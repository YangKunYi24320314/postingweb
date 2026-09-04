<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPublicUser } from '../api/auth'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const user = ref(null)

async function loadUser() {
  loading.value = true
  errorMessage.value = ''
  user.value = null
  try {
    user.value = await getPublicUser(route.params.id)
  } catch (error) {
    errorMessage.value = error.message || '用户信息加载失败'
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, loadUser)
onMounted(loadUser)
</script>

<template>
  <div class="page-container user-profile">
    <el-skeleton v-if="loading" :rows="5" animated />

    <el-result
      v-else-if="errorMessage"
      icon="warning"
      title="无法查看用户"
      :sub-title="errorMessage"
    >
      <template #extra>
        <el-button type="primary" @click="router.push('/')">返回首页</el-button>
      </template>
    </el-result>

    <el-card v-else-if="user" shadow="never" class="user-profile__card">
      <div class="user-profile__top">
        <el-avatar :size="72" :src="user.avatarUrl">{{ user.username?.slice(0, 1) }}</el-avatar>
        <div>
          <h1>{{ user.username || '校园用户' }}</h1>
          <p>{{ user.bio || '这个用户还没有填写个人简介。' }}</p>
        </div>
      </div>
      <el-statistic title="已发布内容" :value="user.postCount" />
    </el-card>
  </div>
</template>

<style scoped>
.user-profile__card {
  max-width: 760px;
  margin: var(--space-lg) auto 0;
}

.user-profile__top {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.user-profile__top h1 {
  font-size: 22px;
  color: var(--text-primary);
}

.user-profile__top p {
  margin-top: var(--space-xs);
  color: var(--text-secondary);
}
</style>
