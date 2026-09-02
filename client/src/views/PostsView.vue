<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
// 初始化空数组，避免 undefined.length 报错
const postList = ref([])

const fetchPosts = async () => {
  console.log("开始请求帖子接口")
  try {
    // ✅ 修改请求地址，直接访问后端完整地址 127.0.0.1:3000/posts
    const res = await axios.get('http://127.0.0.1:3000/posts')
    console.log("后端完整返回：", res.data)
    // 取出真正的帖子数组赋值
    postList.value = res.data.data
  } catch (err) {
    console.error("请求失败：", err)
    // 请求出错依然保持为空数组，防止页面崩溃
    postList.value = []
  }
}

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="posts-page">
    <div class="container">
      <h2 class="page-title">📝 帖子广场</h2>
      <div v-if="postList.length === 0" class="empty-tip">
        暂无帖子数据
      </div>
      <div class="post-list">
        <div class="post-card" v-for="item in postList" :key="item.id">
          <div class="post-header">
            <span class="post-title">{{ item.title }}</span>
            <el-tag size="small" type="info">{{ item.tag }}</el-tag>
          </div>
          <div class="post-content">
            {{ item.content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.posts-page {
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
  padding: 32px 16px;
}
.container {
  max-width: 800px;
  margin: 0 auto;
}
.page-title {
  text-align: center;
  color: #303133;
  margin-bottom: 24px;
}
.empty-tip {
  text-align: center;
  color: #909399;
  padding: 40px 0;
}
.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.post-card {
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.06);
}
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.post-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.post-content {
  color: #606266;
  line-height: 1.6;
}
</style>
