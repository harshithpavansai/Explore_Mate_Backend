/**
 * Hidden gems = destinations flagged is_hidden_gem.
 */
const { query } = require('../config/database');
const { ok, asyncHandler } = require('../utils/responseHandler');
const { haversineKm } = require('../utils/geo');

// GET /hidden-gems
const list = asyncHandler(async (req, res) => {
  const { city, country, limit = 30 } = req.query;
  const where = ['is_hidden_gem = TRUE'];
  const params = [];
  let i = 1;
  if (city)    { where.push(`city ILIKE $${i++}`);    params.push(`%${city}%`); }
  if (country) { where.push(`country ILIKE $${i++}`); params.push(`%${country}%`); }
  params.push(Math.min(Number(limit), 100));
  const { rows } = await query(
    `SELECT * FROM destinations WHERE ${where.join(' AND ')} ORDER BY rating DESC LIMIT $${i}`,
    params
  );
  return ok(res, rows);
});

// GET /hidden-gems/nearby?lat=&lng=&radius=
const nearby = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Number(req.query.radius) || 50;

  const { rows } = await query(
    `SELECT * FROM destinations WHERE is_hidden_gem = TRUE
     AND latitude IS NOT NULL AND longitude IS NOT NULL`
  );
  const items = rows
    .map((r) => ({ ...r, distance_km: +haversineKm(lat, lng, r.latitude, r.longitude).toFixed(2) }))
    .filter((r) => r.distance_km <= radius)
    .sort((a, b) => a.distance_km - b.distance_km);
  return ok(res, items);
});

module.exports = { list, nearby };
