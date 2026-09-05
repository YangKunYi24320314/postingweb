<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { bindContact, changePassword, getMe, sendContactCode } from '../api/auth'
import { saveToken } from '../api/request'

const router = useRouter()
const user = ref(null)

// 绑定联系方式（手机 / 邮箱）
const contactForms = reactive({ phone: { target: '', code: '' }, email: { target: '', code: '' } })
const contactSending = reactive({ phone: false, email: false })
const contactBinding = reactive({ phone: false, email: false })
const contactCountdown = reactive({ phone: 0, email: 0 })

// 修改密码
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordSaving = ref(false)

// 返回上一页：有浏览历史就后退；直接输入网址进来则回个人中心
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/profile')
  }
}

// 加载当前用户信息
async function loadMe() {
  try {
    user.value = await getMe()
  } catch {
    // 未登录或加载失败时保持 null，信息区显示占位
  }
}

// 验证码发送倒计时
function startContactCountdown(channel, seconds) {
  contactCountdown[channel] = seconds
  const timer = window.setInterval(() => {
    contactCountdown[channel] -= 1
    if (contactCountdown[channel] <= 0) window.clearInterval(timer)
  }, 1000)
}

// 发送绑定验证码
async function handleSendContactCode(channel) {
  const target = contactForms[channel].target.trim()
  if (!target) {
    ElMessage.warning(`请输入${channel === 'phone' ? '手机号' : '邮箱'}`)
    return
  }
  if (contactCountdown[channel] > 0) return
  contactSending[channel] = true
  try {
    await sendContactCode({ channel, target })
    startContactCountdown(channel, 60)
    ElMessage.success('验证码已发送，请注意查收')
  } catch (error) {
    ElMessage.error(error.message || '验证码发送失败')
  } finally {
    contactSending[channel] = false
  }
}

// 绑定联系方式
async function handleBindContact(channel) {
  const form = contactForms[channel]
  if (!form.target.trim() || !form.code) {
    ElMessage.warning('请输入联系方式和验证码')
    return
  }
  contactBinding[channel] = true
  try {
    const data = await bindContact({
      channel,
      target: form.target.trim(),
      code: form.code,
    })
    if (data?.token) saveToken(data.token)
    user.value = data?.user || data
    form.target = ''
    form.code = ''
    ElMessage.success(`${channel === 'phone' ? '手机号' : '邮箱'}绑定成功`)
  } catch (error) {
    ElMessage.error(error.message || '绑定失败')
  } finally {
    contactBinding[channel] = false
  }
}

// 修改密码
async function handleChangePassword() {
  if (!passwordForm.currentPassword || passwordForm.newPassword.length < 6) {
    ElMessage.warning('请输入当前密码和不少于 6 位的新密码')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  passwordSaving.value = true
  try {
    const data = await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    saveToken(data.token)
    user.value = data.user
    Object.assign(passwordForm, { currentPassword: '', newPassword: '', confirmPassword: '' })
    ElMessage.success('密码修改成功')
  } catch (error) {
    ElMessage.error(error.message || '密码修改失败')
  } finally {
    passwordSaving.value = false
  }
}

onMounted(loadMe)
</script>

<template>
  <div class="page-container">
    <div class="security__topbar">
      <el-button :icon="ArrowLeft" plain round @click="goBack">返回</el-button>
    </div>

    <el-card shadow="never" class="security__card">
      <div class="security__header">
        <h2 class="security__title">个人安全中心</h2>
        <p class="security__hint">管理登录方式和账号安全信息</p>
      </div>

      <el-descriptions :column="1" border class="security__summary">
        <el-descriptions-item label="手机号">
          {{ user?.phoneBound ? user.phone : '未绑定' }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ user?.emailBound ? user.email : '未绑定' }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="security__contact-grid">
        <el-form label-position="top" @submit.prevent="handleBindContact('phone')">
          <el-form-item label="绑定手机号">
            <el-input v-model="contactForms.phone.target" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item label="短信验证码">
            <div class="security__code-row">
              <el-input v-model="contactForms.phone.code" maxlength="6" />
              <el-button
                :disabled="contactCountdown.phone > 0"
                :loading="contactSending.phone"
                @click="handleSendContactCode('phone')"
              >
                {{ contactCountdown.phone > 0 ? `${contactCountdown.phone}s 后重发` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-button type="primary" :loading="contactBinding.phone" native-type="submit">
            绑定手机号
          </el-button>
        </el-form>

        <el-form label-position="top" @submit.prevent="handleBindContact('email')">
          <el-form-item label="绑定邮箱">
            <el-input v-model="contactForms.email.target" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item label="邮箱验证码">
            <div class="security__code-row">
              <el-input v-model="contactForms.email.code" maxlength="6" />
              <el-button
                :disabled="contactCountdown.email > 0"
                :loading="contactSending.email"
                @click="handleSendContactCode('email')"
              >
                {{ contactCountdown.email > 0 ? `${contactCountdown.email}s 后重发` : '获取验证码' }}
              </el-button>
            </div>
          </el-form-item>
          <el-button type="primary" :loading="contactBinding.email" native-type="submit">
            绑定邮箱
          </el-button>
        </el-form>
      </div>

      <el-form
        label-position="top"
        class="security__password-form"
        @submit.prevent="handleChangePassword"
      >
        <h3>修改密码</h3>
        <el-form-item label="当前密码">
          <el-input
            v-model="passwordForm.currentPassword"
            type="password"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-button type="primary" :loading="passwordSaving" native-type="submit">修改密码</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.security__topbar {
  margin-bottom: var(--space-md);
}
.security__card {
  min-height: 320px;
}
.security__header {
  margin-bottom: var(--space-md);
}
.security__title {
  font-size: 18px;
  color: var(--text-primary);
}
.security__hint {
  margin: var(--space-xs) 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}
.security__summary {
  margin-bottom: var(--space-lg);
}
.security__contact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-lg);
}
.security__code-row {
  display: flex;
  width: 100%;
  gap: var(--space-sm);
}
.security__code-row .el-input {
  flex: 1;
}
.security__password-form {
  max-width: 560px;
  margin-top: var(--space-xl);
}
.security__password-form h3 {
  margin: 0 0 var(--space-md);
  font-size: 16px;
}
@media (max-width: 720px) {
  .security__contact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
