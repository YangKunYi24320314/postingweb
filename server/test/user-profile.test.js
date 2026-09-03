const test = require('node:test')
const assert = require('node:assert/strict')

const { toUser } = require('../utils/user-profile')

test('toUser exposes username and never uses nickname as the display identity', () => {
  assert.deepEqual(
    toUser({
      id: 12,
      username: 'scu123',
      nickname: '旧昵称',
      avatar_url: null,
      bio: '简介',
      role: 'user',
    }),
    {
      id: 12,
      username: 'scu123',
      avatarUrl: null,
      bio: '简介',
      role: 'user',
    }
  )
})
