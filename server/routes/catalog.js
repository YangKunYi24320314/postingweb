// 分类 + 标签：都是只读的静态字典，给发布/筛选帖子用。
// 写法对齐 auth.js：ok/fail 统一返回 + 参数化查询。
const express = require('express')
const pool = require('../db')
const { ok } = require('../utils/response')

const router = express.Router()

// GET /api/categories —— 分类列表（公开，按 sort_order 排序）
router.get('/categories', async (req, res) => {
  const result = await pool.query(
    'SELECT id::int, name, description, sort_order FROM categories ORDER BY sort_order ASC, id ASC'
  )
  // 字段转驼峰，跟前端约定对齐
  const data = result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
  }))
  return ok(res, data)
})

// GET /api/tags —— 标签列表（公开，返回标签名字符串数组）
router.get('/tags', async (req, res) => {
  const result = await pool.query('SELECT name FROM tags ORDER BY id ASC')
  return ok(
    res,
    result.rows.map((row) => row.name)
  )
})

module.exports = router
