const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function isAllowedAvatar(file) {
  return Boolean(file && ALLOWED_MIME_TYPES.has(file.mimetype))
}

function createAvatarFileName(file) {
  const extension = EXTENSION_BY_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase()
  return `${crypto.randomUUID()}${extension}`
}

function getAvatarUrl(fileName) {
  return `/uploads/${fileName}`
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_AVATAR_SIZE,
  UPLOAD_DIR,
  createAvatarFileName,
  getAvatarUrl,
  isAllowedAvatar,
}
