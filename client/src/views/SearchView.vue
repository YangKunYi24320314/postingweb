<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Plus, Search, Star, View } from '@element-plus/icons-vue'
import { ThumbsUp } from 'lucide-vue-next'
import { requestFriend } from '../api/friends'
import { getHotSearches, getSearchSuggestions, searchPosts, searchUsers } from '../api/search'

const route = useRoute()
const router = useRouter()
const HISTORY_KEY = 'campushub-search-history'

const keyword = ref('')
const activeType = ref('posts')
const rank = ref('all')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const posts = ref([])
const users = ref([])
const loading = ref(false)
const addingUserId = ref(null)
const searchBoxRef = ref(null)
const searchVisible = ref(false)
const searchLoading = ref(false)
const searchHistories = ref([])
const hotSearches = ref([])
const suggestedSearches = ref([])

const rankOptions = [
  { label: '全部', value: 'all' },
  { label: '最新', value: 'latest' },
  { label: '最热', value: 'hot' },
]

function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function applyRouteQuery() {
  keyword.value =
    typeof route.query.q === 'string'
      ? route.query.q
      : typeof route.query.keyword === 'string'
        ? route.query.keyword
        : ''
  activeType.value = route.query.type === 'users' ? 'users' : 'posts'
  rank.value = rankOptions.some((item) => item.value === route.query.rank) ? route.query.rank : 'all'
  page.value = Math.max(1, parseInt(route.query.page, 10) || 1)
}

function pushSearch(next = {}) {
  const q = String(next.keyword ?? keyword.value).trim()
  if (!q) {
    ElMessage.warning('请输入搜索内容')
    return
  }

  router.push({
    path: '/search',
    query: {
      q,
      type: next.type || activeType.value,
      rank: next.rank || rank.value,
      page: next.page || 1,
    },
  })
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
    hotSearches.value = hot || []
    suggestedSearches.value = suggested || []
  } catch {
    hotSearches.value = []
    suggestedSearches.value = []
  } finally {
    searchLoading.value = false
  }
}

async function loadResults() {
  const q = String(keyword.value || '').trim()
  if (!q) {
    posts.value = []
    users.value = []
    total.value = 0
    return
  }

  loading.value = true
  try {
    if (activeType.value === 'users') {
      const data = await searchUsers({ keyword: q, page: page.value, pageSize: pageSize.value })
      users.value = data.list || []
      total.value = data.total || 0
    } else {
      const data = await searchPosts({
        keyword: q,
        rank: rank.value,
        page: page.value,
        pageSize: pageSize.value,
      })
      posts.value = data.list || []
      total.value = data.total || 0
    }
  } catch (err) {
    ElMessage.error(err.message || '搜索失败')
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  saveSearchHistory(keyword.value)
  searchVisible.value = false
  pushSearch({ page: 1 })
}

function submitSearch(value) {
  keyword.value = value
  saveSearchHistory(value)
  searchVisible.value = false
  pushSearch({ keyword: value, page: 1 })
}

function switchType(type) {
  if (activeType.value === type) return
  activeType.value = type
  pushSearch({ type, page: 1 })
}

function switchRank(value) {
  if (rank.value === value) return
  rank.value = value
  pushSearch({ rank: value, type: 'posts', page: 1 })
}

function handlePageChange(value) {
  pushSearch({ page: value })
}

function searchTag(tag) {
  keyword.value = tag
  saveSearchHistory(tag)
  pushSearch({ keyword: tag, type: 'posts', rank: 'all', page: 1 })
}

function handleDocumentMouseDown(event) {
  if (!searchVisible.value) return
  const target = event.target
  if (!searchBoxRef.value?.contains(target)) {
    searchVisible.value = false
  }
}

function friendshipLabel(status) {
  const map = {
    self: '自己',
    friends: '已是好友',
    pending_sent: '已申请',
    pending_received: '待同意',
  }
  return map[status] || '加好友'
}

function canAddFriend(user) {
  return user.friendshipStatus === 'none'
}

async function handleAddFriend(user) {
  if (!canAddFriend(user)) return
  addingUserId.value = user.id
  try {
    await requestFriend(user.id)
    user.friendshipStatus = 'pending_sent'
    ElMessage.success('好友申请已发送')
  } catch (err) {
    ElMessage.error(err.message || '发送好友申请失败')
  } finally {
    addingUserId.value = null
  }
}

function goPost(post) {
  router.push(`/post/${post.id}`)
}

function goUser(user) {
  router.push(`/user/${user.id}`)
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentMouseDown)
  applyRouteQuery()
  loadResults()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
})

watch(
  () => route.query,
  () => {
    applyRouteQuery()
    loadResults()
  }
)
</script>

<template>
  <div class="page-container search-page">
    <section class="search-hero">
      <div ref="searchBoxRef" class="search-box">
        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          placeholder="搜索帖子标题、正文、标签或用户名"
          clearable
          @focus="openSearchPanel"
          @click="openSearchPanel"
          @keyup.enter="handleSubmit"
        >
          <template #suffix>
            <button class="search-submit" type="button" aria-label="搜索" @mousedown.prevent @click="handleSubmit">
              <el-icon><Search /></el-icon>
            </button>
          </template>
        </el-input>

        <div v-if="searchVisible" v-loading="searchLoading" class="search-suggest-panel">
          <section class="search-suggest-panel__section">
            <div class="search-suggest-panel__head">
              <h2>历史记录</h2>
              <el-button v-if="searchHistories.length" link type="info" @click="clearSearchHistories">
                清除记录
              </el-button>
            </div>
            <div v-if="searchHistories.length" class="search-suggest-panel__chips">
              <button v-for="item in searchHistories" :key="item" type="button" @click="submitSearch(item)">
                {{ item }}
              </button>
            </div>
            <p v-else class="search-suggest-panel__empty">暂无历史搜索</p>
          </section>

          <section class="search-suggest-panel__section">
            <div class="search-suggest-panel__head">
              <h2>猜你搜索</h2>
            </div>
            <div class="search-suggest-panel__grid">
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

          <section class="search-suggest-panel__section">
            <div class="search-suggest-panel__head">
              <h2>热点搜索</h2>
            </div>
            <ol class="search-suggest-panel__hot">
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
    </section>

    <section class="result-panel">
      <div class="result-tabs">
        <button :class="{ active: activeType === 'posts' }" type="button" @click="switchType('posts')">
          帖子
        </button>
        <button :class="{ active: activeType === 'users' }" type="button" @click="switchType('users')">
          用户
        </button>
      </div>

      <div v-if="activeType === 'posts'" class="rank-tabs">
        <button
          v-for="item in rankOptions"
          :key="item.value"
          :class="{ active: rank === item.value }"
          type="button"
          @click="switchRank(item.value)"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-loading="loading" class="result-list">
        <el-empty
          v-if="!loading && activeType === 'posts' && posts.length === 0"
          description="暂无相关帖子"
        />
        <article v-for="post in posts" v-else-if="activeType === 'posts'" :key="post.id" class="post-result">
          <div class="post-result__body" @click="goPost(post)">
            <div class="post-result__main">
              <h2>{{ post.title }}</h2>
              <p>{{ post.categoryName || '未分类' }} · {{ post.user?.nickname || '匿名用户' }} · {{ formatTime(post.createdAt) }}</p>
              <div v-if="post.tags?.length" class="tag-row" @click.stop>
                <button v-for="tag in post.tags" :key="tag" type="button" @click="searchTag(tag)">
                  {{ tag }}
                </button>
              </div>
            </div>
            <div class="post-result__stats">
              <span><el-icon><View /></el-icon>{{ post.viewCount || 0 }}</span>
              <span><el-icon><ChatDotRound /></el-icon>{{ post.commentCount || 0 }}</span>
              <span><ThumbsUp :size="16" />{{ post.likeCount || 0 }}</span>
              <span><el-icon><Star /></el-icon>{{ post.favoriteCount || 0 }}</span>
            </div>
          </div>
        </article>

        <el-empty
          v-if="!loading && activeType === 'users' && users.length === 0"
          description="暂无相关用户"
        />
        <article v-for="user in users" v-else-if="activeType === 'users'" :key="user.id" class="user-result">
          <button class="user-result__profile" type="button" @click="goUser(user)">
            <el-avatar :size="46" :src="user.avatarUrl">
              {{ (user.nickname || user.username || '?').slice(0, 1) }}
            </el-avatar>
            <span>
              <strong>{{ user.nickname || user.username }}</strong>
              <small>@{{ user.username }} · {{ user.postCount }} 篇帖子</small>
              <em>{{ user.bio || '这个同学还没有写简介' }}</em>
            </span>
          </button>
          <el-button
            :type="canAddFriend(user) ? 'primary' : 'default'"
            :disabled="!canAddFriend(user)"
            :loading="addingUserId === user.id"
            round
            @click="handleAddFriend(user)"
          >
            <el-icon v-if="canAddFriend(user)"><Plus /></el-icon>
            {{ friendshipLabel(user.friendshipStatus) }}
          </el-button>
        </article>
      </div>

      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="page"
        class="search-pagination"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        @current-change="handlePageChange"
      />
    </section>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 1120px;
}

.search-hero {
  display: flex;
  justify-content: center;
  padding: 10px 0 18px;
}

.search-box {
  position: relative;
  width: min(100%, 760px);
  z-index: 20;
}

.search-box :deep(.el-input__wrapper) {
  min-height: 52px;
  padding-right: 8px;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}

.search-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: var(--brand-primary);
  color: #fff;
  cursor: pointer;
  transition:
    background 0.18s ease,
    transform 0.18s ease;
}

.search-submit:hover {
  background: var(--brand-primary-hover);
  transform: translateY(-1px);
}

.search-suggest-panel {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  width: 100%;
  padding: var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-white);
  box-shadow: var(--shadow-lg);
}

.search-suggest-panel__section + .search-suggest-panel__section {
  margin-top: var(--space-md);
}

.search-suggest-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
}

.search-suggest-panel__head h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
}

.search-suggest-panel__chips,
.search-suggest-panel__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.search-suggest-panel__chips button,
.search-suggest-panel__grid button,
.search-suggest-panel__hot button {
  border: 0;
  color: var(--text-regular);
  cursor: pointer;
  font: inherit;
}

.search-suggest-panel__chips button,
.search-suggest-panel__grid button {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--bg-hover);
}

.search-suggest-panel__chips button:hover,
.search-suggest-panel__grid button:hover,
.search-suggest-panel__hot button:hover {
  color: var(--brand-primary);
}

.search-suggest-panel__empty {
  margin: 0;
  color: var(--text-placeholder);
  font-size: 13px;
}

.search-suggest-panel__hot {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm) var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.search-suggest-panel__hot button {
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

.search-suggest-panel__hot span {
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

.result-panel {
  min-height: 520px;
  padding: 24px 28px;
  border: 1px solid var(--border-color-light);
  border-radius: var(--radius-md);
  background: var(--bg-white);
  box-shadow: var(--shadow-sm);
}

.result-tabs,
.rank-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-tabs {
  border-bottom: 1px solid var(--border-color-light);
}

.result-tabs button,
.rank-tabs button {
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
}

.result-tabs button {
  position: relative;
  padding: 0 4px 14px;
  font-size: 17px;
  font-weight: 700;
}

.result-tabs button.active {
  color: var(--brand-primary);
}

.result-tabs button.active::after {
  position: absolute;
  right: 4px;
  bottom: -1px;
  left: 4px;
  height: 3px;
  border-radius: var(--radius-full);
  background: var(--brand-primary);
  content: '';
}

.rank-tabs {
  margin-top: 16px;
}

.rank-tabs button {
  padding: 8px 18px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  background: var(--bg-white);
}

.rank-tabs button.active {
  border-color: var(--brand-primary);
  background: var(--brand-primary);
  color: #fff;
}

.result-list {
  min-height: 360px;
  margin-top: 16px;
}

.post-result,
.user-result {
  border-bottom: 1px solid var(--border-color-light);
}

.post-result__body,
.user-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 0;
}

.post-result__body {
  cursor: pointer;
}

.post-result__main h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
}

.post-result__main p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.tag-row button {
  padding: 4px 10px;
  border: 1px solid var(--brand-primary-light);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--brand-primary);
  cursor: pointer;
}

.post-result__stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.post-result__stats span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.user-result__profile {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.user-result__profile :deep(.el-avatar) {
  flex-shrink: 0;
}

.user-result__profile span {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.user-result__profile strong {
  color: var(--text-primary);
  font-size: 16px;
}

.user-result__profile small,
.user-result__profile em {
  color: var(--text-secondary);
  font-size: 13px;
  font-style: normal;
}
.user-result__profile em {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.search-pagination {
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 720px) {
  .search-box {
    width: 100%;
  }

  .post-result__body,
  .user-result {
    align-items: flex-start;
    flex-direction: column;
  }

  .post-result__stats {
    flex-wrap: wrap;
  }
}
</style>
