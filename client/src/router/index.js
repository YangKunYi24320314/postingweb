import { createRouter, createWebHistory } from 'vue-router'
import BaseLayout from '../layouts/BaseLayout.vue'
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
      // ✅ 子路由去掉开头的 /，path 改为 post‑page
      {
        path: 'post-page',
        name: 'PostPage',
        component: () => import('../views/PostsView.vue'),
        meta: { title: '帖子广场' },
      },
      {
        path: 'write',
        name: 'WritePost',
        component: () => import('../views/WritePostView.vue'),
        meta: { title: '写帖子' }
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

router.beforeEach((to, from, next) => {
  next()
})
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 校园社区` : '校园社区'
})
export default router
