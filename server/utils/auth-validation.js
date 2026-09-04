function validationError(message) {
  const error = new Error(message)
  error.code = 'AUTH_VALIDATION'
  return error
}

function validateCredentials(username, password) {
  const normalizedUsername = typeof username === 'string' ? username.trim() : ''
  const normalizedPassword = typeof password === 'string' ? password : ''

  if (!normalizedUsername || !normalizedPassword) {
    throw validationError('用户名和密码不能为空')
  }
  if (normalizedUsername.length < 3 || normalizedUsername.length > 50) {
    throw validationError('用户名长度应为 3-50 位')
  }
  if (/^1[3-9]\d{9}$/.test(normalizedUsername) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedUsername)) {
    throw validationError('手机号或邮箱请绑定后登录，不能直接注册')
  }
  if (normalizedPassword.length < 6) {
    throw validationError('密码长度不能少于 6 位')
  }

  return { username: normalizedUsername, password: normalizedPassword }
}

module.exports = { validateCredentials }
