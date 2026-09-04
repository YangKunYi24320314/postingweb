import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home hero uses the first-post message without the today counter', async () => {
  const source = await readFile(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')

  assert.match(source, /一天的开始，从第一篇帖/)
  assert.match(source, /CAMPUS HUB/)
  assert.doesNotMatch(source, /CAMPUS COMMUNITY/)
  assert.doesNotMatch(source, /TODAY/)
  assert.doesNotMatch(source, /<strong>01<\/strong>/)
})
