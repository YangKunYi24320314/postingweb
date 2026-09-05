// 认证相关中间件，全队共用。
//   auth       → 必须登录（否则 401），放在需要登录的接口前
//   optionalAuth → 可选登录：有合法 token 就解析出 userId，没 token 也不拦截
//   authAdmin  → 管理员校验，必须放在 auth 之后使用，仅管理员角色可通过
// 用法：const { auth, optionalAuth, authAdmin } = require('../middleware/auth')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const { fail, CODE } = require('../utils/response')

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

/**
 * 强制登录中间件
 * 解析 Token 后查询用户完整信息，挂载到 req.user
 * 保留 req.userId 兼容所有旧代码
 */
async function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return fail(res, CODE.UNAUTHORIZED, '未登录', 401)
  }

  try {
    // 解析 token
    const payload = jwt.verify(token, SECRET)
    // 兼容两种字段名：id 和 userId，避免字段不匹配
    const userId = payload.userId || payload.id

    // 查询用户完整信息（包含角色）
    const result = await pool.query(
      'SELECT id, username, role, status FROM users WHERE id = $1 AND status = 1',
      [userId]
    )

    if (result.rowCount === 0) {
      return fail(res, CODE.UNAUTHORIZED, '用户不存在或已禁用', 401)
    }

    const user = result.rows[0]
    // 兼容原有写法
    req.userId = user.id
    // 新增完整用户信息，包含角色
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role || 'user'
    }

    next()
  } catch (e) {
    console.error('[认证中间件] 失败：', e.message)
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return fail(res, CODE.UNAUTHORIZED, '登录已过期，请重新登录', 401)
    }
    return fail(res, CODE.SERVER_ERROR, '认证失败', 500)
  }
}

/**
 * 可选登录中间件
 * 有 Token 就解析并查询用户信息，没有就直接放行
 */
async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next()

  const token = req.headers.authorization.replace(/^Bearer\s+/i, '')
  try {
    const payload = jwt.verify(token, SECRET)
    const userId = payload.userId || payload.id

    const result = await pool.query(
      'SELECT id, username, role, status FROM users WHERE id = $1 AND status = 1',
      [userId]
    )

    if (result.rowCount > 0) {
      const user = result.rows[0]
      req.userId = user.id
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role || 'user'
      }
    }
    next()
  } catch (e) {
    // 解析失败就当作未登录，不拦截
    next()
  }
}

/**
 * 管理员角色校验中间件
 * 必须放在 auth 中间件之后使用，依赖 auth 解析出的 req.user.role
 */
function authAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return fail(res, CODE.PERMISSION_DENIED, '权限不足，仅管理员可操作', 403)
  }
  next()
}

module.exports = { auth, optionalAuth, authAdmin }
