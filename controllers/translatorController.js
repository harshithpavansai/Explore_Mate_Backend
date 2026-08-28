/**
 * Language translator endpoints.
 */
const { ok, ApiError, asyncHandler } = require('../utils/responseHandler');
const translator = require('../services/translatorService');
const tts = require('../services/ttsService');

// POST /translator   { text, target, source? }
const translate = asyncHandler(async (req, res) => {
  const { text, target = 'en', source } = req.body;
  if (!text) throw new ApiError('text required');
  const out = await translator.translate({ text, target, source });
  return ok(res, out);
});

// POST /translator/speak    { text, language }   -> audio
const speak = asyncHandler(async (req, res) => {
  const { text, language = 'en-US' } = req.body;
  if (!text) throw new ApiError('text required');
  const audio = await tts.synthesize({ text, language });
  return ok(res, audio);
});

// GET /translator/languages
const languages = asyncHandler(async (_req, res) =>
  ok(res, translator.supportedLanguages())
);

module.exports = { translate, speak, languages };
