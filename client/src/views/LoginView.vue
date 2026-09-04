<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login, register, sendPasswordResetCode, resetPassword } from '../api/auth'
import { saveToken } from '../api/request'

const router = useRouter()
const form = reactive({ identifier: '', password: '', confirmPassword: '' })
const resetForm = reactive({ channel: 'email', target: '', code: '', newPassword: '' })
const loading = ref(false)
const resetLoading = ref(false)
const resetCodeLoading = ref(false)
const resetCodeCountdown = ref(0)
const isRegister = ref(false)
const resetVisible = ref(false)
const pageTitle = computed(() => (isRegister.value ? '注册' : '登录'))

function startResetCountdown(seconds) {
  resetCodeCountdown.value = seconds
  const timer = window.setInterval(() => {
    resetCodeCountdown.value -= 1
    if (resetCodeCountdown.value <= 0) window.clearInterval(timer)
  }, 1000)
}

async function handleSubmit() {
  const identifier = form.identifier.trim()
  if (!identifier || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码长度不能少于 6 位')
    return
  }
  if (isRegister.value && (identifier.length < 3 || identifier.length > 50)) {
    ElMessage.warning('用户名长度应为 3-50 位')
    return
  }
  if (isRegister.value && form.password !== form.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    const action = isRegister.value ? register : login
    const payload = isRegister.value
      ? { username: identifier, password: form.password }
      : { identifier, password: form.password }
    const data = await action(payload)
    saveToken(data.token)
    ElMessage.success(isRegister.value ? '注册成功' : '登录成功')
    router.push('/')
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleSendResetCode() {
  if (!resetForm.target.trim()) {
    ElMessage.warning('请输入手机号或邮箱')
    return
  }
  if (resetCodeCountdown.value > 0) return
  resetCodeLoading.value = true
  try {
    await sendPasswordResetCode({ channel: resetForm.channel, target: resetForm.target.trim() })
    startResetCountdown(60)
    ElMessage.success('验证码已发送，请注意查收')
  } catch (error) {
    ElMessage.error(error.message || '验证码发送失败')
  } finally {
    resetCodeLoading.value = false
  }
}

async function handleResetPassword() {
  if (!resetForm.code || resetForm.newPassword.length < 6) {
    ElMessage.warning('请输入验证码和不少于 6 位的新密码')
    return
  }
  resetLoading.value = true
  try {
    const data = await resetPassword({ ...resetForm, target: resetForm.target.trim() })
    saveToken(data.token)
    resetVisible.value = false
    ElMessage.success('密码重置成功')
    router.push('/')
  } catch (error) {
    ElMessage.error(error.message || '密码重置失败')
  } finally {
    resetLoading.value = false
  }
}
</script>

<template>
  <div class="login">
    <el-card class="login__card" shadow="always">
      <h2 class="login__title">{{ pageTitle }}</h2>
      <el-form :model="form" @submit.prevent="handleSubmit">
        <el-form-item>
          <el-input
            v-model="form.identifier"
            :placeholder="isRegister ? '用户名 / 学号' : '用户名 / 手机号 / 邮箱'"
            size="large"
            autocomplete="username"
          />
        </el-form-item>
        <p v-if="isRegister" class="login__register-hint">手机号和邮箱请绑定后登录，不能直接注册</p>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" show-password size="large" autocomplete="current-password" />
        </el-form-item>
        <el-form-item v-if="isRegister">
          <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" show-password size="large" autocomplete="new-password" />
        </el-form-item>
        <el-button type="primary" size="large" class="login__btn" :loading="loading" native-type="submit">
          {{ pageTitle }}
        </el-button>
        <div class="login__links">
          <el-link v-if="!isRegister" type="primary" @click="resetVisible = true">找回密码</el-link>
          <el-link type="primary" @click="isRegister = !isRegister">
            {{ isRegister ? '去登录' : '去注册' }}
          </el-link>
        </div>
      </el-form>
    </el-card>

    <el-dialog v-model="resetVisible" title="找回密码" width="420px">
      <el-form :model="resetForm" label-position="top">
        <el-form-item label="验证方式">
          <el-radio-group v-model="resetForm.channel">
            <el-radio value="email">邮箱</el-radio>
            <el-radio value="phone">手机号</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="resetForm.channel === 'email' ? '邮箱' : '手机号'">
          <el-input v-model="resetForm.target" />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="login__code-row">
            <el-input v-model="resetForm.code" maxlength="6" />
            <el-button :disabled="resetCodeCountdown > 0" :loading="resetCodeLoading" @click="handleSendResetCode">
              {{ resetCodeCountdown > 0 ? `${resetCodeCountdown}s 后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="resetForm.newPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetLoading" @click="handleResetPassword">重置密码</el-button>
      </template>
    </el-dialog>
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
  width: min(380px, calc(100vw - var(--space-lg)));
  padding: var(--space-xl);
}

.login__title {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.login__btn {
  width: 100%;
}

.login__links {
  margin-top: var(--space-md);
  display: flex;
  justify-content: center;
  gap: var(--space-md);
}

.login__register-hint {
  margin: calc(-1 * var(--space-sm)) 0 var(--space-md);
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
}

.login__code-row {
  display: flex;
  width: 100%;
  gap: var(--space-sm);
}

.login__code-row .el-input {
  flex: 1;
}
</style>
