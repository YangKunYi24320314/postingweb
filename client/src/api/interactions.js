import request from './request'

export function likePost(postId) {
  return request.post(`/posts/${postId}/like`)
}

export function unlikePost(postId) {
  return request.delete(`/posts/${postId}/like`)
}

export function favoritePost(postId) {
  return request.post(`/posts/${postId}/favorite`)
}

export function unfavoritePost(postId) {
  return request.delete(`/posts/${postId}/favorite`)
}

export function likeComment(commentId) {
  return request.post(`/comments/${commentId}/like`)
}

export function unlikeComment(commentId) {
  return request.delete(`/comments/${commentId}/like`)
}
