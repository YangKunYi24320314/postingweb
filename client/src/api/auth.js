// 认证相关接口：每个功能模块一个文件，这里只放认证的。
// 使用方式示例：const data = await login({ username, password })
import request from './request'

export function login(data) {
  return request.post('/auth/login', data)
}

export function register(data) {
  return request.post('/auth/register', data)
}

export function getMe() {
  return request.get('/auth/me')
}

export function updateProfile(data) {
  return request.put('/auth/profile', data)
}

export function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)
  return request.post('/auth/avatar', formData)
}

export function getPublicUser(id) {
  return request.get(`/users/${id}`)
}
