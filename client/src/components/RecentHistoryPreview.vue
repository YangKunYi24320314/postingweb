<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Clock } from '@element-plus/icons-vue'
import { getHistory } from '../api/record'

const router = useRouter()

// 最近几条浏览记录（预览用，只取前 5 条）
const list = ref([])
const loading = ref(false)

function goPost(row) {
  router.push(`/post/${row.id}`)
}

async function loadRecent() {
  loading.value = true
  try {
    const data = await getHistory({ page: 1, pageSize: 5 })
    list.value = data.list
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 点击"查看浏览历史"→ 跳到记录中心页（完整历史）
function goHistory() {
  router.push('/records')
}

function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadRecent)
</script>

<template>
  <el-card shadow="never" class="recent-history">
    <div class="recent-history__header">
      <h2 class="recent-history__title">最近浏览</h2>
      <el-button type="primary" plain :icon="Clock" @click="goHistory">查看浏览历史</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      empty-text="暂无浏览记录"
      size="small"
      @row-click="goPost"
    >
      <el-table-column prop="title" label="帖子标题" min-width="180" />
      <el-table-column label="作者" width="110">
        <template #default="{ row }">{{ row.author?.nickname || '匿名用户' }}</template>
      </el-table-column>
      <el-table-column label="浏览时间" width="160">
        <template #default="{ row }">{{ formatTime(row.viewedAt) }}</template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<style scoped>
:deep(.el-table__row) {
  cursor: pointer;
}

.recent-history {
  margin-top: var(--space-lg);
}

.recent-history__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.recent-history__title {
  font-size: 18px;
  color: var(--text-primary);
  margin: 0;
}
</style>
