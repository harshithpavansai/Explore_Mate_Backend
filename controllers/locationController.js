/**
 * Location-related endpoints: geocoding, reverse-geocoding, places search.
 */
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');
const maps = require('../services/googleMapsService');

// GET /location/geocode?address=
const geocode = asyncHandler(async (req, res) => {
  const { address } = req.query;
  if (!address) throw new ApiError('address required');
  const out = await maps.geocode({ address });
  return ok(res, out);
});

// GET /location/reverse?lat=&lng=
const reverse = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat); const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError('lat/lng required');
  const out = await maps.reverseGeocode({ lat, lng });
  return ok(res, out);
});

// GET /location/nearby?lat=&lng=&type=&keyword=&radius=
const nearby = asyncHandler(async (req, res) => {
  const lat = Number(req.query.lat); const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) throw new ApiError('lat/lng required');
  const out = await maps.nearbyPlaces({
    lat, lng,
    type: req.query.type,
    keyword: req.query.keyword,
    radius: req.query.radius ? Number(req.query.radius) : 1500,
  });
  return ok(res, out);
});

module.exports = { geocode, reverse, nearby };
