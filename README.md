# NowBrief 🔔

Samsung Now Brief-style Android app with **real Samsung One UI 7 Now Bar**, **Gemini AI**, live weather, and categorised news.

---

## Samsung Now Bar Integration

Uses the exact bundle extras documented by [akexorcist.dev](https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/):

```java
Bundle extras = new Bundle();
extras.putInt("android.ongoingActivityNoti.style", 1);           // REQUIRED
extras.putString("android.ongoingActivityNoti.primaryInfo",   …); // Drawer main line
extras.putString("android.ongoingActivityNoti.secondaryInfo", …); // Drawer sub line
extras.putString("android.ongoingActivityNoti.chipExpandedText",…);// Chip label
extras.putInt("android.ongoingActivityNoti.chipBgColor",      …); // Chip colour
extras.putString("android.ongoingActivityNoti.nowbarPrimaryInfo",  …); // Lock screen
extras.putString("android.ongoingActivityNoti.nowbarSecondaryInfo",…); // AOD
```

### Enable on your Samsung device

1. Enable **Developer Options** (Settings → About phone → tap Build number 7×)
2. Settings → Developer options → **"Live notifications for all apps"** = ON
3. OR install to a device where `com.samsung.android.support.ongoing_activity` metadata is accepted

The `AndroidManifest.xml` already includes the whitelist bypass metadata flag discovered by [NowbarMeter](https://github.com/realMoai/NowbarMeter).

---

## Features

| Feature | Detail |
|---|---|
| **Now Bar chip** | Real Samsung status bar pill via akexorcist bundle keys |
| **Gemini AI** | Weather summaries, news digest, music recs, location resolver |
| **Open-Meteo** | Free weather, no API key, 7-day forecast + hourly |
| **GNews** | 8 news categories with AI summaries on tap |
| **Location** | Ask user on first launch, Gemini resolves city → GPS, default: Salboni |
| **Schedule** | 8 timed daily messages (morning, commute, news, lunch, etc.) |
| **3-tab UI** | Dark Samsung navy — Summary / Weather / News |

---

## Quick Start (Windows / PowerShell)

```powershell
# 1. Set environment every new session
$env:JAVA_HOME  = "C:\Users\user\java17"
$env:ANDROID_HOME = "C:\Users\user\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"

# 2. Install dependencies
npm install

# 3. Generate JS bundle
npm run bundle:android

# 4. Build debug APK
npm run build:debug

# 5. Install on device
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Push to GitHub (Git commands)

```powershell
# Already initialised — just add remote and push:
git remote add origin https://github.com/YOUR_USERNAME/NowBrief.git
git push -u origin main

# For subsequent updates:
git add .
git commit -m "feat: your change"
git push
```

---

## API Keys

| Service | Where | Key |
|---|---|---|
| Gemini 1.5 Flash | `src/services/GeminiService.js` | Pre-configured |
| GNews | `src/services/NewsService.js` | Replace `YOUR_GNEWS_API_KEY` → [gnews.io/register](https://gnews.io/register) |
| Open-Meteo | Auto | No key needed |

---

## File Structure

```
NowBrief/
├── src/
│   ├── App.js                          ← 3-tab main UI + location gate
│   ├── components/
│   │   ├── NowBarStatusBanner.js       ← Samsung Now Bar status info
│   │   └── LocationPrompt.js           ← City entry → Gemini resolves coords
│   └── services/
│       ├── LiveNotificationService.js  ← NowBar scheduler (8 daily events)
│       ├── NativeNotificationBridge.js ← JS → native bridge
│       ├── GeminiService.js            ← AI: weather, news, music, location
│       ├── WeatherService.js           ← Open-Meteo (default: Salboni)
│       └── NewsService.js              ← GNews 8 categories
├── android/app/src/main/
│   ├── AndroidManifest.xml             ← Samsung whitelist bypass metadata
│   └── java/com/nowbrief/
│       ├── NowBriefNotificationHelper.java  ← ALL Samsung bundle keys
│       ├── NowBriefModule.java              ← React Native bridge
│       ├── NowBriefPackage.java             ← Module registry
│       ├── NowBriefActivity.java            ← Notification tap handler
│       ├── NowBriefForegroundService.java   ← Background keep-alive
│       ├── BootReceiver.java                ← Restart on reboot
│       └── MainApplication.java            ← App + package registration
└── README.md
```

---

## Known Build Tips

- Use **Java 17** (`C:\Users\user\java17`) — Java 21/25 breaks Gradle 8.6
- Always `npm run bundle:android` **before** Gradle
- Use `-x createBundleReleaseJsAndAssets` in Gradle build
- PowerShell file writes: use `[System.IO.File]::WriteAllBytes()` with no-BOM UTF-8
