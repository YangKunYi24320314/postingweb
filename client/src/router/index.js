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
        path: 'post-page',
        name: 'PostPage',
        component: () => import('../views/PostsView.vue'),
        meta: { title: '帖子广场' },
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('../views/SearchView.vue'),
        meta: { title: '搜索' },
      },
      {
        path: 'messages',
        name: 'Messages',
        component: () => import('../views/MessagesView.vue'),
        meta: { title: '消息', requiresAuth: true },
      },
      {
        path: 'messages/chat/:friendId',
        name: 'Chat',
        component: () => import('../views/ChatView.vue'),
        meta: { title: '聊天', requiresAuth: true },
      },
      {
        path: 'post/:id',
        name: 'PostDetail',
        component: () => import('../views/PostDetailView.vue'),
        meta: { title: '帖子详情' },
      },
      {
        path: 'write',
        name: 'WritePost',
        component: () => import('../views/WritePostView.vue'),
        meta: { title: '写帖子', requiresAuth: true },
      },
      {
        path: 'records',
        name: 'Records',
        component: () => import('../views/RecordsView.vue'),
        meta: { title: '记录中心', requiresAuth: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/ProfileView.vue'),
        meta: { title: '个人中心', requiresAuth: true },
      },
      {
        path: 'security',
        name: 'SecurityCenter',
        component: () => import('../views/SecurityCenterView.vue'),
        meta: { title: '安全中心', requiresAuth: true },
      },
      {
        path: 'user/:id',
        name: 'OtherProfile',
        component: () => import('../views/OtherProfileView.vue'),
        meta: { title: '个人主页' },
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (to.name === 'Login' && getToken()) return { path: '/' }
  if (to.meta.requiresAuth && !getToken())
    return { path: '/login', query: { redirect: to.fullPath } }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 校园社区` : '校园社区'
})

export default router
