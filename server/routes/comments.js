// 评论模块：列表 / 发表 / 编辑 / 删除。
// 写法对齐 auth.js：ok/fail 统一返回、参数化查询 $1 $2、需要登录就挂 auth。
// 路由路径以 / 开头（如 /posts/:id/comments），server.js 会自动挂到 /api 前缀下。
const express = require('express')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth, optionalAuth } = require('../middleware/auth')

const router = express.Router()

// 把数据库行转成前端要的格式（user 挂在对象里，和 api-protocol 对得上）
function toComment(row) {
  return {
    id: row.id,
    user: {
      id: row.user_id,
      nickname: row.user_nickname,
      avatarUrl: row.user_avatar_url,
    },
    content: row.content,
    parentId: row.parent_id,
    likeCount: row.like_count,
    isLiked: row.is_liked,
    createdAt: row.created_at,
  }
}

// 查单条评论（带作者信息 + 当前用户是否点过赞），返回 null 表示不存在
async function findComment(commentId, userId) {
  const result = await pool.query(
    `SELECT c.id, c.user_id, c.content, c.parent_id, c.like_count, c.created_at,
            u.nickname AS user_nickname, u.avatar_url AS user_avatar_url,
            EXISTS(
              SELECT 1 FROM comment_likes cl
              WHERE cl.comment_id = c.id AND cl.user_id = $2
            ) AS is_liked
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1`,
    [commentId, userId || 0]
  )
  return result.rows[0] || null
}

// GET /api/posts/:id/comments —— 帖子的评论列表（公开）
router.get('/posts/:id/comments', optionalAuth, async (req, res) => {
  const postId = Number(req.params.id)
  if (!Number.isInteger(postId) || postId <= 0) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }

  const post = await pool.query('SELECT id FROM posts WHERE id = $1 AND is_deleted = false', [
    postId,
  ])
  if (post.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
  }

  const result = await pool.query(
    `SELECT c.id, c.user_id, c.content, c.parent_id, c.like_count, c.created_at,
            u.nickname AS user_nickname, u.avatar_url AS user_avatar_url,
            EXISTS(
              SELECT 1 FROM comment_likes cl
              WHERE cl.comment_id = c.id AND cl.user_id = $2
            ) AS is_liked
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1 AND c.status = 1
     ORDER BY c.created_at ASC`,
    [postId, req.userId || 0]
  )

  return ok(res, result.rows.map(toComment))
})

// POST /api/posts/:id/comments —— 发表评论（需登录）
router.post('/posts/:id/comments', auth, async (req, res) => {
  const postId = Number(req.params.id)
  if (!Number.isInteger(postId) || postId <= 0) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }

  const { content, parentId } = req.body || {}
  if (!content || !content.trim()) {
    return fail(res, CODE.PARAM_ERROR, '评论内容不能为空')
  }

  const post = await pool.query('SELECT id FROM posts WHERE id = $1 AND is_deleted = false', [
    postId,
  ])
  if (post.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
  }

  // 楼中楼：回帖必须存在，且属于同一个帖子
  if (parentId) {
    const parent = await pool.query('SELECT id FROM comments WHERE id = $1 AND post_id = $2', [
      parentId,
      postId,
    ])
    if (parent.rowCount === 0) {
      return fail(res, CODE.PARAM_ERROR, '回复的评论不存在')
    }
  }

  // 事务：插入评论 + 帖子评论数 +1，保证一致
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const inserted = await client.query(
      `INSERT INTO comments (post_id, user_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, content, parent_id, like_count, created_at`,
      [postId, req.userId, parentId || null, content.trim()]
    )
    await client.query('UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1', [postId])
    await client.query('COMMIT')

    // 重新查一遍，补上作者昵称和 is_liked，保持返回结构一致
    const comment = await findComment(inserted.rows[0].id, req.userId)
    return ok(res, toComment(comment))
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

// PUT /api/comments/:id —— 编辑评论（需登录，仅作者）
router.put('/comments/:id', auth, async (req, res) => {
  const commentId = Number(req.params.id)
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return fail(res, CODE.PARAM_ERROR, '评论 id 不合法')
  }

  const { content } = req.body || {}
  if (!content || !content.trim()) {
    return fail(res, CODE.PARAM_ERROR, '评论内容不能为空')
  }

  const existing = await pool.query('SELECT id, user_id, status FROM comments WHERE id = $1', [
    commentId,
  ])
  if (existing.rowCount === 0 || existing.rows[0].status !== 1) {
    return fail(res, CODE.NOT_FOUND, '评论不存在', 404)
  }

  // 只有作者能改自己的评论
  if (existing.rows[0].user_id !== req.userId) {
    return fail(res, CODE.FORBIDDEN, '只能编辑自己的评论', 403)
  }

  await pool.query('UPDATE comments SET content = $1 WHERE id = $2', [content.trim(), commentId])

  const comment = await findComment(commentId, req.userId)
  return ok(res, toComment(comment))
})

// DELETE /api/comments/:id —— 删除评论（需登录，仅作者或管理员）
router.delete('/comments/:id', auth, async (req, res) => {
  const commentId = Number(req.params.id)
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return fail(res, CODE.PARAM_ERROR, '评论 id 不合法')
  }

  const existing = await pool.query(
    'SELECT id, user_id, post_id, status FROM comments WHERE id = $1',
    [commentId]
  )
  if (existing.rowCount === 0 || existing.rows[0].status !== 1) {
    return fail(res, CODE.NOT_FOUND, '评论不存在', 404)
  }

  // 判断当前用户是不是管理员（普通用户只能删自己的）
  const actor = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId])
  const isAdmin = actor.rows[0] && actor.rows[0].role === 'admin'
  const comment = existing.rows[0]
  if (comment.user_id !== req.userId && !isAdmin) {
    return fail(res, CODE.FORBIDDEN, '无权删除该评论', 403)
  }

  // 事务：软删除评论 + 帖子评论数 -1（用 GREATEST 避免减成负数）
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('UPDATE comments SET status = 0 WHERE id = $1', [commentId])
    await client.query(
      'UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1',
      [comment.post_id]
    )
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return ok(res, null)
})

module.exports = router
