const crypto = require('node:crypto')

const CODE_LENGTH = 6
const MAX_ATTEMPTS = 5

function generateVerificationCode(randomInt = crypto.randomInt) {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex')
}

function verifyVerificationCode({ code, codeHash, expiresAt, attempts = 0, consumedAt, now = Date.now() }) {
  if (consumedAt) return { valid: false, reason: 'consumed' }
  if (attempts >= MAX_ATTEMPTS) return { valid: false, reason: 'too_many_attempts' }
  if (new Date(expiresAt).getTime() <= now) return { valid: false, reason: 'expired' }

  const expected = Buffer.from(codeHash, 'utf8')
  const actual = Buffer.from(hashVerificationCode(code), 'utf8')
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return { valid: false, reason: 'mismatch' }
  }
  return { valid: true }
}

module.exports = {
  CODE_LENGTH,
  MAX_ATTEMPTS,
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
}
