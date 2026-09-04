const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('category and tag routes are removed from the server scope', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'routes', 'categories.js')), false)
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'routes', 'tags.js')), false)
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'services', 'catalog.js')), false)
})
