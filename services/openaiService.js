/**
 * OpenAI service - travel chat, itinerary generation, audio-tour scripts.
 *
 * If OPENAI_API_KEY is not configured, methods fall back to deterministic mock
 * data so the rest of the system stays functional in development.
 */
const logger = require('../utils/logger');

let openai = null;
const apiKey = process.env.OPENAI_API_KEY;

if (apiKey) {
  try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey });
  } catch (err) {
    logger.warn(`OpenAI SDK not loaded: ${err.message}`);
  }
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const safeJsonExtract = (text) => {
  if (!text) return null;
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  try { return match ? JSON.parse(match[1] || match[0]) : JSON.parse(text); }
  catch { return null; }
};

// ----------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------

/**
 * Free-form travel chat (used by the AI Assist screen).
 */
const chat = async ({ messages, system }) => {
  if (!openai) {
    return {
      role: 'assistant',
      content:
        "I'm in offline demo mode. Connect an OpenAI key to enable real AI replies. " +
        "Meanwhile, try asking ExploreMate for hidden gems or weather-based food picks!",
    };
  }
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system || 'You are ExploreMate, a friendly AI travel assistant.' },
      ...messages,
    ],
    temperature: 0.7,
  });
  return { role: 'assistant', content: completion.choices[0].message.content };
};

/**
 * Generate a structured day-by-day itinerary.
 */
const generateItinerary = async ({ destination, startDate, endDate, travelers, interests, budget }) => {
  const prompt = `Create a JSON travel itinerary for the following trip:
Destination: ${destination || 'unspecified'}
Dates: ${startDate || '?'} to ${endDate || '?'}
Travelers: ${travelers || 1}
Budget: ${budget || 'flexible'}
Interests: ${(interests || []).join(', ') || 'general'}

Respond ONLY with valid JSON of shape:
[
  { "day": 1, "date": "YYYY-MM-DD", "title": "...", "morning": "...", "afternoon": "...", "evening": "...", "highlights": ["..."], "estimated_cost": 0 }
]`;

  if (!openai) {
    // Mock itinerary
    return [
      { day: 1, date: startDate, title: `Arrival in ${destination}`,
        morning: 'Hotel check-in & light breakfast',
        afternoon: 'City orientation walk',
        evening: 'Local dinner spot near hotel',
        highlights: ['Old town', 'Sunset point'], estimated_cost: 50 },
      { day: 2, date: endDate, title: 'Hidden gems',
        morning: 'Visit lesser-known landmark',
        afternoon: 'Cafe + local market',
        evening: 'Audio-tour stroll',
        highlights: ['Market', 'Cafe'], estimated_cost: 60 },
    ];
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are an expert travel planner. Return ONLY valid JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
  });
  const parsed = safeJsonExtract(completion.choices[0].message.content);
  return parsed || [];
};

/**
 * Generate an audio-tour transcript for a destination.
 */
const generateAudioTourScript = async ({ destinationName, city, country, durationMinutes = 5, language = 'en' }) => {
  const prompt = `Write an engaging ${durationMinutes}-minute audio tour script in ${language} for "${destinationName}" in ${city}, ${country}. Cover history, culture, fun facts, and travel tips. Use a warm conversational tone. Plain text only.`;
  if (!openai) {
    return `Welcome to ${destinationName} in ${city}, ${country}! ` +
           `As you stand here today, imagine the centuries of stories these stones could tell. ` +
           `This place blends history, culture, and local life into one unforgettable experience. ` +
           `Take a deep breath, look around, and let ExploreMate guide your senses through every detail.`;
  }
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are an expert audio tour scriptwriter for travelers.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.85,
  });
  return completion.choices[0].message.content.trim();
};

/**
 * Recommend places given user preferences + context.
 */
const recommendPlaces = async ({ city, interests, weather, time }) => {
  if (!openai) {
    return {
      recommendations: [
        { name: 'Old Town Stroll', reason: 'Charming streets and easy to explore on foot.' },
        { name: 'Sunset Viewpoint', reason: 'Best photo opportunity at golden hour.' },
        { name: 'Hidden Cafe', reason: 'Local favourite tucked away from tourists.' },
      ],
    };
  }
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'Travel concierge. Reply only with JSON: { "recommendations":[{name,reason}] }' },
      { role: 'user', content: `City: ${city}\nInterests: ${interests}\nWeather: ${weather}\nTime: ${time}` },
    ],
    temperature: 0.7,
  });
  return safeJsonExtract(completion.choices[0].message.content) || { recommendations: [] };
};

module.exports = { chat, generateItinerary, generateAudioTourScript, recommendPlaces };
