const test = require('node:test')
const assert = require('node:assert/strict')

const { validateCredentials } = require('../utils/auth-validation')

test('registration rejects a phone number or email as a new username', () => {
  assert.throws(() => validateCredentials('13800138000', '123456'), /手机号或邮箱请绑定后登录/)
  assert.throws(() => validateCredentials('user@example.com', '123456'), /手机号或邮箱请绑定后登录/)
})

test('credentials accept a trimmed username and six-character password', () => {
  assert.deepEqual(validateCredentials('  scu123  ', '123456'), {
    username: 'scu123',
    password: '123456',
  })
})

test('credentials reject passwords shorter than six characters', () => {
  assert.throws(() => validateCredentials('scu123', '12345'), /密码长度不能少于 6 位/)
})

test('credentials reject usernames outside the allowed length', () => {
  assert.throws(() => validateCredentials('ab', '123456'), /用户名长度应为 3-50 位/)
})
