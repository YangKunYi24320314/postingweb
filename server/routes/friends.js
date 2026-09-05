const express = require('express')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth } = require('../middleware/auth')

const router = express.Router()

function parseUserId(value) {
  const userId = Number(value)
  return Number.isInteger(userId) && userId > 0 ? userId : null
}

function toFriendship(row) {
  return {
    id: Number(row.id),
    requesterId: Number(row.requester_id),
    addresseeId: Number(row.addressee_id),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio,
  }
}

function toFriendRequest(row) {
  return {
    id: Number(row.friendship_id),
    status: row.status,
    createdAt: row.created_at,
    requester: toUser(row),
  }
}

router.get('/friends/requests', auth, async (req, res) => {
  const currentUserId = Number(req.userId)
  const result = await pool.query(
    `SELECT f.id AS friendship_id, f.status, f.created_at,
            u.id, u.username, u.nickname, u.avatar_url, u.bio
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
      WHERE f.addressee_id = $1
        AND f.status = 'pending'
        AND u.status = 1
      ORDER BY f.created_at DESC`,
    [currentUserId]
  )

  return ok(res, result.rows.map(toFriendRequest))
})

router.get('/friends', auth, async (req, res) => {
  const currentUserId = Number(req.userId)
  const result = await pool.query(
    `SELECT u.id, u.username, u.nickname, u.avatar_url, u.bio,
            f.updated_at AS friends_at,
            latest.content AS last_message,
            latest.created_at AS last_message_at
       FROM friendships f
       JOIN users u
         ON u.id = CASE
           WHEN f.requester_id = $1 THEN f.addressee_id
           ELSE f.requester_id
         END
       LEFT JOIN LATERAL (
         SELECT content, created_at
           FROM messages m
          WHERE ((m.sender_id = $1 AND m.receiver_id = u.id)
             OR (m.sender_id = u.id AND m.receiver_id = $1))
          ORDER BY m.created_at DESC
          LIMIT 1
       ) latest ON true
      WHERE (f.requester_id = $1 OR f.addressee_id = $1)
        AND f.status = 'accepted'
        AND u.status = 1
      ORDER BY latest.created_at DESC NULLS LAST, f.updated_at DESC`,
    [currentUserId]
  )

  return ok(
    res,
    result.rows.map((row) => ({
      ...toUser(row),
      friendsAt: row.friends_at,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
    }))
  )
})

router.post('/friends/requests/:id/accept', auth, async (req, res) => {
  const requestId = parseUserId(req.params.id)
  const currentUserId = Number(req.userId)

  if (!requestId) {
    return fail(res, CODE.PARAM_ERROR, '好友申请 id 不合法')
  }

  const accepted = await pool.query(
    `UPDATE friendships
        SET status = 'accepted',
            updated_at = now()
      WHERE id = $1
        AND addressee_id = $2
        AND status = 'pending'
      RETURNING *`,
    [requestId, currentUserId]
  )

  if (accepted.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '好友申请不存在或已处理', 404)
  }

  return ok(res, toFriendship(accepted.rows[0]), '已同意好友申请')
})

router.post('/friends/:id/request', auth, async (req, res) => {
  const targetUserId = parseUserId(req.params.id)
  const currentUserId = Number(req.userId)

  if (!targetUserId) {
    return fail(res, CODE.PARAM_ERROR, '用户 id 不合法')
  }

  if (targetUserId === currentUserId) {
    return fail(res, CODE.PARAM_ERROR, '不能添加自己为好友')
  }

  const target = await pool.query('SELECT id FROM users WHERE id = $1 AND status = 1', [targetUserId])
  if (target.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '用户不存在', 404)
  }

  const existing = await pool.query(
    `SELECT *
       FROM friendships
      WHERE (requester_id = $1 AND addressee_id = $2)
         OR (requester_id = $2 AND addressee_id = $1)
      ORDER BY created_at DESC
      LIMIT 1`,
    [currentUserId, targetUserId]
  )

  if (existing.rowCount > 0) {
    const row = existing.rows[0]
    if (row.status === 'accepted') {
      return ok(res, toFriendship(row), '已经是好友')
    }
    if (row.status === 'pending') {
      return ok(res, toFriendship(row), '好友申请已存在')
    }

    const renewed = await pool.query(
      `UPDATE friendships
          SET requester_id = $1,
              addressee_id = $2,
              status = 'pending',
              updated_at = now()
        WHERE id = $3
        RETURNING *`,
      [currentUserId, targetUserId, row.id]
    )

    return ok(res, toFriendship(renewed.rows[0]), '好友申请已发送')
  }

  const inserted = await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     RETURNING *`,
    [currentUserId, targetUserId]
  )

  return ok(res, toFriendship(inserted.rows[0]), '好友申请已发送')
})

// GET /api/friends/status/:userId —— 查看我与某用户的好友关系状态（需登录）
router.get('/friends/status/:userId', auth, async (req, res) => {
  const targetUserId = parseUserId(req.params.userId)
  const currentUserId = Number(req.userId)

  if (!targetUserId) {
    return fail(res, CODE.PARAM_ERROR, '用户 id 不合法')
  }

  // 自己看自己
  if (targetUserId === currentUserId) {
    return ok(res, { status: 'self' })
  }

  const result = await pool.query(
    `SELECT status, requester_id
     FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [currentUserId, targetUserId]
  )

  if (result.rowCount === 0) {
    return ok(res, { status: 'none' })
  }

  const row = result.rows[0]
  if (row.status === 'accepted') {
    return ok(res, { status: 'friends' })
  }
  // pending：判断是谁发起的申请
  return ok(res, {
    status: Number(row.requester_id) === currentUserId ? 'pending_sent' : 'pending_received',
  })
})

module.exports = router
