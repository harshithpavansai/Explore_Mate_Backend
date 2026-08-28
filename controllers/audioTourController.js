/**
 * AI Audio Tour Guide.
 * Generates a script with OpenAI, synthesises with Google TTS, persists the tour record.
 */
const { query } = require('../config/database');
const { ok, created, ApiError, asyncHandler } = require('../utils/responseHandler');
const ai = require('../services/openaiService');
const tts = require('../services/ttsService');

// POST /audio-tour   { destination_id?, destinationName?, city?, country?, durationMinutes?, language? }
const generate = asyncHandler(async (req, res) => {
  let { destination_id, destinationName, city, country, durationMinutes = 5, language = 'en' } = req.body;

  if (destination_id) {
    const { rows } = await query(
      'SELECT name,city,country FROM destinations WHERE id = $1', [destination_id]);
    if (!rows[0]) throw new ApiError('Destination not found', 404);
    destinationName = destinationName || rows[0].name;
    city = city || rows[0].city;
    country = country || rows[0].country;
  }
  if (!destinationName) throw new ApiError('destinationName or destination_id required');

  const transcript = await ai.generateAudioTourScript({ destinationName, city, country, durationMinutes, language });

  const audio = await tts.synthesize({
    text: transcript,
    language: language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`,
  });

  const insert = await query(
    `INSERT INTO audio_tours (destination_id,user_id,title,transcript,audio_url,language,duration_sec)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [destination_id || null, req.user?.id || null,
     `Audio Tour - ${destinationName}`, transcript, audio.audioDataUrl || null,
     language, durationMinutes * 60]
  );

  return created(res, {
    tour: insert.rows[0],
    audio: { dataUrl: audio.audioDataUrl, mock: audio.mock || false, message: audio.message },
  }, 'Audio tour generated');
});

// GET /audio-tour
const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id,destination_id,title,language,duration_sec,created_at
     FROM audio_tours
     WHERE user_id = $1 OR user_id IS NULL
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  return ok(res, rows);
});

// GET /audio-tour/:id
const detail = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM audio_tours WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new ApiError('Audio tour not found', 404);
  return ok(res, rows[0]);
});

module.exports = { generate, list, detail };
