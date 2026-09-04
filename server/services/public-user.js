function parsePublicUserId(value) {
  const userId = Number(value)
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null
}

async function findPublicUser(pool, userId) {
  const result = await pool.query(
    `SELECT u.id,
            u.username,
            u.nickname,
            u.avatar_url,
            u.background_url,
            u.bio,
            COUNT(p.id)::int AS post_count,
            (SELECT COALESCE(SUM(pl.like_count), 0)::int FROM posts pl
              WHERE pl.user_id = u.id AND pl.is_deleted = false AND pl.status = 1) AS total_likes,
            (SELECT COALESCE(SUM(pf.favorite_count), 0)::int FROM posts pf
              WHERE pf.user_id = u.id AND pf.is_deleted = false AND pf.status = 1) AS total_favorites
       FROM users u
       LEFT JOIN posts p
         ON p.user_id = u.id AND p.is_deleted = false AND p.status = 1
      WHERE u.id = $1 AND u.status = 1
      GROUP BY u.id, u.username, u.nickname, u.avatar_url, u.background_url, u.bio`,
    [userId]
  )

  if (result.rowCount === 0) {
    return null
  }

  const user = result.rows[0]
  return {
    id: Number(user.id),
    username: user.username,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    backgroundUrl: user.background_url || null,
    bio: user.bio,
    postCount: Number(user.post_count),
    totalLikes: Number(user.total_likes),
    totalFavorites: Number(user.total_favorites),
  }
}

module.exports = { findPublicUser, parsePublicUserId }
