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
const { createSmsProvider } = require('../services/sms-provider')
const { createEmailProvider } = require('../services/email-provider')
const { createVerificationService } = require('../services/verification-service')
const { createContactAuthService } = require('../services/contact-auth')
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

let contactAuthService

function unavailableProvider(error) {
  return {
    async sendCode() {
      throw error
    },
  }
}

function getContactAuthService() {
  if (contactAuthService) return contactAuthService

  let smsProvider
  let emailProvider
  try {
    smsProvider = createSmsProvider()
  } catch (error) {
    smsProvider = unavailableProvider(error)
  }
  try {
    emailProvider = createEmailProvider()
  } catch (error) {
    emailProvider = unavailableProvider(error)
  }

  const verificationService = createVerificationService({
    pool,
    providers: { phone: smsProvider, email: emailProvider },
  })
  contactAuthService = createContactAuthService({
    pool,
    verificationService,
    signToken,
  })
  return contactAuthService
}

function handleAuthError(res, error) {
  if (error.code === 'AUTH_VALIDATION' || error.code === 'CONTACT_VALIDATION') {
    return fail(res, CODE.PARAM_ERROR, error.message)
  }
  if (error.code === 'AUTH_LOGIN_FAILED') {
    return fail(res, CODE.UNAUTHORIZED, error.message, 401)
  }
  if (error.code === 'AUTH_PASSWORD_INVALID') {
    return fail(res, CODE.PARAM_ERROR, error.message)
  }
  if (error.code === 'AUTH_USER_NOT_FOUND') {
    return fail(res, CODE.NOT_FOUND, error.message, 404)
  }
  if (error.code === 'CONTACT_CONFLICT') {
    return fail(res, CODE.CONFLICT, error.message, 409)
  }
  if (error.code === 'VERIFICATION_INVALID' || error.code === 'VERIFICATION_COOLDOWN') {
    return fail(res, CODE.PARAM_ERROR, error.message)
  }
  if (error.code === 'CONTACT_PROVIDER') {
    return fail(res, CODE.SERVER_ERROR, error.message, 500)
  }
  throw error
}

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
  const { identifier, username, password } = req.body || {}
  try {
    const data = await getContactAuthService().login({
      identifier: identifier ?? username,
      password,
    })
    return ok(res, data)
  } catch (error) {
    return handleAuthError(res, error)
  }
})

// GET /api/auth/me —— 获取当前登录用户（需登录）
router.get('/auth/me', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, avatar_url, bio, role, phone, email FROM users WHERE id = $1 AND status = 1',
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
     RETURNING id, username, avatar_url, bio, role, phone, email`,
    [bio || null, avatarUrl || null, req.userId]
  )

  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }
  return ok(res, toUser(result.rows[0]))
})

// POST /api/auth/contact/send-code —— 发送绑定验证码（需登录）
router.post('/auth/contact/send-code', auth, async (req, res) => {
  try {
    const data = await getContactAuthService().sendBindingCode({
      userId: req.userId,
      channel: req.body?.channel,
      target: req.body?.target,
    })
    return ok(res, data, '验证码已发送')
  } catch (error) {
    return handleAuthError(res, error)
  }
})

// POST /api/auth/contact/bind —— 校验验证码并绑定联系方式（需登录）
router.post('/auth/contact/bind', auth, async (req, res) => {
  try {
    const data = await getContactAuthService().bindContact({
      userId: req.userId,
      channel: req.body?.channel,
      target: req.body?.target,
      code: req.body?.code,
    })
    return ok(res, data, '联系方式绑定成功')
  } catch (error) {
    return handleAuthError(res, error)
  }
})

// POST /api/auth/password/change —— 修改密码（需登录）
router.post('/auth/password/change', auth, async (req, res) => {
  try {
    const data = await getContactAuthService().changePassword({
      userId: req.userId,
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
    })
    return ok(res, data, '密码修改成功')
  } catch (error) {
    return handleAuthError(res, error)
  }
})

// POST /api/auth/password/reset/send-code —— 发送找回密码验证码（无需登录）
router.post('/auth/password/reset/send-code', async (req, res) => {
  try {
    const data = await getContactAuthService().sendResetCode({
      channel: req.body?.channel,
      target: req.body?.target,
    })
    return ok(res, data, '如果账号存在，验证码将发送到对应联系方式')
  } catch (error) {
    return handleAuthError(res, error)
  }
})

// POST /api/auth/password/reset —— 使用验证码重置密码（无需登录）
router.post('/auth/password/reset', async (req, res) => {
  try {
    const data = await getContactAuthService().resetPassword({
      channel: req.body?.channel,
      target: req.body?.target,
      code: req.body?.code,
      newPassword: req.body?.newPassword,
    })
    return ok(res, data, '密码重置成功')
  } catch (error) {
    return handleAuthError(res, error)
  }
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
      RETURNING id, username, avatar_url, bio, role, phone, email`,
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
module.exports.handleAuthError = handleAuthError
