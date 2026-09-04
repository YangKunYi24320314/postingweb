import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 所有以 /api 开头的请求转发到后端 3000（前端统一走 src/api/request.js，baseURL=/api）
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // 上传后的静态文件也转发，方便开发时预览图片
      '/static': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
