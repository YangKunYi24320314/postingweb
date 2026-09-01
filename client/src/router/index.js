import { createRouter, createWebHistory } from 'vue-router'
import BaseLayout from '../layouts/BaseLayout.vue'

// TODO：每个页面在后面功能开发时替换成真实页面
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
        path: 'posts',
        name: 'Posts',
        component: () => import('../views/PostsView.vue'),
        meta: { title: '帖子广场' },
      },
      {
        path: 'records',
        name: 'Records',
        component: () => import('../views/RecordsView.vue'),
        meta: { title: '记录中心' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/ProfileView.vue'),
        meta: { title: '个人中心' },
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

export default router
