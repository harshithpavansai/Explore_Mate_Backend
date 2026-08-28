/**
 * Reviews - per-destination 1-5 star reviews + recompute aggregate rating.
 */
const { query, withTransaction } = require('../config/database');
const { ok, created, ApiError, asyncHandler } = require('../utils/responseHandler');

const recomputeRating = async (client, destinationId) => {
  await client.query(
    `UPDATE destinations d SET
        rating = COALESCE(sub.avg_rating, 0),
        rating_count = COALESCE(sub.cnt, 0)
     FROM (
        SELECT destination_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS cnt
        FROM reviews WHERE destination_id = $1 GROUP BY destination_id
     ) sub
     WHERE d.id = $1`,
    [destinationId]
  );
};

// GET /reviews/destination/:id
const listByDestination = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT r.*, u.name, u.avatar_url
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.destination_id = $1
     ORDER BY r.created_at DESC`,
    [req.params.id]
  );
  return ok(res, rows);
});

// POST /reviews   { destination_id, rating, title?, body? }
const create = asyncHandler(async (req, res) => {
  const { destination_id, rating, title, body } = req.body;
  if (!destination_id || !rating) throw new ApiError('destination_id and rating required');
  if (rating < 1 || rating > 5) throw new ApiError('rating must be 1-5');

  const result = await withTransaction(async (c) => {
    const insert = await c.query(
      `INSERT INTO reviews (user_id,destination_id,rating,title,body)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id,destination_id) DO UPDATE
         SET rating = EXCLUDED.rating, title = EXCLUDED.title,
             body = EXCLUDED.body, updated_at = NOW()
       RETURNING *`,
      [req.user.id, destination_id, rating, title || null, body || null]
    );
    await recomputeRating(c, destination_id);
    return insert.rows[0];
  });
  return created(res, result);
});

// DELETE /reviews/:id
const remove = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING destination_id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new ApiError('Review not found', 404);
  await withTransaction((c) => recomputeRating(c, rows[0].destination_id));
  return ok(res, null, 'Review deleted');
});

module.exports = { listByDestination, create, remove };
