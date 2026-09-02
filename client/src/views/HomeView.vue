<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EditPen, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCategories, getTags } from '../api/catalog'

const router = useRouter()
const categories = ref([])
const tags = ref([])

onMounted(async () => {
  try {
    ;[categories.value, tags.value] = await Promise.all([getCategories(), getTags()])
  } catch (error) {
    ElMessage.error(error.message || '分类标签加载失败')
  }
})
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
          @click="router.push('/posts')"
        >
          去帖子广场
        </el-button>
        <el-button size="large" round plain :icon="EditPen" @click="router.push('/login')">
          写一篇帖子
        </el-button>
      </div>
    </el-card>

    <div class="home__catalogs">
      <el-card shadow="never">
        <template #header><span class="section-title">热门分类</span></template>
        <el-space wrap>
          <el-tag v-for="item in categories" :key="item.id" type="primary">
            {{ item.name }}
          </el-tag>
        </el-space>
      </el-card>
      <el-card shadow="never">
        <template #header><span class="section-title">常用标签</span></template>
        <el-space wrap>
          <el-tag v-for="tag in tags" :key="tag" effect="plain">{{ tag }}</el-tag>
        </el-space>
      </el-card>
    </div>
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

.home__catalogs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.section-title {
  font-weight: 700;
}

@media (max-width: 720px) {
  .home__catalogs {
    grid-template-columns: 1fr;
  }
}
</style>
