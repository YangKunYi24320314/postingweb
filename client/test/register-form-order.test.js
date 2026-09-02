import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const loginView = new URL('../src/views/LoginView.vue', import.meta.url)

test('registration form renders password before confirmation', async () => {
  const template = await readFile(loginView, 'utf8')
  const passwordIndex = template.indexOf('v-model="form.password"')
  const confirmPasswordIndex = template.indexOf('v-model="form.confirmPassword"')

  assert.ok(passwordIndex >= 0, 'password input should exist')
  assert.ok(confirmPasswordIndex >= 0, 'confirmation input should exist')
  assert.ok(passwordIndex < confirmPasswordIndex, 'password must appear before confirmation')
})
