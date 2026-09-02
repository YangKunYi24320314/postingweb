const express = require('express')
const pool = require('../db')
const { auth } = require('../middleware/auth')
const { ok, fail, CODE } = require('../utils/response')

const router = express.Router()

function isPositiveId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}

async function ensurePostExists(client, postId) {
  const result = await client.query(
    `
      SELECT id
      FROM posts
      WHERE id = $1
        AND is_deleted = false
        AND status = 1
    `,
    [postId]
  )

  return result.rowCount > 0
}

async function ensureCommentExists(client, commentId) {
  const result = await client.query(
    `
      SELECT id
      FROM comments
      WHERE id = $1
        AND status = 1
    `,
    [commentId]
  )

  return result.rowCount > 0
}

async function getPostCount(client, postId, countField) {
  const result = await client.query(`SELECT ${countField} FROM posts WHERE id = $1`, [postId])
  return result.rows[0][countField]
}

async function getCommentLikeCount(client, commentId) {
  const result = await client.query('SELECT like_count FROM comments WHERE id = $1', [commentId])
  return result.rows[0].like_count
}

async function withTransaction(handler) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await handler(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

router.post('/posts/:id/like', auth, async (req, res, next) => {
  const postId = Number(req.params.id)
  const userId = req.userId

  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子ID格式不正确', 400)
  }

  try {
    const data = await withTransaction(async (client) => {
      if (!(await ensurePostExists(client, postId))) {
        return { notFound: true }
      }

      const insertResult = await client.query(
        `
          INSERT INTO post_likes (user_id, post_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, post_id) DO NOTHING
        `,
        [userId, postId]
      )

      if (insertResult.rowCount === 0) {
        return {
          conflict: true,
          likeCount: await getPostCount(client, postId, 'like_count'),
        }
      }

      const countResult = await client.query(
        `
          UPDATE posts
          SET like_count = like_count + 1,
              updated_at = now()
          WHERE id = $1
          RETURNING like_count
        `,
        [postId]
      )

      return {
        liked: true,
        likeCount: countResult.rows[0].like_count,
      }
    })

    if (data.notFound) {
      return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
    }

    if (data.conflict) {
      return fail(res, CODE.CONFLICT, '已点过赞', 409)
    }

    return ok(res, data)
  } catch (err) {
    return next(err)
  }
})

router.delete('/posts/:id/like', auth, async (req, res, next) => {
  const postId = Number(req.params.id)
  const userId = req.userId

  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子ID格式不正确', 400)
  }

  try {
    const data = await withTransaction(async (client) => {
      if (!(await ensurePostExists(client, postId))) {
        return { notFound: true }
      }

      const deleteResult = await client.query(
        'DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      )

      if (deleteResult.rowCount > 0) {
        const countResult = await client.query(
          `
            UPDATE posts
            SET like_count = GREATEST(like_count - 1, 0),
                updated_at = now()
            WHERE id = $1
            RETURNING like_count
          `,
          [postId]
        )

        return {
          liked: false,
          likeCount: countResult.rows[0].like_count,
        }
      }

      return {
        liked: false,
        likeCount: await getPostCount(client, postId, 'like_count'),
      }
    })

    if (data.notFound) {
      return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
    }

    return ok(res, data)
  } catch (err) {
    return next(err)
  }
})

router.post('/posts/:id/favorite', auth, async (req, res, next) => {
  const postId = Number(req.params.id)
  const userId = req.userId

  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子ID格式不正确', 400)
  }

  try {
    const data = await withTransaction(async (client) => {
      if (!(await ensurePostExists(client, postId))) {
        return { notFound: true }
      }

      const insertResult = await client.query(
        `
          INSERT INTO favorites (user_id, post_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, post_id) DO NOTHING
        `,
        [userId, postId]
      )

      if (insertResult.rowCount === 0) {
        return {
          conflict: true,
          favoriteCount: await getPostCount(client, postId, 'favorite_count'),
        }
      }

      const countResult = await client.query(
        `
          UPDATE posts
          SET favorite_count = favorite_count + 1,
              updated_at = now()
          WHERE id = $1
          RETURNING favorite_count
        `,
        [postId]
      )

      return {
        isFavorite: true,
        favoriteCount: countResult.rows[0].favorite_count,
      }
    })

    if (data.notFound) {
      return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
    }

    if (data.conflict) {
      return fail(res, CODE.CONFLICT, '已收藏过', 409)
    }

    return ok(res, data)
  } catch (err) {
    return next(err)
  }
})

router.delete('/posts/:id/favorite', auth, async (req, res, next) => {
  const postId = Number(req.params.id)
  const userId = req.userId

  if (!isPositiveId(postId)) {
    return fail(res, CODE.PARAM_ERROR, '帖子ID格式不正确', 400)
  }

  try {
    const data = await withTransaction(async (client) => {
      if (!(await ensurePostExists(client, postId))) {
        return { notFound: true }
      }

      const deleteResult = await client.query(
        'DELETE FROM favorites WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      )

      if (deleteResult.rowCount > 0) {
        const countResult = await client.query(
          `
            UPDATE posts
            SET favorite_count = GREATEST(favorite_count - 1, 0),
                updated_at = now()
            WHERE id = $1
            RETURNING favorite_count
          `,
          [postId]
        )

        return {
          isFavorite: false,
          favoriteCount: countResult.rows[0].favorite_count,
        }
      }

      return {
        isFavorite: false,
        favoriteCount: await getPostCount(client, postId, 'favorite_count'),
      }
    })

    if (data.notFound) {
      return fail(res, CODE.NOT_FOUND, '帖子不存在', 404)
    }

    return ok(res, data)
  } catch (err) {
    return next(err)
  }
})

router.post('/comments/:id/like', auth, async (req, res, next) => {
  const commentId = Number(req.params.id)
  const userId = req.userId

  if (!isPositiveId(commentId)) {
    return fail(res, CODE.PARAM_ERROR, '评论ID格式不正确', 400)
  }

  try {
    const data = await withTransaction(async (client) => {
      if (!(await ensureCommentExists(client, commentId))) {
        return { notFound: true }
      }

      const insertResult = await client.query(
        `
          INSERT INTO comment_likes (user_id, comment_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, comment_id) DO NOTHING
        `,
        [userId, commentId]
      )

      if (insertResult.rowCount === 0) {
        return {
          conflict: true,
          likeCount: await getCommentLikeCount(client, commentId),
        }
      }

      const countResult = await client.query(
        `
          UPDATE comments
          SET like_count = like_count + 1,
              updated_at = now()
          WHERE id = $1
          RETURNING like_count
        `,
        [commentId]
      )

      return {
        liked: true,
        likeCount: countResult.rows[0].like_count,
      }
    })

    if (data.notFound) {
      return fail(res, CODE.NOT_FOUND, '评论不存在', 404)
    }

    if (data.conflict) {
      return fail(res, CODE.CONFLICT, '已点过赞', 409)
    }

    return ok(res, data)
  } catch (err) {
    return next(err)
  }
})

router.delete('/comments/:id/like', auth, async (req, res, next) => {
  const commentId = Number(req.params.id)
  const userId = req.userId

  if (!isPositiveId(commentId)) {
    return fail(res, CODE.PARAM_ERROR, '评论ID格式不正确', 400)
  }

  try {
    const data = await withTransaction(async (client) => {
      if (!(await ensureCommentExists(client, commentId))) {
        return { notFound: true }
      }

      const deleteResult = await client.query(
        'DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
        [userId, commentId]
      )

      if (deleteResult.rowCount > 0) {
        const countResult = await client.query(
          `
            UPDATE comments
            SET like_count = GREATEST(like_count - 1, 0),
                updated_at = now()
            WHERE id = $1
            RETURNING like_count
          `,
          [commentId]
        )

        return {
          liked: false,
          likeCount: countResult.rows[0].like_count,
        }
      }

      return {
        liked: false,
        likeCount: await getCommentLikeCount(client, commentId),
      }
    })

    if (data.notFound) {
      return fail(res, CODE.NOT_FOUND, '评论不存在', 404)
    }

    return ok(res, data)
  } catch (err) {
    return next(err)
  }
})

module.exports = router
