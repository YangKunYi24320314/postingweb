const test = require('node:test')
const assert = require('node:assert/strict')

const { createAvatarFileName, getAvatarUrl, isAllowedAvatar } = require('../utils/avatar-upload')

test('avatar uploads accept common image formats only', () => {
  assert.equal(isAllowedAvatar({ mimetype: 'image/png' }), true)
  assert.equal(isAllowedAvatar({ mimetype: 'image/jpeg' }), true)
  assert.equal(isAllowedAvatar({ mimetype: 'application/pdf' }), false)
})

test('avatar uploads produce a safe public URL with the original image extension', () => {
  const fileName = createAvatarFileName({ originalname: 'student portrait.PNG' })

  assert.match(fileName, /^[a-f0-9-]+\.png$/)
  assert.equal(getAvatarUrl('abc.png'), '/uploads/abc.png')
})
