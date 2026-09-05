<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Document, EditPen, InfoFilled } from '@element-plus/icons-vue'
import { getPostList } from '../api/post'

const router = useRouter()
const activeRank = ref('recommend')
const posts = ref([])
const loading = ref(false)
const loadError = ref('')

const rankingModes = [
  { value: 'recommend', label: '推荐', description: '根据校园兴趣发现内容' },
  { value: 'hot', label: '热门', description: '看看大家正在讨论什么' },
  { value: 'latest', label: '最新', description: '刚刚发布的新鲜帖子' },
]

function formatTime(iso) {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(
    new Date(iso)
  )
}

async function loadPosts() {
  loading.value = true
  loadError.value = ''
  try {
    const data = await getPostList({ page: 1, pageSize: 3, rank: activeRank.value })
    posts.value = data.list || []
  } catch (error) {
    posts.value = []
    loadError.value = error.message || '暂时无法加载帖子'
  } finally {
    loading.value = false
  }
}

function openPost(post) {
  router.push({ name: 'PostDetail', params: { id: post.id } })
}

// 项目介绍是独立静态页（/about.html），用整页跳转而不是路由跳转
function goAbout() {
  window.location.href = '/about.html'
}

watch(activeRank, loadPosts)
onMounted(loadPosts)
</script>

<template>
  <div class="home-page">
    <section class="home-hero page-container">
      <div class="home-hero__copy">
        <span class="home-hero__eyebrow">CAMPUS HUB</span>
        <h1>欢迎来到校园社区</h1>
        <p>分享校园生活，找到同频的交流与灵感。</p>
        <div class="home-hero__actions">
          <el-button
            type="primary"
            size="large"
            :icon="Document"
            @click="router.push({ name: 'PostPage' })"
          >
            浏览帖子
          </el-button>
          <el-button size="large" plain :icon="EditPen" @click="router.push('/write')">
            写一篇帖子
          </el-button>
          <el-button size="large" plain :icon="InfoFilled" @click="goAbout"> 项目介绍 </el-button>
        </div>
      </div>
      <div class="home-hero__signal" aria-hidden="true">
        <span>一天的开始，从第一篇帖</span>
      </div>
    </section>

    <section class="home-feed page-container" aria-labelledby="feed-heading">
      <div class="home-feed__heading">
        <div>
          <span class="section-kicker">DISCOVER</span>
          <h2 id="feed-heading">校园动态</h2>
        </div>
        <router-link to="/post-page" class="home-feed__all"
          >查看全部 <span aria-hidden="true">→</span></router-link
        >
      </div>

      <div class="rank-tabs" role="tablist" aria-label="帖子排序">
        <button
          v-for="mode in rankingModes"
          :key="mode.value"
          type="button"
          class="rank-tab"
          :class="{ 'rank-tab--active': activeRank === mode.value }"
          :aria-selected="activeRank === mode.value"
          role="tab"
          @click="activeRank = mode.value"
        >
          <strong>{{ mode.label }}</strong>
          <span>{{ mode.description }}</span>
        </button>
      </div>

      <div v-loading="loading" class="post-grid" :aria-busy="loading">
        <button
          v-for="post in posts"
          :key="post.id"
          type="button"
          class="post-tile"
          @click="openPost(post)"
        >
          <div class="post-tile__topline">
            <span>{{ post.categoryName || '校园话题' }}</span
            ><time>{{ formatTime(post.createdAt) }}</time>
          </div>
          <h3>{{ post.title }}</h3>
          <p>{{ post.content || '这篇帖子还没有摘要，点击查看完整内容。' }}</p>
          <div class="post-tile__meta">
            <span>{{ post.author?.nickname || post.user?.username || '校园用户' }}</span
            ><span>{{ post.viewCount || 0 }} 次浏览</span>
          </div>
        </button>
      </div>

      <el-empty
        v-if="!loading && !posts.length && !loadError"
        description="还没有帖子，来发布第一篇吧"
      />
      <div v-if="!loading && loadError" class="home-feed__error">
        <p>{{ loadError }}</p>
        <el-button type="primary" link @click="activeRank = 'latest'">先看看最新帖子</el-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  background: var(--bg-page);
}
.home-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-2xl);
  padding-top: clamp(var(--space-2xl), 8vw, 96px);
  padding-bottom: clamp(var(--space-2xl), 7vw, 80px);
}
.home-hero__copy {
  max-width: 660px;
}
.home-hero__eyebrow,
.section-kicker {
  color: var(--brand-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.home-hero h1 {
  margin-top: var(--space-md);
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.1;
  letter-spacing: 0;
}
.home-hero p {
  margin-top: var(--space-md);
  color: var(--text-secondary);
  font-size: 18px;
}
.home-hero__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-xl);
}
.home-hero__signal {
  min-width: 170px;
  max-width: 220px;
  padding: var(--space-lg);
  border-left: 2px solid var(--brand-primary);
  color: var(--text-secondary);
  line-height: 1.6;
}
.home-feed {
  padding-top: 0;
  padding-bottom: var(--space-2xl);
}
.home-feed__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-md);
}
.home-feed h2 {
  margin-top: var(--space-xs);
  font-size: 30px;
}
.home-feed__all {
  color: var(--brand-primary);
  font-weight: 600;
}
.rank-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}
.rank-tab {
  display: grid;
  gap: var(--space-xs);
  min-height: 74px;
  padding: var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-white);
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}
.rank-tab:hover,
.rank-tab:focus-visible {
  border-color: var(--brand-primary-light);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}
.rank-tab:focus-visible,
.post-tile:focus-visible {
  outline: 2px solid var(--brand-primary);
  outline-offset: 2px;
}
.rank-tab strong {
  color: var(--text-primary);
  font-size: 16px;
}
.rank-tab span {
  font-size: 12px;
}
.rank-tab--active {
  border-color: var(--brand-primary);
  background: var(--brand-primary-light);
}
.post-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
  min-height: 160px;
  margin-top: var(--space-lg);
}
.post-tile {
  display: flex;
  flex-direction: column;
  min-height: 190px;
  padding: var(--space-lg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-white);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    box-shadow 160ms ease,
    transform 160ms ease;
}
.post-tile:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.post-tile__topline,
.post-tile__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
  color: var(--text-secondary);
  font-size: 12px;
}
.post-tile h3 {
  display: -webkit-box;
  overflow: hidden;
  margin-top: var(--space-md);
  color: var(--text-primary);
  font-size: 18px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.post-tile p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: var(--space-sm);
  color: var(--text-secondary);
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.post-tile__meta {
  margin-top: auto;
  padding-top: var(--space-lg);
}
.home-feed__error {
  padding: var(--space-xl) 0;
  color: var(--text-secondary);
  text-align: center;
}
@media (max-width: 860px) {
  .home-hero {
    align-items: flex-start;
    flex-direction: column;
  }
  .home-hero__signal {
    width: 100%;
  }
  .post-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .home-hero h1 {
    font-size: 38px;
  }
  .home-hero p {
    font-size: 16px;
  }
  .rank-tabs,
  .post-grid {
    grid-template-columns: 1fr;
  }
}
</style>
