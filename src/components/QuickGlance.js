// src/components/QuickGlance.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const items = [
  { icon: '💰', label: 'Sensex',   val: '81,204', sub: '▲ 0.9%', color: '#2e7d32' },
  { icon: '₹',  label: 'USD/INR',  val: '83.41',  sub: '▼ 0.12', color: '#c62828' },
  { icon: '🗓', label: 'Calendar', val: '3 today', sub: 'Next: 11 AM', color: '#1565C0' },
  { icon: '🚗', label: 'Commute',  val: 'Clear',   sub: '~22 min',    color: '#2e7d32' },
];

export default function QuickGlance() {
  return (
    <View style={s.card}>
      <Text style={s.label}>⚡  Quick Glance</Text>
      <View style={s.grid}>
        {items.map(item => (
          <View key={item.label} style={s.item}>
            <Text style={s.icon}>{item.icon}</Text>
            <Text style={[s.val, { color: item.color }]}>{item.val}</Text>
            <Text style={s.itemLabel}>{item.label}</Text>
            <Text style={s.sub}>{item.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:      { backgroundColor: '#fff', borderRadius: 18, padding: 16, elevation: 1 },
  label:     { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item:      { flex: 1, minWidth: '44%', backgroundColor: '#f8f9fa', borderRadius: 14, padding: 14, alignItems: 'center' },
  icon:      { fontSize: 24, marginBottom: 6 },
  val:       { fontSize: 18, fontWeight: '700' },
  itemLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  sub:       { fontSize: 11, color: '#aaa', marginTop: 2 },
});


// src/components/AIBrief.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AIBrief({ weather, news }) {
  const summary = useMemo(() => {
    const parts = [];
    const h = new Date().getHours();

    if (h < 12) parts.push('Good morning! Here\'s your daily brief.');
    else if (h < 17) parts.push('Here\'s your afternoon update.');
    else parts.push('Evening roundup ready.');

    if (weather) {
      parts.push(`It\'s ${Math.round(weather.temp)}°C in ${weather.city} — ${weather.description}.`);
    }

    if (news.length) {
      parts.push(`Top story: ${news[0].title.substring(0, 80)}...`);
    }

    parts.push('Stay hydrated and have a great day!');
    return parts.join(' ');
  }, [weather, news]);

  return (
    <View style={s.card}>
      <Text style={s.label}>✦  AI Brief</Text>
      <View style={s.row}>
        <View style={s.avatar}><Text style={s.avatarText}>A</Text></View>
        <Text style={s.text}>{summary}</Text>
      </View>
    </View>
  );
}

export default AIBrief;

const s = StyleSheet.create({
  card:       { backgroundColor: '#EEF2FF', borderRadius: 18, padding: 16 },
  label:      { fontSize: 11, fontWeight: '700', color: '#7B61FF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  row:        { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1565C0', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  text:       { flex: 1, fontSize: 14, color: '#333', lineHeight: 21 },
});
