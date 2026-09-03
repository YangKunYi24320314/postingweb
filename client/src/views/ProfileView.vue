<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  bindContact,
  changePassword,
  getMe,
  sendContactCode,
  updateProfile,
  uploadAvatar,
} from '../api/auth'
import { saveToken } from '../api/request'

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
const contactForms = reactive({
  phone: { target: '', code: '' },
  email: { target: '', code: '' },
})
const contactSending = reactive({ phone: false, email: false })
const contactBinding = reactive({ phone: false, email: false })
const contactCountdown = reactive({ phone: 0, email: 0 })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const passwordSaving = ref(false)

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

function startContactCountdown(channel, seconds) {
  contactCountdown[channel] = seconds
  const timer = window.setInterval(() => {
    contactCountdown[channel] -= 1
    if (contactCountdown[channel] <= 0) window.clearInterval(timer)
  }, 1000)
}

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
    user.value = data
    form.target = ''
    form.code = ''
    ElMessage.success(`${channel === 'phone' ? '手机号' : '邮箱'}绑定成功`)
  } catch (error) {
    ElMessage.error(error.message || '绑定失败')
  } finally {
    contactBinding[channel] = false
  }
}

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

      <el-divider content-position="left">账号安全</el-divider>

      <el-descriptions :column="1" border class="profile__security-summary">
        <el-descriptions-item label="手机号">
          {{ user.phoneBound ? user.phone : '未绑定' }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ user.emailBound ? user.email : '未绑定' }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="profile__contact-grid">
        <el-form label-position="top" @submit.prevent="handleBindContact('phone')">
          <el-form-item label="绑定手机号">
            <el-input v-model="contactForms.phone.target" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item label="短信验证码">
            <div class="profile__code-row">
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
            <div class="profile__code-row">
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

      <el-form label-position="top" class="profile__password-form" @submit.prevent="handleChangePassword">
        <h3>修改密码</h3>
        <el-form-item label="当前密码">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password autocomplete="current-password" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-button type="primary" :loading="passwordSaving" native-type="submit">修改密码</el-button>
      </el-form>

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

.profile__security-summary {
  margin-bottom: var(--space-lg);
}

.profile__contact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-lg);
}

.profile__code-row {
  display: flex;
  width: 100%;
  gap: var(--space-sm);
}

.profile__code-row .el-input {
  flex: 1;
}

.profile__password-form {
  max-width: 560px;
  margin-top: var(--space-xl);
}

.profile__password-form h3 {
  margin: 0 0 var(--space-md);
  font-size: 16px;
}

@media (max-width: 720px) {
  .profile__contact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
