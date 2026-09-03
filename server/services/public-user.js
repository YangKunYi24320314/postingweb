function parsePublicUserId(value) {
  const userId = Number(value)
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null
}

async function findPublicUser(pool, userId) {
  const result = await pool.query(
    `SELECT u.id,
            u.username,
            u.avatar_url,
            u.bio,
            COUNT(p.id)::int AS post_count
       FROM users u
       LEFT JOIN posts p
         ON p.user_id = u.id AND p.is_deleted = false AND p.status = 1
      WHERE u.id = $1 AND u.status = 1
      GROUP BY u.id, u.username, u.avatar_url, u.bio`,
    [userId]
  )

  if (result.rowCount === 0) {
    return null
  }

  const user = result.rows[0]
  return {
    id: Number(user.id),
    username: user.username,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    postCount: Number(user.post_count),
  }
}

module.exports = { findPublicUser, parsePublicUserId }
