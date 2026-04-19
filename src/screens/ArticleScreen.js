// src/screens/ArticleScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ArticleScreen({ route, navigation }) {
  const { article } = route.params;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.source} numberOfLines={1}>{article.source}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(article.url)} style={s.openBtn}>
          <Text style={s.openText}>Open ↗</Text>
        </TouchableOpacity>
      </View>
      <WebView
        source={{ uri: article.url }}
        style={{ flex: 1 }}
        startInLoadingState
        allowsBackForwardNavigationGestures
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  header:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1565C0', paddingTop: 48, paddingBottom: 12, paddingHorizontal: 16, gap: 8 },
  back:    { paddingRight: 8 },
  backText:{ color: '#fff', fontSize: 17 },
  source:  { flex: 1, color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  openBtn: { paddingLeft: 8 },
  openText:{ color: '#fff', fontSize: 13 },
});
