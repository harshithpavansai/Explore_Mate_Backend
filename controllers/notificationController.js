/**
 * In-app notifications.
 */
const { query } = require('../config/database');
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');

// GET /notifications
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  return ok(res, rows);
});

// POST /notifications  (admin / system)
const create = asyncHandler(async (req, res) => {
  const { user_id, title, body, type = 'info', payload } = req.body;
  if (!user_id || !title) throw new ApiError('user_id and title required');
  const { rows } = await query(
    `INSERT INTO notifications (user_id,title,body,type,payload)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [user_id, title, body || null, type, payload ? JSON.stringify(payload) : '{}']
  );
  return ok(res, rows[0], 'Notification created');
});

// PATCH /notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rowCount) throw new ApiError('Notification not found', 404);
  return ok(res, null, 'Marked as read');
});

// PATCH /notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [req.user.id]);
  return ok(res, null, 'All notifications marked as read');
});

// DELETE /notifications/:id
const remove = asyncHandler(async (req, res) => {
  const { rowCount } = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rowCount) throw new ApiError('Notification not found', 404);
  return ok(res, null, 'Notification deleted');
});

module.exports = { list, create, markRead, markAllRead, remove };
