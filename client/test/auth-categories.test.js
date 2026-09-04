import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../src/', import.meta.url)

test('auth api exposes public user lookup', async () => {
  const source = await readFile(new URL('api/auth.js', root), 'utf8')
  assert.match(source, /export function getPublicUser\(id\)/)
  assert.match(source, /request\.get\(`\/users\/\$\{id\}`\)/)
})

test('public profile page is routed', async () => {
  const router = await readFile(new URL('router/index.js', root), 'utf8')
  assert.match(router, /path: 'users\/:id'/)

  const userView = await readFile(new URL('views/UserProfileView.vue', root), 'utf8')
  assert.match(userView, /getPublicUser/)
})

test('user-facing auth views use username as the only identity label', async () => {
  const loginView = await readFile(new URL('views/LoginView.vue', root), 'utf8')
  const profileView = await readFile(new URL('views/ProfileView.vue', root), 'utf8')
  const userView = await readFile(new URL('views/UserProfileView.vue', root), 'utf8')

  assert.doesNotMatch(loginView, /form\.nickname|昵称（可选）/)
  assert.doesNotMatch(profileView, /form\.nickname|label="昵称"/)
  assert.match(userView, /user\.username/)
  assert.doesNotMatch(userView, /user\.nickname/)
})

test('profile page uploads a local avatar instead of requiring an image URL', async () => {
  const profileView = await readFile(new URL('views/ProfileView.vue', root), 'utf8')
  const authApi = await readFile(new URL('api/auth.js', root), 'utf8')

  assert.match(profileView, /<el-upload/)
  assert.match(profileView, /handleAvatarUpload/)
  assert.doesNotMatch(profileView, /头像地址/)
  assert.match(authApi, /export function uploadAvatar\(file\)/)
  assert.match(authApi, /request\.post\('\/auth\/avatar'/)
})

test('vite proxies uploaded avatars to the backend', async () => {
  const viteConfig = await readFile(new URL('../vite.config.js', root), 'utf8')
  assert.match(viteConfig, /['"]\/uploads['"]/) 
  assert.match(viteConfig, /target:\s*['"]http:\/\/localhost:3000['"]/) 
})
