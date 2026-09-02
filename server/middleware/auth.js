// 认证相关中间件，全队共用。
//   auth           → 必须登录（否则 401），放在需要登录的接口前
//   optionalAuth   → 可选登录：有合法 token 就解析出 userId（用于返回"我是否点赞/收藏过"），没 token 也不拦截
// 用法：const { auth, optionalAuth } = require('../middleware/auth')
const jwt = require('jsonwebtoken')
const { fail, CODE } = require('../utils/response')

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return fail(res, CODE.UNAUTHORIZED, '未登录', 401)
  }

  try {
    const payload = jwt.verify(token, SECRET)
    req.userId = payload.userId
    next()
  } catch (e) {
    return fail(res, CODE.UNAUTHORIZED, '登录已过期，请重新登录', 401)
  }
}

function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next()
  const token = req.headers.authorization.replace(/^Bearer\s+/i, '')
  try {
    req.userId = jwt.verify(token, SECRET).userId
  } catch (e) {
    // 解析失败就当作未登录，不拦截
  }
  next()
}

module.exports = { auth, optionalAuth }
