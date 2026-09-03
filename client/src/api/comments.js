// 评论相关接口：每个功能模块一个文件，这里只放评论的。
// 使用方式示例：const data = await getComments(postId)
import request from './request'

// 帖子评论列表（公开，游客也能看）
export function getComments(postId) {
  return request.get(`/posts/${postId}/comments`)
}

// 发表评论（需登录）：{ content, parentId }（parentId 表示回复某条评论，顶级评论传 null）
export function createComment(postId, data) {
  return request.post(`/posts/${postId}/comments`, data)
}

// 编辑评论（需登录，仅作者）：{ content }
export function updateComment(commentId, data) {
  return request.put(`/comments/${commentId}`, data)
}

// 删除评论（软删除，需登录，仅作者或管理员）
export function deleteComment(commentId) {
  return request.delete(`/comments/${commentId}`)
}
