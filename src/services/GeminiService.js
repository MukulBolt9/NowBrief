// src/services/GeminiService.js
// Gemini 1.5 Flash: weather summaries, AI news digest, music recommendations,
// location → coordinates lookup, daily brief card.

import axios from 'axios';

const KEY   = 'AIzaSyC356BnpkkFlWyIclsX5aB1OMvY-uNW0Hk';
const BASE  = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-1.5-flash-latest';

async function ask(prompt, json = false) {
  const url = `${BASE}/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt + (json ? '\n\nRespond ONLY with valid JSON, no markdown, no explanation.' : '') }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 400, topP: 0.9 },
  };
  const { data } = await axios.post(url, body, { timeout: 12000 });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  if (!json) return text;
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch { return null; }
}

export class GeminiService {

  /** Resolve a city name → { lat, lon, city, country } using Gemini */
  static async resolveLocation(cityName) {
    const data = await ask(`
Give the GPS coordinates for "${cityName}".
Return JSON: { "lat": number, "lon": number, "city": "canonical city name", "country": "country" }
`, true);
    if (data && data.lat && data.lon) return data;
    return { lat: 22.2967, lon: 87.0788, city: 'Salboni', country: 'India' };
  }

  /** AI weather summary — called with Open-Meteo data */
  static async getWeatherSummary(weather) {
    if (!weather) return 'Weather unavailable.';
    return ask(`
You are a friendly Samsung Now Brief weather assistant. Max 2 short sentences, 30 words.
Include a practical tip if relevant (umbrella/sunscreen/jacket).
Weather: ${weather.temp}°C (feels ${weather.feelsLike}°C), ${weather.description},
humidity ${weather.humidity}%, wind ${weather.windSpeed} km/h,
precipitation ${weather.precipitation}mm, daytime: ${weather.isDay}.
Tomorrow: ${weather.forecast?.[1]?.desc || 'similar'}.
No emojis in text.
`);
  }

  /** Music recommendations based on weather + hour */
  static async getMusicRecommendations(weather, hour) {
    const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    const data = await ask(`
Music curator for a smart brief app. Recommend 3 songs.
Context: ${weather?.description || 'clear'} ${weather?.temp || 25}°C, ${tod}.
Return JSON array of 3: [{ "title": "", "artist": "", "mood": "", "genre": "", "youtubeQuery": "" }]
`, true);
    return Array.isArray(data) ? data : [
      { title: 'Here Comes the Sun', artist: 'The Beatles', mood: 'uplifting', genre: 'pop', youtubeQuery: 'Here Comes the Sun Beatles' },
      { title: 'Weightless', artist: 'Marconi Union', mood: 'calm', genre: 'ambient', youtubeQuery: 'Weightless Marconi Union' },
      { title: 'Good Days', artist: 'SZA', mood: 'mellow', genre: 'r&b', youtubeQuery: 'Good Days SZA' },
    ];
  }

  /** Daily summary card — headline, tip, affirmation, mood emoji */
  static async getDailySummary(weather, news, hour) {
    const tod      = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    const headlines = news?.slice(0, 3).map(n => n.title).join(' | ') || 'No news loaded';
    const data = await ask(`
You are NowBrief, a Samsung Now Brief-style assistant.
Time: ${tod} (${hour}:00), Weather: ${weather?.description || 'unknown'} ${weather?.temp || '?'}°C.
Top news: ${headlines}.
Return JSON:
{
  "headline": "max 12 words",
  "weatherTip": "max 10 words practical tip",
  "newsBite": "max 20 words neutral digest",
  "affirmation": "max 10 words positive",
  "dayEmoji": "single emoji"
}
`, true);
    return data || {
      headline: 'Your brief is ready',
      weatherTip: weather ? `${weather.temp}°C today` : 'Check outside!',
      newsBite: 'Stay informed with today\'s top stories.',
      affirmation: 'Today is full of possibilities.',
      dayEmoji: '✨',
    };
  }

  /** 2-sentence article summary */
  static async summarizeArticle(article) {
    return ask(`Summarize in 2 sentences (max 40 words): "${article.title}". ${article.description || ''} Be neutral and factual.`);
  }

  /** Weather-aware wellness tip */
  static async getWellnessTip(weather, hour) {
    return ask(`One practical wellness tip (max 15 words) for: ${hour}:00, ${weather?.description || 'clear'} ${weather?.temp || 25}°C. Be specific.`);
  }

  /**
   * Gemini-powered weather fetch — generates mock weather data for locations
   * where Open-Meteo might not resolve (used as last fallback).
   */
  static async getWeatherForCity(city) {
    const data = await ask(`
Generate realistic current weather data for ${city}, India.
Return JSON: {
  "temp": number, "feelsLike": number, "humidity": number, "windSpeed": number,
  "description": "string", "emoji": "string", "isDay": true, "precipitation": 0,
  "pressure": number
}
`, true);
    return data;
  }
}
