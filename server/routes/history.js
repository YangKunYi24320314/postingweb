// 记录中心 - 浏览记录模块：上报浏览 / 我的浏览记录 / 清空浏览记录。
// 写法照抄 routes/auth.js 的约定：ok/fail 统一返回 + 参数化查询 + 需登录就挂 auth 关卡。
const express = require('express')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth } = require('../middleware/auth')

const router = express.Router()

// ---------- 工具函数 ----------

// 把数据库的蛇形字段，翻译成前端要的驼峰字段（跟 api-protocol 的 Post 结构对齐）。
// 这里只返回列表页要展示的最小字段集，标签(tags)等后续需要再补。
function toHistoryItem(row) {
  return {
    id: row.post_id,
    title: row.title,
    author: { id: row.author_id, nickname: row.nickname },
    viewCount: row.view_count,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    viewedAt: row.viewed_at, // 我是什么时候看的（浏览记录特有字段）
  }
}

// 从 query 里安全解析分页参数，防止传了 "abc" 这类非法值导致 SQL 报错。
function parsePage(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 10))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

// ---------- 接口 ----------

// POST /api/posts/:id/view —— 上报一次浏览（需登录）
router.post('/posts/:id/view', auth, async (req, res) => {
  const postId = parseInt(req.params.id, 10)

  // 参数校验：id 必须是正整数
  if (!Number.isInteger(postId) || postId <= 0) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }

  // 先确认帖子存在且未被删除（软删除的帖子不算）
  const post = await pool.query('SELECT id FROM posts WHERE id = $1 AND is_deleted = false', [
    postId,
  ])
  if (post.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
  }

  // 事务：下面两条写操作必须"要么都成功、要么都不做"，
  // 防止出现"浏览记录加了、但浏览数没加"的半截状态。
  const client = await pool.connect() // 事务需要一个"专属连接"
  try {
    await client.query('BEGIN')

    // 1) 先锁定当前用户与当前帖子的浏览记录，避免并发刷新造成重复加浏览数。
    const history = await client.query(
      'SELECT id FROM histories WHERE user_id = $1 AND post_id = $2 FOR UPDATE',
      [req.userId, postId]
    )

    if (history.rowCount === 0) {
      // 第一次浏览：写入记录，并把帖子总浏览数 +1。
      await client.query('INSERT INTO histories (user_id, post_id) VALUES ($1, $2)', [
        req.userId,
        postId,
      ])
      await client.query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [postId])
    } else {
      // 重复浏览/刷新：只更新最近浏览时间，不重复增加总浏览数。
      await client.query(
        'UPDATE histories SET viewed_at = now(), updated_at = now() WHERE user_id = $1 AND post_id = $2',
        [req.userId, postId]
      )
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK') // 出错就撤销前面已做的修改
    throw err // 抛给 server.js 的统一错误处理，最终返回 500
  } finally {
    client.release() // 用完连接一定要还回连接池
  }

  return ok(res, null)
})

// GET /api/me/history —— 我的浏览记录（需登录，分页，支持 keyword 模糊搜索）
router.get('/me/history', auth, async (req, res) => {
  const { page, pageSize, offset } = parsePage(req.query)
  const keyword = String(req.query.keyword || '').trim()

  // 动态拼接过滤条件：keyword 非空时对「标题/正文/作者昵称」做 ILIKE 模糊匹配
  const conditions = ['h.user_id = $1', 'p.is_deleted = false']
  const params = [req.userId]
  if (keyword) {
    params.push(`%${keyword}%`)
    conditions.push(
      `(p.title ILIKE $${params.length} OR p.content ILIKE $${params.length} OR u.nickname ILIKE $${params.length})`
    )
  }
  const where = conditions.join(' AND ')

  // 总条数：只统计"仍存在"的帖子（软删除的不显示）
  const count = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM histories h
     JOIN posts p ON p.id = h.post_id
     JOIN users u ON u.id = p.user_id
     WHERE ${where}`,
    params
  )
  const total = count.rows[0].total

  // 列表：按"最近浏览"倒序，关联帖子表和作者表
  const list = await pool.query(
    `SELECT p.id::int AS post_id, p.title, p.view_count, p.like_count, p.comment_count, p.created_at,
            u.id::int AS author_id, u.nickname,
            h.viewed_at
     FROM histories h
     JOIN posts p ON p.id = h.post_id
     JOIN users u ON u.id = p.user_id
     WHERE ${where}
     ORDER BY h.viewed_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  )

  return ok(res, {
    list: list.rows.map(toHistoryItem),
    total,
    page,
    pageSize,
  })
})

// DELETE /api/me/history —— 清空浏览记录（需登录）
router.delete('/me/history', auth, async (req, res) => {
  await pool.query('DELETE FROM histories WHERE user_id = $1', [req.userId])
  return ok(res, null)
})

// DELETE /api/me/history/:postId —— 删除单条浏览记录（需登录）
router.delete('/me/history/:postId', auth, async (req, res) => {
  const postId = parseInt(req.params.postId, 10)
  if (!Number.isInteger(postId) || postId <= 0) {
    return fail(res, CODE.PARAM_ERROR, '帖子 id 不合法')
  }
  // 只删"当前用户"对该帖子的那条记录（user_id + post_id 唯一，最多删一条）
  await pool.query('DELETE FROM histories WHERE user_id = $1 AND post_id = $2', [
    req.userId,
    postId,
  ])
  return ok(res, null)
})

module.exports = router
