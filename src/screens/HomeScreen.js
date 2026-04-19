// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { format } from 'date-fns';

import { WeatherService }           from '../services/WeatherService';
import { NewsService }              from '../services/NewsService';
import LiveNotificationService      from '../services/LiveNotificationService';
import { useUser }                  from '../context/UserContext';
import WeatherCard                  from '../components/WeatherCard';
import NewsCard                     from '../components/NewsCard';
import QuickGlance                  from '../components/QuickGlance';

export default function HomeScreen({ navigation }) {
  const { userName }               = useUser();
  const [weather,    setWeather]   = useState(null);
  const [news,       setNews]      = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [refreshing, setRefreshing]= useState(false);
  const [lastRefresh,setLastRefresh] = useState(null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    _loadCached();
    _fetchLive();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') _fetchLive(false); });
    return () => sub.remove();
  }, []);

  async function _loadCached() {
    try {
      const [cw, cn, lr] = await Promise.all([
        AsyncStorage.getItem('cached_weather'),
        AsyncStorage.getItem('cached_news'),
        AsyncStorage.getItem('last_refresh'),
      ]);
      if (cw) setWeather(JSON.parse(cw));
      if (cn) setNews(JSON.parse(cn));
      if (lr) setLastRefresh(new Date(lr));
    } catch (_) {}
  }

  const _fetchLive = useCallback(async (showLoad = true) => {
    if (showLoad) setLoading(true);
    try {
      const [w, n] = await Promise.allSettled([
        WeatherService.getCurrentWeather(),
        NewsService.getTopHeadlines(20),
      ]);
      if (w.status === 'fulfilled') {
        setWeather(w.value);
        await AsyncStorage.setItem('cached_weather', JSON.stringify(w.value));
        LiveNotificationService.sendWeatherAlert(w.value);
      }
      if (n.status === 'fulfilled') {
        setNews(n.value);
        await AsyncStorage.setItem('cached_news', JSON.stringify(n.value));
      }
      const now = new Date();
      setLastRefresh(now);
      await AsyncStorage.setItem('last_refresh', now.toISOString());
    } catch (e) {
      console.warn('[HomeScreen]', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => { setRefreshing(true); _fetchLive(false); };

  const sendTestNotif = () => {
    LiveNotificationService.sendLiveNotification({
      id:       Math.floor(Math.random() * 9999),
      title:    '🔔  NowBrief · Test',
      body:     weather
        ? `${weather.icon} ${Math.round(weather.temp)}°C in ${weather.city}`
        : 'Live notifications are working!',
      chipText: '⚡ NowBrief',
    });
  };

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient colors={['#1565C0', '#0D47A1', '#0A2E6E']} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greet}>{greeting}, {userName} 👋</Text>
            <Text style={s.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          <TouchableOpacity style={s.bellBtn} onPress={sendTestNotif}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </TouchableOpacity>
        </View>
        {lastRefresh && (
          <Text style={s.refreshed}>Updated {format(lastRefresh, 'h:mm a')}</Text>
        )}
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565C0']} />}
        showsVerticalScrollIndicator={false}
      >
        {weather && (
          <View style={s.briefBanner}>
            <Text style={s.briefText}>
              {weather.icon}  {Math.round(weather.temp)}°C · {weather.description}
              {news[0] ? `  ·  📰 ${news[0].title.slice(0, 60)}…` : ''}
            </Text>
          </View>
        )}

        <WeatherCard weather={weather} loading={loading} />
        <QuickGlance weather={weather} />
        <NewsCard
          news={news}
          loading={loading}
          onPress={article => navigation.navigate('Article', { article })}
        />

        <TouchableOpacity style={s.testBtn} onPress={sendTestNotif}>
          <Text style={s.testBtnText}>🔔  Test Now Bar Notification</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F0F2F5' },
  header:       { paddingTop: 54, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greet:        { fontSize: 22, fontWeight: '300', color: '#fff' },
  date:         { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  refreshed:    { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 8 },
  bellBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, gap: 14 },
  briefBanner:  { backgroundColor: '#1565C0', borderRadius: 14, padding: 12 },
  briefText:    { color: '#fff', fontSize: 13, lineHeight: 18 },
  testBtn:      { backgroundColor: '#1565C0', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  testBtnText:  { color: '#fff', fontSize: 15, fontWeight: '600' },
});
