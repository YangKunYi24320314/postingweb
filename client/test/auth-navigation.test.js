import test from 'node:test'
import assert from 'node:assert/strict'
import { getAuthAction, logout } from '../src/utils/auth-navigation.js'

test('anonymous users go to login and authenticated users go to profile', () => {
  assert.deepEqual(getAuthAction(null), { label: '登录', path: '/login' })
  assert.deepEqual(getAuthAction('jwt-token'), { label: '个人中心', path: '/profile' })
})

test('logout clears the session and navigates to login', () => {
  let cleared = 0
  let navigatedTo = ''

  logout({
    clearToken: () => {
      cleared += 1
    },
    navigate: (path) => {
      navigatedTo = path
    },
  })

  assert.equal(cleared, 1)
  assert.equal(navigatedTo, '/login')
})
