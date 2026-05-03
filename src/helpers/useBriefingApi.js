// src/helpers/useBriefingApi.js
// Data hook: loads cached data from AsyncStorage, drives refresh.
// Used by the main IndexPage / App.js as the single source of truth.
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeatherService } from '../services/WeatherService';
import { NewsService } from '../services/NewsService';
import { GeminiService } from '../services/GeminiService';

export function useBriefingApi() {
  const [summary,      setSummary]      = useState(null);
  const [weather,      setWeather]      = useState(null);
  const [news,         setNews]         = useState({});
  const [isLoading,    setIsLoading]    = useState(true);
  const [isFetching,   setIsFetching]   = useState(false);
  const [isError,      setIsError]      = useState(false);
  const [locationName, setLocationName] = useState('');

  const loadFromCache = useCallback(async () => {
    try {
      const [cw, cn, cs] = await Promise.all([
        AsyncStorage.getItem('nb_weather'),
        AsyncStorage.getItem('nb_news'),
        AsyncStorage.getItem('nb_summary'),
      ]);
      if (cw) { const p = JSON.parse(cw); setWeather(p); setLocationName(p.city || ''); }
      if (cn)   setNews(JSON.parse(cn));
      if (cs)   setSummary(JSON.parse(cs));
    } catch (_) {}
  }, []);

  const refetch = useCallback(async () => {
    setIsFetching(true);
    setIsError(false);
    try {
      const wx = await WeatherService.fetch().catch(() => null);
      if (wx) { setWeather(wx); setLocationName(wx.city || ''); }

      const n = await NewsService.getAllCategories().catch(() => ({}));
      setNews(n);

      const hour     = new Date().getHours();
      const topNews  = Object.values(n).flat().slice(0, 3);
      const [summ, music] = await Promise.allSettled([
        GeminiService.getDailySummary(wx, topNews, hour),
        GeminiService.getMusicRecommendations(wx, hour),
      ]);

      const summaryData = {
        ...(summ.status  === 'fulfilled' ? summ.value  : {}),
        music: music.status === 'fulfilled' ? music.value : [],
        weather: wx,
        rainWarning: wx?.rainWarning || false,
      };
      setSummary(summaryData);

      await Promise.all([
        AsyncStorage.setItem('nb_weather', JSON.stringify(wx)),
        AsyncStorage.setItem('nb_news',    JSON.stringify(n)),
        AsyncStorage.setItem('nb_summary', JSON.stringify(summaryData)),
        AsyncStorage.setItem('nb_lastUpdate', new Date().toISOString()),
      ]);
    } catch (e) {
      setIsError(true);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await WeatherService.loadSavedLocation();
      await loadFromCache();
      setIsLoading(false);
      refetch();  // always refresh in background
    })();
  }, []);

  return { summary, weather, news, isLoading, isFetching, isError, refetch, locationName };
}
