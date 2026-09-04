require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json({ charset: 'utf-8' }));
app.use(cors());

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
  // 用请求方的主机名拼地址（局域网/部署下都不会写死 127.0.0.1）
  const fileUrl = `${req.protocol}://${req.get('host')}/static/${req.file.filename}`
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

// 未匹配的 /api 路由：按契约返回统一错误（防止被下面的前端 SPA 回退吞掉）
app.use('/api', (req, res) => {
  res.status(404).json({ code: 1004, message: '接口不存在', data: null })
})

// ========== 托管前端构建产物（方案B：单端口发布 / 局域网联机） ==========
const clientDist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(clientDist)) {
  // 静态资源：前端编译出的 assets / index.html / favicon 等
  app.use(express.static(clientDist))
  // SPA 回退：非 /api 的 GET 请求交给前端入口 index.html，由前端路由接管
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'))
    }
    next()
  })
  console.log('✅ 已托管前端构建产物 client/dist，可直接用本服务地址访问网站')
} else {
  console.log('⚠️ 未发现 client/dist：请先在 client/ 下执行 npm run build，才能用本端口访问网站；开发调试请改用 vite。')
}

// ========== 启动服务 ==========
const PORT = Number(process.env.PORT || 3000)
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}  (局域网访问：http://<本机IP>:${PORT})`)
});
