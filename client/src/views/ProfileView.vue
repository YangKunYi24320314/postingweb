<script setup>
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { MoreFilled, Edit } from '@element-plus/icons-vue'
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

// 个人信息编辑弹窗
const editVisible = ref(false)
const saving = ref(false)
const uploadingAvatar = ref(false)
const editForm = reactive({ nickname: '', bio: '', avatarUrl: '' })
const fileInput = ref(null)

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
  loading.value = true
  try {
    const data = await fetchers[activeTab.value]({ page: page.value, pageSize: pageSize.value })
    list.value = data.list
    total.value = data.total
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

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
        <el-avatar :size="88" :src="user?.avatarUrl">
          {{ user?.nickname?.charAt(0) || 'U' }}
        </el-avatar>
      </div>
      <div class="info__nickname">{{ user?.nickname || '未设置昵称' }}</div>
      <div class="info__username">{{ user ? '@' + user.username : '' }}</div>
      <div class="info__bio">{{ user?.bio || '这个人很懒，什么都没有写' }}</div>
    </el-card>

    <!-- 我的内容（三个页签） -->
    <el-card shadow="never">
      <h2 class="profile__title">个人主页</h2>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="我发布的" name="posts" />
        <el-tab-pane label="我收藏的" name="favorites" />
        <el-tab-pane label="我点赞的" name="likes" />
      </el-tabs>

      <el-table v-loading="loading" :data="list" empty-text="暂无内容" @row-click="goPost">
        <el-table-column prop="title" label="帖子标题" min-width="200" />
        <el-table-column label="作者" width="140">
          <template #default="{ row }">{{ row.author?.nickname || '匿名用户' }}</template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="80" />
        <el-table-column prop="likeCount" label="点赞" width="80" />
        <el-table-column prop="commentCount" label="评论" width="80" />
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

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

:deep(.el-table__row) {
  cursor: pointer;
}

.profile__title {
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
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
