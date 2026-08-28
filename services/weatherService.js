/**
 * OpenWeather wrapper.
 * Falls back to a mock payload when OPENWEATHER_API_KEY is not set.
 */
const axios = require('axios');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

const KEY = process.env.OPENWEATHER_API_KEY;
const BASE = 'https://api.openweathermap.org/data/2.5';

const fetchWeather = async ({ lat, lng, city }) => {
  const key = JSON.stringify({ lat, lng, city });
  const cached = cache.get(key);
  if (cached) return cached;

  if (!KEY) {
    const mock = {
      city: city || 'Demo City',
      temp_c: 24,
      condition: 'Partly Cloudy',
      humidity: 60,
      wind_kph: 12,
      mock: true,
    };
    cache.set(key, mock);
    return mock;
  }

  try {
    const params = lat != null && lng != null
      ? { lat, lon: lng, units: 'metric', appid: KEY }
      : { q: city, units: 'metric', appid: KEY };
    const { data } = await axios.get(`${BASE}/weather`, { params, timeout: 8000 });

    const result = {
      city: data.name,
      country: data.sys?.country,
      temp_c: data.main?.temp,
      feels_like_c: data.main?.feels_like,
      condition: data.weather?.[0]?.main,
      description: data.weather?.[0]?.description,
      humidity: data.main?.humidity,
      wind_kph: data.wind?.speed ? data.wind.speed * 3.6 : null,
      sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000) : null,
      sunset:  data.sys?.sunset  ? new Date(data.sys.sunset  * 1000) : null,
    };
    cache.set(key, result);
    return result;
  } catch (err) {
    logger.warn(`Weather API error: ${err.message}`);
    return { city: city || 'Unknown', temp_c: null, condition: 'Unavailable', mock: true };
  }
};

module.exports = { fetchWeather };
