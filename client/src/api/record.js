// src/api/record.js —— 记录中心模块的接口函数（曾繁一）。
// 页面里只 import 这里的函数调用，绝不直接写 axios。
import request from './request'

// 上报一次浏览：进入帖子详情时调用
export function reportView(postId) {
  return request.post(`/posts/${postId}/view`)
}

// 我的浏览记录（传 { page, pageSize }）
export function getHistory(params) {
  return request.get('/me/history', { params })
}

// 清空浏览记录
export function clearHistory() {
  return request.delete('/me/history')
}

// 我发布的帖子
export function getMyPosts(params) {
  return request.get('/me/posts', { params })
}

// 我收藏的帖子
export function getMyFavorites(params) {
  return request.get('/me/favorites', { params })
}

// 我点赞的帖子
export function getMyLikes(params) {
  return request.get('/me/likes', { params })
}

// 上传头像（FormData，返回 { url }）
export function uploadAvatar(formData) {
  return request.post('/me/avatar', formData)
}

// 上传背景图（FormData，返回 { url }）
export function uploadBackground(formData) {
  return request.post('/me/background', formData)
}

// 获取我的背景图
export function getMeBackground() {
  return request.get('/me/background')
}

// 我的收获统计（获赞总数 / 获收藏总数）
export function getMeStats() {
  return request.get('/me/stats')
}
