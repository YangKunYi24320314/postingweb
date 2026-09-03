<script setup>
// 帖子详情页：展示帖子全文 + 评论区（发表/回复/编辑/删除/点赞）。
// 后端接口见 devdocs/api-protocol.md（帖子详情 / 评论 / 点赞 / 上报浏览）。
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Pointer } from '@element-plus/icons-vue'
import { getPostById, deletePost } from '../api/post'
import { getComments, createComment } from '../api/comments'
import { reportView } from '../api/record'
import { getMe } from '../api/auth'
import { getToken } from '../api/request'
import InteractionButtons from '../components/InteractionButtons.vue'
import CommentItem from '../components/CommentItem.vue'

const route = useRoute()
const router = useRouter()
// 从路由参数取出帖子 id（如 /post/3 -> 3）
const postId = computed(() => Number(route.params.id))

const post = ref(null)
const comments = ref([])
const myUserId = ref(null)
const me = ref(null)
const loading = ref(false)
const commentsLoading = ref(false)

// 顶级评论输入框
const newContent = ref('')
const submitting = ref(false)

// 格式化时间：ISO → "2026-09-01 08:54"
function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 顶级评论 + 楼中楼：把扁平列表按 parentId 组装成树
const commentTree = computed(() => {
  const childrenMap = {}
  const roots = []
  for (const c of comments.value) {
    if (c.parentId) {
      if (!childrenMap[c.parentId]) childrenMap[c.parentId] = []
      childrenMap[c.parentId].push(c)
    } else {
      roots.push(c)
    }
  }
  const build = (list) =>
    list.map((item) => ({
      ...item,
      replies: childrenMap[item.id] ? build(childrenMap[item.id]) : [],
    }))
  return build(roots)
})

// 加载帖子详情
async function loadPost() {
  if (!Number.isInteger(postId.value) || postId.value <= 0) {
    ElMessage.error('帖子 ID 不合法')
    return
  }
  loading.value = true
  try {
    post.value = await getPostById(postId.value)
  } catch (e) {
    ElMessage.error(e.message || '帖子加载失败')
  } finally {
    loading.value = false
  }
}

// 加载评论列表
async function loadComments() {
  commentsLoading.value = true
  try {
    comments.value = await getComments(postId.value)
  } catch (e) {
    ElMessage.error(e.message || '评论加载失败')
  } finally {
    commentsLoading.value = false
  }
}

// 取当前登录用户（用于判断"是不是我的评论/能不能删帖"）；未登录则为 null
async function loadMe() {
  if (!getToken()) {
    myUserId.value = null
    me.value = null
    return
  }
  try {
    const meData = await getMe()
    me.value = meData
    myUserId.value = meData.id
  } catch {
    myUserId.value = null
    me.value = null
  }
}

// 能不能删帖：仅作者本人或管理员
const isCanDelete = computed(() => {
  if (!post.value || !me.value) return false
  const currentUserId = Number(me.value.id)
  const authorId = Number(post.value.user?.id)
  const isAuthor = currentUserId && authorId && currentUserId === authorId
  const isAdmin = me.value.role === 'admin'
  return isAuthor || isAdmin
})

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

// 删除帖子（软删除，仅作者或管理员，删除后回到帖子广场）
async function handleDelete() {
  try {
    await ElMessageBox.confirm('确定要删除该帖子吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deletePost(post.value.id)
    ElMessage.success('帖子删除成功')
    router.push('/post-page')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '删除失败，请重试')
    }
  }
}

// 评论变更后（发表/回复/删除/编辑）刷新评论与帖子计数
async function handleReload() {
  await Promise.all([loadComments(), loadPost()])
}

// 发表顶级评论
async function submitComment() {
  if (!getToken()) {
    ElMessage.warning('登录后才能评论')
    return
  }
  if (!newContent.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  submitting.value = true
  try {
    await createComment(postId.value, { content: newContent.value.trim() })
    newContent.value = ''
    ElMessage.success('评论成功')
    await handleReload()
  } catch (e) {
    ElMessage.error(e.message || '评论失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadPost(), loadComments(), loadMe()])
  // 上报一次浏览（需登录）
  if (getToken()) {
    try {
      await reportView(postId.value)
    } catch {
      // 上报失败不影响浏览，忽略即可
    }
  }
})
</script>

<template>
  <div class="page-container">
    <el-card v-loading="loading" shadow="never" class="detail-card">
      <template v-if="post">
        <div class="detail-card__head">
          <h2 class="detail-card__title">{{ post.title }}</h2>
          <span v-if="post.isPinned" class="detail-card__pin">置顶</span>
          <el-button
            v-if="isCanDelete"
            class="detail-card__delete"
            type="danger"
            size="small"
            plain
            @click="handleDelete"
          >
            删除帖子
          </el-button>
        </div>

        <div class="detail-card__meta">
          <span class="detail-card__author">{{ post.user?.nickname || '匿名用户' }}</span>
          <span class="detail-card__time">{{ formatTime(post.createdAt) }}</span>
        </div>

        <div v-if="post.tags && post.tags.length" class="detail-card__tags">
          <el-tag v-for="tag in post.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
        </div>

        <div class="detail-card__content">{{ post.content }}</div>

        <!-- 附件下载区域 -->
        <div v-if="post.attachments && post.attachments.length" class="detail-card__attach">
          <h4>📎 附件下载</h4>
          <el-button
            v-for="file in post.attachments"
            :key="file.id"
            class="detail-card__attach-item"
            @click="handleDownload(file)"
          >
            <span class="file-name">{{ file.original_filename }}</span>
            <span class="file-size">{{ formatFileSize(file.file_size) }}</span>
          </el-button>
        </div>

        <div class="detail-card__stats">
          <span
            ><el-icon><Pointer /></el-icon> 浏览 {{ post.viewCount }}</span
          >
          <InteractionButtons
            :post-id="post.id"
            :liked="post.isLiked"
            :like-count="post.likeCount"
            :favorited="post.isFavorite"
            :favorite-count="post.favoriteCount"
          />
        </div>
      </template>
    </el-card>

    <!-- 评论区 -->
    <el-card shadow="never" class="comment-card">
      <h3 class="comment-card__title">评论 ({{ post?.commentCount || 0 }})</h3>

      <!-- 发表评论 -->
      <div class="comment-card__input">
        <el-input
          v-model="newContent"
          type="textarea"
          :rows="3"
          :placeholder="getToken() ? '友善评论，理性发言...' : '登录后才能发表评论'"
        />
        <div class="comment-card__input-actions">
          <el-button type="primary" :loading="submitting" @click="submitComment"
            >发表评论</el-button
          >
        </div>
      </div>

      <!-- 评论列表 -->
      <div v-loading="commentsLoading" class="comment-card__list">
        <el-empty
          v-if="!commentsLoading && commentTree.length === 0"
          description="还没有评论，抢个沙发"
        />
        <CommentItem
          v-for="item in commentTree"
          :key="item.id"
          :comment="item"
          :post-id="postId"
          :my-user-id="myUserId"
          @reload="handleReload"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.detail-card {
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}

.detail-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.detail-card__title {
  font-size: 22px;
  color: var(--text-primary);
}

.detail-card__pin {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-xs);
}

.detail-card__delete {
  margin-left: auto;
}

.detail-card__meta {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-sm);
  color: var(--text-secondary);
  font-size: 13px;
}

.detail-card__tags {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  flex-wrap: wrap;
}

.detail-card__content {
  margin-top: var(--space-md);
  color: var(--text-regular);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.8;
}

.detail-card__attach {
  margin-top: var(--space-lg);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.detail-card__attach h4 {
  margin: 0;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

.detail-card__attach-item {
  display: flex;
  gap: var(--space-sm);
}

.detail-card__attach-item .file-size {
  color: var(--text-secondary);
  font-size: 13px;
}

.detail-card__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--border-color-light);
  flex-wrap: wrap;
}

.detail-card__stats > span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-secondary);
  font-size: 13px;
}

.comment-card {
  padding: var(--space-lg);
}

.comment-card__title {
  font-size: 17px;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}

.comment-card__input {
  margin-bottom: var(--space-lg);
}

.comment-card__input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-sm);
}

.comment-card__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
</style>
