// 统一返回封装：全队所有接口都用这里的 ok / fail，保证格式一致。
// 约定格式：{ code, message, data }，code === 0 表示成功。

// 错误码常量：跟 docs/api-protocol.md 里的错误码表保持一致。
const CODE = {
  PARAM_ERROR: 1001, // 参数错误
  UNAUTHORIZED: 1002, // 未登录或登录失效
  FORBIDDEN: 1003, // 无权限
  NOT_FOUND: 1004, // 资源不存在
  CONFLICT: 1005, // 冲突/重复（如用户名已存在、已点过赞）
  SERVER_ERROR: 5000, // 服务器内部错误
}

// 成功：统一返回 { code: 0, message: 'success', data }
function ok(res, data = null, message = 'success') {
  return res.json({ code: 0, message, data })
}

// 失败：按业务/HTTP 状态返回错误，data 固定为 null
function fail(res, code, message, httpStatus = 400) {
  return res.status(httpStatus).json({ code, message, data: null })
}

module.exports = { CODE, ok, fail }
