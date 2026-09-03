<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
// 导入帖子接口 + 认证接口
import { getPostById, deletePost } from '../api/post'
import { getMe } from '../api/auth'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const post = ref(null)
const currentUser = ref(null)

// 权限判断：仅帖子作者 或 管理员 可删除
const isCanDelete = computed(() => {
  if (!post.value || !currentUser.value) return false
  
  const currentUserId = currentUser.value.id || currentUser.value.userId
  const authorId = post.value.user?.id || post.value.user?.userId
  
  const isAuthor = currentUserId && authorId && currentUserId === authorId
  const isAdmin = currentUser.value.role === 'admin'
  
  return isAuthor || isAdmin
})

// 格式化时间，和列表页保持一致
function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 文件大小格式化
function formatFileSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 点击下载附件
function handleDownload(file) {
  window.open(`/api/attachments/${file.id}/download`, '_blank')
}

// 删除帖子
async function handleDelete() {
  try {
    await ElMessageBox.confirm(
      '确定要删除该帖子吗？删除后无法恢复。',
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await deletePost(route.params.id)
    
    ElMessage.success('帖子删除成功')
    router.push('/post-page')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败，请重试')
    }
  }
}

// 加载帖子详情 + 当前登录用户信息
async function loadDetail() {
  loading.value = true
  try {
    // 并行请求，提升加载速度
    const [postData, userData] = await Promise.all([
      getPostById(route.params.id),
      getMe()
    ])
    post.value = postData
    currentUser.value = userData
  } catch (err) {
    ElMessage.error(err.message || '页面加载失败')
    console.error('详情加载错误：', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="page-container post-detail">
    <el-card v-loading="loading" shadow="never">
      <!-- 空状态 -->
      <div v-if="!loading && !post" class="empty-tip">
        <el-empty description="帖子不存在或已删除" />
      </div>
      <!-- 详情内容 -->
      <template v-if="post">
        <!-- 标题栏：左侧标题 + 右侧删除按钮 -->
        <div class="post-header">
          <h2 class="post-title">{{ post.title }}</h2>
          <el-button
            v-if="isCanDelete"
            type="danger"
            size="small"
            plain
            @click="handleDelete"
          >
            删除帖子
          </el-button>
        </div>
        
        <div class="post-meta">
          <span>作者：{{ post.user?.nickname || '匿名用户' }}</span>
          <span>发布时间：{{ formatTime(post.createdAt) }}</span>
          <span>浏览量：{{ post.viewCount }}</span>
        </div>
        <!-- 标签 -->
        <div v-if="post.tags && post.tags.length" class="post-tags">
          <el-tag v-for="tag in post.tags" :key="tag" size="small" effect="plain">
            {{ tag }}
          </el-tag>
        </div>
        <!-- 正文 -->
        <div class="post-content">
          {{ post.content }}
        </div>
        <!-- 附件下载区域 -->
        <div v-if="post.attachments && post.attachments.length" class="attachment-block">
          <h4>📎 附件下载</h4>
          <div class="attachment-list">
            <div 
              v-for="file in post.attachments" 
              :key="file.id" 
              class="attachment-item"
              @click="handleDownload(file)"
            >
              <span class="file-name">{{ file.original_filename }}</span>
              <span class="file-size">{{ formatFileSize(file.file_size) }}</span>
            </div>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<style scoped>
.post-detail {
  max-width: 900px;
  margin: 20px auto;
  padding: 0 20px;
}
/* 标题栏布局 */
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.post-title {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
}
.post-meta {
  display: flex;
  gap: 20px;
  color: var(--text-secondary);
  font-size: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color-light);
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.post-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.post-content {
  line-height: 1.8;
  font-size: 16px;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}
.empty-tip {
  padding: 60px 0;
}
/* 附件下载样式 */
.attachment-block {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color-light);
}
.attachment-block h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 500;
}
.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.attachment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-color-page);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.attachment-item:hover {
  background: var(--color-primary-light-9);
}
.file-name {
  color: var(--text-primary);
}
.file-size {
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
