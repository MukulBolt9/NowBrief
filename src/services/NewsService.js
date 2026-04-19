// src/services/NewsService.js
// Fetches real news via public RSS feeds — NO API KEY required.
// Sources: Times of India, NDTV, BBC India, Reuters, TechCrunch, Economic Times
// Parses RSS XML with a lightweight regex parser (no external XML lib needed).

import axios from 'axios';

// Public RSS feeds — all freely accessible, no auth
const FEEDS = [
  { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',       category: 'general'    },
  { name: 'NDTV',           url: 'https://feeds.feedburner.com/ndtvnews-top-stories',                category: 'general'    },
  { name: 'BBC News',       url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                      category: 'world'      },
  { name: 'Reuters',        url: 'https://feeds.reuters.com/reuters/topNews',                        category: 'world'      },
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms',      category: 'business'   },
  { name: 'TechCrunch',     url: 'https://techcrunch.com/feed/',                                     category: 'technology' },
  { name: 'The Hindu',      url: 'https://www.thehindu.com/feeder/default.rss',                      category: 'general'    },
  { name: 'CNBC',           url: 'https://www.cnbc.com/id/100727362/device/rss/rss.html',            category: 'business'   },
];

const CATEGORY_ICONS = {
  general:    '🌐',
  world:      '🌍',
  business:   '💼',
  technology: '💻',
  sports:     '🏏',
  health:     '❤️',
};

// Lightweight RSS XML parser — extracts <item> blocks without needing xml2js
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    const link  = get('link') || get('guid');
    const desc  = get('description');
    const pubDate = get('pubDate');
    const media = block.match(/url="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
    if (title) items.push({ title, link, desc, pubDate, image: media?.[1] || null });
  }
  return items;
}

class NewsServiceClass {
  constructor() {
    this.cache     = [];
    this.cacheTime = null;
    this.TTL       = 15 * 60 * 1000; // 15 min
  }

  async getTopHeadlines(max = 20) {
    if (this.cache.length && this.cacheTime && Date.now() - this.cacheTime < this.TTL) {
      return this.cache.slice(0, max);
    }
    try {
      // Fetch top 3 feeds concurrently, skip failures
      const results = await Promise.allSettled(
        FEEDS.slice(0, 5).map(feed => this._fetchFeed(feed))
      );
      const articles = [];
      results.forEach(r => { if (r.status === 'fulfilled') articles.push(...r.value); });

      // Sort by date descending, deduplicate by title
      const seen = new Set();
      const sorted = articles
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .filter(a => { if (seen.has(a.title)) return false; seen.add(a.title); return true; });

      this.cache     = sorted;
      this.cacheTime = Date.now();
      return sorted.slice(0, max);
    } catch (e) {
      console.warn('[NewsService] All feeds failed:', e.message);
      return [];
    }
  }

  async getByCategory(category, max = 8) {
    const feed = FEEDS.find(f => f.category === category);
    if (!feed) return [];
    try {
      return (await this._fetchFeed(feed)).slice(0, max);
    } catch (_) { return []; }
  }

  async _fetchFeed(feed) {
    // Use allorigins.win CORS proxy so it works on device without a backend
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
    const res = await axios.get(proxyUrl, { timeout: 10000 });
    const xml = res.data?.contents || res.data;
    const items = parseRSS(typeof xml === 'string' ? xml : JSON.stringify(xml));
    return items.map(item => ({
      title:       this._cleanText(item.title),
      description: this._cleanText(item.desc),
      source:      feed.name,
      category:    feed.category,
      url:         item.link,
      image:       item.image || null,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      icon:        CATEGORY_ICONS[feed.category] || '📰',
    }));
  }

  _cleanText(text = '') {
    return text
      .replace(/<[^>]+>/g, '')           // strip HTML tags
      .replace(/&amp;/g,  '&')
      .replace(/&lt;/g,   '<')
      .replace(/&gt;/g,   '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g,  "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g,    ' ')
      .trim();
  }

  getTimeSince(isoDate) {
    const diff = Date.now() - new Date(isoDate).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 1)  return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr  < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }
}

export const NewsService = new NewsServiceClass();
