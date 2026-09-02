// 后端入口：组装中间件 + 挂载各模块路由。
// 每个功能模块一个文件，放在 routes/ 里，在这里 app.use 挂载即可。
const express = require('express')
const cors = require('cors')
require('dotenv').config()

const { ok, fail, CODE } = require('./utils/response')
const authRoutes = require('./routes/auth')
const commentRoutes = require('./routes/comments')

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

// 评论路由：/api/posts/:id/comments 与 /api/comments/:id（路径自带前缀，挂在 /api 下）
app.use('/api', commentRoutes)

// 没匹配到任何路由 → 404
app.use((req, res) => {
  fail(res, CODE.NOT_FOUND, '接口不存在', 404)
})

// 统一错误处理：任何 async 路由抛错都会走到这里（Express 5 自动捕获）
app.use((err, req, res, next) => {
  console.error(err)
  // body-parser 解析失败（如 JSON 格式错）属于客户端问题，返回 4xx 而不是 500
  if (err.status && err.status < 500) {
    return fail(res, CODE.PARAM_ERROR, '请求格式错误', err.status)
  }
  fail(res, CODE.SERVER_ERROR, '服务器内部错误', 500)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
