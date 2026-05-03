// src/services/NewsService.js
import axios from 'axios';

const GNEWS_KEY = 'YOUR_GNEWS_API_KEY'; // get free key at gnews.io/register
const BASE = 'https://gnews.io/api/v4';

export const NEWS_CATEGORIES = [
  { id: 'general',       label: 'Top',          emoji: '🔥' },
  { id: 'technology',    label: 'Tech',          emoji: '💻' },
  { id: 'business',      label: 'Business',      emoji: '💼' },
  { id: 'world',         label: 'World',         emoji: '🌍' },
  { id: 'science',       label: 'Science',       emoji: '🔬' },
  { id: 'health',        label: 'Health',        emoji: '🏥' },
  { id: 'sports',        label: 'Sports',        emoji: '⚽' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
];

const MOCK = [
  { title: 'AI breakthroughs reshape global technology landscape', description: 'Major tech companies announce record investments in artificial intelligence.', publishedAt: new Date(Date.now()-3600000).toISOString(), source: 'TechCrunch', category: 'technology', image: null, url: '' },
  { title: 'Global markets rally as inflation data shows decline', description: 'Stocks rose after inflation figures came in below expectations.', publishedAt: new Date(Date.now()-7200000).toISOString(), source: 'Reuters', category: 'business', image: null, url: '' },
  { title: 'Climate agreement signed by 60 nations at Geneva', description: 'World leaders committed to ambitious emissions reductions.', publishedAt: new Date(Date.now()-10800000).toISOString(), source: 'BBC', category: 'world', image: null, url: '' },
  { title: 'Breakthrough cancer therapy shows 90% success in trials', description: 'A new immunotherapy approach shows unprecedented results.', publishedAt: new Date(Date.now()-14400000).toISOString(), source: 'Nature', category: 'health', image: null, url: '' },
  { title: 'Scientists discover exoplanet with Earth-like atmosphere', description: 'James Webb reveals a promising habitability candidate.', publishedAt: new Date(Date.now()-18000000).toISOString(), source: 'NASA', category: 'science', image: null, url: '' },
  { title: 'India economy grows at fastest pace in a decade', description: 'GDP beat expectations as manufacturing and services surge.', publishedAt: new Date(Date.now()-1800000).toISOString(), source: 'NDTV', category: 'general', image: null, url: '' },
  { title: 'IPL 2025 — SRH vs CSK match highlights', description: 'A nail-biting finish as SRH edges CSK in the last over.', publishedAt: new Date(Date.now()-900000).toISOString(), source: 'CricInfo', category: 'sports', image: null, url: '' },
  { title: 'Major streaming merger announced — what it means for you', description: 'Two top platforms set to combine in a landmark deal.', publishedAt: new Date(Date.now()-25200000).toISOString(), source: 'Variety', category: 'entertainment', image: null, url: '' },
];

export class NewsService {
  static apiKey = GNEWS_KEY;
  static setApiKey(key) { this.apiKey = key; }

  static async getByCategory(category = 'general', max = 6, lang = 'en') {
    try {
      const { data } = await axios.get(`${BASE}/top-headlines`, {
        params: { category, lang, max, apikey: this.apiKey },
        timeout: 10000,
      });
      return (data.articles || []).map(a => ({
        title: a.title, description: a.description, content: a.content,
        url: a.url, image: a.image, publishedAt: a.publishedAt,
        source: a.source?.name || 'Unknown', category,
      }));
    } catch {
      return MOCK.filter(n => n.category === category || category === 'general').slice(0, max);
    }
  }

  // Alias used by LiveNotificationService
  static getTopHeadlines(lang = 'en', max = 10) {
    return this.getByCategory('general', max, lang);
  }

  static async getAllCategories() {
    const cats = ['general','technology','business','world','science','health','sports','entertainment'];
    const results = await Promise.allSettled(cats.map(c => this.getByCategory(c, 5)));
    const all = {};
    cats.forEach((c, i) => {
      all[c] = results[i].status === 'fulfilled' ? results[i].value : MOCK.filter(n => n.category === c);
    });
    return all;
  }

  static timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
