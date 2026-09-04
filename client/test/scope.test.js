import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../src/', import.meta.url)

test('navigation and home page do not expose categories or tags', async () => {
  const layout = await readFile(new URL('layouts/BaseLayout.vue', root), 'utf8')
  const router = await readFile(new URL('router/index.js', root), 'utf8')
  const home = await readFile(new URL('views/HomeView.vue', root), 'utf8')

  assert.doesNotMatch(layout, /categories|分类标签|CollectionTag/)
  assert.doesNotMatch(router, /categories|Categories|分类标签/)
  assert.doesNotMatch(home, /categories|分类标签|CollectionTag/)
})

test('category and tag frontend modules are no longer part of the app', async () => {
  await assert.rejects(access(new URL('api/categories.js', root)))
  await assert.rejects(access(new URL('api/tags.js', root)))
  await assert.rejects(access(new URL('views/CategoriesView.vue', root)))
})
