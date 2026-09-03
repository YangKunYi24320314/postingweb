const test = require('node:test')
const assert = require('node:assert/strict')

const { createContactAuthService } = require('../services/contact-auth')

function createPool(responses) {
  const calls = []
  return {
    calls,
    async query(...args) {
      calls.push(args)
      return responses.shift() || { rowCount: 0, rows: [] }
    },
  }
}

const userRow = {
  id: 7,
  username: 'scu123',
  password_hash: 'old-hash',
  avatar_url: null,
  bio: '简介',
  role: 'user',
  phone: '13800138000',
  email: 'user@example.com',
}

test('contact auth service logs in with a bound phone identifier', async () => {
  const pool = createPool([{ rowCount: 1, rows: [userRow] }])
  const service = createContactAuthService({
    pool,
    comparePassword: async (password, hash) => password === 'secret' && hash === 'old-hash',
    signToken: (id) => `token-${id}`,
  })

  const result = await service.login({ identifier: '13800138000', password: 'secret' })

  assert.equal(result.token, 'token-7')
  assert.equal(result.user.phone, '138****8000')
  assert.equal(result.user.email, 'u***@example.com')
  assert.match(pool.calls[0][0], /WHERE phone = \$1/i)
})

test('contact auth service rejects incorrect current password during a change', async () => {
  const pool = createPool([{ rowCount: 1, rows: [{ ...userRow }] }])
  const service = createContactAuthService({
    pool,
    comparePassword: async () => false,
  })

  await assert.rejects(
    service.changePassword({ userId: 7, currentPassword: 'wrongpw', newPassword: 'newpass' }),
    /当前密码不正确/
  )
})

test('contact auth service binds a verified email and returns the updated user', async () => {
  const pool = createPool([
    { rowCount: 0, rows: [] },
    { rowCount: 1, rows: [{ ...userRow, email: 'new@example.com' }] },
  ])
  const service = createContactAuthService({
    pool,
    verificationService: {
      consume: async (input) => {
        assert.equal(input.code, '123456')
      },
    },
  })

  const result = await service.bindContact({
    userId: 7,
    channel: 'email',
    target: 'NEW@example.com',
    code: '123456',
  })

  assert.equal(result.email, 'n***@example.com')
  assert.match(pool.calls[1][0], /UPDATE users/i)
})

test('contact auth service resets password with a verified phone', async () => {
  const pool = createPool([
    { rowCount: 1, rows: [{ id: 7, phone: '13800138000', status: 1 }] },
    { rowCount: 1, rows: [{ ...userRow, password_hash: 'new-hash' }] },
  ])
  const service = createContactAuthService({
    pool,
    verificationService: { consume: async () => {} },
    hashPassword: async () => 'new-hash',
    signToken: (id) => `token-${id}`,
  })

  const result = await service.resetPassword({
    channel: 'phone',
    target: '13800138000',
    code: '123456',
    newPassword: 'newpass',
  })

  assert.equal(result.token, 'token-7')
  assert.equal(result.user.username, 'scu123')
})
