import { createRouter, createWebHistory } from 'vue-router'
import BaseLayout from '../layouts/BaseLayout.vue'
import { getToken } from '../api/request'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: BaseLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/HomeView.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/ProfileView.vue'),
        meta: { title: '个人中心', requiresAuth: true },
      },
      {
        path: 'users/:id',
        name: 'UserProfile',
        component: () => import('../views/UserProfileView.vue'),
        meta: { title: '用户主页' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 浏览器标签页标题跟随页面
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 校园社区` : '校园社区'
})

router.beforeEach((to) => {
  if (to.name === 'Login' && getToken()) {
    return { path: '/' }
  }
  if (to.meta.requiresAuth && !getToken()) {
    return { path: '/login' }
  }
})

export default router
