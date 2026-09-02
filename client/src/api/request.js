// 统一的请求封装：全队所有前端请求都通过这里，不要在页面里直接写 axios。
// 好处：
//   1. 自动加上登录 token（Authorization: Bearer xxx）
//   2. 自动解开后端的 { code, message, data } 包装 —— 调用方拿到的直接就是 data
//   3. 集中处理错误提示、登录失效自动跳回登录页
import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// token 存到 localStorage，刷新页面也还在
const TOKEN_KEY = 'token'

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// 统一处理后端返回的 { code, message, data }
function handleResponse(res) {
  if (res.code === 0) {
    return res.data // 成功：直接把 data 返回，调用方拿到的就是数据本身
  }
  // 登录已失效：清除 token，跳回登录页
  if (res.code === 1002) {
    clearToken()
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
  return Promise.reject(new Error(res.message || '请求失败'))
}

// 请求拦截器：每个请求自动带上 token
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：解包 + 统一错误提示
request.interceptors.response.use(
  (response) => handleResponse(response.data),
  (error) => {
    // 后端出错时也会返回 { code, message, data }，从这里尽量读出真实信息
    const res = error.response && error.response.data
    if (res && typeof res.code === 'number') {
      return handleResponse(res)
    }
    return Promise.reject(new Error('网络异常，请稍后重试'))
  }
)

export default request
