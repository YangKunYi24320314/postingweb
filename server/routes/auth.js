// 认证模块：注册 / 登录 / 个人信息的参考实现。
// 全队写其它模块（posts/comments/...）时，照这里的三点来：
//   1. 用 ok / fail 统一返回  →  require('../utils/response')
//   2. 数据库用参数化查询，不拼字符串，防 SQL 注入
//   3. 需要登录的接口在前面挂 auth 中间件  →  require('../middleware/auth')
// 注意：路由路径以 / 开头（如 /auth/login），server.js 会自动挂到 /api 前缀下。
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth } = require('../middleware/auth')
const { validateCredentials } = require('../utils/auth-validation')
const { findPublicUser, parsePublicUserId } = require('../services/public-user')
const { toUser } = require('../utils/user-profile')
const {
  MAX_AVATAR_SIZE,
  UPLOAD_DIR,
  createAvatarFileName,
  getAvatarUrl,
  isAllowedAvatar,
} = require('../utils/avatar-upload')

const router = express.Router()
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, callback) => callback(null, createAvatarFileName(file)),
  }),
  limits: { fileSize: MAX_AVATAR_SIZE },
  fileFilter: (req, file, callback) => {
    if (!isAllowedAvatar(file)) {
      return callback(new Error('头像只支持 JPG、PNG、GIF 或 WEBP 图片'))
    }
    callback(null, true)
  },
})

// 生成登录令牌（默认 7 天有效）
function signToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '7d' })
}

// POST /api/auth/register —— 注册
router.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {}
  let credentials
  try {
    credentials = validateCredentials(username, password)
  } catch (error) {
    if (error.code === 'AUTH_VALIDATION') {
      return fail(res, CODE.PARAM_ERROR, error.message)
    }
    throw error
  }

  // 先查重：用户名已被占用则直接返回冲突错误
  const exists = await pool.query('SELECT id FROM users WHERE username = $1', [
    credentials.username,
  ])
  if (exists.rowCount > 0) {
    return fail(res, CODE.CONFLICT, '用户名已被占用')
  }

  // 密码必须加密后才入库，绝不能存明文
  const passwordHash = await bcrypt.hash(password, 10)

  const result = await pool.query(
    `INSERT INTO users (username, password_hash, nickname)
     VALUES ($1, $2, $3)
     RETURNING id, username, nickname, avatar_url, bio, role`,
    [credentials.username, passwordHash, credentials.username]
  )

  const user = result.rows[0]
  return ok(res, { token: signToken(user.id), user: toUser(user) })
})

// POST /api/auth/login —— 登录
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {}
  let credentials
  try {
    credentials = validateCredentials(username, password)
  } catch (error) {
    if (error.code === 'AUTH_VALIDATION') {
      return fail(res, CODE.PARAM_ERROR, error.message)
    }
    throw error
  }

  const result = await pool.query('SELECT * FROM users WHERE username = $1', [credentials.username])
  if (result.rowCount === 0) {
    return fail(res, CODE.UNAUTHORIZED, '用户名或密码错误', 401)
  }

  const user = result.rows[0]
  const match = await bcrypt.compare(credentials.password, user.password_hash)
  if (!match) {
    return fail(res, CODE.UNAUTHORIZED, '用户名或密码错误', 401)
  }

  return ok(res, { token: signToken(user.id), user: toUser(user) })
})

// GET /api/auth/me —— 获取当前登录用户（需登录）
router.get('/auth/me', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, avatar_url, bio, role FROM users WHERE id = $1 AND status = 1',
    [req.userId]
  )
  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }
  return ok(res, toUser(result.rows[0]))
})

// PUT /api/auth/profile —— 更新个人信息（需登录）
router.put('/auth/profile', auth, async (req, res) => {
  const { bio, avatarUrl } = req.body || {}

  // COALESCE：传了才更新，没传就保留原值
  const result = await pool.query(
    `UPDATE users
     SET bio = COALESCE($1, bio),
         avatar_url = COALESCE($2, avatar_url)
     WHERE id = $3
     RETURNING id, username, avatar_url, bio, role`,
    [bio || null, avatarUrl || null, req.userId]
  )

  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }
  return ok(res, toUser(result.rows[0]))
})

// POST /api/auth/avatar —— 上传当前用户头像（需登录）
router.post('/auth/avatar', auth, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return fail(res, CODE.PARAM_ERROR, '头像不能超过 2MB')
      }
      if (error.message) {
        return fail(res, CODE.PARAM_ERROR, error.message)
      }
      return next(error)
    }
    next()
  })
}, async (req, res) => {
  if (!req.file) {
    return fail(res, CODE.PARAM_ERROR, '请选择头像图片')
  }

  const avatarUrl = getAvatarUrl(req.file.filename)
  const result = await pool.query(
    `UPDATE users
        SET avatar_url = $1
      WHERE id = $2 AND status = 1
      RETURNING id, username, avatar_url, bio, role`,
    [avatarUrl, req.userId]
  )

  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }

  return ok(res, toUser(result.rows[0]))
})

// GET /api/users/:id —— 查看某用户公开信息（无需登录）
router.get('/users/:id', async (req, res) => {
  const userId = parsePublicUserId(req.params.id)
  if (!userId) {
    return fail(res, CODE.PARAM_ERROR, '用户 id 必须是正整数')
  }

  const user = await findPublicUser(pool, userId)
  if (!user) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }

  return ok(res, user)
})

module.exports = router
