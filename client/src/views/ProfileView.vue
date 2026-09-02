<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getMe, updateProfile } from '../api/auth'

const loading = ref(true)
const saving = ref(false)
const form = reactive({ username: '', nickname: '', bio: '', avatarUrl: '' })

async function loadProfile() {
  try {
    Object.assign(form, await getMe())
  } catch (error) {
    ElMessage.error(error.message || '个人信息加载失败')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  try {
    Object.assign(form, await updateProfile(form))
    ElMessage.success('资料已更新')
  } catch (error) {
    ElMessage.error(error.message || '资料更新失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="page-container">
    <el-card v-loading="loading" shadow="never" class="profile-card">
      <template #header><span class="profile-card__title">个人资料</span></template>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="form.username" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="个人简介">
          <el-input v-model="form.bio" type="textarea" :rows="4" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item label="头像地址">
          <el-input v-model="form.avatarUrl" placeholder="https://..." />
        </el-form-item>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存修改</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.profile-card {
  max-width: 680px;
  margin: var(--space-lg) auto;
}

.profile-card__title {
  font-weight: 700;
}
</style>
