const test = require('node:test')
const assert = require('node:assert/strict')

const {
  generateVerificationCode,
  hashVerificationCode,
  verifyVerificationCode,
} = require('../utils/verification-code')

test('verification code generation always returns six digits', () => {
  assert.equal(generateVerificationCode(() => 42), '000042')
  assert.match(generateVerificationCode(), /^\d{6}$/)
})

test('verification code accepts a matching unexpired code', () => {
  const result = verifyVerificationCode({
    code: '123456',
    codeHash: hashVerificationCode('123456'),
    expiresAt: Date.now() + 60_000,
    attempts: 0,
    now: Date.now(),
  })
  assert.deepEqual(result, { valid: true })
})

test('verification code rejects expired, consumed, exhausted, and mismatched codes', () => {
  const hash = hashVerificationCode('123456')
  assert.equal(
    verifyVerificationCode({
      code: '123456',
      codeHash: hash,
      expiresAt: Date.now() - 1,
      attempts: 0,
      now: Date.now(),
    }).reason,
    'expired'
  )
  assert.equal(
    verifyVerificationCode({
      code: '123456',
      codeHash: hash,
      expiresAt: Date.now() + 60_000,
      attempts: 0,
      consumedAt: new Date(),
      now: Date.now(),
    }).reason,
    'consumed'
  )
  assert.equal(
    verifyVerificationCode({
      code: '123456',
      codeHash: hash,
      expiresAt: Date.now() + 60_000,
      attempts: 5,
      now: Date.now(),
    }).reason,
    'too_many_attempts'
  )
  assert.equal(
    verifyVerificationCode({
      code: '654321',
      codeHash: hash,
      expiresAt: Date.now() + 60_000,
      attempts: 0,
      now: Date.now(),
    }).reason,
    'mismatch'
  )
})
