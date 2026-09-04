require('dotenv').config();
console.log('【验证密码读取】密码值：', process.env.DB_PASSWORD, ' | 类型：', typeof process.env.DB_PASSWORD);
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(express.json({ charset: 'utf-8' }));
app.use(cors());

// ========== 【修改1：新增 前端页面托管】访问根路径直接打开网站 ==========
// 打包后的前端dist目录，局域网设备直接输IP就能打开
app.use(express.static(path.join(__dirname, '../client/dist')));

// 静态资源托管：访问 /static/xxx
app.use('/static', express.static(path.join(__dirname, './static')));

// multer上传配置（旧版通用图片上传，保留兼容）
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 文件保存到 server/static 文件夹
    cb(null, path.join(__dirname, './static'))
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const newFileName = Date.now() + '-' + Math.random().toString(36).slice(2) + ext
    cb(null, newFileName)
  }
})

// 增加图片格式校验（过滤非图片文件）
const fileFilter = (req, file, cb) => {
  const allowType = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (allowType.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('只允许上传图片'), false)
  }
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制10MB
  fileFilter: fileFilter
})

// 旧版上传接口 POST /upload（保留兼容）
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ code: 400, msg: '没有接收到文件或文件格式错误' })
  }
  // ========== 【修改2：改用环境变量的BASE_URL，适配局域网访问】 ==========
  // 从.env读取基础地址，默认回退到本机地址
  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000'
  const fileUrl = `${baseUrl}/static/${req.file.filename}`
  res.json({
    code: 200,
    data: {
      url: fileUrl
    }
  })
})

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// ========== 路由挂载区 ==========
// 1. 帖子路由
let postRoutes;
try{
  postRoutes = require('./routes/posts');
  console.log("✅ 帖子路由加载成功");
}catch(e){
  console.error("❌ 帖子路由加载失败：",e.message);
}
if(postRoutes){
  app.use('/api', postRoutes);
  console.log("✅ /api/posts 路由挂载完成");
}

// 2. 认证路由（注册、登录）
let authRoutes;
try{
  authRoutes = require('./routes/auth');
  console.log("✅ 认证路由加载成功");
}catch(e){
  console.error("❌ 认证路由加载失败：",e.message);
}
if(authRoutes){
  app.use('/api', authRoutes);
  console.log("✅ /api/auth 路由挂载完成");
}

// 3. 附件路由
let attachmentRoutes;
try{
  attachmentRoutes = require('./routes/attachments');
  console.log("✅ 附件路由加载成功");
}catch(e){
  console.error("❌ 附件路由加载失败：",e.message);
}
if(attachmentRoutes){
  app.use('/api', attachmentRoutes);
  console.log("✅ /api/attachments 路由挂载完成");
}

// 4. 分类&标签路由
let catalogRoutes;
try{
  catalogRoutes = require('./routes/catalog');
  console.log("✅ 分类标签路由加载成功");
}catch(e){
  console.error("❌ 分类标签路由加载失败：",e.message);
}
if(catalogRoutes){
  app.use('/api', catalogRoutes);
  console.log("✅ /api/categories 路由挂载完成");
}

// 5. 互动路由（点赞、收藏）
let interactionRoutes;
try{
  interactionRoutes = require('./routes/interactions');
  console.log("✅ 互动路由加载成功");
}catch(e){
  console.error("❌ 互动路由加载失败：",e.message);
}
if(interactionRoutes){
  app.use('/api', interactionRoutes);
  console.log("✅ /api/posts/:id/like 路由挂载完成");
}

// 6. 评论路由
let commentRoutes;
try{
  commentRoutes = require('./routes/comments');
  console.log("✅ 评论路由加载成功");
}catch(e){
  console.error("❌ 评论路由加载失败：",e.message);
}
if(commentRoutes){
  app.use('/api', commentRoutes);
  console.log("✅ /api/comments 路由挂载完成");
}

// 7. 浏览历史路由
let historyRoutes;
try{
  historyRoutes = require('./routes/history');
  console.log("✅ 历史路由加载成功");
}catch(e){
  console.error("❌ 历史路由加载失败：",e.message);
}
if(historyRoutes){
  app.use('/api', historyRoutes);
  console.log("✅ /api/history 路由挂载完成");
}

// 8. 个人信息路由
let meRoutes;
try{
  meRoutes = require('./routes/me');
  console.log("✅ 个人信息路由加载成功");
}catch(e){
  console.error("❌ 个人信息路由加载失败：",e.message);
}
if(meRoutes){
  app.use('/api', meRoutes);
  console.log("✅ /api/me 路由挂载完成");
}

// ========== 新增：Vue history模式全局兜底（兼容版） ==========
// 所有未匹配的GET请求、非接口非静态资源，统一返回前端index.html
app.use((req, res, next) => {
  // 只拦截 GET 请求，且排除 /api 接口和 /static 静态资源
  if (req.method === 'GET' 
      && !req.path.startsWith('/api') 
      && !req.path.startsWith('/static')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  } else {
    // 接口和静态资源正常放行
    next()
  }
})
// ========== 启动服务 ==========
const PORT = 3000;
// ========== 【修改3：监听 0.0.0.0，放开局域网所有设备访问】 ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`本机访问：http://127.0.0.1:${PORT}`);
  // ========== 【修改4：增加局域网访问地址提示】 ==========
  console.log(`局域网访问：http://10.252.63.98:${PORT}`);
});
