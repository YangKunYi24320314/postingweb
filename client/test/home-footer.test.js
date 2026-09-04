import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../src/', import.meta.url)

test('home page exposes recommendation, hot, and latest post modes', async () => {
  const source = await readFile(new URL('views/HomeView.vue', root), 'utf8')

  assert.match(source, /getPostList/)
  assert.match(source, /recommend/)
  assert.match(source, /hot/)
  assert.match(source, /latest/)
})

test('footer exposes GitHub, team contact, and feedback links', async () => {
  const source = await readFile(new URL('layouts/BaseLayout.vue', root), 'utf8')

  assert.match(source, /github\.com\/YangKunYi24320314\/postingweb/)
  assert.match(source, /团队/)
  assert.match(source, /帮助/)
  assert.match(source, /建议与投诉/)
  assert.match(source, /contactEmail = '205613196@qq\.com'/)
})
