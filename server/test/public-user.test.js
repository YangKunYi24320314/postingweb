const test = require('node:test')
const assert = require('node:assert/strict')

const { parsePublicUserId, findPublicUser } = require('../services/public-user')

test('public user ids must be positive integers', () => {
  assert.equal(parsePublicUserId('12'), 12)
  assert.equal(parsePublicUserId('0'), null)
  assert.equal(parsePublicUserId('abc'), null)
})

test('public user lookup returns a safe public profile and post count', async () => {
  const queries = []
  const pool = {
    query: async (sql, params) => {
      queries.push({ sql, params })
      return {
        rowCount: 1,
        rows: [
          {
            id: 12,
            username: 'scu123',
            nickname: '校园用户',
            avatar_url: null,
            bio: '喜欢分享校园生活',
            post_count: '3',
          },
        ],
      }
    },
  }

  const profile = await findPublicUser(pool, 12)

  assert.deepEqual(profile, {
    id: 12,
    username: 'scu123',
    nickname: '校园用户',
    avatarUrl: null,
    bio: '喜欢分享校园生活',
    postCount: 3,
  })
  assert.equal(queries[0].params[0], 12)
})

test('public user lookup returns null when the user does not exist', async () => {
  const profile = await findPublicUser({ query: async () => ({ rowCount: 0, rows: [] }) }, 99)

  assert.equal(profile, null)
})
