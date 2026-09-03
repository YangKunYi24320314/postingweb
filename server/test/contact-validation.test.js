const test = require('node:test')
const assert = require('node:assert/strict')

const {
  normalizeContact,
  validateContact,
  validatePhone,
  validateEmail,
  normalizeLoginIdentifier,
} = require('../utils/contact-validation')

test('phone contact accepts a mainland mobile number and strips whitespace', () => {
  assert.equal(validatePhone(' 13800138000 '), '13800138000')
})

test('email contact normalizes casing and whitespace', () => {
  assert.equal(validateEmail('  User@Example.COM '), 'user@example.com')
})

test('contact validator normalizes targets by channel', () => {
  assert.equal(normalizeContact('phone', '13800138000'), '13800138000')
  assert.equal(normalizeContact('email', 'USER@example.com'), 'user@example.com')
  assert.throws(() => validateContact('fax', '123456'), /联系方式类型不支持/)
})

test('contact validators reject malformed phone and email targets', () => {
  assert.throws(() => validatePhone('12345678901'), /手机号格式不正确/)
  assert.throws(() => validateEmail('not-an-email'), /邮箱格式不正确/)
})

test('login identifier normalizes username, phone, and email values', () => {
  assert.deepEqual(normalizeLoginIdentifier('  scu123 '), { type: 'username', value: 'scu123' })
  assert.deepEqual(normalizeLoginIdentifier(' 13800138000 '), {
    type: 'phone',
    value: '13800138000',
  })
  assert.deepEqual(normalizeLoginIdentifier(' USER@example.com '), {
    type: 'email',
    value: 'user@example.com',
  })
})
