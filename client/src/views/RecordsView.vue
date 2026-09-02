<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getHistory, clearHistory } from '../api/record'

// 页面数据（都用 ref 包起来，改了自动更新界面）
const list = ref([])        // 表格要显示的行
const total = ref(0)        // 总条数（分页用）
const page = ref(1)         // 当前页码
const pageSize = ref(10)    // 每页条数
const loading = ref(false)  // 是否加载中

// 拉取浏览记录
async function loadHistory() {
  loading.value = true
  try {
    // 组长的 request.js 已经解包过，这里直接拿到 { list, total, page, pageSize }
    const data = await getHistory({ page: page.value, pageSize: pageSize.value })
    list.value = data.list
    total.value = data.total
  } catch (err) {
    // request.js 不自动弹错误提示，页面要自己 catch 并提示
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 翻页：换页后重新拉数据
function handlePageChange(p) {
  page.value = p
  loadHistory()
}

// 清空浏览记录
async function handleClear() {
  try {
    await clearHistory()
    ElMessage.success('已清空浏览记录')
    page.value = 1
    loadHistory() // 清空后回到第一页并刷新
  } catch (err) {
    ElMessage.error(err.message || '清空失败')
  }
}

// 时间格式化：ISO 字符串 → "2026-09-02 01:49"
function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 页面"挂载"完成时（即用户打开这个页面时）执行一次，触发首次加载
onMounted(() => {
  loadHistory()
})
</script>

<template>
  <div class="page-container">
    <el-card shadow="never">
      <div class="records__header">
        <h2 class="records__title">我的浏览记录</h2>
        <el-popconfirm title="确定清空所有浏览记录吗？" @confirm="handleClear">
          <template #reference>
            <el-button type="danger" plain :disabled="total === 0">清空浏览记录</el-button>
          </template>
        </el-popconfirm>
      </div>

      <el-table v-loading="loading" :data="list" empty-text="暂无浏览记录">
        <el-table-column prop="title" label="帖子标题" min-width="200" />
        <el-table-column label="作者" width="140">
          <template #default="{ row }">
            {{ row.author?.nickname || '匿名用户' }}
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="80" />
        <el-table-column prop="likeCount" label="点赞" width="80" />
        <el-table-column prop="commentCount" label="评论" width="80" />
        <el-table-column label="浏览时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.viewedAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        class="records__pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<style scoped>
.records__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}
.records__title {
  font-size: 18px;
  color: var(--text-primary);
}
.records__pagination {
  margin-top: var(--space-md);
  justify-content: flex-end;
}
</style>