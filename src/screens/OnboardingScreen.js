// src/screens/OnboardingScreen.js
// First-launch screen — asks for the user's name, then transitions to Home.
// Only shown once; name is persisted in AsyncStorage via UserContext.

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, Keyboard, KeyboardAvoidingView, Platform,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useUser } from '../context/UserContext';

export default function OnboardingScreen() {
  const { saveName } = useUser();
  const [name,    setName]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name to continue.');
      shake();
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      shake();
      return;
    }
    setError('');
    setSaving(true);
    Keyboard.dismiss();
    await saveName(trimmed);
    // UserContext update triggers App.js to switch to Home automatically
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />

      {/* Background gradient via nested Views */}
      <View style={s.bg}>
        <View style={s.bgTop} />
        <View style={s.bgBottom} />
      </View>

      <View style={s.content}>
        {/* Logo / branding */}
        <View style={s.logoArea}>
          <View style={s.logoCircle}>
            <Text style={s.logoEmoji}>⚡</Text>
          </View>
          <Text style={s.appName}>NowBrief</Text>
          <Text style={s.tagline}>Your live daily briefing</Text>
        </View>

        {/* Card */}
        <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={s.heading}>What's your name?</Text>
          <Text style={s.sub}>We'll personalise your briefings and greet you every day.</Text>

          <TextInput
            style={[s.input, error ? s.inputError : null]}
            placeholder="e.g. Arjun, Priya, Sam…"
            placeholderTextColor="#bbb"
            value={name}
            onChangeText={v => { setName(v); if (error) setError(''); }}
            onSubmitEditing={handleContinue}
            returnKeyType="done"
            autoCapitalize="words"
            autoFocus
            maxLength={40}
          />

          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, !name.trim() && s.btnDisabled]}
            onPress={handleContinue}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Get Started →</Text>
            }
          </TouchableOpacity>
        </Animated.View>

        {/* Features preview */}
        <View style={s.features}>
          {[
            ['🌤', 'Live weather from GPS'],
            ['📰', 'Real news, no API key'],
            ['🔔', 'Samsung Now Bar support'],
          ].map(([icon, label]) => (
            <View key={label} style={s.featureRow}>
              <Text style={s.featureIcon}>{icon}</Text>
              <Text style={s.featureLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  bg:          { ...StyleSheet.absoluteFillObject },
  bgTop:       { flex: 0.55, backgroundColor: '#0D47A1' },
  bgBottom:    { flex: 0.45, backgroundColor: '#F0F2F5' },
  content:     { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  logoArea:    { alignItems: 'center', marginBottom: 32 },
  logoCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoEmoji:   { fontSize: 36 },
  appName:     { fontSize: 32, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  tagline:     { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card:        { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  heading:     { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  sub:         { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 20 },

  input:       { borderWidth: 1.5, borderColor: '#e0e0e0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, color: '#1a1a1a', backgroundColor: '#fafafa' },
  inputError:  { borderColor: '#e53935' },
  errorText:   { color: '#e53935', fontSize: 12, marginTop: 6 },

  btn:         { backgroundColor: '#1565C0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  btnDisabled: { backgroundColor: '#90CAF9' },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  features:    { marginTop: 28, gap: 10 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  featureLabel:{ fontSize: 14, color: '#666' },
});
