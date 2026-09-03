function toUser(row) {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    role: row.role,
  }
}

module.exports = { toUser }
