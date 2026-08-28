/**
 * Destinations: search, list, detail, nearby, CRUD (admin).
 */
const { query } = require('../config/database');
const { ok, created, ApiError, asyncHandler } = require('../utils/responseHandler');
const { haversineKm } = require('../utils/geo');

// GET /destinations  ?q=&category=&minRating=&limit=&offset=&hidden=
const list = asyncHandler(async (req, res) => {
  const {
    q, category, city, country, minRating,
    hidden, limit = 30, offset = 0, sort = 'rating',
  } = req.query;

  const where = [];
  const params = [];
  let i = 1;

  if (q) {
    where.push(`(name ILIKE $${i} OR city ILIKE $${i} OR description ILIKE $${i})`);
    params.push(`%${q}%`); i++;
  }
  if (category) { where.push(`category = $${i++}`); params.push(category); }
  if (city)     { where.push(`city ILIKE $${i++}`); params.push(`%${city}%`); }
  if (country)  { where.push(`country ILIKE $${i++}`); params.push(`%${country}%`); }
  if (minRating){ where.push(`rating >= $${i++}`); params.push(Number(minRating)); }
  if (hidden !== undefined) { where.push(`is_hidden_gem = $${i++}`); params.push(hidden === 'true'); }

  const orderBy = ({
    rating: 'rating DESC',
    name: 'name ASC',
    newest: 'created_at DESC',
  })[sort] || 'rating DESC';

  const sql = `
    SELECT * FROM destinations
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderBy}
    LIMIT $${i++} OFFSET $${i}
  `;
  params.push(Math.min(Number(limit), 100), Number(offset));

  const { rows } = await query(sql, params);
  return ok(res, { items: rows, count: rows.length });
});

// GET /destinations/:id
const detail = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM destinations WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new ApiError('Destination not found', 404);

  const reviews = await query(
    `SELECT r.id,r.rating,r.title,r.body,r.created_at,
            u.id AS user_id, u.name, u.avatar_url
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.destination_id = $1
     ORDER BY r.created_at DESC LIMIT 20`,
    [req.params.id]
  );

  return ok(res, { ...rows[0], reviews: reviews.rows });
});

// GET /destinations/nearby?lat=&lng=&radius=
const nearby = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Number(req.query.radius) || 25; // km
  if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError('lat/lng required');

  // Rough bounding box for index-friendly query
  const dLat = radius / 111;
  const dLng = radius / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  const { rows } = await query(
    `SELECT * FROM destinations
     WHERE latitude BETWEEN $1 AND $2 AND longitude BETWEEN $3 AND $4`,
    [lat - dLat, lat + dLat, lng - dLng, lng + dLng]
  );

  const items = rows
    .map((r) => ({ ...r, distance_km: +haversineKm(lat, lng, r.latitude, r.longitude).toFixed(2) }))
    .filter((r) => r.distance_km <= radius)
    .sort((a, b) => a.distance_km - b.distance_km);

  return ok(res, { items, count: items.length });
});

// POST /destinations  (admin)
const createDestination = asyncHandler(async (req, res) => {
  const cols = ['name','city','country','category','description','short_summary',
                'image_url','latitude','longitude','address','rating','price_level',
                'tags','is_hidden_gem'];
  const values = cols.map((c) => req.body[c] ?? null);
  const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(',');
  const { rows } = await query(
    `INSERT INTO destinations (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return created(res, rows[0]);
});

const updateDestination = asyncHandler(async (req, res) => {
  const allowed = ['name','city','country','category','description','short_summary',
                   'image_url','latitude','longitude','address','rating','price_level',
                   'tags','is_hidden_gem','metadata'];
  const updates = []; const values = []; let i = 1;
  for (const k of allowed) if (req.body[k] !== undefined) { updates.push(`${k} = $${i++}`); values.push(req.body[k]); }
  if (!updates.length) throw new ApiError('No fields to update');
  values.push(req.params.id);
  const { rows } = await query(
    `UPDATE destinations SET ${updates.join(',')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) throw new ApiError('Destination not found', 404);
  return ok(res, rows[0], 'Destination updated');
});

const deleteDestination = asyncHandler(async (req, res) => {
  const { rowCount } = await query('DELETE FROM destinations WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new ApiError('Destination not found', 404);
  return ok(res, null, 'Destination deleted');
});

const trending = asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT * FROM destinations ORDER BY rating DESC, rating_count DESC LIMIT 10`
  );
  return ok(res, rows);
});

module.exports = {
  list, detail, nearby, trending,
  createDestination, updateDestination, deleteDestination,
};
