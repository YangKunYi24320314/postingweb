// 数据库连接池：统一在这里配，别的文件直接 require 它。
// 参数从 .env 读取（见 server/.env.example），没填就取默认值兜底。
const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'post_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

module.exports = pool
