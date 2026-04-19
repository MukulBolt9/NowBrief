// src/services/NewsService.js
// Real news from GNews API (free — 100 req/day)
// Get your key at: https://gnews.io

import axios from 'axios';

// ⚠️  Replace with your own free key from gnews.io
const GNEWS_API_KEY = 'YOUR_GNEWS_API_KEY';
const GNEWS_BASE    = 'https://gnews.io/api/v4';

// Fallback: NewsAPI (newsapi.org — another free option)
const NEWSAPI_KEY  = 'YOUR_NEWSAPI_KEY';
const NEWSAPI_BASE = 'https://newsapi.org/v2';

const CATEGORY_ICONS = {
  general:       '🌐',
  business:      '💼',
  technology:    '💻',
  entertainment: '🎬',
  sports:        '🏏',
  science:       '🔬',
  health:        '❤️',
};

class NewsService {
  constructor() {
    this.cache     = [];
    this.cacheTime = null;
    this.TTL       = 15 * 60 * 1000; // 15 min cache
  }

  async getTopHeadlines(country = 'in', max = 10) {
    // Return cache if fresh
    if (this.cache.length && this.cacheTime && Date.now() - this.cacheTime < this.TTL) {
      return this.cache;
    }

    try {
      const res = await axios.get(`${GNEWS_BASE}/top-headlines`, {
        params: {
          token:    GNEWS_API_KEY,
          country,
          max,
          lang:     'en',
        },
        timeout: 8000,
      });

      this.cache     = res.data.articles.map(this._normalize);
      this.cacheTime = Date.now();
      return this.cache;
    } catch (e) {
      console.warn('[NewsService] GNews failed, trying NewsAPI:', e.message);
      return this._fallbackNewsAPI(country, max);
    }
  }

  async getByCategory(category = 'technology', max = 5) {
    try {
      const res = await axios.get(`${GNEWS_BASE}/top-headlines`, {
        params: {
          token:  GNEWS_API_KEY,
          topic:  category,
          max,
          lang:   'en',
        },
        timeout: 8000,
      });
      return res.data.articles.map(this._normalize);
    } catch (e) {
      return [];
    }
  }

  async search(query, max = 5) {
    try {
      const res = await axios.get(`${GNEWS_BASE}/search`, {
        params: {
          token: GNEWS_API_KEY,
          q:     query,
          max,
          lang:  'en',
        },
        timeout: 8000,
      });
      return res.data.articles.map(this._normalize);
    } catch (e) {
      return [];
    }
  }

  async _fallbackNewsAPI(country, pageSize) {
    try {
      const res = await axios.get(`${NEWSAPI_BASE}/top-headlines`, {
        params: {
          apiKey:   NEWSAPI_KEY,
          country,
          pageSize,
        },
        timeout: 8000,
      });
      this.cache     = res.data.articles.map(a => ({
        title:       a.title,
        description: a.description,
        source:      a.source.name,
        url:         a.url,
        image:       a.urlToImage,
        publishedAt: a.publishedAt,
        icon:        '📰',
      }));
      this.cacheTime = Date.now();
      return this.cache;
    } catch (e) {
      console.warn('[NewsService] Both APIs failed');
      return [];
    }
  }

  _normalize(article) {
    return {
      title:       article.title,
      description: article.description,
      source:      article.source?.name || 'Unknown',
      url:         article.url,
      image:       article.image,
      publishedAt: article.publishedAt,
      icon:        '📰',
    };
  }

  getTimeSince(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 60)  return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr  < 24)  return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }
}

export const NewsService = new NewsService();
