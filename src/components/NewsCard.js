// src/components/NewsCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NewsService } from '../services/NewsService';

export default function NewsCard({ news, loading, onPress }) {
  return (
    <View style={s.card}>
      <Text style={s.label}>📰  Top News</Text>
      {loading && !news.length ? (
        <ActivityIndicator color="#1565C0" style={{ padding: 16 }} />
      ) : (
        news.slice(0, 5).map((article, i) => (
          <TouchableOpacity key={i} style={[s.item, i === news.length - 1 && { borderBottomWidth: 0 }]} onPress={() => onPress(article)}>
            <View style={s.dot} />
            <View style={{ flex: 1 }}>
              <Text style={s.source}>{article.source}</Text>
              <Text style={s.title} numberOfLines={2}>{article.title}</Text>
              <Text style={s.time}>{NewsService.getTimeSince(article.publishedAt)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card:   { backgroundColor: '#fff', borderRadius: 18, padding: 16, elevation: 1 },
  label:  { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  item:   { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5', alignItems: 'flex-start' },
  dot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1565C0', marginTop: 5, flexShrink: 0 },
  source: { fontSize: 10, color: '#1565C0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title:  { fontSize: 14, fontWeight: '500', color: '#1a1a1a', marginTop: 2, lineHeight: 19 },
  time:   { fontSize: 11, color: '#bbb', marginTop: 4 },
});
