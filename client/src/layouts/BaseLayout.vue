<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChatDotRound, EditPen, Clock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { clearToken, getToken } from '../api/request'
import { getAuthAction, logout } from '../utils/auth-navigation'

const route = useRoute()
const router = useRouter()
const authAction = computed(() => getAuthAction(getToken()))

// 侧边/顶部导航当前激活的菜单项（用当前路由路径匹配）
const activeMenu = computed(() => route.path)

const menuItems = [
  { index: '/', label: '首页', icon: ChatDotRound },
  { index: '/posts', label: '帖子广场', icon: EditPen },
  { index: '/records', label: '记录中心', icon: Clock },
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

        <!-- 顶部导航：index=路由地址，router 属性让点击自动跳转 -->
        <el-menu :default-active="activeMenu" mode="horizontal" router class="layout__menu">
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
          <!-- TODO：有用户信息后，替换成头像下拉菜单 -->
        </div>
      </div>
    </el-header>

    <el-main class="layout__main">
      <router-view />
    </el-main>

    <el-footer class="layout__footer"> 校园发帖社区 · 第1组 · © 2026 </el-footer>
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
}

.layout__logo-dot {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--brand-gradient);
  color: #fff;
  font-weight: 700;
}

.layout__logo-text {
  font-size: 18px;
  font-weight: 700;
}

.layout__menu {
  border-bottom: none;
  height: 100%;
}

.layout__main {
  padding: 0;
}

.layout__footer {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
