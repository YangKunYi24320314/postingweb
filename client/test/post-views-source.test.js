import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../src/views/', import.meta.url)

test('post feed imports useRoute once', async () => {
  const source = await readFile(new URL('PostsView.vue', root), 'utf8')
  const imports = source.match(/import \{ useRoute \} from 'vue-router'/g) || []

  assert.equal(imports.length, 1)
})

test('publish action declares loading before click handling', async () => {
  const source = await readFile(new URL('WritePostView.vue', root), 'utf8')
  const loadingIndex = source.indexOf(':loading="loading"')
  const clickIndex = source.indexOf('@click="submitPost"')

  assert.ok(loadingIndex >= 0)
  assert.ok(clickIndex >= 0)
  assert.ok(loadingIndex < clickIndex)
})
