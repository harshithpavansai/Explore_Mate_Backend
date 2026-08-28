/**
 * Google Maps Places + Geocoding wrapper.
 * Falls back to mock data when GOOGLE_MAPS_API_KEY is not configured.
 */
const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

const cache = new NodeCache({ stdTTL: 300 });
const KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES = 'https://maps.googleapis.com/maps/api/place';
const GEOCODE = 'https://maps.googleapis.com/maps/api/geocode/json';

const nearbyPlaces = async ({ lat, lng, radius = 2000, type, keyword }) => {
  const k = JSON.stringify({ lat, lng, radius, type, keyword });
  const c = cache.get(k); if (c) return c;

  if (!KEY) {
    const mock = [
      { name: 'Sample Cafe', vicinity: 'Mock Street 1', rating: 4.5, geometry: { location: { lat: lat + 0.001, lng: lng + 0.001 } }, types: ['cafe'], mock: true },
      { name: 'Sample Park', vicinity: 'Mock Street 2', rating: 4.7, geometry: { location: { lat: lat - 0.002, lng: lng + 0.002 } }, types: ['park'], mock: true },
    ];
    cache.set(k, mock);
    return mock;
  }
  try {
    const { data } = await axios.get(`${PLACES}/nearbysearch/json`, {
      params: { location: `${lat},${lng}`, radius, key: KEY, ...(type && { type }), ...(keyword && { keyword }) },
      timeout: 8000,
    });
    cache.set(k, data.results || []);
    return data.results || [];
  } catch (err) {
    logger.warn(`Maps nearby error: ${err.message}`);
    return [];
  }
};

const geocode = async ({ address }) => {
  if (!address) return null;
  if (!KEY) return { lat: 0, lng: 0, formatted_address: address, mock: true };
  try {
    const { data } = await axios.get(GEOCODE, { params: { address, key: KEY }, timeout: 8000 });
    if (!data.results?.length) return null;
    const r = data.results[0];
    return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatted_address: r.formatted_address };
  } catch (err) {
    logger.warn(`Geocode error: ${err.message}`); return null;
  }
};

const reverseGeocode = async ({ lat, lng }) => {
  if (!KEY) return { formatted_address: 'Mock Location', mock: true };
  try {
    const { data } = await axios.get(GEOCODE, { params: { latlng: `${lat},${lng}`, key: KEY }, timeout: 8000 });
    return data.results?.[0] || null;
  } catch (err) {
    logger.warn(`Reverse geocode error: ${err.message}`); return null;
  }
};

module.exports = { nearbyPlaces, geocode, reverseGeocode };
