<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const form = reactive({
  username: '',
  password: '',
})

function handleSubmit() {
  // TODO：后面接登录接口
  ElMessage.info('登录接口还没接入，先去完成后端登录模块吧')
}
</script>

<template>
  <div class="login">
    <el-card class="login__card" shadow="always">
      <h2 class="login__title">登录</h2>
      <el-form :model="form" @submit.prevent>
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名 / 学号" size="large" />
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
        <el-button type="primary" size="large" class="login__btn" @click="handleSubmit">
          登录
        </el-button>
        <div class="login__register">
          还没有账号？
          <el-link type="primary">去注册</el-link>
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
