const test = require('node:test')
const assert = require('node:assert/strict')

const { shouldSkipUpload } = require('../utils/upload-state')

test('upload is skipped when today already has a successful upload', () => {
  assert.equal(shouldSkipUpload({ date: '2026-09-02', uploaded: true }, '2026-09-02'), true)
})

test('upload is allowed for a new day even when a previous day was uploaded', () => {
  assert.equal(shouldSkipUpload({ date: '2026-09-01', uploaded: true }, '2026-09-02'), false)
})
