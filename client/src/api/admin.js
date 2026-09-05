import request from './request'

/**
 * 获取已删除帖子列表（分页）
 * @param {Object} params - 分页参数 { page, pageSize }
 */
export function getDeletedPosts(params) {
  return request({
    url: '/admin/posts/deleted',
    method: 'get',
    params
  })
}

/**
 * 获取单篇已删除帖子详情
 * @param {Number} id - 帖子ID
 */
export function getDeletedPostDetail(id) {
  return request({
    url: `/admin/posts/${id}`,
    method: 'get'
  })
}

/**
 * 还原已删除的帖子
 * @param {Number} id - 帖子ID
 */
export function restorePost(id) {
  return request({
    url: `/admin/posts/${id}/restore`,
    method: 'put'
  })
}
