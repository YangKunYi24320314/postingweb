import request from './request'

// 帖子列表（支持分页、分类/标签/关键词筛选、rank 组合排序）
export function getPostList(params) {
  return request({
    url: '/posts',
    method: 'get',
    params,
    skipAuthRedirect: true,
  })
}

// 获取单条帖子
export function getPostById(id) {
  return request({
    url: `/posts/${id}`,
    method: 'get',
  })
}

// 新增帖子
export function createPost(data) {
  return request({
    url: '/posts',
    method: 'post',
    data,
  })
}

// 修改帖子
export function updatePost(id, data) {
  return request({
    url: `/posts/${id}`,
    method: 'put',
    data,
  })
}

// 删除帖子（逻辑删除）
export function deletePost(id) {
  return request({
    url: `/posts/${id}`,
    method: 'delete',
  })
}

// 上传文件接口
export function uploadAttachment(formData) {
  return request({
    url: '/attachments/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
