import request from './request'

export function getConversation(friendId) {
  return request({ url: `/messages/conversations/${friendId}`, method: 'get' })
}

export function sendMessage(friendId, content) {
  return request({
    url: `/messages/conversations/${friendId}`,
    method: 'post',
    data: { content },
  })
}
