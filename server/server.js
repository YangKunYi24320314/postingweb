// 引入 express
const express = require('express');
// 引入 cors
const cors = require('cors');
// 引入 dotenv 并配置
require('dotenv').config();

// 创建 express 应用
const app = express();

// 中间件：让服务器能解析 JSON 格式的请求体
app.use(express.json());
// 中间件：启用 cors，允许前端跨域访问
app.use(cors());

// 定义一个简单的测试接口
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// 从环境变量取端口，没有就用 3000
const PORT = process.env.PORT || 3000;

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});