const express = require('express')
const router = express.Router()
const pool = require('../db')
const { auth, authAdmin } = require('../middleware/auth')
const { ok, fail, CODE } = require('../utils/response')

// 连通性测试接口：GET /api/admin/ping
router.get('/ping', (req, res) => {
  res.json({ code: 0, message: 'admin 路由正常' })
})

/**
 * 1. 获取已删除帖子列表（分页）
 * 完整路径：GET /api/admin/posts/deleted
 */
router.get('/posts/deleted', auth, authAdmin, async (req, res) => {
  const page = Number(req.query.page) || 1
  const pageSize = Number(req.query.pageSize) || 10
  const offset = (page - 1) * pageSize

  try {
    const postsResult = await pool.query(`
      SELECT 
        p.id, p.title, p.user_id, p.updated_at,
        u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = true
      ORDER BY p.updated_at DESC
      LIMIT $1 OFFSET $2
    `, [pageSize, offset])

    const totalResult = await pool.query(`
      SELECT COUNT(*) as count FROM posts WHERE is_deleted = true
    `)

    ok(res, {
      list: postsResult.rows,
      total: totalResult.rows[0].count,
      page,
      pageSize
    })
  } catch (err) {
    console.error('[管理员] 查询已删除帖子失败:', err)
    fail(res, CODE.SERVER_ERROR, '查询失败')
  }
})

/**
 * 2. 管理员查看单篇已删除帖子详情
 * 完整路径：GET /api/admin/posts/:id
 */
router.get('/posts/:id', auth, authAdmin, async (req, res) => {
  const postId = Number(req.params.id)
  try {
    const postResult = await pool.query(`
      SELECT 
        p.*,
        u.username as author_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND p.is_deleted = true
    `, [postId])

    if (postResult.rowCount === 0) {
      return fail(res, CODE.NOT_FOUND, '帖子不存在或未删除', 404)
    }

    const attachmentsResult = await pool.query(
      'SELECT * FROM post_attachments WHERE post_id = $1',
      [postId]
    )

    ok(res, { 
      ...postResult.rows[0], 
      attachments: attachmentsResult.rows 
    })
  } catch (err) {
    console.error('[管理员] 查询帖子详情失败:', err)
    fail(res, CODE.SERVER_ERROR, '查询失败')
  }
})

/**
 * 3. 还原已删除帖子
 * 完整路径：PUT /api/admin/posts/:id/restore
 */
router.put('/posts/:id/restore', auth, authAdmin, async (req, res) => {
  const postId = Number(req.params.id)
  try {
    const result = await pool.query(
      'UPDATE posts SET is_deleted = false, updated_at = now() WHERE id = $1 AND is_deleted = true',
      [postId]
    )

    if (result.rowCount === 0) {
      return fail(res, CODE.NOT_FOUND, '帖子不存在或未删除', 404)
    }

    ok(res, null, '还原成功')
  } catch (err) {
    console.error('[管理员] 还原帖子失败:', err)
    fail(res, CODE.SERVER_ERROR, '还原失败')
  }
})

module.exports = router
