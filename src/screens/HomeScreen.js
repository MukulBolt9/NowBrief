// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { WeatherService } from '../services/WeatherService';
import { NewsService }    from '../services/NewsService';
import LiveNotificationService from '../services/LiveNotificationService';
import { format }         from 'date-fns';
import WeatherCard        from '../components/WeatherCard';
import NewsCard           from '../components/NewsCard';
import QuickGlance        from '../components/QuickGlance';
import AIBrief            from '../components/AIBrief';

export default function HomeScreen({ navigation }) {
  const [weather,      setWeather]      = useState(null);
  const [news,         setNews]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [greeting,     setGreeting]     = useState('Good morning');

  useEffect(() => {
    setGreeting(getGreeting());
    loadCachedData();
    fetchLiveData();

    // Re-fetch when app comes to foreground
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') fetchLiveData(false);
    });
    return () => sub.remove();
  }, []);

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  async function loadCachedData() {
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

  const fetchLiveData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [w, n] = await Promise.all([
        WeatherService.getCurrentWeather(),
        NewsService.getTopHeadlines('in', 8),
      ]);
      setWeather(w);
      setNews(n);
      setLastRefresh(new Date());

      // Push a weather live-update notification
      LiveNotificationService.sendWeatherAlert(w);
    } catch (e) {
      console.warn('[HomeScreen] Fetch failed:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveData(false);
  };

  const sendTestNotif = () => {
    LiveNotificationService.sendLiveNotification({
      id:    Math.floor(Math.random() * 9999),
      title: '🔔  Now Brief · Test',
      body:  'Live notifications are working! Tap to open.',
      data:  { screen: 'Home' },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient colors={['#1565C0', '#0D47A1', '#0A2E6E']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetText}>{greeting} 👋</Text>
            <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={sendTestNotif}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </TouchableOpacity>
        </View>
        {lastRefresh && (
          <Text style={styles.refreshText}>
            Updated {format(lastRefresh, 'h:mm a')}
          </Text>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565C0']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* AI BRIEF */}
        <AIBrief weather={weather} news={news} />

        {/* WEATHER */}
        <WeatherCard weather={weather} loading={loading} />

        {/* QUICK GLANCE */}
        <QuickGlance />

        {/* NEWS */}
        <NewsCard
          news={news}
          loading={loading}
          onPress={article => navigation.navigate('Article', { article })}
        />

        {/* SEND TEST NOTIFICATION BUTTON */}
        <TouchableOpacity style={styles.testBtn} onPress={sendTestNotif}>
          <Text style={styles.testBtnText}>🔔  Send Test Live Notification</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F0F2F5' },
  header:       { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greetText:    { fontSize: 24, fontWeight: '300', color: '#fff' },
  dateText:     { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  refreshText:  { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  bellBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, gap: 14 },
  testBtn:      { backgroundColor: '#1565C0', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  testBtnText:  { color: '#fff', fontSize: 15, fontWeight: '600' },
});
