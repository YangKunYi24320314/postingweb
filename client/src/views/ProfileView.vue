<script setup>
import { ref, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MoreFilled, Edit, View, ChatDotRound, Pointer, Search } from '@element-plus/icons-vue'
import { getMe, updateProfile } from '../api/auth'
import { getMyPosts, getMyFavorites, getMyLikes, uploadAvatar } from '../api/record'
import RecentHistoryPreview from '../components/RecentHistoryPreview.vue'

const router = useRouter()

// 当前登录用户信息（个人信息区用）
const user = ref(null)

// 我的内容（三个页签）
const activeTab = ref('posts')
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const keyword = ref('') // 搜索关键词（标题/正文/作者）
let searchTimer = null // 防抖定时器
let requestSeq = 0 // 请求序号：用于丢弃过期的旧请求结果
const listVersion = ref(0) // 列表版本号：换列表时自增，触发所有卡片重新挂载以重放淡入动画

// 个人信息编辑弹窗
const editVisible = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)
const editForm = reactive({ nickname: '', bio: '', avatarUrl: '' })
const fileInput = ref(null)

// 头像全图预览
const avatarPreviewVisible = ref(false)

// 页签名 → 对应的接口函数
const fetchers = {
  posts: getMyPosts,
  favorites: getMyFavorites,
  likes: getMyLikes,
}

// 点击行 → 跳到帖子详情
function goPost(row) {
  router.push(`/post/${row.id}`)
}

async function loadList() {
  const seq = ++requestSeq
  loading.value = true
  try {
    const data = await fetchers[activeTab.value]({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    if (seq !== requestSeq) return // 已有更新的请求，丢弃本次过期结果
    list.value = data.list
    total.value = data.total
    listVersion.value++ // 换列表时自增，触发所有卡片重新挂载以重放淡入动画
  } catch (err) {
    if (seq !== requestSeq) return
    ElMessage.error(err.message || '加载失败')
  } finally {
    if (seq === requestSeq) {
      loading.value = false
    }
  }
}

// 监听关键词变化：防抖 300ms 后回到第一页并重新加载（切换页签不会清空 keyword）
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    loadList()
  }, 300)
})

function handleTabChange(name) {
  activeTab.value = name
  page.value = 1
  loadList()
}

function handlePageChange(p) {
  page.value = p
  loadList()
}

function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 悬浮预览正文：删除空行后返回剩余文本；视觉上的 3 行限制与省略交给 CSS line-clamp
function contentPreview(content) {
  if (!content) return ''
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
}

// 加载当前用户信息
async function loadMe() {
  try {
    user.value = await getMe()
  } catch {
    // 未登录或加载失败时保持 null，信息区显示占位
  }
}

// 打开编辑弹窗：回显当前信息
function openEdit() {
  editForm.nickname = user.value?.nickname || ''
  editForm.bio = user.value?.bio || ''
  editForm.avatarUrl = user.value?.avatarUrl || ''
  editVisible.value = true
}

// "···" 下拉菜单项点击
function handleCommand(command) {
  if (command === 'editProfile') openEdit()
}

// 保存个人信息
async function saveProfile() {
  saving.value = true
  try {
    await updateProfile({
      nickname: editForm.nickname,
      bio: editForm.bio,
      avatarUrl: editForm.avatarUrl,
    })
    ElMessage.success('修改成功')
    editVisible.value = false
    await loadMe() // 重新拉取，刷新顶部信息区
  } catch (err) {
    ElMessage.error(err.message || '修改失败')
  } finally {
    saving.value = false
  }
}

// 点击头像 → 唤起文件选择
function triggerUpload() {
  fileInput.value?.click()
}

// 选择文件后上传，把返回的 URL 回显到预览
async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    e.target.value = ''
    return
  }
  const formData = new FormData()
  formData.append('file', file)
  uploadingAvatar.value = true
  try {
    const data = await uploadAvatar(formData)
    editForm.avatarUrl = data.url
    ElMessage.success('头像上传成功')
  } catch (err) {
    ElMessage.error(err.message || '头像上传失败')
  } finally {
    uploadingAvatar.value = false
    e.target.value = '' // 清空，允许重复选同一文件
  }
}

// 点击头像 → 查看全图（仅当已设置头像）
function openAvatarPreview() {
  if (!user.value?.avatarUrl) return
  avatarPreviewVisible.value = true
}
function closeAvatarPreview() {
  avatarPreviewVisible.value = false
}

onMounted(() => {
  loadList()
  loadMe()
})
</script>

<template>
  <div class="page-container">
    <!-- 个人信息区 -->
    <el-card shadow="never" class="profile__info">
      <div class="info__actions">
        <el-dropdown trigger="click" @command="handleCommand">
          <el-button :icon="MoreFilled" circle text />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="editProfile">修改个人信息</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
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
      <div class="info__nickname">{{ user?.nickname || '未设置昵称' }}</div>
      <div class="info__username">{{ user ? '@' + user.username : '' }}</div>
      <div class="info__bio">{{ user?.bio || '这个人很懒，什么都没有写' }}</div>
    </el-card>

    <!-- 我的内容（三个页签） -->
    <el-card v-loading="loading" shadow="never">
      <div class="profile__header">
        <h2 class="profile__title">我的</h2>
        <el-input
          v-model="keyword"
          class="profile__search"
          placeholder="搜索标题、正文或作者"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="我发布的" name="posts" />
        <el-tab-pane label="我收藏的" name="favorites" />
        <el-tab-pane label="我点赞的" name="likes" />
      </el-tabs>

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
        <!-- 悬浮展开的正文预览（前 3 个含文字的非空行） -->
        <div v-if="contentPreview(row.content)" class="profile-post-card__preview">
          {{ contentPreview(row.content) }}
        </div>
        <div class="profile-post-card__stats">
          <span><el-icon><View /></el-icon> {{ row.viewCount }}</span>
          <span><el-icon><ChatDotRound /></el-icon> {{ row.commentCount }}</span>
          <span><el-icon><Pointer /></el-icon> {{ row.likeCount }}</span>
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

    <RecentHistoryPreview />

    <!-- 修改个人信息弹窗 -->
    <el-dialog v-model="editVisible" title="修改个人信息" width="420px">
      <!-- 头像：图片回显，悬停变暗 + 修改图标，点击上传 -->
      <div class="avatar-editor" @click="triggerUpload">
        <el-avatar v-loading="uploadingAvatar" :size="96" :src="editForm.avatarUrl || undefined">
          {{ editForm.nickname?.charAt(0) || 'U' }}
        </el-avatar>
        <div class="avatar-editor__mask">
          <el-icon><Edit /></el-icon>
          <span>修改头像</span>
        </div>
      </div>

      <el-form :model="editForm" label-width="70px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="3" placeholder="介绍一下自己" />
        </el-form-item>
      </el-form>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="avatar-editor__input"
        @change="handleFileChange"
      />

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 头像全图查看（点击任意处退出） -->
    <transition name="avatar-fade">
      <div v-if="avatarPreviewVisible" class="avatar-viewer" @click="closeAvatarPreview">
        <img :src="user?.avatarUrl" class="avatar-viewer__img" alt="头像大图" />
      </div>
    </transition>
  </div>
</template>

<style scoped>
.profile__info {
  position: relative;
  text-align: center;
  padding: var(--space-lg);
  margin-bottom: var(--space-md);
}

.info__actions {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
}

.info__avatar {
  display: flex;
  justify-content: center;
}

/* 头像：悬停放大 + 点击查看全图 */
.profile-avatar {
  transition: transform 0.2s ease;
}
.profile-avatar:hover {
  transform: scale(1.08);
}

/* 全图查看遮罩：点击任意处退出 */
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

.info__nickname {
  margin-top: var(--space-md);
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.info__username {
  margin-top: var(--space-xs);
  font-size: 12px;
  color: var(--text-placeholder);
}

.info__bio {
  margin-top: var(--space-lg);
  font-size: 15px;
  color: var(--text-regular);
}

/* 个人主页帖子卡片（对齐帖子广场的 post-card 样式） */
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
/* 悬浮展开正文预览：默认收起，hover 展开；视觉 3 行，超出省略 */
.profile-post-card__preview {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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

.profile__header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}
.profile__title {
  font-size: 18px;
  color: var(--text-primary);
}
.profile__search {
  width: 240px;
}

.profile__pagination {
  margin-top: var(--space-md);
  justify-content: flex-end;
}

/* 头像编辑：悬停变暗 + 覆盖修改图标 */
.avatar-editor {
  position: relative;
  width: 96px;
  margin: 0 auto var(--space-md);
  cursor: pointer;
  border-radius: 50%;
}

.avatar-editor:hover .el-avatar {
  filter: brightness(0.6);
}

.avatar-editor__mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  color: var(--bg-white);
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
  border-radius: 50%;
}

.avatar-editor:hover .avatar-editor__mask {
  opacity: 1;
}

.avatar-editor__input {
  display: none;
}
</style>
