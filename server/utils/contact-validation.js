function validationError(message) {
  const error = new Error(message)
  error.code = 'CONTACT_VALIDATION'
  return error
}

function validatePhone(value) {
  const phone = typeof value === 'string' ? value.trim() : ''
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw validationError('手机号格式不正确')
  }
  return phone
}

function validateEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
    throw validationError('邮箱格式不正确')
  }
  return email
}

function validateContact(channel, target) {
  if (channel === 'phone') return validatePhone(target)
  if (channel === 'email') return validateEmail(target)
  throw validationError('联系方式类型不支持')
}

function normalizeContact(channel, target) {
  return validateContact(channel, target)
}

function normalizeLoginIdentifier(value) {
  const identifier = typeof value === 'string' ? value.trim() : ''
  if (!identifier) throw validationError('用户名、手机号或邮箱不能为空')
  if (identifier.includes('@')) return { type: 'email', value: validateEmail(identifier) }
  if (/^1\d+$/.test(identifier)) return { type: 'phone', value: validatePhone(identifier) }
  if (identifier.length < 3 || identifier.length > 50) {
    throw validationError('用户名长度应为 3-50 位')
  }
  return { type: 'username', value: identifier }
}

module.exports = {
  normalizeContact,
  normalizeLoginIdentifier,
  validateContact,
  validatePhone,
  validateEmail,
}
