// src/App.js  — NowBrief main entry (React Native 0.73.6)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBriefingApi }    from './helpers/useBriefingApi';
import { SummaryTab }        from './components/SummaryTab';
import { WeatherTab }        from './components/WeatherTab';
import { NewsTab }           from './components/NewsTab';
import NowBarService         from './services/LiveNotificationService';
import { WeatherService }    from './services/WeatherService';
import { GeminiService }     from './services/GeminiService';
import NowBarStatusBanner    from './components/NowBarStatusBanner';
import LocationPrompt        from './components/LocationPrompt';

const C = {
  bg:'#07080F', surf:'#0E1018', surfup:'#14161F', bdr:'#1F2235',
  acc:'#6C63FF', txt:'#F0F0FF', sub:'#9AA0BC', dim:'#4A5070',
};

const dateFormatter = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'short', day:'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-US', { hour:'numeric', minute:'2-digit' });

export default function App() {
  const [tab,          setTab]          = useState(0);
  const [now,          setNow]          = useState(new Date());
  const [needLocation, setNeedLocation] = useState(false);
  const [locationSet,  setLocationSet]  = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const { summary, weather, news, isLoading, isFetching, isError, refetch, locationName } = useBriefingApi();

  // Update clock every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Check if location has been saved
  useEffect(() => {
    AsyncStorage.getItem('nb_location').then(s => {
      if (!s) setNeedLocation(true);
      else setLocationSet(true);
    });
  }, []);

  // Fade in when data arrives
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [isLoading]);

  // Start NowBar service once location is confirmed
  useEffect(() => {
    if (locationSet) {
      NowBarService.start();
      return () => NowBarService.stop();
    }
  }, [locationSet]);

  // On location set — mark done, trigger refetch
  const onLocationSet = useCallback(async (loc) => {
    setNeedLocation(false);
    setLocationSet(true);
    refetch();
  }, [refetch]);

  if (needLocation) {
    return (
      <View style={s.root}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content"/>
        <LocationPrompt onLocationSet={onLocationSet}/>
      </View>
    );
  }

  const TABS = [['✦','Summary'],['☁','Weather'],['◼','News']];

  return (
    <View style={s.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content"/>

      {/* Header — matches IndexPage pattern */}
      <SafeAreaView edges={['top']} style={{backgroundColor:'transparent'}}>
        <View style={s.header}>
          <View style={s.headerInfo}>
            <View style={s.dateTime}>
              <Text style={s.time}>{timeFormatter.format(now)}</Text>
              <Text style={s.date}>{dateFormatter.format(now)}</Text>
            </View>
            <View style={s.location}>
              <Text style={s.locationIcon}>📍</Text>
              <Text style={s.locationTxt}>{locationName || 'Locating...'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[s.refreshBtn, isFetching && s.refreshBtnSpin]}
            onPress={refetch}
            disabled={isFetching}
            activeOpacity={0.7}>
            <Text style={s.refreshIcon}>⟳</Text>
          </TouchableOpacity>
        </View>

        {/* Now Bar status banner */}
        <View style={{paddingHorizontal:16, paddingBottom:4}}>
          <NowBarStatusBanner/>
        </View>
      </SafeAreaView>

      {/* Error state */}
      {isError ? (
        <View style={s.errorWrap}>
          <Text style={s.errorEmoji}>⚠️</Text>
          <Text style={s.errorTxt}>Failed to load your daily briefing.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={[s.contentWrap, {opacity: fadeAnim}]}>
          {/* Tab content */}
          <View style={s.tabContentArea}>
            {tab === 0 && <SummaryTab data={summary} isLoading={isLoading}/>}
            {tab === 1 && <WeatherTab data={weather}  isLoading={isLoading}/>}
            {tab === 2 && <NewsTab    data={news}     isLoading={isLoading}/>}
          </View>
        </Animated.View>
      )}

      {/* Samsung pill tab bar */}
      <SafeAreaView edges={['bottom']} style={{backgroundColor: C.surf}}>
        <View style={s.tabBar}>
          {TABS.map(([icon, label], i) => (
            <TouchableOpacity key={i} style={s.tabItem} onPress={() => setTab(i)} activeOpacity={0.8}>
              {tab === i
                ? <View style={s.pill}><Text style={s.pillIcon}>{icon}</Text><Text style={s.pillLbl}>{label}</Text></View>
                : <View style={s.tabIconWrap}><Text style={s.tabIcon}>{icon}</Text></View>
              }
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex:1, backgroundColor: C.bg },
  header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:12 },
  headerInfo:   { gap: 4 },
  dateTime:     { flexDirection:'row', alignItems:'baseline', gap: 8 },
  time:         { fontSize: 22, fontWeight: '800', color: C.txt, letterSpacing: -0.5 },
  date:         { fontSize: 13, color: C.sub },
  location:     { flexDirection:'row', alignItems:'center', gap: 4 },
  locationIcon: { fontSize: 12 },
  locationTxt:  { fontSize: 13, color: C.sub },
  refreshBtn:   { width:38, height:38, borderRadius:19, backgroundColor:C.surfup, borderWidth:1, borderColor:C.bdr, justifyContent:'center', alignItems:'center' },
  refreshBtnSpin:{ opacity: 0.5 },
  refreshIcon:  { fontSize: 19, color: C.acc },
  contentWrap:  { flex: 1 },
  tabContentArea:{ flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  errorWrap:    { flex:1, alignItems:'center', justifyContent:'center', padding:32 },
  errorEmoji:   { fontSize: 40, marginBottom: 12 },
  errorTxt:     { fontSize: 15, color: C.sub, textAlign:'center', marginBottom: 20 },
  retryBtn:     { backgroundColor: C.acc, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryTxt:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  tabBar:       { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingHorizontal:16, paddingVertical:10, gap:8, borderTopWidth:1, borderTopColor:C.bdr },
  tabItem:      { flex:1, alignItems:'center' },
  pill:         { flexDirection:'row', alignItems:'center', backgroundColor:'#6C63FF', borderRadius:24, paddingHorizontal:16, paddingVertical:9, gap:6 },
  pillIcon:     { fontSize:13, color:'#fff' },
  pillLbl:      { fontSize:13, fontWeight:'700', color:'#fff', letterSpacing: 0.3 },
  tabIconWrap:  { padding: 10 },
  tabIcon:      { fontSize:17, color:'#4A5070' },
});
