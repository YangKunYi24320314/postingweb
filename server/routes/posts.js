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

function parseRank(query) {
  const raw = query.rank || query.sort || 'latest'
  const values = Array.isArray(raw) ? raw : String(raw).split(',')
  const rank = [...new Set(values.map((item) => String(item).trim()).filter(Boolean))].map((item) =>
    item === 'new' ? 'latest' : item
  )
  const allowed = new Set(['latest', 'hot', 'recommend'])
  if (rank.some((item) => !allowed.has(item))) {
    return { error: true }
  }
  return { rank: rank.length ? rank : ['latest'] }
}

function buildPostFilters(query, startIndex = 1) {
  const { categoryId, tag, keyword } = query
  const conditions = ['p.is_deleted = false', 'p.status = 1']
  const params = []

  if (categoryId !== undefined && categoryId !== '') {
    const cat = Number(categoryId)
    if (!isPositiveId(cat)) {
      return { error: '分类 id 不合法' }
    }
    params.push(cat)
    conditions.push(`p.category_id = $${startIndex + params.length - 1}`)
  }

  if (tag !== undefined && tag !== '') {
    params.push(String(tag).trim())
    conditions.push(
      `EXISTS(SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id AND t.name = $${startIndex + params.length - 1})`
    )
  }

  if (keyword !== undefined && keyword !== '') {
    params.push(`%${String(keyword).trim()}%`)
    conditions.push(
      `(p.title ILIKE $${startIndex + params.length - 1}
        OR p.content ILIKE $${startIndex + params.length - 1}
        OR EXISTS(
          SELECT 1
          FROM post_tags keyword_pt
          JOIN tags keyword_t ON keyword_t.id = keyword_pt.tag_id
          WHERE keyword_pt.post_id = p.id
            AND keyword_t.name ILIKE $${startIndex + params.length - 1}
          ))`
    )
  }

  return { where: conditions.join(' AND '), params }
}

function buildRankOrder(rank) {
  const scores = []
  const hotScore = '(p.view_count * 1 + p.like_count * 3 + p.favorite_count * 4 + p.comment_count * 5)'

  if (rank.includes('latest')) {
    scores.push('(100 / (EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 + 2)) * 2')
  }
  if (rank.includes('hot')) {
    scores.push(hotScore)
  }
  if (rank.includes('recommend')) {
    scores.push(
      `(CASE WHEN ps.preference_count > 0 THEN COALESCE(pref.recommend_score, 0) * 3 ELSE ${hotScore} * 0.5 END)`
    )
  }

  return `${scores.join(' + ')} DESC, p.created_at DESC, p.id DESC`
}

function decayWeight(timeExpression) {
  const days = `EXTRACT(EPOCH FROM (now() - ${timeExpression})) / 86400`
  return `CASE
    WHEN ${days} < 1 THEN 1.0
    WHEN ${days} < 5 THEN 0.7
    WHEN ${days} < 14 THEN 0.4
    WHEN ${days} < 30 THEN 0.2
    ELSE 0
  END`
}

// ---------- 帖子 → 前端结构的翻译函数 ----------
// 单帖子的字段翻译（列表项不需要 content，详情需要）
function toPost(row, isDetail = false) {
  const post = {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    content: row.content, // 列表与详情都返回正文（帖子广场卡片做 3 行预览）
    user: { id: row.user_id, nickname: row.nickname, avatarUrl: row.user_avatar_url || null },
    viewCount: row.view_count,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    commentCount: row.comment_count,
    isPinned: row.is_pinned,
    isLiked: row.is_liked,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    isDeleted: row.is_deleted, // 新增：返回帖子删除状态，供前端判断显示还原按钮
    attachments: row.attachments || [],
  }
  // 正文现在统一返回，isDetail 参数仅保留以兼容调用方
  void isDetail
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

// 批量查一组帖子 id 的图片/视频附件（每帖最多 3 个，供帖子广场卡片预览）
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

// === 新增：事务内绑定附件到帖子 ===
async function bindAttachments(client, postId, attachmentIds) {
  if (!Array.isArray(attachmentIds) || !attachmentIds.length) return
  for (const attachId of attachmentIds) {
    await client.query(
      'UPDATE post_attachments SET post_id = $1 WHERE id = $2 AND post_id IS NULL',
      [postId, attachId]
    )
  }
}

// 查单帖（带作者、是否被我点赞/收藏），isDetail 控制是否要 content
// 新增 isAdmin 参数：管理员可穿透 is_deleted 限制，查看已删除帖子
async function findPost(postId, userId, isDetail, isAdmin = false) {
  // 管理员跳过删除过滤，普通用户仅能查看未删除帖子
  const deleteCondition = isAdmin ? '' : 'AND p.is_deleted = false'

  const result = await pool.query(
    `SELECT p.id::int, p.user_id::int, p.title, p.content, p.category_id::int,
        p.view_count, p.like_count, p.favorite_count, p.comment_count, p.is_pinned, p.created_at, p.is_deleted,
        u.id::int AS user_id, u.nickname, u.avatar_url AS user_avatar_url,
        EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) AS is_liked,
        EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = $2) AS is_favorite
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1 ${deleteCondition}`,
    [postId, userId || 0]
  )
  const row = result.rows[0]
  if (!row) return null

  const tags = await getTagsByPostIds([postId])
  row.tags = tags[postId] || []

  // 附件查询保持原有逻辑不变
  const attachResult = await pool.query(
    'SELECT id, original_filename, file_path, file_size, mime_type FROM post_attachments WHERE post_id = $1 ORDER BY id',
    [postId]
  )
  row.attachments = attachResult.rows

  return toPost(row, isDetail)
}

// ---------- 接口 ----------
// GET /api/posts —— 帖子列表（公开，可筛选/搜索/排序/分页）
router.get('/posts', optionalAuth, async (req, res) => {
  const { page, pageSize, offset } = parsePage(req.query)
  const userId = parseInt(req.userId, 10) || 0
  const { rank, error: rankError } = parseRank(req.query)

  if (rankError) {
    return fail(res, CODE.PARAM_ERROR, '排序参数不合法')
  }
  if (rank.includes('recommend') && !userId) {
    return fail(res, CODE.UNAUTHORIZED, '请先登录后查看猜你喜欢', 401)
  }

  const countFilter = buildPostFilters(req.query)
  if (countFilter.error) {
    return fail(res, CODE.PARAM_ERROR, countFilter.error)
  }

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM posts p WHERE ${countFilter.where}`,
    countFilter.params
  )
  const total = countResult.rows[0].total

  const listFilter = buildPostFilters(req.query, 2)
  const orderBy = buildRankOrder(rank)

  const preferenceSql = rank.includes('recommend')
    ? `
      WITH user_preferences AS (
        SELECT behavior_tags.tag_id, SUM(behavior_tags.weight)::numeric AS weight
        FROM (
          SELECT pt.tag_id, 1 * ${decayWeight('h.viewed_at')} AS weight
          FROM histories h
          JOIN post_tags pt ON pt.post_id = h.post_id
          WHERE h.user_id = $1
          UNION ALL
          SELECT pt.tag_id, 3 * ${decayWeight('pl.created_at')} AS weight
          FROM post_likes pl
          JOIN post_tags pt ON pt.post_id = pl.post_id
          WHERE pl.user_id = $1
          UNION ALL
          SELECT pt.tag_id, 4 * ${decayWeight('f.created_at')} AS weight
          FROM favorites f
          JOIN post_tags pt ON pt.post_id = f.post_id
          WHERE f.user_id = $1
          ) behavior_tags
        WHERE behavior_tags.weight > 0
        GROUP BY behavior_tags.tag_id
        ),
        preference_summary AS (
          SELECT COUNT(*)::int AS preference_count FROM user_preferences
        )
    `
    : ''

  const preferenceJoin = rank.includes('recommend')
    ? `
      CROSS JOIN preference_summary ps
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(up.weight), 0)::numeric AS recommend_score
        FROM post_tags pt
        JOIN user_preferences up ON up.tag_id = pt.tag_id
        WHERE pt.post_id = p.id
        ) pref ON true
    `
    : 'LEFT JOIN LATERAL (SELECT 0::int AS recommend_score) pref ON true'

  const listResult = await pool.query(
    `${preferenceSql}
     SELECT p.id::int, p.user_id::int, p.title, p.content, p.category_id::int,
        p.view_count, p.like_count, p.favorite_count, p.comment_count, p.is_pinned, p.created_at,
        u.id::int AS user_id, u.nickname, u.avatar_url AS user_avatar_url,
        c.name AS category_name,
        EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1::int) AS is_liked,
        EXISTS(SELECT 1 FROM favorites f WHERE f.post_id = p.id AND f.user_id = $1::int) AS is_favorite
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN categories c ON p.category_id = c.id
     ${preferenceJoin}
     WHERE ${listFilter.where}
     ORDER BY ${orderBy}
     LIMIT $${listFilter.params.length + 2} OFFSET $${listFilter.params.length + 3}`,
    [userId, ...listFilter.params, pageSize, offset]
  )

  const tagsMap = await getTagsByPostIds(listResult.rows.map((r) => r.id))
  const mediaMap = await getMediaByPostIds(listResult.rows.map((r) => r.id))
  const list = listResult.rows.map((row) => {
    row.tags = tagsMap[row.id] || []
    row.attachments = mediaMap[row.id] || []
    return toPost(row)
  })

  return ok(res, { list, total, page, pageSize })
})

// GET /api/posts/:id —— 帖子详情（公开，需登录场景下带 isLiked/isFavorite）
// 管理员可查看已删除的帖子
router.get('/posts/:id', optionalAuth, async (req, res) => {
  const postId = Number(req.params.id)
  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }
  // 判断当前登录用户是否为管理员
  const isAdmin = req.user && req.user.role === 'admin'
  const post = await findPost(postId, req.userId, true, isAdmin)
  if (!post) {
    return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
  }
  return ok(res, post)
})

// POST /api/posts —— 发布帖子（需登录）
router.post('/posts', auth, async (req, res) => {
  // === 新增：接收 attachmentIds 参数 ===
  const { title, content, categoryId, tags, attachmentIds } = req.body || {}

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
    // === 新增：绑定上传好的附件到帖子 ===
    await bindAttachments(client, postId, attachmentIds)

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

  // === 新增：接收 attachmentIds 参数 ===
  const { title, content, categoryId, tags, attachmentIds } = req.body || {}

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

    // === 新增：编辑时传了附件ID就重新绑定 ===
    if (Array.isArray(attachmentIds)) {
      await client.query('DELETE FROM post_attachments WHERE post_id = $1', [postId])
      await bindAttachments(client, postId, attachmentIds)
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

  // 权限校验：作者本人 或 管理员
  // req.user.role 由 auth 中间件解析注入，无需重复查库
  const isAuthor = existing.rows[0].user_id === req.userId
  const isAdmin = req.user?.role === 'admin'

  if (!isAuthor && !isAdmin) {
    return fail(res, CODE.FORBIDDEN, '无权删除该帖子', 403)
  }

  await pool.query('UPDATE posts SET is_deleted = true, updated_at = now() WHERE id = $1', [postId])
  return ok(res, null)
})

module.exports = router
