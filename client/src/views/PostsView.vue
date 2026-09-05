<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, View, ChatDotRound } from '@element-plus/icons-vue'
import { getPostList } from '../api/post'
import { getCategories } from '../api/catalog'
import { getHotSearches, getSearchSuggestions } from '../api/search'
import InteractionButtons from '../components/InteractionButtons.vue'

const HISTORY_KEY = 'campushub-search-history'

// 获取当前路由实例
const route = useRoute()
const router = useRouter()

// 列表数据
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
// 筛选条件
const categories = ref([]) // 分类下拉数据
const searchVisible = ref(false)
const searchLoading = ref(false)
const searchHistories = ref([])
const hotSearches = ref([])
const suggestedSearches = ref([])
const searchAnchorRef = ref(null)
const filters = ref({
  categoryId: '',
  tag: '',
  keyword: '',
  rank: 'latest',
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
      rank: filters.value.rank || 'latest',
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
  if (!filters.value.rank) {
    filters.value.rank = 'latest'
  }
  page.value = 1
  loadList()
}

function loadSearchHistories() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    searchHistories.value = Array.isArray(raw) ? raw.slice(0, 8) : []
  } catch {
    searchHistories.value = []
  }
}

function saveSearchHistory(value) {
  const text = String(value || '').trim()
  if (!text) return
  const next = [text, ...searchHistories.value.filter((item) => item !== text)].slice(0, 8)
  searchHistories.value = next
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

function clearSearchHistories() {
  searchHistories.value = []
  localStorage.removeItem(HISTORY_KEY)
}

async function openSearchPanel() {
  searchVisible.value = true
  loadSearchHistories()
  searchLoading.value = true
  try {
    const [hot, suggested] = await Promise.all([getHotSearches(), getSearchSuggestions()])
    hotSearches.value = hot
    suggestedSearches.value = suggested
  } catch {
    hotSearches.value = []
    suggestedSearches.value = []
  } finally {
    searchLoading.value = false
  }
}

function submitSearch(value = filters.value.keyword) {
  const keyword = String(value || '').trim()
  if (!keyword) {
    ElMessage.warning('请输入搜索内容')
    return
  }
  filters.value.keyword = keyword
  filters.value.tag = ''
  searchVisible.value = false
  saveSearchHistory(keyword)
  router.push({ path: '/search', query: { q: keyword, type: 'posts', rank: 'all' } })
}

function handleDocumentMouseDown(event) {
  if (!searchVisible.value) return
  const target = event.target
  const clickedAnchor = searchAnchorRef.value?.contains(target)
  if (!clickedAnchor) {
    searchVisible.value = false
  }
}

function selectCategory(categoryId) {
  filters.value.categoryId = filters.value.categoryId === categoryId ? '' : categoryId
  handleFilterChange()
}

function searchByTag(tag) {
  filters.value.tag = tag
  filters.value.keyword = tag
  saveSearchHistory(tag)
  handleFilterChange()
}

function handleKeywordInput(value) {
  const keyword = String(value || '').trim()
  if (!keyword || keyword !== filters.value.tag) {
    filters.value.tag = ''
  }
}

function clearSearch() {
  filters.value.keyword = ''
  filters.value.tag = ''
  searchVisible.value = false
  router.replace({ path: '/post-page' })
  handleFilterChange()
}

function applyRouteQuery() {
  const queryTag = typeof route.query.tag === 'string' ? route.query.tag.trim() : ''
  const queryKeyword = typeof route.query.keyword === 'string' ? route.query.keyword.trim() : ''
  filters.value.tag = queryTag
  filters.value.keyword = queryKeyword || queryTag
}

// 翻页
function handlePageChange(p) {
  page.value = p
  loadList()
}

onMounted(async () => {
  document.addEventListener('mousedown', handleDocumentMouseDown)

  // 从URL读取页码，有合法值就直接定位到对应页
  const queryPage = parseInt(route.query.page)
  if (queryPage && queryPage > 0) {
    page.value = queryPage
  }

  applyRouteQuery()
  loadList()
  try {
    categories.value = await getCategories()
  } catch (e) {
    ElMessage.error(e.message || '分类加载失败')
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
})

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    page.value = 1
    loadList()
  }
)
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
      <div ref="searchAnchorRef" class="search-shell">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索标题、正文或点击标签搜索"
          clearable
          class="filter-bar__search"
          :prefix-icon="Search"
          @focus="openSearchPanel"
          @click="openSearchPanel"
          @input="handleKeywordInput"
          @keyup.enter="submitSearch()"
          @clear="clearSearch"
        />

        <div v-if="searchVisible" v-loading="searchLoading" class="post-search-panel">
          <section class="post-search-panel__section">
            <div class="post-search-panel__head">
              <h2>历史记录</h2>
              <el-button v-if="searchHistories.length" link type="info" @click="clearSearchHistories">
                清除记录
              </el-button>
            </div>
            <div v-if="searchHistories.length" class="post-search-panel__chips">
              <button v-for="item in searchHistories" :key="item" type="button" @click="submitSearch(item)">
                {{ item }}
              </button>
            </div>
            <p v-else class="post-search-panel__empty">暂无历史搜索</p>
          </section>

          <section class="post-search-panel__section">
            <div class="post-search-panel__head">
              <h2>猜你搜索</h2>
            </div>
            <div class="post-search-panel__grid">
              <button
                v-for="item in suggestedSearches"
                :key="item.keyword"
                type="button"
                @click="submitSearch(item.keyword)"
              >
                {{ item.keyword }}
              </button>
            </div>
          </section>

          <section class="post-search-panel__section">
            <div class="post-search-panel__head">
              <h2>热点搜索</h2>
            </div>
            <ol class="post-search-panel__hot">
              <li v-for="(item, index) in hotSearches" :key="item.keyword">
                <button type="button" @click="submitSearch(item.keyword)">
                  <span>{{ index + 1 }}</span>
                  {{ item.keyword }}
                </button>
              </li>
            </ol>
          </section>
        </div>
      </div>
      <el-radio-group v-model="filters.rank" class="filter-bar__rank" @change="handleFilterChange">
        <el-radio-button value="latest">最新</el-radio-button>
        <el-radio-button value="hot">热门</el-radio-button>
        <el-radio-button value="recommend">猜你喜欢</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 帖子列表 -->
    <el-card v-loading="loading" shadow="never" class="post-list">
      <el-empty v-if="!loading && list.length === 0" description="暂无帖子" />
      <div v-for="item in list" :key="item.id" class="post-card">
        <div class="post-card__head">
          <!-- 点击标题跳转详情页，携带当前分页页码 -->
          <router-link
            :to="{ path: `/post/${item.id}`, query: { page: page } }"
            class="post-card__title-link"
          >
            <h3 class="post-card__title">{{ item.title }}</h3>
          </router-link>
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
  justify-content: center;
  gap: var(--space-md);
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
.search-shell {
  position: relative;
  width: min(100%, 560px);
  max-width: 560px;
  z-index: 20;
}

.filter-bar__search {
  width: 100%;
}

.filter-bar__search :deep(.el-input__wrapper) {
  min-height: 42px;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}
.filter-bar__rank {
  flex-shrink: 0;
}

.post-search-panel {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: 100%;
  padding: var(--space-md);
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.post-search-panel__section + .post-search-panel__section {
  margin-top: var(--space-md);
}

.post-search-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.post-search-panel__head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
}

.post-search-panel__chips,
.post-search-panel__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.post-search-panel__chips button,
.post-search-panel__grid button,
.post-search-panel__hot button {
  border: 0;
  color: var(--text-regular);
  cursor: pointer;
  font: inherit;
}

.post-search-panel__chips button,
.post-search-panel__grid button {
  padding: 6px 12px;
  background: var(--bg-hover);
  border-radius: var(--radius-full);
}

.post-search-panel__chips button:hover,
.post-search-panel__grid button:hover,
.post-search-panel__hot button:hover {
  color: var(--brand-primary);
}

.post-search-panel__empty {
  margin: 0;
  color: var(--text-placeholder);
  font-size: 13px;
}

.post-search-panel__hot {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm) var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-search-panel__hot button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 0;
  overflow: hidden;
  background: transparent;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-search-panel__hot span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--brand-primary-light);
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 700;
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
  margin: 0;
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
/* 标题跳转链接样式 */
.post-card__title-link {
  text-decoration: none;
  color: inherit;
  transition: color 0.2s ease;
}
.post-card__title-link:hover {
  color: var(--color-primary);
}
</style>
