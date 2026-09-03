const test = require('node:test')
const assert = require('node:assert/strict')

const authRouter = require('../routes/auth')

test('auth router exposes contact binding and password security endpoints', () => {
  const paths = authRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`)

  assert.deepEqual(
    paths.filter((path) => path.includes('contact') || path.includes('password')),
    [
      'POST /auth/contact/send-code',
      'POST /auth/contact/bind',
      'POST /auth/password/change',
      'POST /auth/password/reset/send-code',
      'POST /auth/password/reset',
    ]
  )
})

test('auth router maps provider failures to the unified server error response', () => {
  let response
  const res = {
    status(code) {
      response = { status: code }
      return this
    },
    json(body) {
      response.body = body
      return body
    },
  }

  authRouter.handleAuthError(res, Object.assign(new Error('验证码发送失败'), { code: 'CONTACT_PROVIDER' }))

  assert.deepEqual(response, {
    status: 500,
    body: { code: 5000, message: '验证码发送失败', data: null },
  })
})
