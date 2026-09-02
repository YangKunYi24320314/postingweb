// ============================================================
// 后端入口：载入环境变量 → 通用中间件 → 静态资源/上传 → 自动挂载路由 → 统一错误处理。
// 约定：
//   - 全队新功能 = 在 routes/ 放一个文件导出 express.Router()，路径以 / 开头，
//     这里会自动把它挂到 /api 前缀下，【不用改本文件】。
//   - 所有接口返回统一格式 { code, message, data }，code === 0 表示成功。
// ============================================================
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { fail, CODE } = require('./utils/response')

const app = express()

app.use(express.json({ charset: 'utf-8' }))
app.use(cors())

// ============ 静态资源 + 文件上传（保留但规范化） ============
// 注意：上传不属于接口契约（无 file/image 字段），这里仅做规范化，方便后续团队约定扩展。
const UPLOAD_DIR = path.join(__dirname, 'static')

// 访问示例：http://localhost:3000/static/xxx.png
app.use('/static', express.static(UPLOAD_DIR))

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    // 时间戳 + 随机串命名，避免重名覆盖（保留原后缀）
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// POST /api/upload —— 上传文件，统一用 { code, message, data } 返回。
// 返回的 url 是相对路径，前端展示时按需拼接 origin 即可。
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return fail(res, CODE.PARAM_ERROR, '没有接收到文件')
  }
  return res.json({ code: 0, message: 'success', data: { url: `/static/${req.file.filename}` } })
})

// ============ 自动加载 routes/ 下的所有模块并挂到 /api ============
// 每个文件必须导出 express.Router()，否则在这里会报错（方便尽早发现问题）。
const routesDir = path.join(__dirname, 'routes')
fs.readdirSync(routesDir)
  .filter((file) => file.endsWith('.js'))
  .forEach((file) => {
    const router = require(path.join(routesDir, file))
    app.use('/api', router)
  })

// ============ 404：没有匹配到任何路由 ============
app.use((req, res) => {
  fail(res, CODE.NOT_FOUND, '接口不存在', 404)
})

// ============ 统一错误处理：任何 async 异常都落到这里，返回 500 ============
app.use((err, req, res, next) => {
  console.error('❌ 服务器内部错误：', err)
  fail(res, CODE.SERVER_ERROR, '服务器内部错误', 500)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
})
