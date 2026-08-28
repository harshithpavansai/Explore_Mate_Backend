/**
 * Weather lookup + alerts endpoints.
 */
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');
const weather = require('../services/weatherService');

// GET /weather?city=...   or  ?lat=&lng=
const current = asyncHandler(async (req, res) => {
  const { city } = req.query;
  const lat = req.query.lat ? Number(req.query.lat) : undefined;
  const lng = req.query.lng ? Number(req.query.lng) : undefined;
  if (!city && (lat == null || lng == null)) throw new ApiError('city or lat/lng required');
  const data = await weather.fetchWeather({ city, lat, lng });
  return ok(res, data);
});

module.exports = { current };
