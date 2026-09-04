const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('attachment migration creates the missing table without destructive SQL', async () => {
  const { ensurePostAttachmentsTable } = require('../scripts/migrate-post-attachments')
  const queries = []
  const pool = {
    async query(sql) {
      queries.push(sql)
    },
  }

  await ensurePostAttachmentsTable(pool)

  assert.match(queries[0], /CREATE TABLE IF NOT EXISTS post_attachments/)
  assert.match(queries[0], /post_id BIGINT REFERENCES posts\(id\) ON DELETE CASCADE/)
  assert.match(queries[1], /CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id/)
  assert.equal(queries.some((sql) => /\bDROP\b/i.test(sql)), false)
})

test('attachment migration loads environment variables before the database pool', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'migrate-post-attachments.js'), 'utf8')

  const dotenvIndex = source.indexOf("require('dotenv').config()")
  const dbIndex = source.indexOf("require('../db')")

  assert.ok(dotenvIndex >= 0)
  assert.ok(dotenvIndex < dbIndex)
})
