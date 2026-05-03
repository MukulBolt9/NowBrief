// src/components/NowBarStatusBanner.js
// Shows a banner explaining Samsung Now Bar status to the user.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Bridge from '../services/NativeNotificationBridge';

const C = {
  accent: '#6C63FF', accentDim: '#3D3880', text: '#F0F0FF',
  sub: '#9AA0BC', dim: '#4A5070', surf: '#14161F', bdr: '#1F2235',
  ok: '#22C55E', okDim: '#14532D', info: '#1565C0', infoDim: '#0D2137',
};

export default function NowBarStatusBanner() {
  const [android16, setAndroid16] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    Bridge.canPostPromotedNotifications().then(v => setAndroid16(v));
  }, []);

  if (dismissed) return null;

  return (
    <View style={[s.banner, android16 ? s.bannerOk : s.bannerInfo]}>
      <View style={s.row}>
        <Text style={s.icon}>{android16 ? '✅' : '🔔'}</Text>
        <View style={s.textWrap}>
          <Text style={s.title}>
            {android16 ? 'Android 16 Live Updates active' : 'Samsung Now Bar ready'}
          </Text>
          <Text style={s.sub}>
            {android16
              ? 'Notifications appear in the promoted ongoing area.'
              : 'Enable "Live notifications for all apps" in Developer options → see the Now Bar chip.'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} style={s.close}>
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>
      {!android16 && (
        <TouchableOpacity style={s.devBtn} onPress={() => Linking.openSettings()}>
          <Text style={s.devBtnTxt}>Open Developer Options →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  banner:     { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
  bannerInfo: { backgroundColor: C.infoDim, borderColor: '#1E3A5F' },
  bannerOk:   { backgroundColor: C.okDim,   borderColor: '#166534' },
  row:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon:       { fontSize: 18, marginTop: 1 },
  textWrap:   { flex: 1 },
  title:      { fontSize: 13, fontWeight: '700', color: C.text },
  sub:        { fontSize: 12, color: C.sub, marginTop: 3, lineHeight: 16 },
  close:      { padding: 2 },
  closeTxt:   { fontSize: 13, color: C.dim },
  devBtn:     { marginTop: 10, alignSelf: 'flex-start', backgroundColor: C.accentDim, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14 },
  devBtnTxt:  { fontSize: 12, color: C.accent, fontWeight: '700' },
});
