const bcrypt = require('bcryptjs')
const { normalizeContact, normalizeLoginIdentifier } = require('../utils/contact-validation')
const { toUser } = require('../utils/user-profile')

function serviceError(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

function validatePassword(value, label = '密码') {
  if (typeof value !== 'string' || value.length < 6) {
    throw serviceError(`${label}长度不能少于 6 位`, 'AUTH_VALIDATION')
  }
  return value
}

function createContactAuthService({
  pool,
  verificationService = {},
  hashPassword = (password) => bcrypt.hash(password, 10),
  comparePassword = bcrypt.compare,
  signToken = () => {
    throw new Error('signToken is required')
  },
}) {
  if (!pool || !verificationService) throw new Error('账号安全服务缺少依赖')

  async function findUserByIdentifier(identifier) {
    const parsed = normalizeLoginIdentifier(identifier)
    const result = await pool.query(
      `SELECT * FROM users WHERE ${parsed.type} = $1 AND status = 1`,
      [parsed.value]
    )
    return result.rows[0] || null
  }

  async function login({ identifier, password }) {
    validatePassword(password)
    const user = await findUserByIdentifier(identifier)
    if (!user || !(await comparePassword(password, user.password_hash))) {
      throw serviceError('用户名、手机号或邮箱与密码不匹配', 'AUTH_LOGIN_FAILED')
    }
    return { token: signToken(user.id), user: toUser(user) }
  }

  async function changePassword({ userId, currentPassword, newPassword }) {
    validatePassword(currentPassword, '当前密码')
    validatePassword(newPassword, '新密码')
    if (currentPassword === newPassword) {
      throw serviceError('新密码不能与当前密码相同', 'AUTH_VALIDATION')
    }
    const current = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND status = 1',
      [userId]
    )
    const user = current.rows[0]
    if (!user || !(await comparePassword(currentPassword, user.password_hash))) {
      throw serviceError('当前密码不正确', 'AUTH_PASSWORD_INVALID')
    }
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = now()
        WHERE id = $2
        RETURNING *`,
      [await hashPassword(newPassword), userId]
    )
    return { token: signToken(userId), user: toUser(result.rows[0]) }
  }

  async function sendBindingCode({ userId, channel, target }) {
    const normalizedTarget = normalizeContact(channel, target)
    const existing = await pool.query(
      `SELECT id FROM users WHERE ${channel} = $1 AND id <> $2 LIMIT 1`,
      [normalizedTarget, userId]
    )
    if (existing.rowCount > 0) throw serviceError('该联系方式已被其他账号绑定', 'CONTACT_CONFLICT')
    return verificationService.send({ userId, channel, target: normalizedTarget, purpose: 'bind' })
  }

  async function bindContact({ userId, channel, target, code }) {
    const normalizedTarget = normalizeContact(channel, target)
    const existing = await pool.query(
      `SELECT id FROM users WHERE ${channel} = $1 AND id <> $2 LIMIT 1`,
      [normalizedTarget, userId]
    )
    if (existing.rowCount > 0) throw serviceError('该联系方式已被其他账号绑定', 'CONTACT_CONFLICT')
    await verificationService.consume({ userId, channel, target: normalizedTarget, purpose: 'bind', code })
    const result = await pool.query(
      `UPDATE users SET ${channel} = $1, updated_at = now()
        WHERE id = $2 AND status = 1
        RETURNING *`,
      [normalizedTarget, userId]
    )
    if (result.rowCount === 0) throw serviceError('用户不存在', 'AUTH_USER_NOT_FOUND')
    return toUser(result.rows[0])
  }

  async function findUserByContact(channel, target) {
    const normalizedTarget = normalizeContact(channel, target)
    const result = await pool.query(
      `SELECT * FROM users WHERE ${channel} = $1 AND status = 1 LIMIT 1`,
      [normalizedTarget]
    )
    return { normalizedTarget, user: result.rows[0] || null }
  }

  async function sendResetCode({ channel, target }) {
    const { normalizedTarget, user } = await findUserByContact(channel, target)
    if (!user) return { accepted: true }
    await verificationService.send({
      userId: user.id,
      channel,
      target: normalizedTarget,
      purpose: 'password_reset',
    })
    return { accepted: true }
  }

  async function resetPassword({ channel, target, code, newPassword }) {
    validatePassword(newPassword, '新密码')
    const { normalizedTarget, user } = await findUserByContact(channel, target)
    if (!user) throw serviceError('验证码无效或已过期', 'VERIFICATION_INVALID')
    await verificationService.consume({
      userId: user.id,
      channel,
      target: normalizedTarget,
      purpose: 'password_reset',
      code,
    })
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = now()
        WHERE id = $2 AND status = 1
        RETURNING *`,
      [await hashPassword(newPassword), user.id]
    )
    return { token: signToken(user.id), user: toUser(result.rows[0]) }
  }

  return {
    bindContact,
    changePassword,
    findUserByContact,
    login,
    resetPassword,
    sendBindingCode,
    sendResetCode,
  }
}

module.exports = { createContactAuthService, serviceError, validatePassword }
