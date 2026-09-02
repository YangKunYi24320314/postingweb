<script setup>
import { useRouter } from 'vue-router'
import { EditPen, Document } from '@element-plus/icons-vue'
const router = useRouter()
</script>
<template>
  <div class="page-container">
    <el-card shadow="never" class="hero">
      <h1 class="hero__title">欢迎来到校园社区</h1>
      <p class="hero__desc">一个分享、交流、记录的校园发帖平台</p>
      <div class="hero__actions">
        <el-button
          type="primary"
          size="large"
          round
          :icon="Document"
          @click="router.push({ name: 'PostPage' })"
        >
          去帖子广场
        </el-button>
        <!-- 这里把 /login 修改为 /write -->
        <el-button size="large" round plain :icon="EditPen" @click="router.push('/write')">
          写一篇帖子
        </el-button>
      </div>
    </el-card>
  </div>
</template>
<style scoped>
.hero {
  margin-top: var(--space-xl);
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
}
.hero__title {
  font-size: 28px;
  color: var(--text-primary);
}
.hero__desc {
  margin-top: var(--space-sm);
  color: var(--text-secondary);
}
.hero__actions {
  margin-top: var(--space-lg);
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
}
</style>
