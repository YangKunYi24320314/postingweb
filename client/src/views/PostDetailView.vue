<script setup>
// 帖子详情页：展示帖子全文 + 评论区（发表/回复/编辑/删除/点赞）+ 附件在线预览。
// 后端接口见 devdocs/api-protocol.md（帖子详情 / 评论 / 点赞 / 上报浏览）。
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, ArrowLeft } from '@element-plus/icons-vue'
import { getPostById, deletePost } from '../api/post'
import { getComments, createComment } from '../api/comments'
import { reportView } from '../api/record'
import { getMe } from '../api/auth'
import { getToken } from '../api/request'
import { restorePost } from '../api/admin' // 新增：导入还原帖子接口
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

// ===== 附件预览弹窗控制 =====
const imageVisible = ref(false)
const pdfVisible = ref(false)
const videoVisible = ref(false)
const currentPreviewUrl = ref('')

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

// ========== 核心修改：删帖权限升级为「作者本人 或 管理员」 ==========
const isCanDelete = computed(() => {
  if (!post.value || !me.value) return false
  // 已删除的帖子不再显示删除按钮
  if (post.value.isDeleted) return false
  const currentUserId = Number(me.value.id)
  const authorId = Number(post.value.user?.id)
  const isAuthor = currentUserId && authorId && currentUserId === authorId
  // 新增管理员角色判断
  const isAdmin = me.value.role === 'admin'
  return isAuthor || isAdmin
})

// ========== 新增：管理员还原按钮显示控制 ==========
const showRestoreBtn = computed(() => {
  if (!post.value || !me.value) return false
  // 仅管理员 + 帖子已删除状态 才显示
  const isAdmin = me.value.role === 'admin'
  return isAdmin && post.value.isDeleted
})

// 文件大小格式化
function formatFileSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 文件类型图标映射
function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊'
  return '📎'
}

// ===== 附件预览：路径归一化，避免双斜杠导致域名解析失败 =====
function handlePreview(file) {
  // 去掉开头所有多余斜杠，统一加一个 /，保证是标准根相对路径
  const fileUrl = '/' + file.file_path.replace(/^\/+/, '')
  currentPreviewUrl.value = fileUrl
  // 【补上这行】拼接完整的绝对地址
  const fullFileUrl = window.location.origin + fileUrl
  const type = file.mime_type
  if (type.startsWith('image/')) {
    imageVisible.value = true
  } else if (type === 'application/pdf') {
    pdfVisible.value = true
  } else if (type.startsWith('video/')) {
    videoVisible.value = true
  }
  // Office文档用微软在线预览 目前我们的地址微软无法访问，docx文件无法在线预览
  else if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    window.open(
      `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fullFileUrl)}`,
      '_blank'
    )
  } else {
    // 不支持在线预览的格式，自动触发下载
    handleDownload(file)
  }
}

// ===== 独立下载功能：走原下载接口 =====
function handleDownload(file) {
  window.open(`/api/attachments/${file.id}/download`, '_blank')
}

// ===== 返回上一页：有浏览历史就后退；直接输入网址进来则回帖子广场 =====
const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/post-page')
  }
}

// 删除帖子（软删除，仅作者或管理员，删除后回到帖子广场）
async function handleDelete() {
  try {
    await ElMessageBox.confirm('确定要删除该帖子吗？删除后可在回收站恢复。', '删除确认', {
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

// ========== 新增：还原帖子（仅管理员，还原后跳回回收站） ==========
async function handleRestore() {
  try {
    await ElMessageBox.confirm('确定要还原这篇帖子吗？还原后将重新在帖子广场展示', '还原确认', {
      confirmButtonText: '确认还原',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await restorePost(post.value.id)
    ElMessage.success('帖子还原成功')
    // 还原成功后自动返回回收站列表
    router.push('/admin/deleted-posts')
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.message || '还原失败，请重试')
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
        <!-- 返回按钮栏 -->
        <div class="back-bar">
          <el-button :icon="ArrowLeft" plain round @click="goBack">返回</el-button>
        </div>
        <div class="detail-card__head">
          <h2 class="detail-card__title">{{ post.title }}</h2>
          <span v-if="post.isPinned" class="detail-card__pin">置顶</span>
          <!-- 新增：已删除标记 -->
          <span v-if="post.isDeleted" class="detail-card__deleted">已删除</span>
          
          <!-- 还原按钮：仅管理员查看已删除帖时显示 -->
          <el-button
            v-if="showRestoreBtn"
            class="detail-card__restore"
            type="primary"
            size="small"
            @click="handleRestore"
          >
            还原帖子
          </el-button>

          <!-- 删除按钮：未删除状态 + 有权限时显示 -->
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
          <el-tag
            v-for="tag in post.tags"
            :key="tag"
            class="detail-card__tag"
            size="small"
            effect="plain"
            @click="searchByTag(tag)"
          >
            {{ tag }}
          </el-tag>
        </div>
        <div class="detail-card__content">{{ post.content }}</div>
        <!-- ===== 附件区域：点击文件名预览，点击按钮下载 ===== -->
        <div v-if="post.attachments && post.attachments.length" class="detail-card__attach">
          <h4>📎 附件</h4>
          <div class="attach-list">
            <div v-for="file in post.attachments" :key="file.id" class="attach-item">
              <!-- 左侧：图标+文件名，点击触发预览 -->
              <div class="attach-info" @click="handlePreview(file)">
                <span class="attach-icon">{{ getFileIcon(file.mime_type) }}</span>
                <span class="attach-name">{{ file.original_filename }}</span>
              </div>
              <!-- 右侧：文件大小 + 下载按钮 -->
              <div class="attach-actions">
                <span class="attach-size">{{ formatFileSize(file.file_size) }}</span>
                <el-button type="primary" size="small" text @click.stop="handleDownload(file)">
                  下载
                </el-button>
              </div>
            </div>
          </div>
        </div>
        <!-- 图片预览弹窗 -->
        <el-dialog v-model="imageVisible" width="80%" top="5vh" :show-close="true">
          <img
            :src="currentPreviewUrl"
            style="max-width: 100%; max-height: 80vh; display: block; margin: 0 auto"
            alt="图片预览"
          />
        </el-dialog>
        <!-- PDF 预览弹窗 -->
        <el-dialog v-model="pdfVisible" width="90%" top="5vh">
          <iframe
            :src="currentPreviewUrl"
            style="width: 100%; height: 80vh; border: none; background: #fff"
            frameborder="0"
          />
        </el-dialog>
        <!-- 视频预览弹窗 -->
        <el-dialog v-model="videoVisible" width="80%" top="5vh">
          <video :src="currentPreviewUrl" controls style="width: 100%" />
        </el-dialog>
        <div class="detail-card__stats">
          <span
            ><el-icon><View /></el-icon> 浏览 {{ post.viewCount }}</span
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
.back-bar {
  margin-bottom: 16px;
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
/* 新增：已删除标记样式 */
.detail-card__deleted {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
  padding: 0 var(--space-xs);
}
.detail-card__delete {
  margin-left: auto;
}
.detail-card__restore {
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
/* ===== 附件列表样式 ===== */
.attach-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
}
.attach-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}
.attach-item:hover {
  background: var(--bg-hover);
}
.attach-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  cursor: pointer;
  overflow: hidden;
}
.attach-icon {
  font-size: 16px;
  flex-shrink: 0;
}
.attach-name {
  color: var(--text-primary);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attach-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}
.attach-size {
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
