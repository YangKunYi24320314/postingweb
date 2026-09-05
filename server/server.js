// 后端入口：组装中间件 + 自动加载 routes/ 下的所有路由。
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const multer = require('multer')
const path = require('path')
require('dotenv').config()
const { ok, fail, CODE } = require('./utils/response')
const { UPLOAD_DIR } = require('./utils/avatar-upload')

const app = express()
const clientDist = path.join(__dirname, '..', 'client', 'dist')
const legacyUploadDir = path.join(__dirname, 'static')

app.use(express.json({ charset: 'utf-8' }))
app.use(cors())
app.use('/uploads', express.static(UPLOAD_DIR))
app.use('/static', express.static(path.join(__dirname, 'static')))

const legacyUpload = multer({
  storage: multer.diskStorage({
    destination: legacyUploadDir,
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    callback(null, allowed.has(file.mimetype))
  },
})

app.post('/upload', legacyUpload.single('file'), (req, res) => {
  if (!req.file) return fail(res, CODE.PARAM_ERROR, '没有接收到图片')
  return ok(res, { url: `${req.protocol}://${req.get('host')}/static/${req.file.filename}` })
})

app.get('/api/hello', (req, res) => {
  ok(res, { message: 'Hello from backend!' })
})

const routesDir = path.join(__dirname, 'routes')

// ========== 【优先级最高】先加载管理员路由 ==========
const adminRouter = require(path.join(routesDir, 'admin.js'))
app.use('/api/admin', adminRouter)

// ========== 再加载普通业务路由 ==========
fs.readdirSync(routesDir)
  .filter((file) => file.endsWith('.js') && file !== 'admin.js')
  .forEach((file) => {
    const routeModule = require(path.join(routesDir, file))
    app.use('/api', routeModule)
  })

// ========== 最后放 /api 全局 404 兜底 ==========
app.use('/api', (req, res) => {
  fail(res, CODE.NOT_FOUND, '接口不存在', 404)
})

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    if (req.method !== 'GET') return next()
    return res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use((err, req, res, next) => {
  console.error(err)
  if (err.status && err.status < 500) {
    return fail(res, CODE.PARAM_ERROR, '请求格式错误', err.status)
  }
  return fail(res, CODE.SERVER_ERROR, '服务器内部错误', 500)
})

const PORT = Number(process.env.PORT || 3000)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
