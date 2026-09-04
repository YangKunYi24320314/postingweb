// 认证模块：注册 / 登录 / 个人信息的参考实现。
// 全队写其它模块（posts/comments/...）时，照这里的三点来：
//   1. 用 ok / fail 统一返回  →  require('../utils/response')
//   2. 数据库用参数化查询，不拼字符串，防 SQL 注入
//   3. 需要登录的接口在前面挂 auth 中间件  →  require('../middleware/auth')
// 注意：路由路径以 / 开头（如 /auth/login），server.js 会自动挂到 /api 前缀下。
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth } = require('../middleware/auth')
const { validateCredentials, normalizeNickname } = require('../utils/auth-validation')

const router = express.Router()
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

// 生成登录令牌（默认 7 天有效）
function signToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '7d' })
}

// 把数据库行的蛇形字段转成前端要的驼峰字段（跟 api-protocol 对齐）
// 注意：BIGINT 主键从 pg 取出来是字符串，这里统一转成 Number，方便前端比较。
function toUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    role: row.role,
  }
}

// POST /api/auth/register —— 注册
router.post('/auth/register', async (req, res) => {
  const { username, password, nickname } = req.body || {}
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
    [credentials.username, passwordHash, normalizeNickname(credentials.username, nickname)]
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

// GET /api/users/:id —— 查看某用户公开信息（无需登录）
router.get('/users/:id', async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    return fail(res, CODE.PARAM_ERROR, '用户 id 不合法')
  }

  const result = await pool.query(
    `SELECT u.id::int, u.username, u.nickname, u.avatar_url, u.background_url, u.bio,
            (SELECT COUNT(*)::int FROM posts p WHERE p.user_id = u.id AND p.is_deleted = false) AS post_count,
            (SELECT COALESCE(SUM(p.like_count), 0)::int FROM posts p WHERE p.user_id = u.id AND p.is_deleted = false) AS total_likes,
            (SELECT COALESCE(SUM(p.favorite_count), 0)::int FROM posts p WHERE p.user_id = u.id AND p.is_deleted = false) AS total_favorites
     FROM users u
     WHERE u.id = $1 AND u.status = 1`,
    [userId]
  )
  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }

  const row = result.rows[0]
  return ok(res, {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    backgroundUrl: row.background_url || null,
    bio: row.bio,
    postCount: row.post_count,
    totalLikes: row.total_likes,
    totalFavorites: row.total_favorites,
  })
})

// GET /api/auth/me —— 获取当前登录用户（需登录）
router.get('/auth/me', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, username, nickname, avatar_url, bio, role FROM users WHERE id = $1 AND status = 1',
    [req.userId]
  )
  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }
  return ok(res, toUser(result.rows[0]))
})

// PUT /api/auth/profile —— 更新个人信息（需登录）
router.put('/auth/profile', auth, async (req, res) => {
  const { nickname, bio, avatarUrl } = req.body || {}

  // COALESCE：传了才更新，没传就保留原值
  const result = await pool.query(
    `UPDATE users
     SET nickname = COALESCE($1, nickname),
         bio = COALESCE($2, bio),
         avatar_url = COALESCE($3, avatar_url)
     WHERE id = $4
     RETURNING id, username, nickname, avatar_url, bio, role`,
    [nickname || null, bio || null, avatarUrl || null, req.userId]
  )

  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }
  return ok(res, toUser(result.rows[0]))
})

module.exports = router
