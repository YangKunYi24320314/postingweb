const express = require('express')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth } = require('../middleware/auth')

const router = express.Router()

function parseUserId(value) {
  const userId = Number(value)
  return Number.isInteger(userId) && userId > 0 ? userId : null
}

async function ensureFriendship(currentUserId, friendId) {
  const result = await pool.query(
    `SELECT 1
       FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1))
      LIMIT 1`,
    [currentUserId, friendId]
  )
  return result.rowCount > 0
}

router.get('/messages/conversations/:friendId', auth, async (req, res) => {
  const currentUserId = Number(req.userId)
  const friendId = parseUserId(req.params.friendId)

  if (!friendId) {
    return fail(res, CODE.PARAM_ERROR, '好友 id 不合法')
  }

  const friend = await pool.query(
    'SELECT id, username, nickname, avatar_url, bio FROM users WHERE id = $1 AND status = 1',
    [friendId]
  )
  if (friend.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }

  if (!(await ensureFriendship(currentUserId, friendId))) {
    return fail(res, CODE.FORBIDDEN, '成为好友后才能聊天', 403)
  }

  const messages = await pool.query(
    `SELECT id::int, sender_id::int, receiver_id::int, content, created_at, read_at
       FROM messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
      LIMIT 100`,
    [currentUserId, friendId]
  )

  await pool.query(
    `UPDATE messages
        SET read_at = COALESCE(read_at, now())
      WHERE sender_id = $1
        AND receiver_id = $2
        AND read_at IS NULL`,
    [friendId, currentUserId]
  )

  return ok(res, {
    friend: {
      id: Number(friend.rows[0].id),
      username: friend.rows[0].username,
      nickname: friend.rows[0].nickname,
      avatarUrl: friend.rows[0].avatar_url,
      bio: friend.rows[0].bio,
    },
    list: messages.rows.map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      createdAt: row.created_at,
      readAt: row.read_at,
      mine: row.sender_id === currentUserId,
    })),
  })
})

router.post('/messages/conversations/:friendId', auth, async (req, res) => {
  const currentUserId = Number(req.userId)
  const friendId = parseUserId(req.params.friendId)
  const content = String(req.body?.content || '').trim()

  if (!friendId) {
    return fail(res, CODE.PARAM_ERROR, '好友 id 不合法')
  }

  if (!content) {
    return fail(res, CODE.PARAM_ERROR, '消息内容不能为空')
  }

  if (content.length > 500) {
    return fail(res, CODE.PARAM_ERROR, '消息内容不能超过 500 字')
  }

  if (!(await ensureFriendship(currentUserId, friendId))) {
    return fail(res, CODE.FORBIDDEN, '成为好友后才能聊天', 403)
  }

  const inserted = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, content)
     VALUES ($1, $2, $3)
     RETURNING id::int, sender_id::int, receiver_id::int, content, created_at, read_at`,
    [currentUserId, friendId, content]
  )

  const row = inserted.rows[0]
  return ok(res, {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    createdAt: row.created_at,
    readAt: row.read_at,
    mine: true,
  })
})

module.exports = router
