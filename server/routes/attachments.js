const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const pool = require('../db')
const { ok, fail, CODE } = require('../utils/response')
const { auth } = require('../middleware/auth')
const router = express.Router()

// 确保附件存储目录存在
const uploadDir = path.join(__dirname, '../static/attachments')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// multer 磁盘存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名，保留原始后缀
    const ext = path.extname(file.originalname)
    const uniqueName = Date.now() + '-' + Math.random().toString(36).slice(2) + ext
    cb(null, uniqueName)
  }
})

// 单文件最大100MB，支持视频、文档等
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
})

// 上传附件接口（需登录）
// 接口地址：POST /api/attachments/upload
router.post('/attachments/upload', auth, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return fail(res, CODE.PARAM_ERROR, '未接收到文件')
    }
    try {
      // 中文文件名转码：latin1 → utf8
      const originalFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
  
      // 插入数据库，使用转码后的文件名
      const result = await pool.query(
        `INSERT INTO post_attachments 
         (post_id, original_filename, storage_path, file_size, mime_type)
         VALUES (NULL, $1, $2, $3, $4)
         RETURNING id, original_filename, file_size`,
        [
          originalFilename,  // 这里必须用转码后的变量，不能用 req.file.originalname
          `/static/attachments/${req.file.filename}`,
          req.file.size,
          req.file.mimetype
        ]
      )
      
      return ok(res, result.rows[0])
    } catch (e) {
      // 插入失败则删除磁盘文件，防止垃圾文件
      fs.unlinkSync(req.file.path)
      throw e
    }
  })

// 附件下载接口（公开）
// 接口地址：GET /api/attachments/:id/download
router.get('/attachments/:id/download', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return fail(res, CODE.PARAM_ERROR, '附件id不合法')
  }

  const result = await pool.query(
    'SELECT * FROM post_attachments WHERE id = $1',
    [id]
  )
  if (result.rowCount === 0) {
    return fail(res, CODE.NOT_FOUND, '附件不存在', 404)
  }

  const file = result.rows[0]
  const filePath = path.join(__dirname, '..', file.storage_path)

  if (!fs.existsSync(filePath)) {
    return fail(res, CODE.NOT_FOUND, '文件已损坏', 404)
  }
  // === 修复：中文文件名编码，解决乱码 ===
  const encodedName = encodeURIComponent(file.original_filename)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodedName}`
  )
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream')

  // 以原始文件名触发浏览器下载
  res.download(filePath, file.original_filename, (err) => {
    if (err) console.error('下载失败', err)
  })
})

module.exports = router
