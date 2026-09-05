<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChatDotRound, EditPen } from '@element-plus/icons-vue'
import { Github, LifeBuoy, Mail } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { clearToken, getToken } from '../api/request'
import { getAuthAction, logout } from '../utils/auth-navigation'

const route = useRoute()
const router = useRouter()
const authAction = computed(() => getAuthAction(getToken()))
const repositoryUrl = 'https://github.com/YangKunYi24320314/postingweb'
const contactEmail = '205613196@qq.com'
const teamMailto = `mailto:${contactEmail}?subject=团队联系`
const feedbackMailto = `mailto:${contactEmail}?subject=建议与投诉`

const activeMenu = computed(() => route.path)
const menuItems = [
  { index: '/', label: '首页', icon: ChatDotRound },
  { index: '/post-page', label: '帖子广场', icon: EditPen },
]

function handleAuthAction() {
  router.push(authAction.value.path)
}

function handleLogout() {
  logout({
    clearToken,
    navigate: (path) => router.push(path),
  })
  ElMessage.success('已退出登录')
}
</script>

<template>
  <el-container class="layout">
    <el-header class="layout__header">
      <div class="layout__inner">
        <router-link to="/" class="layout__logo">
          <span class="layout__logo-dot">C</span>
          <span class="layout__logo-text">校园社区</span>
        </router-link>

        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          router
          :ellipsis="false"
          class="layout__menu"
        >
          <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>

        <div class="layout__actions">
          <el-button type="primary" round @click="handleAuthAction">
            {{ authAction.label }}
          </el-button>
          <el-button v-if="authAction.path === '/profile'" link type="info" @click="handleLogout">
            退出登录
          </el-button>
        </div>
      </div>
    </el-header>

    <el-main class="layout__main">
      <router-view />
    </el-main>

    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__brand">
          <div class="site-footer__brand-mark" aria-hidden="true">C</div>
          <div>
            <p class="site-footer__brand-name">校园社区</p>
            <p class="site-footer__tagline">分享校园生活，记录真实交流</p>
          </div>
        </div>

        <nav class="site-footer__column" aria-label="产品">
          <h2>产品</h2>
          <a
            :href="repositoryUrl"
            target="_blank"
            rel="noreferrer"
            class="site-footer__link"
            aria-label="打开 GitHub 项目仓库"
          >
            <Github :size="17" aria-hidden="true" />
            <span>GitHub</span>
          </a>
        </nav>

        <nav class="site-footer__column" aria-label="关于">
          <h2>关于</h2>
          <a :href="teamMailto" class="site-footer__link">
            <Mail :size="17" aria-hidden="true" />
            <span>团队</span>
          </a>
        </nav>

        <nav class="site-footer__column" aria-label="帮助">
          <h2>帮助</h2>
          <a :href="feedbackMailto" class="site-footer__link">
            <LifeBuoy :size="17" aria-hidden="true" />
            <span>建议与投诉</span>
          </a>
        </nav>
      </div>
      <div class="site-footer__bottom">校园贴吧 · © 2026</div>
    </footer>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.layout__header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  height: 60px;
  padding: 0;
}

.layout__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-md);
  height: 100%;
}

.layout__logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.layout__logo-dot,
.site-footer__brand-mark {
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--brand-gradient);
  color: var(--bg-white);
  font-weight: 700;
}

.layout__logo-dot {
  width: 34px;
  height: 34px;
}

.layout__logo-text {
  font-size: 18px;
  font-weight: 700;
}

.layout__menu {
  flex: 1;
  min-width: 0;
  margin: 0 var(--space-lg);
  border-bottom: none;
  height: 100%;
}

.layout__main {
  flex: 1;
  padding: 0;
}

.site-footer {
  background: var(--footer-bg);
  color: var(--footer-text);
}

.site-footer__inner {
  display: grid;
  grid-template-columns: minmax(220px, 1.7fr) repeat(3, minmax(120px, 1fr));
  gap: var(--space-2xl);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-md);
}

.site-footer__brand {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
}

.site-footer__brand-mark {
  width: 40px;
  height: 40px;
  font-size: 18px;
}

.site-footer__brand-name {
  color: var(--footer-heading);
  font-size: 18px;
  font-weight: 700;
}

.site-footer__tagline {
  margin-top: var(--space-xs);
  color: var(--footer-muted);
  font-size: 13px;
}

.site-footer__column h2 {
  margin-bottom: var(--space-md);
  color: var(--footer-heading);
  font-size: 14px;
  font-weight: 600;
}

.site-footer__link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--footer-text);
  font-size: 14px;
  line-height: 1.5;
  transition: color 160ms ease;
}

.site-footer__link:hover,
.site-footer__link:focus-visible {
  color: var(--footer-link-hover);
}

.site-footer__link:focus-visible {
  outline: 2px solid var(--footer-focus);
  outline-offset: 4px;
}

.site-footer__bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-md);
  border-top: 1px solid var(--footer-border);
  color: var(--footer-muted);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 720px) {
  .layout__inner {
    padding: 0 var(--space-sm);
  }

  .layout__menu {
    margin: 0 var(--space-sm);
  }

  .layout__logo-text {
    display: none;
  }

  .site-footer__inner {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg) var(--space-md);
  }

  .site-footer__brand {
    grid-column: 1 / -1;
  }
}
</style>
