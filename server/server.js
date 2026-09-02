// 后端入口：组装中间件 + 挂载各模块路由。
// 每个功能模块一个文件，放在 routes/ 里，在这里 app.use 挂载即可。
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const { ok, fail, CODE } = require('./utils/response')
const authRoutes = require('./routes/auth')
const historyRoutes = require('./routes/history')
const meRoutes = require('./routes/me')

const app = express()

// 让服务器能解析 JSON 请求体、允许前端跨域访问
app.use(express.json())
app.use(cors())

// 简单连通性测试
app.get('/api/hello', (req, res) => {
  ok(res, { message: 'Hello from backend!' })
})

// 挂载各模块路由：/api/auth/...
app.use('/api/auth', authRoutes)
app.use('/api', historyRoutes)
app.use('/api', meRoutes)

// 没匹配到任何路由 → 404
app.use((req, res) => {
  fail(res, CODE.NOT_FOUND, '接口不存在', 404)
})

// 统一错误处理：任何 async 路由抛错都会走到这里（Express 5 自动捕获）
app.use((err, req, res, next) => {
  console.error(err)
  fail(res, CODE.SERVER_ERROR, '服务器内部错误', 500)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
