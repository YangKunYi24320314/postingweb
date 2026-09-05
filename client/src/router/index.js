import { createRouter, createWebHistory } from 'vue-router'
import BaseLayout from '../layouts/BaseLayout.vue'
import { getToken } from '../api/request'
import { getMe } from '../api/auth' // 引入获取当前用户信息接口

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
      // ========== 管理员子路由（嵌套在主布局内，共用侧边栏） ==========
      {
        path: 'admin/deleted-posts',
        name: 'AdminDeletedPosts',
        component: () => import('../views/admin/AdminDeletedPosts.vue'),
        meta: { title: '帖子回收站', requiresAuth: true, requiresAdmin: true },
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes })

// ========== 扩展全局守卫：新增管理员权限校验 ==========
router.beforeEach(async (to) => {
  // 已登录用户访问登录页，直接跳首页
  if (to.name === 'Login' && getToken()) return { path: '/' }

  // 需要登录但无 token，跳登录页并携带重定向地址
  if (to.meta.requiresAuth && !getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 需要管理员权限：校验用户角色
  if (to.meta.requiresAdmin) {
    try {
      const userInfo = await getMe()
      // 非管理员用户强制跳回首页
      if (userInfo.role !== 'admin') {
        return { path: '/' }
      }
    } catch (err) {
      // 获取用户信息失败（token 失效等），跳登录页
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 校园社区` : '校园社区'
})

export default router
