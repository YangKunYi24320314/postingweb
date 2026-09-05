import request from './request'

export function searchPosts(params) {
  return request({
    url: '/search/posts',
    method: 'get',
    params,
    skipAuthRedirect: true,
  })
}

export function searchUsers(params) {
  return request({
    url: '/search/users',
    method: 'get',
    params,
    skipAuthRedirect: true,
  })
}

export function getHotSearches() {
  return request({
    url: '/search/hot',
    method: 'get',
    skipAuthRedirect: true,
  })
}

export function getSearchSuggestions() {
  return request({
    url: '/search/suggestions',
    method: 'get',
    skipAuthRedirect: true,
  })
}
