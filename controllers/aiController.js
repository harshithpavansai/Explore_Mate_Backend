/**
 * AI Assist screen + smart travel tools backend.
 */
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');
const ai = require('../services/openaiService');
const weather = require('../services/weatherService');

// POST /ai/chat   { messages:[{role,content}], system? }
const chat = asyncHandler(async (req, res) => {
  const { messages, system } = req.body;
  if (!Array.isArray(messages) || !messages.length) throw new ApiError('messages array required');
  const reply = await ai.chat({ messages, system });
  return ok(res, reply);
});

// POST /ai/recommend   { city, interests, weather?, time? }
const recommend = asyncHandler(async (req, res) => {
  const { city, interests = [], time } = req.body;
  if (!city) throw new ApiError('city required');
  let w = req.body.weather;
  if (!w) {
    const fetched = await weather.fetchWeather({ city });
    w = `${fetched.condition}, ${fetched.temp_c}C`;
  }
  const out = await ai.recommendPlaces({
    city,
    interests: Array.isArray(interests) ? interests.join(', ') : interests,
    weather: w,
    time: time || new Date().toISOString(),
  });
  return ok(res, out);
});

// POST /ai/travel-tips   { destination, days, interests }
const travelTips = asyncHandler(async (req, res) => {
  const { destination, days = 3, interests = [] } = req.body;
  if (!destination) throw new ApiError('destination required');
  const messages = [{
    role: 'user',
    content: `Give 5 short, actionable travel tips for a ${days}-day trip to ${destination}` +
             ` focused on ${(Array.isArray(interests) ? interests.join(', ') : interests) || 'general travel'}.`,
  }];
  const reply = await ai.chat({ messages, system: 'You are a concise, expert travel advisor.' });
  return ok(res, reply);
});

module.exports = { chat, recommend, travelTips };
