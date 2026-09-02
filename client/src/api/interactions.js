const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const TOKEN_KEY = 'token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getAuthToken() {
  return getToken()
}

async function request(path, options = {}) {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const result = await response.json()

  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '请求失败')
  }

  return result.data
}

export function likePost(postId) {
  return request(`/posts/${postId}/like`, { method: 'POST' })
}

export function unlikePost(postId) {
  return request(`/posts/${postId}/like`, { method: 'DELETE' })
}

export function favoritePost(postId) {
  return request(`/posts/${postId}/favorite`, { method: 'POST' })
}

export function unfavoritePost(postId) {
  return request(`/posts/${postId}/favorite`, { method: 'DELETE' })
}

export function likeComment(commentId) {
  return request(`/comments/${commentId}/like`, { method: 'POST' })
}

export function unlikeComment(commentId) {
  return request(`/comments/${commentId}/like`, { method: 'DELETE' })
}
