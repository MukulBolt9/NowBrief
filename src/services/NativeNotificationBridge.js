// src/services/NativeNotificationBridge.js
// Wraps NowBriefModule native module — exact same API as your uploaded file.
import { NativeModules, Platform } from 'react-native';

const { NowBriefModule } = NativeModules;

if (!NowBriefModule && Platform.OS === 'android') {
  console.warn('[NowBrief] NowBriefModule not found — rebuild the native app.');
}

const Bridge = {
  sendLiveNotification(opts = {}) {
    if (!NowBriefModule) return Promise.resolve();
    return NowBriefModule.sendLiveNotification({
      id:              opts.id              ?? Math.floor(Math.random() * 80000) + 5000,
      title:           opts.title          ?? 'NowBrief',
      body:            opts.body           ?? '',
      primaryInfo:     opts.primaryInfo    ?? opts.title    ?? 'NowBrief',
      secondaryInfo:   opts.secondaryInfo  ?? opts.body     ?? '',
      nowBarPrimary:   opts.nowBarPrimary  ?? opts.primaryInfo  ?? opts.title ?? 'NowBrief',
      nowBarSecondary: opts.nowBarSecondary ?? opts.secondaryInfo ?? opts.body ?? '',
      chipText:        opts.chipText       ?? opts.primaryInfo ?? opts.title ?? 'NowBrief',
      chipColor:       opts.chipColor      ?? '#1565C0',
      progress:        opts.progress       ?? -1,
      progressMax:     opts.progressMax    ?? 100,
    });
  },

  sendSimpleNotification(opts = {}) {
    if (!NowBriefModule) return Promise.resolve();
    return NowBriefModule.sendSimpleNotification({
      id:     opts.id     ?? Math.floor(Math.random() * 80000) + 5000,
      title:  opts.title  ?? 'NowBrief',
      body:   opts.body   ?? '',
      screen: opts.screen ?? 'summary',
    });
  },

  cancel(id) {
    if (NowBriefModule) NowBriefModule.cancelNotification(id);
  },

  async canPostPromotedNotifications() {
    if (!NowBriefModule) return false;
    try { return await NowBriefModule.canPostPromotedNotifications(); }
    catch { return false; }
  },

  createChannels() {
    if (NowBriefModule) NowBriefModule.createChannels();
  },
};

export default Bridge;
