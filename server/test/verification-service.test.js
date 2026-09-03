const test = require('node:test')
const assert = require('node:assert/strict')

const { createVerificationService } = require('../services/verification-service')
const { hashVerificationCode } = require('../utils/verification-code')

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

test('verification service sends through the selected provider and replaces old active codes', async () => {
  const pool = createPool([{ rowCount: 0, rows: [] }, { rowCount: 2, rows: [] }, { rowCount: 1, rows: [] }])
  const messages = []
  const service = createVerificationService({
    pool,
    providers: {
      phone: {
        sendCode: async (message) => messages.push(message),
      },
    },
    now: () => new Date('2026-09-03T10:00:00.000Z'),
    codeGenerator: () => '123456',
  })

  const result = await service.send({
    userId: 8,
    channel: 'phone',
    target: '13800138000',
    purpose: 'bind',
  })

  assert.deepEqual(messages, [
    { target: '13800138000', code: '123456', purpose: 'bind' },
  ])
  assert.deepEqual(result, { cooldownSeconds: 60, expiresInSeconds: 300 })
  assert.match(pool.calls[1][0], /UPDATE verification_codes\s+SET consumed_at/i)
  assert.equal(pool.calls[2][1][4], hashVerificationCode('123456'))
})

test('verification service blocks resends during the sixty-second cooldown', async () => {
  const pool = createPool([
    { rowCount: 1, rows: [{ created_at: new Date('2026-09-03T09:59:30.000Z') }] },
  ])
  const service = createVerificationService({
    pool,
    providers: { email: { sendCode: async () => assert.fail('should not send') } },
    now: () => new Date('2026-09-03T10:00:00.000Z'),
  })

  await assert.rejects(
    service.send({ userId: 8, channel: 'email', target: 'user@example.com', purpose: 'bind' }),
    /请在 60 秒后再试/
  )
})

test('verification service consumes a matching valid code', async () => {
  const pool = createPool([
    {
      rowCount: 1,
      rows: [
        {
          id: 18,
          code_hash: hashVerificationCode('123456'),
          expires_at: new Date('2026-09-03T10:05:00.000Z'),
          attempts: 0,
          consumed_at: null,
        },
      ],
    },
    { rowCount: 1, rows: [] },
  ])
  const service = createVerificationService({
    pool,
    providers: {},
    now: () => new Date('2026-09-03T10:00:00.000Z'),
  })

  await service.consume({
    userId: 8,
    channel: 'phone',
    target: '13800138000',
    purpose: 'bind',
    code: '123456',
  })

  assert.match(pool.calls[1][0], /SET consumed_at = now/i)
})
