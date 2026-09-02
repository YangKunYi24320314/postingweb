// 帖子模块：列表（筛选/搜索/排序/分页） / 发布 / 详情 / 编辑 / 删除。
// 写法对齐 auth.js：ok/fail 统一返回、参数化查询 $1 $2、需要登录就挂 auth。
// 路由路径以 / 开头（如 /posts），server.js 会自动挂到 /api 前缀下。
const express = require('express')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth, optionalAuth } = require('../middleware/auth')

const router = express.Router()

// ---------- 基础工具 ----------

// 从 query 安全解析分页参数，防止传 "abc" 这类非法值导致 SQL 报错。
function parsePage(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function isPositiveId(value) {
  return Number.isInteger(value) && value > 0
}

// ---------- 帖子 → 前端结构的翻译函数 ----------

// 单帖子的字段翻译（列表项不需要 content，详情需要）
function toPost(row, isDetail = false) {
  const post = {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    user: { id: row.user_id, nickname: row.nickname, avatarUrl: row.user_avatar_url || null },
    viewCount: row.view_count,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    commentCount: row.comment_count,
    isPinned: row.is_pinned,
    isLiked: row.is_liked,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
  }
  if (isDetail) {
    post.content = row.content
  }
  // tags 由调用方额外查好后塞进来
  post.tags = row.tags || []
  return post
}

// 批量查询一组帖子 id 的标签（返回 { postId: [tagName, ...] }）
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

// 校验传来的标签数组，返回去重后的字符串数组（最多 10 个）
function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))].slice(0, 10)
}

// 把一串标签名 upsert 进 tags 表并绑定到帖子（在事务内调用）
// 技巧：ON CONFLICT DO UPDATE 能让"已存在"和"新建"两种情况都返回 id。
async function bindTags(client, postId, tagNames) {
  for (const name of tagNames) {
    const tag = await client.query(
      `INSERT INTO tags (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name]
    )
    await client.query(
      'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, tag.rows[0].id]
    )
  }
}

// 查单帖（带作者、是否被我点赞/收藏），isDetail 控制是否要 content
async function findPost(postId, userId, isDetail) {
  const result = await pool.query(
    `SELECT p.id::int, p.user_id::int, p.title, p.content, p.category_id::int,
            p.view_count, p.like_count, p.favorite_count, p.comment_count, p.is_pinned, p.created_at,
            u.id::int AS user_id, u.nickname AS user_nickname, u.avatar_url AS user_avatar_url,
            EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS is_liked,
            EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = $2) AS is_favorite
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1 AND p.is_deleted = false`,
    [postId, userId || 0]
  )
  const row = result.rows[0]
  if (!row) return null
  const tags = await getTagsByPostIds([postId])
  row.tags = tags[postId] || []
  return toPost(row, isDetail)
}

// ---------- 接口 ----------

// GET /api/posts —— 帖子列表（公开，可筛选/搜索/排序/分页）
router.get('/posts', optionalAuth, async (req, res) => {
  const { page, pageSize, offset } = parsePage(req.query)
  const { categoryId, tag, keyword, sort } = req.query
  const userId = req.userId || 0

  const conditions = ['p.is_deleted = false', 'p.status = 1']
  const params = []

  if (categoryId !== undefined && categoryId !== '') {
    const cat = Number(categoryId)
    if (!isPositiveId(cat)) {
      return fail(res, CODE.PARAM_ERROR, '分类 id 不合法')
    }
    params.push(cat)
    conditions.push(`p.category_id = $${params.length}`)
  }

  if (tag !== undefined && tag !== '') {
    params.push(String(tag))
    conditions.push(
      `EXISTS(SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.name = $${params.length})`
    )
  }

  if (keyword !== undefined && keyword !== '') {
    params.push(`%${String(keyword).trim()}%`)
    conditions.push(`(p.title ILIKE $${params.length} OR p.content ILIKE $${params.length})`)
  }

  const where = conditions.join(' AND ')

  // 排序：new 按发布时间倒序；hot 按热度（点赞/评论/收藏）倒序
  const orderBy =
    sort === 'hot'
      ? 'p.like_count DESC, p.comment_count DESC, p.favorite_count DESC, p.created_at DESC'
      : 'p.created_at DESC, p.id DESC'

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM posts p WHERE ${where}`,
    params
  )
  const total = countResult.rows[0].total

  // 注意：这里 userId 要作为最后一个参数传给 EXISTS 子查询
  const listResult = await pool.query(
    `SELECT p.id::int, p.user_id::int, p.title, p.category_id::int,
            p.view_count, p.like_count, p.favorite_count, p.comment_count, p.is_pinned, p.created_at,
            u.id::int AS user_id, u.nickname, u.avatar_url AS user_avatar_url,
            EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS is_liked,
            EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = $1) AS is_favorite
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${params.length + 2} OFFSET $${params.length + 3}`,
    [userId, ...params, pageSize, offset]
  )

  const tagsMap = await getTagsByPostIds(listResult.rows.map((r) => r.id))
  const list = listResult.rows.map((row) => {
    row.tags = tagsMap[row.id] || []
    return toPost(row)
  })

  return ok(res, { list, total, page, pageSize })
})

// GET /api/posts/:id —— 帖子详情（公开，需登录场景下带 isLiked/isFavorite）
router.get('/posts/:id', optionalAuth, async (req, res) => {
  const postId = Number(req.params.id)
  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }

  const post = await findPost(postId, req.userId, true)
  if (!post) {
    return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
  }
  return ok(res, post)
})

// POST /api/posts —— 发布帖子（需登录）
router.post('/posts', auth, async (req, res) => {
  const { title, content, categoryId, tags } = req.body || {}
  if (!title || !title.trim()) {
    return fail(res, CODE.PARAM_ERROR, '标题不能为空')
  }
  if (!content || !content.trim()) {
    return fail(res, CODE.PARAM_ERROR, '正文不能为空')
  }
  if (title.trim().length > 200) {
    return fail(res, CODE.PARAM_ERROR, '标题不能超过 200 字')
  }

  // 校验分类（可选，传了就必须存在）
  const catId = categoryId ? Number(categoryId) : null
  if (catId !== null) {
    if (!isPositiveId(catId)) {
      return fail(res, CODE.PARAM_ERROR, '分类 id 不合法')
    }
    const cat = await pool.query('SELECT id FROM categories WHERE id = $1', [catId])
    if (cat.rowCount === 0) {
      return fail(res, CODE.PARAM_ERROR, '分类不存在')
    }
  }

  const tagNames = normalizeTags(tags)

  const client = await pool.connect()
  let postId
  try {
    await client.query('BEGIN')
    const inserted = await client.query(
      `INSERT INTO posts (user_id, category_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.userId, catId, title.trim(), content.trim()]
    )
    postId = inserted.rows[0].id
    await bindTags(client, postId, tagNames)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const post = await findPost(postId, req.userId, true)
  return ok(res, post)
})

// PUT /api/posts/:id —— 编辑帖子（需登录，仅作者）
router.put('/posts/:id', auth, async (req, res) => {
  const postId = Number(req.params.id)
  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }

  const { title, content, categoryId, tags } = req.body || {}
  if (title && !title.trim()) {
    return fail(res, CODE.PARAM_ERROR, '标题不能为空')
  }
  if (content && !content.trim()) {
    return fail(res, CODE.PARAM_ERROR, '正文不能为空')
  }

  const existing = await pool.query('SELECT id, user_id, is_deleted FROM posts WHERE id = $1', [
    postId,
  ])
  if (existing.rowCount === 0 || existing.rows[0].is_deleted) {
    return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
  }
  if (existing.rows[0].user_id !== req.userId) {
    return fail(res, CODE.FORBIDDEN, '只能编辑自己的帖子', 403)
  }

  // 分类校验（可选）
  const catId = categoryId !== undefined && categoryId !== null ? Number(categoryId) : null
  if (catId !== null) {
    if (!isPositiveId(catId)) {
      return fail(res, CODE.PARAM_ERROR, '分类 id 不合法')
    }
    const cat = await pool.query('SELECT id FROM categories WHERE id = $1', [catId])
    if (cat.rowCount === 0) {
      return fail(res, CODE.PARAM_ERROR, '分类不存在')
    }
  }

  // tags 传了才更新（空数组表示清空标签）
  const tagNames = Array.isArray(tags) ? normalizeTags(tags) : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'UPDATE posts SET title = COALESCE($1, title), content = COALESCE($2, content), category_id = $3, updated_at = now() WHERE id = $4',
      [title ? title.trim() : null, content ? content.trim() : null, catId, postId]
    )
    if (tagNames !== null) {
      await client.query('DELETE FROM post_tags WHERE post_id = $1', [postId])
      await bindTags(client, postId, tagNames)
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const post = await findPost(postId, req.userId, true)
  return ok(res, post)
})

// DELETE /api/posts/:id —— 删除帖子（软删除，仅作者或管理员）
router.delete('/posts/:id', auth, async (req, res) => {
  const postId = Number(req.params.id)
  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }

  const existing = await pool.query('SELECT id, user_id, is_deleted FROM posts WHERE id = $1', [
    postId,
  ])
  if (existing.rowCount === 0 || existing.rows[0].is_deleted) {
    return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
  }

  // 管理员可直接删；普通用户只能删自己的（跟评论模块一致）
  const actor = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId])
  const isAdmin = actor.rows[0] && actor.rows[0].role === 'admin'
  if (existing.rows[0].user_id !== req.userId && !isAdmin) {
    return fail(res, CODE.FORBIDDEN, '无权删除该帖子', 403)
  }

  await pool.query('UPDATE posts SET is_deleted = true, updated_at = now() WHERE id = $1', [postId])
  return ok(res, null)
})

module.exports = router
