import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 上传接口 /upload 转发后端3000
      '/upload': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      },
      // 帖子相关接口 /posts 转发后端3000
      '/posts': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
})
