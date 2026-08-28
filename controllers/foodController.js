/**
 * Food spots + weather-based food recommendations.
 */
const { query } = require('../config/database');
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');
const weather = require('../services/weatherService');
const ai = require('../services/openaiService');
const maps = require('../services/googleMapsService');

// GET /food
const list = asyncHandler(async (req, res) => {
  const { city, q, limit = 30 } = req.query;
  const where = [`category = 'food'`];
  const params = [];
  let i = 1;
  if (city) { where.push(`city ILIKE $${i++}`); params.push(`%${city}%`); }
  if (q)    { where.push(`(name ILIKE $${i} OR description ILIKE $${i})`); params.push(`%${q}%`); i++; }
  params.push(Math.min(Number(limit), 100));
  const { rows } = await query(
    `SELECT * FROM destinations WHERE ${where.join(' AND ')} ORDER BY rating DESC LIMIT $${i}`,
    params
  );
  return ok(res, rows);
});

// POST /food/recommend   { city?, lat?, lng? }
const recommend = asyncHandler(async (req, res) => {
  const { city } = req.body;
  const lat = req.body.lat ? Number(req.body.lat) : undefined;
  const lng = req.body.lng ? Number(req.body.lng) : undefined;
  if (!city && (lat == null || lng == null)) throw new ApiError('city or lat/lng required');

  const w = await weather.fetchWeather({ city, lat, lng });

  // Quick rule-based hint based on temperature/condition
  const hint = (() => {
    if (w.temp_c == null) return 'comfort food';
    if (w.temp_c <= 10) return 'hot soups, ramen, stews';
    if (w.temp_c <= 20) return 'warm pastas, hearty dishes';
    if (w.temp_c <= 28) return 'fresh salads, grilled food';
    return 'cold drinks, light bowls, ice cream';
  })();

  // Try Google Places if coords provided
  let nearby = [];
  if (lat != null && lng != null) {
    nearby = (await maps.nearbyPlaces({ lat, lng, type: 'restaurant', radius: 1500 })).slice(0, 6);
  }

  const aiOut = await ai.recommendPlaces({
    city: city || w.city,
    interests: `food, ${hint}`,
    weather: `${w.condition}, ${w.temp_c}C`,
    time: new Date().toISOString(),
  });

  return ok(res, { weather: w, hint, nearby, ai: aiOut });
});

module.exports = { list, recommend };
