# NowBrief ⚡

A fully functional React Native Android app that delivers a personalised live daily briefing via the **Samsung One UI 7 Now Bar** and standard Android notifications.

**No API keys required.** Weather comes from [Open-Meteo](https://open-meteo.com) (free, no signup). News comes from public RSS feeds (TOI, NDTV, BBC, Reuters, Economic Times, TechCrunch, The Hindu).

---

## Features

| Feature | Details |
|---|---|
| 👤 Onboarding | Name screen on first launch, persisted forever |
| 🌤 Live weather | Open-Meteo — GPS location, no API key |
| 📰 Real news | RSS feeds — TOI, NDTV, BBC, Reuters, ET, TechCrunch |
| 🔔 Now Bar | Samsung One UI 7 Now Bar chip + drawer (private bundle extras) |
| 🤖 Android 16 | `NotificationCompat.ProgressStyle` + `setRequestPromotedOngoing` |
| 📋 Scheduler | Morning brief, commute, news, lunch, market, weather, evening, wind-down |
| 🔁 Boot restart | Foreground service restarts after device reboot |

---

## Quick Start (local build)

### Prerequisites
- Android Studio (provides Android SDK, NDK, emulator)
- Node.js 18+
- JDK 17+

### Steps

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/NowBrief.git
cd NowBrief

# 2. Install JS dependencies
npm install

# 3. Start Metro bundler (keep this running)
npm start

# 4a. Run on connected device / emulator
npm run android

# 4b. Or build a standalone APK
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

---

## GitHub Actions — Automated APK Build

The workflow at `.github/workflows/build.yml` automatically builds a **debug APK** on every push to `main`.

### Setup

1. Push this repo to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/NowBrief.git
   git push -u origin main
   ```

2. GitHub Actions starts automatically. Go to **Actions** tab → **Build NowBrief APK**.

3. Once the workflow finishes, download the APK from the **Artifacts** section of the run.

### Signed release build

To produce a signed release APK, add these repository secrets under **Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `KEYSTORE_FILE` | Base64-encoded `.keystore` file |
| `KEYSTORE_ALIAS` | Key alias |
| `KEYSTORE_STORE_PASSWORD` | Store password |
| `KEYSTORE_KEY_PASSWORD` | Key password |

Then uncomment the release build steps in `.github/workflows/build.yml`.

---

## Now Bar — How It Works

### Samsung One UI 7 (Android < 16)
Uses private Samsung bundle extras (discovered via [akexorcist.dev](https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/)):

```
android.ongoingActivityNoti.primaryInfo    → drawer title
android.ongoingActivityNoti.secondaryInfo  → drawer subtitle
android.ongoingActivityNoti.chipText       → status bar pill text
android.ongoingActivityNoti.timerInfo      → countdown / stopwatch
android.ongoingActivityNoti.progressInfo   → progress bar
android.ongoingActivityNoti.segmentInfo    → step indicator
android.ongoingActivityNoti.pointsInfo     → dot indicators
```

Requires in `AndroidManifest.xml`:
```xml
<meta-data android:name="com.samsung.android.support.ongoing_activity" android:value="true"/>
```

### Android 16 / One UI 8 (API 36+)
Uses the official `NotificationCompat.ProgressStyle` + `setRequestPromotedOngoing(true)` — no Samsung extras or whitelist needed.

---

## Data Sources (all free, no key)

| Source | URL |
|---|---|
| Weather | `https://api.open-meteo.com/v1/forecast` |
| Geocoding | `https://geocoding-api.open-meteo.com/v1/reverse` |
| TOI RSS | `https://timesofindia.indiatimes.com/rssfeedstopstories.cms` |
| NDTV RSS | `https://feeds.feedburner.com/ndtvnews-top-stories` |
| BBC RSS | `https://feeds.bbci.co.uk/news/world/rss.xml` |
| Reuters RSS | `https://feeds.reuters.com/reuters/topNews` |
| Economic Times | `https://economictimes.indiatimes.com/rssfeedstopstories.cms` |
| TechCrunch | `https://techcrunch.com/feed/` |
| The Hindu | `https://www.thehindu.com/feeder/default.rss` |

---

## Project Structure

```
NowBrief/
├── App.js                          # Root — onboarding gate + nav
├── index.js                        # RN entry point
├── src/
│   ├── context/
│   │   └── UserContext.js          # Global user name state
│   ├── screens/
│   │   ├── OnboardingScreen.js     # First-launch name screen
│   │   ├── HomeScreen.js           # Main dashboard
│   │   └── ArticleScreen.js        # In-app news reader (WebView)
│   ├── components/
│   │   ├── WeatherCard.js
│   │   ├── NewsCard.js
│   │   └── QuickGlance.js
│   └── services/
│       ├── WeatherService.js       # Open-Meteo, no API key
│       ├── NewsService.js          # RSS feeds, no API key
│       └── LiveNotificationService.js  # Now Bar + Android 16
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/java/com/nowbrief/
│   │       ├── MainActivity.java
│   │       ├── MainApplication.java
│   │       ├── NativeNotificationModule.java  # Now Bar bridge
│   │       ├── NativeNotificationPackage.java
│   │       └── BootReceiver.java
│   ├── build.gradle
│   ├── settings.gradle
│   └── gradlew
└── .github/workflows/build.yml     # GitHub Actions CI
```
