import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home hero uses the campus slogan without the today counter or all-posts link', async () => {
  const source = await readFile(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')

  assert.match(source, /方寸帖子间，万千校园事/)
  assert.match(source, /CAMPUS HUB/)
  assert.doesNotMatch(source, /CAMPUS COMMUNITY/)
  assert.doesNotMatch(source, /TODAY/)
  assert.doesNotMatch(source, /<strong>01<\/strong>/)
  assert.doesNotMatch(source, /查看全部/)
  assert.doesNotMatch(source, /home-feed__all/)
})
