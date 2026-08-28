/**
 * User profile controller.
 * Profile read/update, preferences, trip-history, deactivate.
 */
const { query } = require('../config/database');
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');

const PROFILE_COLS = `id,name,email,phone,avatar_url,bio,role,xp,level,
                      preferences,is_verified,created_at,last_login_at`;

const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await query(`SELECT ${PROFILE_COLS} FROM users WHERE id = $1`, [req.user.id]);
  if (!rows[0]) throw new ApiError('User not found', 404);
  return ok(res, rows[0]);
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatar_url', 'bio', 'preferences'];
  const updates = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = $${i++}`);
      values.push(key === 'preferences' ? req.body[key] : req.body[key]);
    }
  }
  if (!updates.length) throw new ApiError('No valid fields to update');
  values.push(req.user.id);
  const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${PROFILE_COLS}`;
  const { rows } = await query(sql, values);
  return ok(res, rows[0], 'Profile updated');
});

const updatePreferences = asyncHandler(async (req, res) => {
  const prefs = req.body || {};
  const { rows } = await query(
    `UPDATE users SET preferences = preferences || $1::jsonb
     WHERE id = $2 RETURNING preferences`,
    [JSON.stringify(prefs), req.user.id]
  );
  return ok(res, rows[0].preferences, 'Preferences updated');
});

const tripHistory = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT h.id, h.visited_at, h.notes,
            d.id AS destination_id, d.name, d.city, d.country, d.image_url, d.category
     FROM trip_history h
     LEFT JOIN destinations d ON d.id = h.destination_id
     WHERE h.user_id = $1
     ORDER BY h.visited_at DESC
     LIMIT 100`,
    [req.user.id]
  );
  return ok(res, rows);
});

const addToHistory = asyncHandler(async (req, res) => {
  const { destination_id, notes } = req.body;
  if (!destination_id) throw new ApiError('destination_id required');
  const { rows } = await query(
    `INSERT INTO trip_history (user_id,destination_id,notes)
     VALUES ($1,$2,$3) RETURNING *`,
    [req.user.id, destination_id, notes || null]
  );
  return ok(res, rows[0], 'Added to history');
});

const deactivate = asyncHandler(async (req, res) => {
  await query('UPDATE users SET is_active = FALSE WHERE id = $1', [req.user.id]);
  return ok(res, null, 'Account deactivated');
});

// Admin: list users
const listUsers = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const { rows } = await query(
    `SELECT ${PROFILE_COLS} FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return ok(res, rows);
});

module.exports = {
  getProfile, updateProfile, updatePreferences,
  tripHistory, addToHistory, deactivate, listUsers,
};
