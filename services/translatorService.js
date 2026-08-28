/**
 * Google Translate wrapper.
 * Falls back to a no-op pass-through (with detected language echoed) when no key is set.
 */
const axios = require('axios');
const logger = require('../utils/logger');

const KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const BASE = 'https://translation.googleapis.com/language/translate/v2';

const translate = async ({ text, target = 'en', source }) => {
  if (!text) return { translated: '', detectedSourceLanguage: 'en' };
  if (!KEY) {
    return { translated: `[mock-${target}] ${text}`, detectedSourceLanguage: source || 'en', mock: true };
  }
  try {
    const { data } = await axios.post(`${BASE}?key=${KEY}`,
      { q: text, target, ...(source ? { source } : {}), format: 'text' },
      { timeout: 8000 }
    );
    const t = data.data.translations[0];
    return { translated: t.translatedText, detectedSourceLanguage: t.detectedSourceLanguage || source || 'auto' };
  } catch (err) {
    logger.warn(`Translate error: ${err.message}`);
    return { translated: text, detectedSourceLanguage: source || 'unknown', error: err.message };
  }
};

const supportedLanguages = () => ([
  { code: 'en', name: 'English' },  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },   { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },    { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },{ code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },  { code: 'ko', name: 'Korean' },
  { code: 'te', name: 'Telugu' },   { code: 'ta', name: 'Tamil' },
]);

module.exports = { translate, supportedLanguages };
