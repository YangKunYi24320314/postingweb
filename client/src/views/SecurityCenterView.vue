<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

// 返回上一页：有浏览历史就后退；直接输入网址进来则回个人中心
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/profile')
  }
}
</script>

<template>
  <div class="page-container">
    <!-- 左上角返回按钮 -->
    <div class="security__topbar">
      <el-button :icon="ArrowLeft" plain round @click="goBack">返回</el-button>
    </div>

    <el-card shadow="never" class="security__card">
      <div class="security__header">
        <h2 class="security__title">个人安全中心</h2>
      </div>

      <!--
        TODO：此处为「账号安全」模块的功能框架，由负责该模块的组员继续开发。
        可放：绑定手机号 / 绑定邮箱、修改密码、找回密码等。
        后端相关接口已就绪（见 devdocs/api-protocol.md 的认证部分）：
        POST /api/auth/contact/send-code、POST /api/auth/contact/bind、
        POST /api/auth/password/change、POST /api/auth/password/reset 等。
      -->
      <el-empty description="安全中心功能开发中，敬请期待" />
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
</style>
