const express = require('express');
const router = express.Router();
const axios = require('axios');

// google-tts-api requires no API key and returns a direct Google Translate TTS audio URL
let googleTTS;
try {
  googleTTS = require('google-tts-api');
} catch (e) {
  // Safe mock if dependency is not installed yet
  googleTTS = {
    getAudioUrl: (text, opts) => `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${opts.lang || 'en'}&client=tw-ob`
  };
}

// @route   GET api/v1/free/weather
// @desc    Get free weather data (Open-Meteo API - NO KEY REQUIRED)
router.get('/weather', async (req, res) => {
    try {
        const { lat = 17.6868, lon = 83.2185 } = req.query; // Default to Vizag
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        
        const response = await axios.get(url);
        res.json({ weather: response.data.current_weather });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Weather fetch failed' });
    }
});

// @route   GET api/v1/free/places
// @desc    Get free places/food data (Nominatim/OpenStreetMap - NO KEY REQUIRED)
router.get('/places', async (req, res) => {
    try {
        const { query = 'restaurant', city = 'Visakhapatnam' } = req.query;
        // Nominatim requires a User-Agent header
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}+in+${encodeURIComponent(city)}&format=json&limit=5`;
        
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'ExploreMateApp/1.0' }
        });
        
        res.json({ places: response.data });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Places fetch failed' });
    }
});

// @route   GET api/v1/free/tts
// @desc    Get free Text-to-Speech audio URL (Google TTS API - NO KEY REQUIRED)
router.get('/tts', async (req, res) => {
    try {
        const { text, lang = 'en' } = req.query;
        if (!text) return res.status(400).json({ msg: 'Text is required' });

        const url = googleTTS.getAudioUrl(text, {
            lang: lang,
            slow: false,
            host: 'https://translate.google.com',
        });
        
        res.json({ audioUrl: url });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'TTS generation failed' });
    }
});

module.exports = router;
