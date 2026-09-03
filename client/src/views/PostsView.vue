<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, View, ChatDotRound, Pointer } from '@element-plus/icons-vue'
import { getPostList } from '../api/post'
import { getCategories } from '../api/catalog'
import InteractionButtons from '../components/InteractionButtons.vue'

// 列表数据
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 筛选条件
const categories = ref([])
const filters = ref({
  categoryId: '',
  tag: '',
  keyword: '',
  rank: ['latest'],
})

// 格式化时间：ISO → "2026-09-01 08:54"
function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 根据 id 找到分类名
function categoryName(id) {
  if (!id) return '未分类'
  const found = categories.value.find((c) => c.id === id)
  return found ? found.name : '未分类'
}

// 拉取帖子列表
async function loadList() {
  loading.value = true
  try {
    const data = await getPostList({
      page: page.value,
      pageSize: pageSize.value,
      categoryId: filters.value.categoryId || undefined,
      tag: filters.value.tag || undefined,
      keyword: filters.value.keyword || undefined,
      rank: filters.value.rank.join(',') || 'latest',
    })
    list.value = data.list
    total.value = data.total
  } catch (err) {
    ElMessage.error(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 切换分类/搜索/排序都回到第一页并重新加载
function handleFilterChange() {
  if (filters.value.rank.length === 0) {
    filters.value.rank = ['latest']
  }
  page.value = 1
  loadList()
}

function selectCategory(categoryId) {
  filters.value.categoryId = filters.value.categoryId === categoryId ? '' : categoryId
  handleFilterChange()
}

function searchByTag(tag) {
  filters.value.tag = tag
  filters.value.keyword = tag
  handleFilterChange()
}

function clearSearch() {
  filters.value.keyword = ''
  filters.value.tag = ''
  handleFilterChange()
}

// 翻页
function handlePageChange(p) {
  page.value = p
  loadList()
}

onMounted(async () => {
  loadList()
  try {
    categories.value = await getCategories()
  } catch (e) {
    ElMessage.error(e.message || '分类加载失败')
  }
})
</script>

<template>
  <div class="page-container">
    <!-- 顶部工具条：分类筛选 + 关键词搜索 + 组合排序 -->
    <div class="filter-bar">
      <div class="category-strip">
        <el-button
          :type="filters.categoryId === '' ? 'primary' : 'default'"
          round
          @click="selectCategory('')"
        >
          全部
        </el-button>
        <el-button
          v-for="c in categories"
          :key="c.id"
          :type="filters.categoryId === c.id ? 'primary' : 'default'"
          round
          @click="selectCategory(c.id)"
        >
          {{ c.name }}
        </el-button>
      </div>

      <el-input
        v-model="filters.keyword"
        placeholder="搜索标题、正文或点击标签搜索"
        clearable
        class="filter-bar__search"
        :prefix-icon="Search"
        @keyup.enter="handleFilterChange"
        @clear="clearSearch"
      />

      <el-checkbox-group
        v-model="filters.rank"
        class="filter-bar__rank"
        @change="handleFilterChange"
      >
        <el-checkbox-button value="latest">最新</el-checkbox-button>
        <el-checkbox-button value="hot">热门</el-checkbox-button>
        <el-checkbox-button value="recommend">猜你喜欢</el-checkbox-button>
      </el-checkbox-group>

    </div>

    <!-- 帖子列表 -->
    <el-card v-loading="loading" shadow="never" class="post-list">
      <el-empty v-if="!loading && list.length === 0" description="暂无帖子" />

      <div v-for="item in list" :key="item.id" class="post-card">
        <div class="post-card__head">
          <h3 class="post-card__title">{{ item.title }}</h3>
          <span class="post-card__category">{{ categoryName(item.categoryId) }}</span>
        </div>

        <div class="post-card__meta">
          <span class="post-card__author">{{ item.user?.nickname || '匿名用户' }}</span>
          <span class="post-card__time">{{ formatTime(item.createdAt) }}</span>
        </div>

        <!-- 标签 -->
        <div v-if="item.tags && item.tags.length" class="post-card__tags">
          <el-tag
            v-for="tag in item.tags"
            :key="tag"
            class="post-card__tag"
            size="small"
            effect="plain"
            @click="searchByTag(tag)"
          >
            {{ tag }}
          </el-tag>
        </div>

        <!-- 数据 + 互动按钮 -->
        <div class="post-card__stats">
          <div class="post-card__counts">
            <span
              ><el-icon><View /></el-icon> {{ item.viewCount }}</span
            >
            <span
              ><el-icon><ChatDotRound /></el-icon> {{ item.commentCount }}</span
            >
            <span
              ><el-icon><Pointer /></el-icon> {{ item.likeCount }}</span
            >
          </div>
          <InteractionButtons
            :post-id="item.id"
            :liked="item.isLiked"
            :like-count="item.likeCount"
            :favorited="item.isFavorite"
            :favorite-count="item.favoriteCount"
            size="small"
          />
        </div>
      </div>

      <el-pagination
        v-model:current-page="page"
        class="post-list__pagination"
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
.filter-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.category-strip {
  display: flex;
  gap: var(--space-xs);
  width: 100%;
  flex-wrap: wrap;
  padding-bottom: 2px;
}

.filter-bar__search {
  max-width: 320px;
}

.filter-bar__rank {
  flex-shrink: 0;
}

.post-card__tag {
  cursor: pointer;
  user-select: none;
}

.post-list {
  padding: var(--space-md);
}

.post-card {
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--border-color-light);
}

.post-card:last-child {
  border-bottom: none;
}

.post-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.post-card__title {
  font-size: 17px;
  color: var(--text-primary);
}

.post-card__category {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.post-card__meta {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-xs);
  color: var(--text-secondary);
  font-size: 13px;
}

.post-card__tags {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  flex-wrap: wrap;
}

.post-card__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  flex-wrap: wrap;
}

.post-card__counts {
  display: flex;
  gap: var(--space-md);
  color: var(--text-secondary);
  font-size: 13px;
}

.post-card__counts span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.post-list__pagination {
  margin-top: var(--space-md);
  justify-content: flex-end;
}
</style>
