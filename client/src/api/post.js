import request from '../utils/request'

// 获取全部帖子
export function getPostList() {
  return request({
    url: '/posts',
    method: 'get'
  })
}

// 获取单条帖子
export function getPostById(id) {
  return request({
    url: `/posts/${id}`,
    method: 'get'
  })
}

// 新增帖子
export function createPost(data) {
  return request({
    url: '/posts',
    method: 'post',
    data
  })
}

// 修改帖子
export function updatePost(id, data) {
  return request({
    url: `/posts/${id}`,
    method: 'put',
    data
  })
}

// 删除帖子（逻辑删除）
export function deletePost(id) {
  return request({
    url: `/posts/${id}`,
    method: 'delete'
  })
}
