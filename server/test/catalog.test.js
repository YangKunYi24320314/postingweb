const test = require('node:test')
const assert = require('node:assert/strict')

const { toCategory, toTag } = require('../utils/catalog')

test('toCategory maps database fields to the public category contract', () => {
  assert.deepEqual(
    toCategory({ id: '2', name: '校园生活', description: '宿舍与食堂', sort_order: 20 }),
    { id: '2', name: '校园生活', description: '宿舍与食堂' }
  )
})

test('toTag returns the tag name used by the frontend contract', () => {
  assert.equal(toTag({ name: '考研' }), '考研')
})
