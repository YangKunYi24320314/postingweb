const { normalizeContact } = require('../utils/contact-validation')
const {
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
} = require('../utils/verification-code')

const CODE_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

function serviceError(message, code = 'VERIFICATION_ERROR') {
  const error = new Error(message)
  error.code = code
  return error
}

function createVerificationService({ pool, providers, now = () => new Date(), codeGenerator = generateVerificationCode }) {
  if (!pool || !providers) throw new Error('验证码服务缺少依赖')

  return {
    async send({ userId, channel, target, purpose }) {
      const normalizedTarget = normalizeContact(channel, target)
      const currentTime = now()
      const recent = await pool.query(
        `SELECT created_at
           FROM verification_codes
          WHERE user_id = $1 AND channel = $2 AND target = $3 AND purpose = $4
            AND consumed_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1`,
        [userId, channel, normalizedTarget, purpose]
      )
      const latest = recent.rows[0]
      if (latest && currentTime.getTime() - new Date(latest.created_at).getTime() < RESEND_COOLDOWN_MS) {
        throw serviceError('请在 60 秒后再试', 'VERIFICATION_COOLDOWN')
      }

      const code = codeGenerator()
      const provider = providers[channel]
      if (!provider || typeof provider.sendCode !== 'function') {
        throw serviceError('验证码发送渠道未配置', 'CONTACT_PROVIDER')
      }
      await provider.sendCode({ target: normalizedTarget, code, purpose })

      await pool.query(
        `UPDATE verification_codes
            SET consumed_at = now()
          WHERE user_id = $1 AND channel = $2 AND target = $3 AND purpose = $4
            AND consumed_at IS NULL`,
        [userId, channel, normalizedTarget, purpose]
      )
      await pool.query(
        `INSERT INTO verification_codes
          (user_id, channel, target, purpose, code_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          channel,
          normalizedTarget,
          purpose,
          hashVerificationCode(code),
          new Date(currentTime.getTime() + CODE_TTL_MS),
        ]
      )

      return { cooldownSeconds: 60, expiresInSeconds: 300 }
    },

    async consume({ userId, channel, target, purpose, code }) {
      const normalizedTarget = normalizeContact(channel, target)
      const result = await pool.query(
        `SELECT id, code_hash, expires_at, attempts, consumed_at
           FROM verification_codes
          WHERE user_id = $1 AND channel = $2 AND target = $3 AND purpose = $4
          ORDER BY created_at DESC
          LIMIT 1`,
        [userId, channel, normalizedTarget, purpose]
      )
      const record = result.rows[0]
      const verification = record
        ? verifyVerificationCode({
            code,
            codeHash: record.code_hash,
            expiresAt: record.expires_at,
            attempts: record.attempts,
            consumedAt: record.consumed_at,
            now: now().getTime(),
          })
        : { valid: false, reason: 'missing' }

      if (!verification.valid) {
        if (record && verification.reason === 'mismatch') {
          await pool.query(
            `UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1 AND consumed_at IS NULL`,
            [record.id]
          )
        }
        throw serviceError('验证码无效或已过期', 'VERIFICATION_INVALID')
      }

      const consumed = await pool.query(
        `UPDATE verification_codes SET consumed_at = now()
          WHERE id = $1 AND consumed_at IS NULL`,
        [record.id]
      )
      if (consumed.rowCount !== 1) {
        throw serviceError('验证码无效或已过期', 'VERIFICATION_INVALID')
      }
      return { verified: true }
    },
  }
}

module.exports = { CODE_TTL_MS, RESEND_COOLDOWN_MS, createVerificationService, serviceError }
