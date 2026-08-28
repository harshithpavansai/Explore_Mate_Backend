/**
 * Favorites - per-user saved destinations.
 */
const { query } = require('../config/database');
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');

// GET /favorites
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT f.id AS favorite_id, f.created_at AS favorited_at, d.*
     FROM favorites f JOIN destinations d ON d.id = f.destination_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [req.user.id]
  );
  return ok(res, rows);
});

// POST /favorites   { destination_id }
const add = asyncHandler(async (req, res) => {
  const { destination_id } = req.body;
  if (!destination_id) throw new ApiError('destination_id required');
  await query(
    `INSERT INTO favorites (user_id,destination_id)
     VALUES ($1,$2)
     ON CONFLICT (user_id,destination_id) DO NOTHING`,
    [req.user.id, destination_id]
  );
  return ok(res, null, 'Added to favorites');
});

// DELETE /favorites/:destinationId
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM favorites WHERE user_id = $1 AND destination_id = $2',
    [req.user.id, req.params.destinationId]
  );
  if (!rowCount) throw new ApiError('Favorite not found', 404);
  return ok(res, null, 'Removed from favorites');
});

module.exports = { list, add, remove };
