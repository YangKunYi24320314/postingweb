// JWT 认证中间件：放在需要登录的接口前，例如 router.get('/me', auth, handler)。
// 作用：解析请求头的 Authorization: Bearer <token>，验证通过后把 userId 挂到 req 上。
const jwt = require('jsonwebtoken')
const { fail, CODE } = require('../utils/response')

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

module.exports = function auth(req, res, next) {
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
