// 后端入口：组装中间件 + 自动加载 routes/ 下的所有路由。
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const { ok, fail, CODE } = require('./utils/response')

const app = express()

// 让服务器能解析 JSON 请求体、允许前端跨域访问
app.use(express.json())
app.use(cors())

// 简单连通性测试
app.get('/api/hello', (req, res) => {
  ok(res, { message: 'Hello from backend!' })
})

// 自动加载 routes/ 下所有路由文件：
// 每人在 routes/ 里放一个文件、导出 express.Router()，路由路径以 / 开头（如 /auth/login）。
// 这里统一把它们挂到 /api 前缀下。好处：加新模块完全不用改这个文件，避免多人改动在 server.js 打架。
const routesDir = path.join(__dirname, 'routes')
fs.readdirSync(routesDir)
  .filter((file) => file.endsWith('.js'))
  .forEach((file) => {
    const routeModule = require(path.join(routesDir, file))
    app.use('/api', routeModule)
  })

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
