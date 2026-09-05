import request from './request'

export function requestFriend(userId) {
  return request({
    url: `/friends/${userId}/request`,
    method: 'post',
  })
}

export function getFriendRequests() {
  return request({ url: '/friends/requests', method: 'get' })
}

export function acceptFriendRequest(requestId) {
  return request({ url: `/friends/requests/${requestId}/accept`, method: 'post' })
}

export function getFriends() {
  return request({ url: '/friends', method: 'get' })
}
