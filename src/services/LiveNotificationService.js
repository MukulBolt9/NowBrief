// src/services/LiveNotificationService.js
// Orchestrates all live notifications using the Samsung Now Bar native bridge.
// Samsung One UI 7 bundle keys implemented in NowBriefNotificationHelper.java.
// Weather + news fetched via Gemini AI (+ Open-Meteo fallback).

import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage    from '@react-native-async-storage/async-storage';
import { format }      from 'date-fns';
import Bridge          from './NativeNotificationBridge';
import { GeminiService } from './GeminiService';
import { WeatherService } from './WeatherService';
import { NewsService }   from './NewsService';

const WEATHER_CHIP_ID = 9001;

// Time-of-day chip colours
const CHIP_COLORS = {
  morning: '#E65100',
  day:     '#1565C0',
  evening: '#4A148C',
  night:   '#0D47A1',
};

function getChipColor() {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return CHIP_COLORS.morning;
  if (h >= 11 && h < 17) return CHIP_COLORS.day;
  if (h >= 17 && h < 21) return CHIP_COLORS.evening;
  return CHIP_COLORS.night;
}

// ── Scheduled timed messages (matches your uploaded file) ───────────────────
const SCHEDULE = [
  { hour: 6,  min: 0,  key: 'morning',    title: 'Good morning!',
    chipText: 'Good morning',
    getPrimary:   (w) => w ? `${w.emoji} ${w.temp}°C in ${w.city}` : 'Your brief is ready',
    getSecondary: (w, n) => n?.[0]?.title?.slice(0, 80) ?? 'Top stories ready',
    getNowBar:    (w) => w ? `${w.temp}°C · ${w.description}` : 'Morning brief ready',
    chipColor: CHIP_COLORS.morning },

  { hour: 7,  min: 30, key: 'commute',    title: 'Commute time',
    chipText: 'Commute check',
    getPrimary:   () => 'Morning commute',
    getSecondary: () => 'Traffic looks clear on your usual route.',
    getNowBar:    () => 'Traffic looks clear',
    chipColor: '#00695C' },

  { hour: 9,  min: 0,  key: 'news',       title: 'Top stories',
    chipText: 'Morning news',
    getPrimary:   (w, n) => n?.[0]?.source ?? 'Top news',
    getSecondary: (w, n) => n?.[0]?.title?.slice(0, 80) ?? 'Headlines ready',
    getNowBar:    (w, n) => n?.[0]?.title?.slice(0, 60) ?? 'News ready',
    chipColor: '#1565C0' },

  { hour: 12, min: 0,  key: 'lunch',      title: 'Lunch break',
    chipText: 'Lunch time',
    getPrimary:   () => 'Lunch break!',
    getSecondary: () => 'Time to step away from the screen.',
    getNowBar:    () => 'Take a break',
    chipColor: '#E65100' },

  { hour: 14, min: 0,  key: 'markets',    title: 'Markets update',
    chipText: 'Markets',
    getPrimary:   () => 'Markets midday',
    getSecondary: () => 'Tap to see Sensex & your portfolio snapshot.',
    getNowBar:    () => 'Markets update ready',
    chipColor: '#2E7D32' },

  { hour: 17, min: 0,  key: 'weather_pm', title: 'Evening weather',
    chipText: 'Weather',
    getPrimary:   (w) => w ? `${w.emoji} ${w.city} · ${w.temp}°C` : 'Evening weather',
    getSecondary: (w) => w ? `${w.description} · ${w.rainChance ?? 0}% rain` : 'Check before heading home.',
    getNowBar:    (w) => w ? `${w.temp}°C · ${w.description}` : 'Weather update',
    chipColor: CHIP_COLORS.evening },

  { hour: 19, min: 0,  key: 'digest',     title: 'Evening digest',
    chipText: 'Evening digest',
    getPrimary:   () => 'Your evening digest',
    getSecondary: (w, n) => n?.[1]?.title?.slice(0, 80) ?? 'What you missed today.',
    getNowBar:    () => 'Evening digest ready',
    chipColor: '#4A148C' },

  { hour: 21, min: 30, key: 'wellness',   title: 'Wind down',
    chipText: 'Wind down',
    getPrimary:   () => 'Time to wind down',
    getSecondary: () => 'Great day! Relax and sleep well tonight.',
    getNowBar:    () => 'Good night',
    chipColor: CHIP_COLORS.night },
];

// ── NowBarService singleton ──────────────────────────────────────────────────
class NowBarService {
  constructor() {
    this.running   = false;
    this.timers    = [];
    this.sentToday = new Set();
    this.weather   = null;
    this.news      = [];
  }

  async start() {
    if (this.running) return;
    this.running = true;
    Bridge.createChannels();

    await this._loadCache();
    this._fetchAndUpdateChip();

    // Refresh every 15 min
    this.timers.push(BackgroundTimer.setInterval(() => this._fetchAndUpdateChip(), 15 * 60_000));
    // Check schedule every 60s
    this.timers.push(BackgroundTimer.setInterval(() => this._checkSchedule(), 60_000));

    console.log('[NowBar] Service running');
  }

  stop() {
    this.timers.forEach(t => BackgroundTimer.clearInterval(t));
    this.timers  = [];
    this.running = false;
  }

  async _loadCache() {
    try {
      const [cw, cn] = await Promise.all([
        AsyncStorage.getItem('nb_weather'),
        AsyncStorage.getItem('nb_news'),
      ]);
      if (cw) this.weather = JSON.parse(cw);
      if (cn) this.news    = JSON.parse(cn);
    } catch (_) {}
  }

  async _fetchAndUpdateChip() {
    try {
      // 1. Get raw weather from Open-Meteo
      const rawWeather = await WeatherService.fetch().catch(() => null);

      // 2. Enhance with Gemini AI summary
      let w = rawWeather;
      if (rawWeather) {
        const aiSummary = await GeminiService.getWeatherSummary(rawWeather).catch(() => null);
        w = { ...rawWeather, aiSummary };
        // Store canonical weather shape
        w.city     = rawWeather.city || 'Salboni';
        w.emoji    = rawWeather.emoji || '🌡';
        w.rainChance = rawWeather.hourly?.[0]?.rainProb ?? 0;
      }

      // 3. Get news (GNews → Gemini fallback)
      const rawNews = await NewsService.getByCategory('general', 10).catch(() => []);
      // Gemini AI summaries for top 3
      const n = await Promise.all(
        rawNews.slice(0, 3).map(async (a) => ({
          ...a,
          aiSummary: await GeminiService.summarizeArticle(a).catch(() => a.description),
        }))
      ).catch(() => rawNews);

      this.weather = w;
      this.news    = n.length ? n : rawNews;

      await AsyncStorage.setItem('nb_weather', JSON.stringify(w));
      await AsyncStorage.setItem('nb_news',    JSON.stringify(this.news));
      await AsyncStorage.setItem('nb_lastRefresh', new Date().toISOString());

      // 4. Update the persistent Now Bar chip
      const chipText = w ? `${w.emoji} ${w.temp}°C` : 'NowBrief';
      Bridge.sendLiveNotification({
        id:              WEATHER_CHIP_ID,
        title:           w ? `${w.emoji} ${w.city} · ${w.temp}°C` : 'NowBrief',
        body:            w ? `${w.description} · ${w.humidity}% humidity · ${w.windSpeed} km/h wind` : 'Your live brief',
        primaryInfo:     w ? `${w.emoji} ${w.city}` : 'NowBrief',
        secondaryInfo:   w ? `${w.temp}°C · ${w.description}` : '',
        nowBarPrimary:   chipText,
        nowBarSecondary: w ? w.description : 'Live brief',
        chipText,
        chipColor:       getChipColor(),
        progress:        -1,
      });

      console.log('[NowBar] Chip updated:', chipText);
    } catch (e) {
      console.warn('[NowBar] Fetch error:', e.message);
    }
  }

  _checkSchedule() {
    const now   = new Date();
    const h     = now.getHours();
    const m     = now.getMinutes();
    const today = format(now, 'yyyy-MM-dd');

    for (const entry of SCHEDULE) {
      const key = `${today}_${entry.key}`;
      if (entry.hour === h && Math.abs(entry.min - m) <= 1 && !this.sentToday.has(key)) {
        this.sentToday.add(key);
        this._fireScheduled(entry);
      }
    }
    if (h === 0 && m === 0) this.sentToday.clear();
  }

  _fireScheduled(entry) {
    const w = this.weather;
    const n = this.news;
    const primary   = entry.getPrimary(w, n);
    const secondary = entry.getSecondary(w, n);
    const nowBar    = entry.getNowBar(w, n);

    Bridge.sendLiveNotification({
      id:              Math.floor(Math.random() * 80000) + 5000,
      title:           entry.title,
      body:            secondary,
      primaryInfo:     primary,
      secondaryInfo:   secondary,
      nowBarPrimary:   nowBar,
      nowBarSecondary: secondary,
      chipText:        entry.chipText,
      chipColor:       entry.chipColor ?? '#1565C0',
      progress:        -1,
    });
    console.log('[NowBar] Fired scheduled:', entry.title);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  sendTestNotification() {
    const w = this.weather;
    Bridge.sendLiveNotification({
      id:              7777,
      title:           'NowBrief · Test',
      body:            w ? `Live: ${w.emoji} ${w.temp}°C in ${w.city}` : 'Live notifications working!',
      primaryInfo:     'NowBrief is working!',
      secondaryInfo:   w ? `${w.temp}°C · ${w.description}` : 'Live notifications active.',
      nowBarPrimary:   'NowBrief',
      nowBarSecondary: 'Live notification test',
      chipText:        'NowBrief',
      chipColor:       '#1565C0',
      progress:        -1,
    });
  }

  sendBreakingNews(article) {
    Bridge.sendLiveNotification({
      id:              Math.floor(Math.random() * 80000) + 5000,
      title:           `Breaking: ${article.source}`,
      body:            article.title,
      primaryInfo:     article.source,
      secondaryInfo:   article.title,
      nowBarPrimary:   'Breaking news',
      nowBarSecondary: article.source,
      chipText:        '🔴 Breaking',
      chipColor:       '#B71C1C',
      progress:        -1,
    });
  }

  getCachedWeather() { return this.weather; }
  getCachedNews()    { return this.news; }
  getWeatherChipId() { return WEATHER_CHIP_ID; }
}

export default new NowBarService();
