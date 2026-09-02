<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, register } from '../api/auth'
import { saveToken } from '../api/request'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
  nickname: '',
})
const loading = ref(false)
const isRegister = ref(false)
const pageTitle = computed(() => (isRegister.value ? '注册' : '登录'))

async function handleSubmit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    // login() 走统一封装：返回的 data 里就是 { token, user }
    const action = isRegister.value ? register : login
    const payload = isRegister.value
      ? { username: form.username, password: form.password, nickname: form.nickname }
      : { username: form.username, password: form.password }
    const data = await action(payload)
    saveToken(data.token)
    ElMessage.success(isRegister.value ? '注册成功' : '登录成功')
    router.push('/')
  } catch (e) {
    // 统一封装已抛错，message 就是后端返回的提示（如"用户名或密码错误"）
    ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <el-card class="login__card" shadow="always">
      <h2 class="login__title">{{ pageTitle }}</h2>
      <el-form :model="form" @submit.prevent>
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名 / 学号" size="large" />
        </el-form-item>
        <el-form-item v-if="isRegister">
          <el-input v-model="form.nickname" placeholder="昵称（可选）" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            show-password
            size="large"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="login__btn"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ pageTitle }}
        </el-button>
        <div class="login__register">
          <span v-if="!isRegister">还没有账号？</span>
          <span v-else>已经有账号？</span>
          <el-link type="primary" @click="isRegister = !isRegister">
            {{ isRegister ? '去登录' : '去注册' }}
          </el-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--bg-white);
}

.login__card {
  width: 380px;
  padding: var(--space-xl);
}

.login__title {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.login__btn {
  width: 100%;
}

.login__register {
  margin-top: var(--space-md);
  text-align: center;
  color: var(--text-secondary);
}
</style>
