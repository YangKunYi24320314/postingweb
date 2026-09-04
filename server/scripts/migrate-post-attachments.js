require('dotenv').config()
const pool = require('../db')

async function ensurePostAttachmentsTable(database = pool) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS post_attachments (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
      original_filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size BIGINT NOT NULL CHECK (file_size >= 0),
      mime_type VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await database.query(
    'CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON post_attachments(post_id)'
  )
}

async function main() {
  try {
    await ensurePostAttachmentsTable()
    console.log('post_attachments migration completed')
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { ensurePostAttachmentsTable }
