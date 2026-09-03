<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMe, updateProfile, uploadAvatar } from '../api/auth'

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const avatarUploading = ref(false)
const errorMessage = ref('')
const user = ref(null)
const form = reactive({
  bio: '',
})
const avatarPreview = ref('')

async function loadProfile() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await getMe()
    user.value = data
    form.bio = data.bio || ''
    avatarPreview.value = data.avatarUrl || ''
  } catch (error) {
    errorMessage.value = error.message || '个人信息加载失败'
  } finally {
    loading.value = false
  }
}

async function submitProfile() {
  saving.value = true
  try {
    const data = await updateProfile({ bio: form.bio })
    user.value = data
    Object.assign(form, {
      bio: data.bio || '',
    })
    ElMessage.success('个人信息已更新')
  } catch (error) {
    ElMessage.error(error.message || '个人信息更新失败')
  } finally {
    saving.value = false
  }
}

function validateAvatar(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.warning('请选择 JPG、PNG、GIF 或 WEBP 图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.warning('头像不能超过 2MB')
    return false
  }
  return true
}

async function handleAvatarUpload(uploadFile) {
  const file = uploadFile.raw
  if (!file || !validateAvatar(file)) return

  avatarPreview.value = URL.createObjectURL(file)
  avatarUploading.value = true
  try {
    const data = await uploadAvatar(file)
    user.value = data
    avatarPreview.value = data.avatarUrl || avatarPreview.value
    ElMessage.success('头像已更新')
  } catch (error) {
    avatarPreview.value = user.value?.avatarUrl || ''
    ElMessage.error(error.message || '头像上传失败')
  } finally {
    avatarUploading.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="page-container profile">
    <el-skeleton v-if="loading" :rows="6" animated />

    <el-result v-else-if="errorMessage" icon="error" title="加载失败" :sub-title="errorMessage">
      <template #extra>
        <el-button type="primary" @click="loadProfile">重新加载</el-button>
      </template>
    </el-result>

    <el-card v-else-if="user" shadow="never" class="profile__card">
      <template #header>
        <div class="profile__header">
          <span>个人中心</span>
          <el-button link type="primary" @click="router.push(`/users/${user.id}`)">
            查看公开主页
          </el-button>
        </div>
      </template>

      <el-descriptions :column="1" border class="profile__summary">
        <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ user.role }}</el-descriptions-item>
      </el-descriptions>

      <div class="profile__avatar">
        <span class="profile__label">头像</span>
        <div class="profile__avatar-row">
          <el-avatar :size="80" :src="avatarPreview">{{ user.username?.slice(0, 1) }}</el-avatar>
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            accept="image/jpeg,image/png,image/gif,image/webp"
            @change="handleAvatarUpload"
          >
            <el-button type="primary" plain :loading="avatarUploading">选择本地图片</el-button>
          </el-upload>
        </div>
        <span class="profile__hint">支持 JPG、PNG、GIF、WEBP，大小不超过 2MB</span>
      </div>

      <el-form label-position="top" class="profile__form" @submit.prevent="submitProfile">
        <el-form-item label="个人简介">
          <el-input v-model="form.bio" type="textarea" :rows="4" maxlength="255" show-word-limit />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="saving">保存修改</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.profile__card {
  max-width: 760px;
  margin: var(--space-lg) auto 0;
}

.profile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
}

.profile__summary {
  margin-bottom: var(--space-lg);
}

.profile__avatar {
  margin-bottom: var(--space-lg);
}

.profile__label,
.profile__hint {
  display: block;
  color: var(--text-secondary);
}

.profile__label {
  margin-bottom: var(--space-sm);
  font-weight: 600;
}

.profile__avatar-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.profile__hint {
  margin-top: var(--space-sm);
  font-size: 12px;
}

.profile__form {
  max-width: 560px;
}
</style>
