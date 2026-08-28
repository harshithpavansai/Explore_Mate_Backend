/**
 * Google Text-to-Speech wrapper.
 * Returns base64-encoded MP3 audio plus a data URL that the Flutter app can play directly.
 *
 * If GOOGLE_TTS_API_KEY isn't set, a mock indicator is returned so the audio screen still flows.
 */
const axios = require('axios');
const logger = require('../utils/logger');

const KEY = process.env.GOOGLE_TTS_API_KEY;
const BASE = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const synthesize = async ({ text, language = 'en-US', voiceName, gender = 'NEUTRAL' }) => {
  if (!text) throw new Error('text required');

  if (!KEY) {
    return {
      audioContent: null,
      audioDataUrl: null,
      mock: true,
      message: 'TTS API key not configured. Configure GOOGLE_TTS_API_KEY to enable real audio.',
    };
  }

  try {
    const { data } = await axios.post(
      `${BASE}?key=${KEY}`,
      {
        input: { text },
        voice: { languageCode: language, ...(voiceName ? { name: voiceName } : {}), ssmlGender: gender },
        audioConfig: { audioEncoding: 'MP3' },
      },
      { timeout: 15_000 }
    );
    const audioContent = data.audioContent;
    return {
      audioContent,
      audioDataUrl: `data:audio/mp3;base64,${audioContent}`,
      mimeType: 'audio/mpeg',
    };
  } catch (err) {
    logger.warn(`TTS error: ${err.message}`);
    return { error: err.message, mock: true, audioContent: null, audioDataUrl: null };
  }
};

module.exports = { synthesize };
