// src/components/WeatherCard.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function WeatherCard({ weather, loading }) {
  if (loading && !weather) {
    return (
      <View style={s.card}>
        <ActivityIndicator color="#1565C0" style={{ padding: 24 }} />
      </View>
    );
  }
  if (!weather) return null;

  return (
    <View style={s.card}>
      <Text style={s.label}>🌤  Weather</Text>
      <View style={s.row}>
        <Text style={s.emoji}>{weather.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.city}>{weather.city}, {weather.country}</Text>
          <Text style={s.desc}>{weather.description} · Feels like {Math.round(weather.feelsLike)}°C</Text>
        </View>
        <Text style={s.temp}>{Math.round(weather.temp)}°</Text>
      </View>
      <View style={s.strip}>
        {[
          { label: 'Humidity', val: `${weather.humidity}%` },
          { label: 'Wind',     val: `${weather.wind} km/h` },
          { label: 'Visibility', val: weather.visibility ? `${weather.visibility} km` : '—' },
        ].map(item => (
          <View key={item.label} style={s.stripItem}>
            <Text style={s.stripLabel}>{item.label}</Text>
            <Text style={s.stripVal}>{item.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:       { backgroundColor: '#fff', borderRadius: 18, padding: 16, elevation: 1 },
  label:      { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji:      { fontSize: 44 },
  city:       { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  desc:       { fontSize: 13, color: '#888', marginTop: 3 },
  temp:       { fontSize: 52, fontWeight: '200', color: '#1a1a1a' },
  strip:      { flexDirection: 'row', marginTop: 14, borderTopWidth: 0.5, borderTopColor: '#f0f0f0', paddingTop: 10 },
  stripItem:  { flex: 1, alignItems: 'center' },
  stripLabel: { fontSize: 10, color: '#bbb', textTransform: 'uppercase' },
  stripVal:   { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 3 },
});
