/**
 * Lightweight geo helpers - Haversine distance, bounding-box helpers.
 */
const EARTH_KM = 6371;

const toRad = (d) => (d * Math.PI) / 180;

/**
 * Distance in kilometres between two lat/lon points.
 */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

module.exports = { haversineKm };
