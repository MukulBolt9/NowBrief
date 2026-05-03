package com.nowbrief;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * NowBriefNotificationHelper
 *
 * Implements the EXACT Samsung One UI 7 Now Bar + Live Notification bundle extras
 * as documented by akexorcist:
 * https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/
 *
 * ═══════════════════════════════════════════════════════════════
 * SAMSUNG BUNDLE KEYS (from akexorcist research):
 * ═══════════════════════════════════════════════════════════════
 *
 * REQUIRED — must always be 1:
 *   "android.ongoingActivityNoti.style"  → Int = 1
 *
 * LIVE NOTIFICATION DRAWER (standard style):
 *   "android.ongoingActivityNoti.primaryInfo"        → String  (main line)
 *   "android.ongoingActivityNoti.secondaryInfo"      → String  (sub line)
 *   "android.ongoingActivityNoti.secondaryInfoIcon"  → Icon    (optional icon beside secondary)
 *
 * STATUS BAR CHIP (top-left pill, always visible):
 *   "android.ongoingActivityNoti.chipBgColor"        → Int     (ARGB background color)
 *   "android.ongoingActivityNoti.chipIcon"           → Icon    (optional, defaults to smallIcon)
 *   "android.ongoingActivityNoti.chipExpandedText"   → String  (chip label text)
 *
 * NOW BAR (lock screen / AOD — separate from drawer):
 *   "android.ongoingActivityNoti.nowbarPrimaryInfo"   → String
 *   "android.ongoingActivityNoti.nowbarSecondaryInfo" → String
 *
 * PROGRESS (drawer only — Not supported in Now Bar):
 *   "android.ongoingActivityNoti.progress"                      → Int
 *   "android.ongoingActivityNoti.progressMax"                   → Int
 *   "android.ongoingActivityNoti.progressSegments.progressColor"→ Int (ARGB)
 *
 * ACTION BUTTONS (drawer):
 *   "android.ongoingActivityNoti.actionType"        → Int = 1
 *   "android.ongoingActivityNoti.actionPrimarySet"  → Int = 0
 *
 * ═══════════════════════════════════════════════════════════════
 * WHITELIST BYPASS (from NowbarMeter / realMoai):
 * ═══════════════════════════════════════════════════════════════
 * Samsung restricts Now Bar to a hardcoded whitelist of system apps.
 * The bypass: set metadata flag "com.samsung.android.support.ongoing_activity"
 * in AndroidManifest.xml <application> tag. This grants third-party apps
 * access to the Now Bar chip without being on the whitelist.
 *
 * Also requires Developer Options → "Live notifications for all apps" = ON
 * for the chip to show on non-whitelisted packages.
 */
public class NowBriefNotificationHelper {

    private static final String TAG = "NowBriefNotiHelper";

    // ── Channel IDs ──────────────────────────────────────────────────────────
    public static final String CHANNEL_LIVE    = "nowbrief_live";
    public static final String CHANNEL_ALERTS  = "nowbrief_alerts";
    public static final String CHANNEL_SERVICE = "nowbrief_service";

    // ── EXACT Samsung bundle keys (source: akexorcist.dev) ───────────────────

    /** REQUIRED: Must be 1 to enable Live Notification + Now Bar */
    private static final String KEY_STYLE          = "android.ongoingActivityNoti.style";

    /** Live Notification drawer — standard style */
    private static final String KEY_PRIMARY        = "android.ongoingActivityNoti.primaryInfo";
    private static final String KEY_SECONDARY      = "android.ongoingActivityNoti.secondaryInfo";

    /** Status bar chip (pill always visible in top-left) */
    private static final String KEY_CHIP_BG_COLOR  = "android.ongoingActivityNoti.chipBgColor";
    private static final String KEY_CHIP_ICON      = "android.ongoingActivityNoti.chipIcon";
    private static final String KEY_CHIP_TEXT      = "android.ongoingActivityNoti.chipExpandedText";

    /** Now Bar — lock screen / AOD (separate values from drawer) */
    private static final String KEY_NOWBAR_PRIMARY = "android.ongoingActivityNoti.nowbarPrimaryInfo";
    private static final String KEY_NOWBAR_SEC     = "android.ongoingActivityNoti.nowbarSecondaryInfo";

    /** Progress (drawer only) */
    private static final String KEY_PROGRESS       = "android.ongoingActivityNoti.progress";
    private static final String KEY_PROGRESS_MAX   = "android.ongoingActivityNoti.progressMax";
    private static final String KEY_PROGRESS_COLOR = "android.ongoingActivityNoti.progressSegments.progressColor";

    // ── Create notification channels ─────────────────────────────────────────
    public static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Live: HIGH so Now Bar chip appears
        if (nm.getNotificationChannel(CHANNEL_LIVE) == null) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_LIVE, "NowBrief Live", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Persistent live weather & brief chip");
            ch.setShowBadge(false);
            ch.enableVibration(false);
            ch.enableLights(true);
            ch.setLightColor(0xFF4FC3F7);
            nm.createNotificationChannel(ch);
        }

        // Alerts: standard for greetings/news
        if (nm.getNotificationChannel(CHANNEL_ALERTS) == null) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ALERTS, "NowBrief Alerts", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Greetings, breaking news, wellness reminders");
            nm.createNotificationChannel(ch);
        }

        // Service: MIN (hidden from tray visually, just keeps process alive)
        if (nm.getNotificationChannel(CHANNEL_SERVICE) == null) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_SERVICE, "NowBrief Service", NotificationManager.IMPORTANCE_MIN);
            ch.setDescription("Background service keep-alive");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }

        Log.d(TAG, "Channels ready");
    }

    /**
     * Send / silently update a Samsung One UI 7 Live Notification.
     * Reuse same ID → updates chip text in-place, no sound/vibration.
     *
     * @param id            Notification ID (reuse same ID for silent update)
     * @param title         Standard notification title
     * @param body          Expanded body
     * @param primaryInfo   Live Notification drawer primary line
     * @param secondaryInfo Live Notification drawer secondary line
     * @param nowBarPrimary Now Bar (lock screen) primary text
     * @param nowBarSec     Now Bar secondary text
     * @param chipText      Status bar chip label (keep short: "☀️ 32°C")
     * @param chipColorHex  Chip background color "#RRGGBB"
     * @param progress      0-100 or -1 for none
     * @param progressMax   Max for progress (usually 100)
     */
    public static void sendLiveNotification(
            Context ctx,
            int id,
            String title,
            String body,
            String primaryInfo,
            String secondaryInfo,
            String nowBarPrimary,
            String nowBarSec,
            String chipText,
            String chipColorHex,
            int progress,
            int progressMax
    ) {
        ensureChannels(ctx);

        // ── Build Samsung extras bundle ───────────────────────────────────────
        Bundle extras = new Bundle();

        // REQUIRED — marks this as a Live Notification
        extras.putInt(KEY_STYLE, 1);

        // Drawer
        extras.putString(KEY_PRIMARY,   primaryInfo   != null ? primaryInfo   : title);
        extras.putString(KEY_SECONDARY, secondaryInfo != null ? secondaryInfo : body);

        // Chip (status bar pill)
        extras.putString(KEY_CHIP_TEXT, chipText != null ? chipText : primaryInfo);
        try {
            extras.putInt(KEY_CHIP_BG_COLOR, Color.parseColor(chipColorHex));
        } catch (Exception e) {
            extras.putInt(KEY_CHIP_BG_COLOR, Color.parseColor("#1565C0"));
        }

        // Now Bar (lock screen / AOD)
        extras.putString(KEY_NOWBAR_PRIMARY, nowBarPrimary != null ? nowBarPrimary : primaryInfo);
        extras.putString(KEY_NOWBAR_SEC,     nowBarSec     != null ? nowBarSec     : secondaryInfo);

        // Progress (drawer only)
        if (progress >= 0) {
            extras.putInt(KEY_PROGRESS,       progress);
            extras.putInt(KEY_PROGRESS_MAX,   progressMax > 0 ? progressMax : 100);
            extras.putInt(KEY_PROGRESS_COLOR, 0xFF4FC3F7);
        }

        // ── Tap intent ────────────────────────────────────────────────────────
        Intent tap = new Intent(ctx, NowBriefActivity.class);
        tap.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tap.putExtra("openTab", "summary");
        PendingIntent pi = PendingIntent.getActivity(ctx, id, tap,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // ── Build notification ────────────────────────────────────────────────
        NotificationCompat.Builder nb = new NotificationCompat.Builder(ctx, CHANNEL_LIVE)
                .setSmallIcon(R.drawable.ic_nowbrief)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setOngoing(true)           // REQUIRED: ongoing = chip persists
                .setOnlyAlertOnce(true)     // silent update on same ID
                .setShowWhen(true)
                .setContentIntent(pi)
                .setColor(parseColor(chipColorHex, 0xFF1565C0))
                .setColorized(true)
                .addExtras(extras);         // ATTACH Samsung extras

        if (progress >= 0) {
            nb.setProgress(progressMax > 0 ? progressMax : 100, progress, false);
        }

        try {
            NotificationManagerCompat.from(ctx).notify(id, nb.build());
            Log.d(TAG, "Live notification id=" + id + " chip=" + chipText);
        } catch (SecurityException e) {
            Log.e(TAG, "Missing POST_NOTIFICATIONS permission");
        }
    }

    /** Simple auto-cancel notification (greetings, news alerts) */
    public static void sendSimpleNotification(
            Context ctx, int id, String title, String body, String screen) {
        ensureChannels(ctx);
        Intent tap = new Intent(ctx, NowBriefActivity.class);
        tap.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tap.putExtra("openTab", screen != null ? screen : "summary");
        PendingIntent pi = PendingIntent.getActivity(ctx, id + 5000, tap,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder nb = new NotificationCompat.Builder(ctx, CHANNEL_ALERTS)
                .setSmallIcon(R.drawable.ic_nowbrief)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setColor(0xFF0D47A1);
        try {
            NotificationManagerCompat.from(ctx).notify(id, nb.build());
        } catch (SecurityException ignored) {}
    }

    public static void cancel(Context ctx, int id) {
        NotificationManagerCompat.from(ctx).cancel(id);
    }

    public static boolean canPostPromotedNotifications(Context ctx) {
        return Build.VERSION.SDK_INT >= 36;
    }

    public static Notification buildServiceNotification(Context ctx) {
        ensureChannels(ctx);
        Intent tap = new Intent(ctx, NowBriefActivity.class);
        PendingIntent pi = PendingIntent.getActivity(ctx, 9999, tap,
                PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(ctx, CHANNEL_SERVICE)
                .setSmallIcon(R.drawable.ic_nowbrief)
                .setContentTitle("NowBrief")
                .setContentText("Live brief running…")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true).setSilent(true)
                .setContentIntent(pi).build();
    }

    private static int parseColor(String hex, int fallback) {
        try { return Color.parseColor(hex); } catch (Exception e) { return fallback; }
    }
}
