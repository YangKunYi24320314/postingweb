const express = require('express')
const pool = require('../db')
const { ok } = require('../utils/response')
const { toCategory, toTag } = require('../utils/catalog')

const router = express.Router()

// 分类按后台配置的顺序返回，标签按名称稳定排序，方便前端展示和缓存。
router.get('/categories', async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, description FROM categories ORDER BY sort_order ASC, id ASC'
  )
  return ok(res, result.rows.map(toCategory))
})

router.get('/tags', async (req, res) => {
  const result = await pool.query('SELECT name FROM tags ORDER BY name ASC')
  return ok(res, result.rows.map(toTag))
})

module.exports = router
