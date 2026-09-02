const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(express.json({ charset: 'utf-8' }));
app.use(cors());

// ============ 1. 开启静态文件访问（static文件夹） ============
// 访问地址示例：http://127.0.0.1:3000/static/xxx.png
app.use('/static', express.static(path.join(__dirname, './static')));

// ============ 2. multer 文件上传配置 ============
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 文件保存到项目根目录的 static 文件夹
    cb(null, path.join(__dirname, './static'))
  },
  filename: function (req, file, cb) {
    // 获取文件后缀名
    const ext = path.extname(file.originalname)
    // 时间戳+随机字符串命名，避免重名覆盖
    const newFileName = Date.now() + '-' + Math.random().toString(36).slice(2) + ext
    cb(null, newFileName)
  }
})

// 限制单文件最大 10MB
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
})

// ============ 3. 文件上传接口 POST /upload ============
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.json({ code: 400, msg: '没有接收到文件' })
  }
  // 返回浏览器可直接访问的完整地址
  const fileUrl = `http://127.0.0.1:3000/static/${req.file.filename}`
  res.json({
    code: 200,
    data: {
      url: fileUrl
    }
  })
})

// ============ 下面是你原本的代码，完全保留 ============
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// 加载路由时捕获错误
let postRoutes;
try{
  postRoutes = require('./src/routes/postRoutes');
  console.log("✅ 路由文件加载成功");
}catch(e){
  console.error("❌ 路由加载失败：",e.message);
}
// 只有加载成功才挂载
if(postRoutes){
  app.use('/posts', postRoutes);
  console.log("✅ /posts 路由挂载完成");
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
