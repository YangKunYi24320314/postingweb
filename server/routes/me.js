// 记录中心 - 我的内容模块：我发布的帖子 / 我收藏的帖子 / 我点赞的帖子。
// 三个接口结构几乎一样：都是"关联表/主表 JOIN 帖子 + 作者 + 分页"，
// 所以共用同一个字段翻译函数 toPostItem。
const express = require('express')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth } = require('../middleware/auth')

const router = express.Router()

// 把数据库行翻译成前端要的帖子列表项（跟 api-protocol 的 Post 结构对齐，字段用驼峰）。
function toPostItem(row) {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    author: { id: row.user_id, nickname: row.nickname },
    viewCount: row.view_count,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    favoritedAt: row.favorited_at, // 只有"收藏列表"的查询里有这个字段
    likedAt: row.liked_at,         // 只有"点赞列表"的查询里有这个字段
  }
  // 注：其余查询没有 favorited_at/liked_at 列，值是 undefined，JSON.stringify 会自动省略它。
}

// 解析分页参数（和 history.js 一致）
function parsePage(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

// GET /api/me/posts —— 我发布的帖子（需登录，分页）
router.get('/me/posts', auth, async (req, res) => {
  const { page, pageSize, offset } = parsePage(req.query)

  const count = await pool.query(
    'SELECT COUNT(*)::int AS total FROM posts WHERE user_id = $1 AND is_deleted = false',
    [req.userId]
  )
  const total = count.rows[0].total

  const list = await pool.query(
    `SELECT p.id::int, p.title, p.category_id::int, p.view_count, p.like_count,
            p.favorite_count, p.comment_count, p.created_at,
            u.id::int AS user_id, u.nickname
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1 AND p.is_deleted = false
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.userId, pageSize, offset]
  )

  return ok(res, { list: list.rows.map(toPostItem), total, page, pageSize })
})

// GET /api/me/favorites —— 我收藏的帖子（需登录，分页）
router.get('/me/favorites', auth, async (req, res) => {
  const { page, pageSize, offset } = parsePage(req.query)

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM favorites f
     JOIN posts p ON p.id = f.post_id
     WHERE f.user_id = $1 AND p.is_deleted = false`,
    [req.userId]
  )
  const total = count.rows[0].total

  const list = await pool.query(
    `SELECT p.id::int, p.title, p.category_id::int, p.view_count, p.like_count,
            p.favorite_count, p.comment_count, p.created_at,
            u.id::int AS user_id, u.nickname,
            f.created_at AS favorited_at
     FROM favorites f
     JOIN posts p ON p.id = f.post_id
     JOIN users u ON u.id = p.user_id
     WHERE f.user_id = $1 AND p.is_deleted = false
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.userId, pageSize, offset]
  )

  return ok(res, { list: list.rows.map(toPostItem), total, page, pageSize })
})

// GET /api/me/likes —— 我点赞的帖子（需登录，分页）
router.get('/me/likes', auth, async (req, res) => {
  const { page, pageSize, offset } = parsePage(req.query)

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM post_likes pl
     JOIN posts p ON p.id = pl.post_id
     WHERE pl.user_id = $1 AND p.is_deleted = false`,
    [req.userId]
  )
  const total = count.rows[0].total

  const list = await pool.query(
    `SELECT p.id::int, p.title, p.category_id::int, p.view_count, p.like_count,
            p.favorite_count, p.comment_count, p.created_at,
            u.id::int AS user_id, u.nickname,
            pl.created_at AS liked_at
     FROM post_likes pl
     JOIN posts p ON p.id = pl.post_id
     JOIN users u ON u.id = p.user_id
     WHERE pl.user_id = $1 AND p.is_deleted = false
     ORDER BY pl.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.userId, pageSize, offset]
  )

  return ok(res, { list: list.rows.map(toPostItem), total, page, pageSize })
})

module.exports = router