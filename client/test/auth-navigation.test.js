import test from 'node:test'
import assert from 'node:assert/strict'
import { getAuthAction } from '../src/utils/auth-navigation.js'

test('anonymous users go to login and authenticated users go to profile', () => {
  assert.deepEqual(getAuthAction(null), { label: '登录', path: '/login' })
  assert.deepEqual(getAuthAction('jwt-token'), { label: '个人中心', path: '/profile' })
})
