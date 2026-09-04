// src/api/user.js —— 用户公开信息相关接口（曾繁一）。
// 页面里只 import 这里的函数调用，绝不直接写 axios。
import request from './request'

// 查看某用户公开信息（无需登录）
export function getUserInfo(id) {
  return request.get(`/users/${id}`)
}

// 查看某用户发布的帖子（分页）
export function getUserPosts(id, params) {
  return request.get(`/users/${id}/posts`, { params })
}
