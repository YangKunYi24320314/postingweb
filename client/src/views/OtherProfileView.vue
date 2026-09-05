<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { View, ChatDotRound, ArrowLeft, Search } from '@element-plus/icons-vue'
import { ThumbsUp } from 'lucide-vue-next'
import { getUserInfo, getUserPosts } from '../api/user'
import PostMediaPreview from '../components/PostMediaPreview.vue'

const route = useRoute()
const router = useRouter()

// 被查看的用户信息
const user = ref(null)
const bgLoaded = ref(false) // 背景图是否已加载（用于淡入）

// Ta的投稿
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
let requestSeq = 0
const listVersion = ref(0)
const keyword = ref('') // 搜索关键词（标题/正文）
let searchTimer = null // 防抖定时器

// 头像全图预览
const avatarPreviewVisible = ref(false)

// 从路由 /user/:id 取用户 id
function currentUserId() {
  const id = Number(route.params.id)
  return Number.isInteger(id) && id > 0 ? id : null
}

// 预加载图片，加载完成后执行回调（用于背景淡入）
function preloadImage(url, onLoad) {
  if (!url) {
    onLoad()
    return
  }
  const img = new Image()
  img.onload = onLoad
  img.src = url
}

// 加载用户信息
async function loadUser() {
  const id = currentUserId()
  if (!id) return
  try {
    user.value = await getUserInfo(id)
  } catch {
    user.value = null
  }
  // 预加载背景图，加载完成后淡入
  bgLoaded.value = false
  preloadImage(user.value?.backgroundUrl, () => {
    bgLoaded.value = true
  })
}

// 加载 Ta的投稿
async function loadPosts() {
  const id = currentUserId()
  if (!id) return
  const seq = ++requestSeq
  loading.value = true
  try {
    const data = await getUserPosts(id, {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    if (seq !== requestSeq) return
    list.value = data.list
    total.value = data.total
    listVersion.value++
  } catch {
    if (seq !== requestSeq) return
    list.value = []
    total.value = 0
  } finally {
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

// 监听关键词变化：防抖 300ms 后回到第一页并重新加载
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadPosts()
  }, 300)
})

function handlePageChange(p) {
  page.value = p
  loadPosts()
}

function goPost(row) {
  router.push(`/post/${row.id}`)
}

// 返回上一页：有浏览历史就后退；直接输入网址进来则回首页
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 悬浮预览正文：删除空行后返回剩余文本；视觉 3 行省略交给 CSS
function contentPreview(content) {
  if (!content) return ''
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
}

function openAvatarPreview() {
  if (!user.value?.avatarUrl) return
  avatarPreviewVisible.value = true
}
function closeAvatarPreview() {
  avatarPreviewVisible.value = false
}

onMounted(() => {
  loadUser()
  loadPosts()
})

// 切换查看的用户时重新加载
watch(
  () => route.params.id,
  () => {
    page.value = 1
    loadUser()
    loadPosts()
  }
)
</script>

<template>
  <div class="page-container">
    <!-- 左上角返回按钮 -->
    <div class="profile__topbar">
      <el-button :icon="ArrowLeft" plain round @click="goBack">返回</el-button>
    </div>

    <!-- 用户信息卡（无 "···" 按钮） -->
    <el-card
      shadow="never"
      class="profile__info"
      :class="{ 'profile__info--bg-loaded': bgLoaded }"
      :style="user?.backgroundUrl ? { '--profile-bg': `url('${user.backgroundUrl}')` } : {}"
    >
      <div class="info__avatar">
        <el-avatar
          :size="88"
          :src="user?.avatarUrl"
          class="profile-avatar"
          @click="openAvatarPreview"
        >
          {{ user?.nickname?.charAt(0) || 'U' }}
        </el-avatar>
      </div>
      <div class="info__identity">
        <div class="info__nickname">{{ user?.nickname || '未设置昵称' }}</div>
        <div class="info__username">{{ user ? '@' + user.username : '' }}</div>
      </div>
      <div class="info__bio">{{ user?.bio || '这个人很懒，什么都没有写' }}</div>
      <div class="profile__stats">
        <div class="profile__stat">
          <div class="profile__stat-label">收获的赞</div>
          <div class="profile__stat-value">{{ user?.totalLikes ?? 0 }}</div>
        </div>
        <div class="profile__stat">
          <div class="profile__stat-label">收获收藏</div>
          <div class="profile__stat-value">{{ user?.totalFavorites ?? 0 }}</div>
        </div>
      </div>
    </el-card>

    <!-- Ta的投稿 -->
    <el-card v-loading="loading" shadow="never">
      <div class="profile__header">
        <h2 class="profile__title">Ta的投稿</h2>
        <el-input
          v-model="keyword"
          class="profile__search"
          placeholder="搜索标题或正文"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <el-empty
        v-if="!loading && list.length === 0"
        :description="keyword ? '没有匹配的内容' : '暂无内容'"
      />
      <div
        v-for="(row, index) in list"
        :key="`${listVersion}-${row.id}`"
        class="profile-post-card"
        :style="{ animationDelay: `${index * 80}ms` }"
        @click="goPost(row)"
      >
        <div class="profile-post-card__head">
          <h3 class="profile-post-card__title">{{ row.title }}</h3>
          <span class="profile-post-card__category">{{ row.categoryName || '未分类' }}</span>
        </div>
        <div class="profile-post-card__meta">
          <span class="profile-post-card__author">{{ row.author?.nickname || '匿名用户' }}</span>
          <span class="profile-post-card__time">{{ formatTime(row.createdAt) }}</span>
        </div>
        <div v-if="row.tags && row.tags.length" class="profile-post-card__tags">
          <el-tag
            v-for="tag in row.tags"
            :key="tag"
            class="profile-post-card__tag"
            size="small"
            effect="plain"
          >
            {{ tag }}
          </el-tag>
        </div>
        <div v-if="contentPreview(row.content)" class="profile-post-card__preview">
          {{ contentPreview(row.content) }}
        </div>
        <!-- 附件图片/视频预览（一直展示，位于正文预览下方） -->
        <PostMediaPreview :attachments="row.attachments || []" :post-id="row.id" />
        <div class="profile-post-card__stats">
          <span><el-icon><View /></el-icon> {{ row.viewCount }}</span>
          <span><el-icon><ChatDotRound /></el-icon> {{ row.commentCount }}</span>
          <span><el-icon><ThumbsUp /></el-icon> {{ row.likeCount }}</span>
        </div>
      </div>

      <el-pagination
        v-model:current-page="page"
        class="profile__pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="handlePageChange"
      />
    </el-card>

    <!-- 头像全图查看（点击任意处退出） -->
    <transition name="avatar-fade">
      <div v-if="avatarPreviewVisible" class="avatar-viewer" @click="closeAvatarPreview">
        <img :src="user?.avatarUrl" class="avatar-viewer__img" alt="头像大图" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.profile__topbar {
  margin-bottom: var(--space-md);
}
.profile__info {
  position: relative;
  overflow: hidden;
  text-align: center;
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}
.profile__info::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 66.66%;
  background-image: var(--profile-bg, none);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 0.6s ease;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%);
  pointer-events: none;
}
.profile__info--bg-loaded::before {
  opacity: 0.85;
}
.profile__info::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 66.66%;
  background: linear-gradient(
    135deg,
    var(--brand-primary) 0%,
    transparent 40%,
    transparent 60%,
    var(--brand-primary) 100%
  );
  background-size: 200% 200%;
  opacity: 0.7;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%);
  animation: profile-gradient-flow 7s ease-in-out infinite;
  pointer-events: none;
}
.profile__info :deep(.el-card__body) {
  position: relative;
  z-index: 1;
}
@keyframes profile-gradient-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.info__avatar {
  display: flex;
  justify-content: center;
}

.profile-avatar {
  transition: transform 0.2s ease;
}
.profile-avatar:hover {
  transform: scale(1.08);
}

.avatar-viewer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  cursor: zoom-out;
}
.avatar-viewer__img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.avatar-fade-enter-active,
.avatar-fade-leave-active {
  transition: opacity 0.2s ease;
}
.avatar-fade-enter-from,
.avatar-fade-leave-to {
  opacity: 0;
}

.info__identity {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  margin-top: var(--space-md);
  padding: var(--space-xs) var(--space-lg);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-white) 55%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.info__nickname {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}
.info__username {
  font-size: 12px;
  color: var(--text-placeholder);
  line-height: 1.2;
}
.info__bio {
  margin-top: var(--space-lg);
  font-size: 15px;
  color: var(--text-regular);
}
.profile__stats {
  display: flex;
  justify-content: space-evenly;
  margin-top: var(--space-lg);
  border-top: 1px solid var(--border-color-light);
  padding-top: var(--space-md);
}
.profile__stat-label {
  font-size: 12px;
  color: var(--text-placeholder);
}
.profile__stat-value {
  margin-top: var(--space-xs);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.profile__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}
.profile__title {
  font-size: 18px;
  color: var(--text-primary);
}
.profile__search {
  width: 240px;
}

.profile-post-card {
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--border-color-light);
  cursor: pointer;
  animation: card-fade-in 0.3s ease backwards;
}
@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.profile-post-card:last-child {
  border-bottom: none;
}
.profile-post-card:hover .profile-post-card__title {
  color: var(--brand-primary);
}
.profile-post-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}
.profile-post-card__title {
  font-size: 17px;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.2s ease;
}
.profile-post-card__category {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.profile-post-card__meta {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xs);
  color: var(--text-secondary);
  font-size: 13px;
}
.profile-post-card__tags {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  flex-wrap: wrap;
}
.profile-post-card__stats {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-sm);
  color: var(--text-secondary);
  font-size: 13px;
}
.profile-post-card__stats span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}
.profile-post-card__preview {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  white-space: pre-line;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
  transition: max-height 0.25s ease, opacity 0.25s ease, margin-top 0.25s ease;
}
.profile-post-card:hover .profile-post-card__preview {
  max-height: 140px;
  opacity: 1;
  margin-top: var(--space-sm);
}

.profile__pagination {
  margin-top: var(--space-md);
  justify-content: flex-end;
}
</style>
