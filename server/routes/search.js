const express = require('express')
const pool = require('../db')
const { ok } = require('../utils/response')
const { optionalAuth } = require('../middleware/auth')

const router = express.Router()

function parsePage(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(30, Math.max(1, parseInt(query.pageSize, 10) || 10))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function parseKeyword(query) {
  return String(query.keyword || query.q || '').trim()
}

function parsePostRank(query) {
  const allowed = new Set(['all', 'latest', 'hot'])
  return allowed.has(query.rank) ? query.rank : 'all'
}

function toPost(row) {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    content: row.content,
    user: { id: row.user_id, nickname: row.nickname, avatarUrl: row.user_avatar_url || null },
    viewCount: row.view_count,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    commentCount: row.comment_count,
    isLiked: row.is_liked,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    tags: row.tags || [],
    attachments: row.attachments || [],
  }
}

function toUser(row, currentUserId) {
  let friendshipStatus = 'none'
  if (currentUserId && Number(row.id) === currentUserId) {
    friendshipStatus = 'self'
  } else if (row.friendship_status === 'accepted') {
    friendshipStatus = 'friends'
  } else if (row.friendship_status === 'pending' && Number(row.requester_id) === currentUserId) {
    friendshipStatus = 'pending_sent'
  } else if (row.friendship_status === 'pending') {
    friendshipStatus = 'pending_received'
  }

  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    postCount: Number(row.post_count || 0),
    friendshipStatus,
  }
}

async function getTagsByPostIds(postIds) {
  if (!postIds.length) return {}
  const result = await pool.query(
    `SELECT pt.post_id::int AS post_id, t.name
     FROM post_tags pt
     JOIN tags t ON t.id = pt.tag_id
     WHERE pt.post_id = ANY($1::int[])
     ORDER BY t.name`,
    [postIds]
  )
  const map = {}
  result.rows.forEach((row) => {
    if (!map[row.post_id]) map[row.post_id] = []
    map[row.post_id].push(row.name)
  })
  return map
}

// 批量查一组帖子 id 的图片/视频附件（每帖最多 3 个，供卡片预览）
async function getMediaByPostIds(postIds) {
  if (!postIds.length) return {}
  const result = await pool.query(
    `SELECT pa.post_id::int AS post_id, pa.id, pa.file_path, pa.mime_type, pa.original_filename
     FROM post_attachments pa
     WHERE pa.post_id = ANY($1::int[])
       AND (pa.mime_type LIKE 'image/%' OR pa.mime_type LIKE 'video/%')
     ORDER BY pa.post_id, pa.id`,
    [postIds]
  )
  const map = {}
  result.rows.forEach((row) => {
    if (!map[row.post_id]) map[row.post_id] = []
    if (map[row.post_id].length < 3) {
      map[row.post_id].push({
        id: row.id,
        file_path: row.file_path,
        mime_type: row.mime_type,
        original_filename: row.original_filename,
      })
    }
  })
  return map
}

router.get('/search/posts', optionalAuth, async (req, res) => {
  const keyword = parseKeyword(req.query)
  const { page, pageSize, offset } = parsePage(req.query)
  const rank = parsePostRank(req.query)
  const userId = Number(req.userId) || 0

  // whereParams 只给 WHERE 子句用；关键词存在时 $1 = keyword
  const conditions = ['p.is_deleted = false', 'p.status = 1']
  const whereParams = []

  let orderBy
  if (keyword) {
    whereParams.push(`%${keyword}%`)
    conditions.push(`(
      p.title ILIKE $1
      OR p.content ILIKE $1
      OR EXISTS (
        SELECT 1
        FROM post_tags spt
        JOIN tags st ON st.id = spt.tag_id
        WHERE spt.post_id = p.id
          AND st.name ILIKE $1
      )
    )`)
    orderBy =
      rank === 'hot'
        ? '(p.view_count * 1 + p.like_count * 3 + p.favorite_count * 4 + p.comment_count * 5) DESC, p.created_at DESC'
        : rank === 'latest'
          ? 'p.created_at DESC'
          : `(CASE
               WHEN p.title ILIKE $1 THEN 4
               WHEN EXISTS (
                 SELECT 1
                   FROM post_tags rpt
                   JOIN tags rt ON rt.id = rpt.tag_id
                  WHERE rpt.post_id = p.id
                    AND rt.name ILIKE $1
               ) THEN 3
               WHEN p.content ILIKE $1 THEN 2
               ELSE 1
             END) DESC, p.created_at DESC`
  } else {
    // 无关键词：返回全部内容，rank=all 等同 latest
    orderBy =
      rank === 'hot'
        ? '(p.view_count * 1 + p.like_count * 3 + p.favorite_count * 4 + p.comment_count * 5) DESC, p.created_at DESC'
        : 'p.created_at DESC'
  }

  const where = conditions.join(' AND ')
  const uid = whereParams.length + 1 // userId 的参数位置

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total FROM posts p WHERE ${where}`,
    whereParams
  )
  const total = count.rows[0].total

  const listResult = await pool.query(
    `SELECT p.id::int, p.user_id::int, p.title, p.content, p.category_id::int,
            p.view_count, p.like_count, p.favorite_count, p.comment_count, p.created_at,
            u.nickname,
            u.avatar_url AS user_avatar_url,
            c.name AS category_name,
            EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${uid}) AS is_liked,
            EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = $${uid}) AS is_favorite
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where}
      ORDER BY ${orderBy}, p.id DESC
      LIMIT $${uid + 1} OFFSET $${uid + 2}`,
    [...whereParams, userId, pageSize, offset]
  )

  const tagsMap = await getTagsByPostIds(listResult.rows.map((row) => row.id))
  const mediaMap = await getMediaByPostIds(listResult.rows.map((row) => row.id))
  const list = listResult.rows.map((row) => {
    row.tags = tagsMap[row.id] || []
    row.attachments = mediaMap[row.id] || []
    return toPost(row)
  })

  return ok(res, { list, total, page, pageSize })
})

router.get('/search/users', optionalAuth, async (req, res) => {
  const keyword = parseKeyword(req.query)
  const { page, pageSize, offset } = parsePage(req.query)
  const currentUserId = Number(req.userId) || 0

  // whereParams 只给 WHERE 子句用；关键词存在时 $1 = keyword
  const conditions = ['u.status = 1']
  const whereParams = []

  if (keyword) {
    whereParams.push(`%${keyword}%`)
    conditions.push(`(u.username ILIKE $1 OR u.nickname ILIKE $1 OR u.bio ILIKE $1)`)
  }

  const where = conditions.join(' AND ')
  const uid = whereParams.length + 1 // currentUserId 的参数位置

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total FROM users u WHERE ${where}`,
    whereParams
  )
  const total = count.rows[0].total

  const listResult = await pool.query(
    `SELECT u.id::int, u.username, u.nickname, u.avatar_url, u.bio,
            COUNT(p.id)::int AS post_count,
            f.status AS friendship_status,
            f.requester_id::int AS requester_id
       FROM users u
       LEFT JOIN posts p
         ON p.user_id = u.id AND p.is_deleted = false AND p.status = 1
       LEFT JOIN LATERAL (
         SELECT requester_id, status
         FROM friendships
         WHERE (requester_id = $${uid} AND addressee_id = u.id)
            OR (requester_id = u.id AND addressee_id = $${uid})
         ORDER BY created_at DESC
         LIMIT 1
       ) f ON true
      WHERE ${where}
      GROUP BY u.id, u.username, u.nickname, u.avatar_url, u.bio, f.status, f.requester_id
      ORDER BY post_count DESC, u.id DESC
      LIMIT $${uid + 1} OFFSET $${uid + 2}`,
    [...whereParams, currentUserId, pageSize, offset]
  )

  return ok(res, {
    list: listResult.rows.map((row) => toUser(row, currentUserId)),
    total,
    page,
    pageSize,
  })
})

router.get('/search/hot', async (req, res) => {
  const result = await pool.query(
    `SELECT t.name AS keyword, COUNT(pt.post_id)::int AS score
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
      GROUP BY t.id, t.name
      ORDER BY score DESC, t.id ASC
      LIMIT 10`
  )

  return ok(res, result.rows)
})

router.get('/search/suggestions', optionalAuth, async (req, res) => {
  const currentUserId = Number(req.userId) || 0

  if (currentUserId) {
    const preference = await pool.query(
      `SELECT t.name AS keyword, SUM(source.weight)::int AS score
         FROM (
           SELECT h.post_id, 1 AS weight
             FROM histories h
            WHERE h.user_id = $1
           UNION ALL
           SELECT pl.post_id, 3 AS weight
             FROM post_likes pl
            WHERE pl.user_id = $1
           UNION ALL
           SELECT f.post_id, 4 AS weight
             FROM favorites f
            WHERE f.user_id = $1
         ) source
         JOIN post_tags pt ON pt.post_id = source.post_id
         JOIN tags t ON t.id = pt.tag_id
        GROUP BY t.id, t.name
        ORDER BY score DESC, t.id ASC
        LIMIT 8`,
      [currentUserId]
    )

    if (preference.rowCount > 0) {
      return ok(res, preference.rows)
    }
  }

  const fallback = await pool.query(
    `SELECT t.name AS keyword, COUNT(pt.post_id)::int AS score
       FROM tags t
       LEFT JOIN post_tags pt ON pt.tag_id = t.id
      GROUP BY t.id, t.name
      ORDER BY score DESC, t.id ASC
      LIMIT 8`
  )

  return ok(res, fallback.rows)
})

module.exports = router
