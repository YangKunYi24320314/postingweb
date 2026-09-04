import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('public post list requests opt out of automatic unauthorized redirects', async () => {
  const requestSource = await readFile(new URL('../src/api/request.js', import.meta.url), 'utf8')
  const postSource = await readFile(new URL('../src/api/post.js', import.meta.url), 'utf8')

  assert.match(requestSource, /skipAuthRedirect/)
  assert.match(postSource, /skipAuthRedirect:\s*true/)
})
