import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const authApi = fs.readFileSync(new URL('../src/api/auth.js', import.meta.url), 'utf8')
const loginView = fs.readFileSync(new URL('../src/views/LoginView.vue', import.meta.url), 'utf8')
const profileView = fs.readFileSync(
  new URL('../src/views/ProfileView.vue', import.meta.url),
  'utf8'
)

test('auth api exposes contact binding and password security calls', () => {
  assert.match(authApi, /sendContactCode/)
  assert.match(authApi, /bindContact/)
  assert.match(authApi, /changePassword/)
  assert.match(authApi, /sendPasswordResetCode/)
  assert.match(authApi, /resetPassword/)
})

test('login view submits identifier and supports password reset entry', () => {
  assert.match(loginView, /identifier/)
  assert.match(loginView, /用户名 \/ 手机号 \/ 邮箱/)
  assert.match(loginView, /找回密码/)
  assert.match(loginView, /手机号和邮箱请绑定后登录/)
})

test('profile view exposes contact binding and password change controls', () => {
  assert.match(profileView, /绑定手机号/)
  assert.match(profileView, /绑定邮箱/)
  assert.match(profileView, /修改密码/)
  assert.match(profileView, /phoneBound/)
  assert.match(profileView, /emailBound/)
})
