// src/services/LiveNotificationService.js
// Samsung One UI 7 Now Bar  +  Android 16 Live Updates
// References:
//   https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/
//   https://developer.android.com/develop/ui/views/notifications/live-update

import { Platform }       from 'react-native';
import VIForegroundService from 'react-native-foreground-service';
import PushNotification   from 'react-native-push-notification';
import BackgroundTimer     from 'react-native-background-timer';
import AsyncStorage        from '@react-native-async-storage/async-storage';
import { WeatherService }  from './WeatherService';
import { NewsService }     from './NewsService';
import { format }          from 'date-fns';

// ─── Channel IDs ─────────────────────────────────────────────────────────────
const CHANNEL_LIVE    = 'now_brief_live';
const CHANNEL_UPDATES = 'now_brief_updates';
const CHANNEL_FG      = 'now_brief_foreground';

// ─── Samsung Now Bar private bundle keys ─────────────────────────────────────
// Discovered by akexorcist.dev — these extras make ongoing notifications appear
// in Samsung's Now Bar chip (status bar) and drawer on One UI 7.
// Reference: https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/
//
// Layout in the Now Bar drawer:
//   ┌─────────────────────────────────────────┐
//   │  [chipIcon]  chipText          (pill)   │  ← status bar chip
//   ├─────────────────────────────────────────┤
//   │  primaryInfo                            │  ← drawer main title
//   │  secondaryInfo                          │  ← drawer subtitle
//   │  [timerInfo]  [progressInfo]            │  ← optional structured row
//   │  [pointsInfo segments…]                 │  ← optional point list
//   └─────────────────────────────────────────┘
const SAMSUNG = {
  // ── Core text ───────────────────────────────────────────────────────────
  PRIMARY:    'android.ongoingActivityNoti.primaryInfo',    // drawer main title
  SECONDARY:  'android.ongoingActivityNoti.secondaryInfo',  // drawer subtitle
  CHIP_TEXT:  'android.ongoingActivityNoti.chipText',       // status bar pill text
  CHIP_ICON:  'android.ongoingActivityNoti.chipIcon',       // Icon (native-only, pass Icon object)

  // ── Structured info rows (all optional) ─────────────────────────────────
  // timerInfo — shows a running / counting-down timer in the drawer
  //   Bundle keys inside timerInfo Bundle:
  //     "type"        : "STOPWATCH" | "TIMER"
  //     "startTime"   : long (epoch ms, for STOPWATCH — counts up from here)
  //     "endTime"     : long (epoch ms, for TIMER — counts down to here)
  //     "paused"      : boolean
  //     "prefixText"  : String shown before the timer (e.g. "ETA ")
  //     "suffixText"  : String shown after  the timer (e.g. " left")
  TIMER_INFO: 'android.ongoingActivityNoti.timerInfo',

  // progressInfo — horizontal progress bar in the drawer
  //   Bundle keys inside progressInfo Bundle:
  //     "progress"    : int   (current value)
  //     "maxProgress" : int   (max value)
  //     "label"       : String shown beside bar (e.g. "Downloading…")
  PROGRESS_INFO: 'android.ongoingActivityNoti.progressInfo',

  // textInfo — an extra freeform text line below secondaryInfo
  //   Bundle keys inside textInfo Bundle:
  //     "text"        : String
  TEXT_INFO: 'android.ongoingActivityNoti.textInfo',

  // pointsInfo — a horizontal list of labelled dot/chip indicators
  //   Value: ArrayList<Bundle>, each Bundle has:
  //     "label"       : String
  //     "active"      : boolean (filled vs outlined dot)
  POINTS_INFO: 'android.ongoingActivityNoti.pointsInfo',

  // segmentInfo — segmented progress (e.g. step 2 of 4)
  //   Bundle keys inside segmentInfo Bundle:
  //     "current"     : int
  //     "total"       : int
  //     "label"       : String (e.g. "Step 2 of 4")
  SEGMENT_INFO: 'android.ongoingActivityNoti.segmentInfo',
};

// Manifest meta-data key that tells One UI this app supports Now Bar:
// <meta-data android:name="com.samsung.android.support.ongoing_activity" android:value="true"/>

// ─── Timed message schedule ───────────────────────────────────────────────────
const SCHEDULE = [
  { hour: 6,  min: 0,  type: 'morning',  emoji: '🌅', title: 'Good morning!',     body: 'Your daily brief is ready.' },
  { hour: 7,  min: 30, type: 'commute',  emoji: '🚗', title: 'Commute check',      body: 'Traffic looks clear today.' },
  { hour: 9,  min: 0,  type: 'news',     emoji: '📰', title: 'Morning headlines',  body: 'Top stories ready for you.' },
  { hour: 12, min: 0,  type: 'lunch',    emoji: '🍱', title: 'Lunch break!',       body: 'Step away from the screen.' },
  { hour: 14, min: 0,  type: 'market',   emoji: '📈', title: 'Markets midday',     body: 'Sensex update ready.' },
  { hour: 17, min: 0,  type: 'weather',  emoji: '🌦', title: 'Evening weather',    body: 'Check before heading home.' },
  { hour: 19, min: 0,  type: 'digest',   emoji: '📋', title: 'Evening digest',     body: 'What you missed today.' },
  { hour: 21, min: 30, type: 'wellness', emoji: '🌙', title: 'Wind down time',     body: 'Great day. Sleep well.' },
];

class LiveNotificationService {
  constructor() {
    this.isRunning     = false;
    this.timers        = [];
    this.sentToday     = new Set();
    this.latestWeather = null;
    this.latestNews    = [];
    this.WEATHER_ID    = 9001; // persistent weather chip (updates in-place)
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  async init() {
    this._createChannels();
    await this._requestPermissions();
    this._configurePushHandler();
  }

  _createChannels() {
    PushNotification.createChannel({ channelId: CHANNEL_LIVE,    channelName: 'Now Brief · Live',    importance: 4, vibrate: false, playSound: false }, () => {});
    PushNotification.createChannel({ channelId: CHANNEL_UPDATES, channelName: 'Now Brief · Updates', importance: 3, vibrate: true,  playSound: true  }, () => {});
    PushNotification.createChannel({ channelId: CHANNEL_FG,      channelName: 'Now Brief · Service', importance: 1, vibrate: false, playSound: false }, () => {});
  }

  async _requestPermissions() {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const { PermissionsAndroid } = require('react-native');
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    } else if (Platform.OS === 'ios') {
      PushNotification.requestPermissions();
    }
  }

  _configurePushHandler() {
    PushNotification.configure({
      onNotification: n => { if (n.userInteraction) console.log('[NowBrief] tapped:', n.data); },
      popInitialNotification: true,
      requestPermissions: false,
    });
  }

  // ─── Foreground Service ───────────────────────────────────────────────────
  async startForegroundService() {
    if (Platform.OS !== 'android') return;
    try {
      await VIForegroundService.getInstance().createNotificationChannel({
        id: CHANNEL_FG, name: 'Now Brief', description: 'Keeps Now Brief active', enableVibration: false,
      });
      await VIForegroundService.getInstance().startService({
        channelId: CHANNEL_FG, id: 1001,
        title: 'Now Brief is active', text: 'Delivering your live briefings…',
        icon: 'ic_notification', button: false,
      });
    } catch (e) { console.warn('[NowBrief] FG service error:', e); }
  }

  async stopForegroundService() {
    if (Platform.OS === 'android') await VIForegroundService.getInstance().stopService();
  }

  // ─── Samsung One UI 7 Now Bar ─────────────────────────────────────────────
  // Sends an ongoing notification with Samsung's private bundle extras so it
  // appears in the Now Bar chip + drawer on One UI 7.
  //
  // Reference: https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/
  //
  // Requires:
  //   1. <meta-data android:name="com.samsung.android.support.ongoing_activity"
  //                 android:value="true"/> in AndroidManifest.xml
  //   2. App package on Samsung's whitelist (One UI 7)
  //      OR One UI 8 + Android 16 (whitelist removed, use standard API)
  //
  // Optional structured fields (forwarded to NativeNotificationModule.java):
  //   timerInfo     — { type: 'STOPWATCH'|'TIMER', startTime?, endTime?,
  //                     paused?, prefixText?, suffixText? }
  //   progressInfo  — { progress: int, maxProgress: int, label?: string }
  //   textInfo      — { text: string }
  //   pointsInfo    — [{ label: string, active: boolean }, …]
  //   segmentInfo   — { current: int, total: int, label?: string }
  _sendSamsungNowBar({
    id, title, body,
    primaryInfo, secondaryInfo, chipText,
    timerInfo    = null,
    progressInfo = null,
    textInfo     = null,
    pointsInfo   = null,
    segmentInfo  = null,
  }) {
    PushNotification.localNotification({
      channelId:  CHANNEL_LIVE,
      id,
      title,
      message:    body,
      ongoing:    true,
      autoCancel: false,
      smallIcon:  'ic_notification',
      color:      '#1565C0',
      vibrate:    false,
      playSound:  false,
      userInfo: {
        [SAMSUNG.PRIMARY]:    primaryInfo   || title,
        [SAMSUNG.SECONDARY]:  secondaryInfo || body,
        [SAMSUNG.CHIP_TEXT]:  chipText      || primaryInfo || title,
        _isSamsungNowBar:     true,
        ...(timerInfo    && { [SAMSUNG.TIMER_INFO]:    timerInfo    }),
        ...(progressInfo && { [SAMSUNG.PROGRESS_INFO]: progressInfo }),
        ...(textInfo     && { [SAMSUNG.TEXT_INFO]:     textInfo     }),
        ...(pointsInfo   && { [SAMSUNG.POINTS_INFO]:   pointsInfo   }),
        ...(segmentInfo  && { [SAMSUNG.SEGMENT_INFO]:  segmentInfo  }),
      },
    });
  }

  // ─── Android 16 Live Updates (One UI 8+) ─────────────────────────────────
  // Uses the official NotificationCompat.ProgressStyle API.
  // No whitelist required — works on any Android 16 device including Galaxy.
  //
  // Key APIs used (via NativeNotificationModule.java):
  //   .setRequestPromotedOngoing(true)   ← promotes to Live Update area
  //   .setStyle(NotificationCompat.ProgressStyle()
  //       .setProgress(max, current, false))
  //   .setShortCriticalText(chipText)    ← status bar chip text
  //   .setOnlyAlertOnce(true)            ← no sound/vibrate on updates
  //   .setWhen() + .setUsesChronometer() ← countdown in chip (optional)
  _sendAndroid16LiveUpdate({ id, title, body, progress = 0, maxProgress = 100, chipText, countdownMs = null }) {
    PushNotification.localNotification({
      channelId:     CHANNEL_LIVE,
      id,
      title,
      message:       body,
      ongoing:       true,
      autoCancel:    false,
      smallIcon:     'ic_notification',
      color:         '#1565C0',
      vibrate:       false,
      playSound:     false,
      onlyAlertOnce: true,
      // Android 16 Live Update flags — handled in NativeNotificationModule.java
      userInfo: {
        _isAndroid16LiveUpdate:  true,
        requestPromotedOngoing:  true,      // setRequestPromotedOngoing(true)
        progressCurrent:         progress,
        progressMax:             maxProgress,
        shortCriticalText:       chipText || title, // setShortCriticalText()
        ...(countdownMs !== null && {
          usesChronometer:       true,
          chronometerCountdown:  true,
          whenTimestamp:         Date.now() + countdownMs,
        }),
      },
    });
  }

  // ─── Universal send — auto-picks right API ────────────────────────────────
  sendLiveNotification({ id, title, body, chipText, progress = null, countdownMs = null, data = {} }) {
    const android16 = Platform.OS === 'android' && Platform.Version >= 36;

    if (android16) {
      this._sendAndroid16LiveUpdate({
        id, title, body, chipText,
        progress: progress ?? 0, maxProgress: 100, countdownMs,
      });
    } else {
      // One UI 7 path (Samsung private extras) + graceful fallback for other Android
      this._sendSamsungNowBar({
        id, title, body, chipText,
        primaryInfo:   chipText || title,
        secondaryInfo: body,
      });
    }
  }

  // Update in-place: same id → no new alert, chip text changes silently
  updateLiveNotification(id, title, body, progress, chipText) {
    this.sendLiveNotification({ id, title, body, progress, chipText });
  }

  // ─── Scheduler ───────────────────────────────────────────────────────────
  startScheduler() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timers.push(BackgroundTimer.setInterval(() => this._checkSchedule(), 60_000));
    this.timers.push(BackgroundTimer.setInterval(() => this._refreshData(), 15 * 60_000));
    this._checkSchedule();
    this._refreshData();
    console.log('[NowBrief] Scheduler running');
  }

  stopScheduler() {
    this.timers.forEach(t => BackgroundTimer.clearInterval(t));
    this.timers = []; this.isRunning = false;
  }

  _checkSchedule() {
    const now   = new Date();
    const h     = now.getHours();
    const m     = now.getMinutes();
    const today = format(now, 'yyyy-MM-dd');

    SCHEDULE.forEach(msg => {
      const key = `${today}_${msg.type}`;
      if (msg.hour === h && Math.abs(msg.min - m) <= 1 && !this.sentToday.has(key)) {
        this.sentToday.add(key);
        let body = msg.body;
        if (msg.type === 'weather' && this.latestWeather)
          body = `${this.latestWeather.description}, ${Math.round(this.latestWeather.temp)}°C · ${this.latestWeather.city}`;
        if (msg.type === 'news' && this.latestNews.length)
          body = this.latestNews[0].title.slice(0, 100);

        this.sendLiveNotification({
          id:       Math.floor(Math.random() * 90000) + 10000,
          title:    `${msg.emoji}  ${msg.title}`,
          body,
          chipText: `${msg.emoji} ${msg.title}`,
          data:     { screen: 'Home', type: msg.type },
        });
      }
    });

    if (h === 0 && m === 0) this.sentToday.clear();
  }

  async _refreshData() {
    try {
      const [w, n] = await Promise.all([
        WeatherService.getCurrentWeather(),
        NewsService.getTopHeadlines('in', 8),
      ]);
      this.latestWeather = w;
      this.latestNews    = n;
      await AsyncStorage.setItem('cached_weather', JSON.stringify(w));
      await AsyncStorage.setItem('cached_news',    JSON.stringify(n));
      await AsyncStorage.setItem('last_refresh',   new Date().toISOString());

      // ── Persistent weather chip in Now Bar ──
      // Updating the same id (WEATHER_ID) silently updates the chip text.
      // On Samsung One UI 7: shows in status bar chip via SAMSUNG.CHIP_TEXT
      // On Android 16:       shows via setShortCriticalText()
      this.sendLiveNotification({
        id:       this.WEATHER_ID,
        title:    `${w.icon}  ${w.city} · ${Math.round(w.temp)}°C`,
        body:     `${w.description} · Humidity ${w.humidity}% · Wind ${w.wind} km/h`,
        chipText: `${w.icon} ${Math.round(w.temp)}°C`,
      });

      console.log('[NowBrief] Now Bar chip updated:', Math.round(w.temp) + '°C');
    } catch (e) {
      console.warn('[NowBrief] Refresh failed:', e.message);
    }
  }

  // ─── Public helpers ───────────────────────────────────────────────────────
  sendMorningBrief(weather, news) {
    const temp = weather ? `${Math.round(weather.temp)}°C · ` : '';
    const head = news?.[0]?.title?.slice(0, 80) || 'Top stories ready';
    this.sendLiveNotification({
      id: 2001, title: '🌅  Good morning!',
      body: `${temp}${head}`, chipText: '🌅 Morning Brief',
    });
  }

  sendBreakingNews(article) {
    this.sendLiveNotification({
      id: 2003 + Math.floor(Math.random() * 100),
      title: `📰  ${article.source}`,
      body: article.title, chipText: '📰 Breaking',
    });
  }

  // Android 16 delivery-style progress update with countdown timer in chip
  sendDeliveryUpdate(label, progressPct, etaMs) {
    this._sendAndroid16LiveUpdate({
      id: 5001, title: `📦  ${label}`,
      body: `${progressPct}% complete`,
      chipText: `📦 ${progressPct}%`,
      progress: progressPct, maxProgress: 100,
      countdownMs: etaMs,
    });
  }

  // ─── Weather alert (called from HomeScreen after data refresh) ────────────
  // Uses Samsung timerInfo to show a "last updated" stopwatch in the drawer,
  // and progressInfo to represent humidity as a visual bar.
  sendWeatherAlert(weather) {
    if (!weather) return;
    const temp   = Math.round(weather.temp);
    const title  = `${weather.icon || '🌦'}  ${weather.city} · ${temp}°C`;
    const body   = `${weather.description} · Humidity ${weather.humidity}% · Wind ${weather.wind} km/h`;
    const chip   = `${weather.icon || '🌦'} ${temp}°C`;

    const android16 = Platform.OS === 'android' && Platform.Version >= 36;
    if (android16) {
      this._sendAndroid16LiveUpdate({
        id: this.WEATHER_ID, title, body, chipText: chip,
        progress: weather.humidity ?? 0, maxProgress: 100,
      });
    } else {
      // One UI 7: show humidity as a progress bar + stopwatch since last fetch
      this._sendSamsungNowBar({
        id:           this.WEATHER_ID,
        title,
        body,
        primaryInfo:  chip,
        secondaryInfo: body,
        chipText:     chip,
        progressInfo: {
          progress:    weather.humidity ?? 0,
          maxProgress: 100,
          label:       `Humidity ${weather.humidity}%`,
        },
        timerInfo: {
          type:       'STOPWATCH',
          startTime:  Date.now(),
          prefixText: 'Updated ',
          suffixText: ' ago',
        },
      });
    }
  }

  // ─── Samsung-specific structured helpers ─────────────────────────────────

  // Show a countdown timer in the Now Bar drawer (e.g. "Order arriving in 8 min")
  // timerType: 'TIMER' (counts down to endTime) | 'STOPWATCH' (counts up from startTime)
  sendTimerUpdate({ id, title, body, chipText, timerType = 'TIMER', endTime = null, startTime = null, prefixText = '', suffixText = '' }) {
    const android16 = Platform.OS === 'android' && Platform.Version >= 36;
    if (android16) {
      const countdownMs = endTime ? endTime - Date.now() : null;
      this._sendAndroid16LiveUpdate({ id, title, body, chipText, countdownMs });
    } else {
      this._sendSamsungNowBar({
        id, title, body,
        primaryInfo:  chipText || title,
        secondaryInfo: body,
        chipText,
        timerInfo: {
          type:      timerType,
          ...(endTime   && { endTime   }),
          ...(startTime && { startTime }),
          prefixText,
          suffixText,
        },
      });
    }
  }

  // Show a segmented step indicator (e.g. "Step 2 of 4" dots in the drawer)
  // Useful for multi-step flows: order placed → packed → dispatched → delivered
  sendSegmentUpdate({ id, title, body, chipText, currentStep, totalSteps, stepLabel = '' }) {
    const android16 = Platform.OS === 'android' && Platform.Version >= 36;
    const pct = Math.round((currentStep / totalSteps) * 100);
    if (android16) {
      this._sendAndroid16LiveUpdate({ id, title, body, chipText, progress: pct, maxProgress: 100 });
    } else {
      // Build pointsInfo (filled dots for completed steps, outline for remaining)
      const pointsInfo = Array.from({ length: totalSteps }, (_, i) => ({
        label:  `${i + 1}`,
        active: i < currentStep,
      }));
      this._sendSamsungNowBar({
        id, title, body,
        primaryInfo:  chipText || title,
        secondaryInfo: body,
        chipText,
        segmentInfo: { current: currentStep, total: totalSteps, label: stepLabel },
        pointsInfo,
      });
    }
  }

  // Show a plain progress bar with an optional text label in the drawer
  sendProgressUpdate({ id, title, body, chipText, progress, maxProgress = 100, label = '' }) {
    const android16 = Platform.OS === 'android' && Platform.Version >= 36;
    if (android16) {
      this._sendAndroid16LiveUpdate({ id, title, body, chipText, progress, maxProgress });
    } else {
      this._sendSamsungNowBar({
        id, title, body,
        primaryInfo:  chipText || title,
        secondaryInfo: body,
        chipText,
        progressInfo: { progress, maxProgress, label },
      });
    }
  }
}

export default new LiveNotificationService();
