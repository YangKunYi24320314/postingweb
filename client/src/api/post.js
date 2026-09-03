// 帖子相关接口：每个功能模块一个文件，这里只放帖子的。
// 使用方式示例：const data = await getPostList({ page: 1, pageSize: 10 })
import request from './request'

// 帖子列表（支持分页、分类/标签/关键词筛选、rank 组合排序）
export function getPostList(params) {
  return request.get('/posts', { params })
}

// 帖子详情
export function getPostById(id) {
  return request.get(`/posts/${id}`)
}

// 发布帖子（需登录）：{ title, content, categoryId, tags }
export function createPost(data) {
  return request.post('/posts', data)
}

// 编辑帖子（需登录，仅作者）
export function updatePost(id, data) {
  return request.put(`/posts/${id}`, data)
}

// 删除帖子（软删除，需登录，仅作者或管理员）
export function deletePost(id) {
  return request.delete(`/posts/${id}`)
}
