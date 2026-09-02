<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMyPosts, getMyFavorites, getMyLikes } from '../api/record'

const activeTab = ref('posts') // 当前激活的页签
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 页签名 → 对应的接口函数（一个对象把"三个页签"和"三个接口"对应起来）
const fetchers = {
  posts: getMyPosts,
  favorites: getMyFavorites,
  likes: getMyLikes,
}

async function loadList() {
  loading.value = true
  try {
    // 根据当前页签，调用对应的接口（三个接口返回结构一样，所以能共用同一个表格）
    const data = await fetchers[activeTab.value]({ page: page.value, pageSize: pageSize.value })
    list.value = data.list
    total.value = data.total
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 切换页签：回到第一页并重新加载
function handleTabChange(name) {
  activeTab.value = name
  page.value = 1
  loadList()
}

// 翻页
function handlePageChange(p) {
  page.value = p
  loadList()
}

function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadList)
</script>

<template>
  <div class="page-container">
    <el-card shadow="never">
      <h2 class="profile__title">个人主页</h2>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="我发布的" name="posts" />
        <el-tab-pane label="我收藏的" name="favorites" />
        <el-tab-pane label="我点赞的" name="likes" />
      </el-tabs>

      <el-table :data="list" v-loading="loading" empty-text="暂无内容">
        <el-table-column prop="title" label="帖子标题" min-width="200" />
        <el-table-column label="作者" width="140">
          <template #default="{ row }">{{ row.author?.nickname || '匿名用户' }}</template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="80" />
        <el-table-column prop="likeCount" label="点赞" width="80" />
        <el-table-column prop="commentCount" label="评论" width="80" />
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="profile__pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        v-model:current-page="page"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<style scoped>
.profile__title {
  font-size: 18px;
  color: var(--text-primary);
  margin-bottom: var(--space-md);
}
.profile__pagination {
  margin-top: var(--space-md);
  justify-content: flex-end;
}
</style>