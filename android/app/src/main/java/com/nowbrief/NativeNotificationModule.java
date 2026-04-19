// android/app/src/main/java/com/nowbrief/NativeNotificationModule.java
//
// This is the critical native bridge that intercepts notification sends from
// react-native-push-notification and adds:
//
//  A) Samsung One UI 7 Now Bar extras (android.ongoingActivityNoti.*)
//     Source: https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/
//
//  B) Android 16 Live Updates (NotificationCompat.ProgressStyle + setRequestPromotedOngoing)
//     Source: https://developer.android.com/develop/ui/views/notifications/live-update

package com.nowbrief;

import android.app.NotificationManager;
import android.content.Context;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

import java.util.ArrayList;

public class NativeNotificationModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    public NativeNotificationModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "NativeNotificationModule";
    }

    // ─── Check if Android 16 Live Updates are available ───────────────────────
    @ReactMethod
    public void canPostPromotedNotifications(com.facebook.react.bridge.Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) { // API 36
            NotificationManager nm = (NotificationManager)
                reactContext.getSystemService(Context.NOTIFICATION_SERVICE);
            promise.resolve(nm.canPostPromotedNotifications());
        } else {
            promise.resolve(false);
        }
    }

    // ─── Send Samsung Now Bar notification ────────────────────────────────────
    // Adds private Samsung bundle extras to make the notification appear in
    // the Now Bar chip (status bar pill) and Live Notifications drawer.
    @ReactMethod
    public void sendSamsungNowBarNotification(ReadableMap options) {
        Context ctx         = reactContext.getApplicationContext();
        String  channelId   = options.getString("channelId");
        int     notifId     = options.getInt("id");
        String  title       = options.getString("title");
        String  body        = options.getString("body");
        String  primaryInfo = options.hasKey("primaryInfo")   ? options.getString("primaryInfo")   : title;
        String  secondary   = options.hasKey("secondaryInfo") ? options.getString("secondaryInfo") : body;
        String  chipText    = options.hasKey("chipText")      ? options.getString("chipText")      : title;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setColor(0xFF1565C0)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH);

        // ── Samsung Now Bar extras ──────────────────────────────────────────
        // These bundle keys are Samsung private APIs discovered by reverse engineering.
        // Reference: https://akexorcist.dev/live-notifications-and-now-bar-in-samsung-one-ui-7-as-developer-en/
        //
        // Core text keys:
        //   primaryInfo   → main text in the Live Notifications drawer
        //   secondaryInfo → subtitle in the drawer
        //   chipText      → text shown in the status bar pill / Now Bar chip
        //
        // Structured info keys (all optional):
        //   timerInfo     → Bundle with type/startTime/endTime/paused/prefixText/suffixText
        //   progressInfo  → Bundle with progress/maxProgress/label
        //   textInfo      → Bundle with text
        //   pointsInfo    → ArrayList<Bundle> with label/active per dot
        //   segmentInfo   → Bundle with current/total/label
        Bundle samsungExtras = new Bundle();
        samsungExtras.putString("android.ongoingActivityNoti.primaryInfo",   primaryInfo);
        samsungExtras.putString("android.ongoingActivityNoti.secondaryInfo", secondary);
        samsungExtras.putString("android.ongoingActivityNoti.chipText",      chipText);

        // ── timerInfo ──────────────────────────────────────────────────────
        if (options.hasKey("android.ongoingActivityNoti.timerInfo")) {
            ReadableMap t = options.getMap("android.ongoingActivityNoti.timerInfo");
            Bundle timerBundle = new Bundle();
            if (t.hasKey("type"))        timerBundle.putString("type",        t.getString("type"));
            if (t.hasKey("startTime"))   timerBundle.putLong("startTime",     (long) t.getDouble("startTime"));
            if (t.hasKey("endTime"))     timerBundle.putLong("endTime",       (long) t.getDouble("endTime"));
            if (t.hasKey("paused"))      timerBundle.putBoolean("paused",     t.getBoolean("paused"));
            if (t.hasKey("prefixText"))  timerBundle.putString("prefixText",  t.getString("prefixText"));
            if (t.hasKey("suffixText"))  timerBundle.putString("suffixText",  t.getString("suffixText"));
            samsungExtras.putBundle("android.ongoingActivityNoti.timerInfo", timerBundle);
        }

        // ── progressInfo ───────────────────────────────────────────────────
        if (options.hasKey("android.ongoingActivityNoti.progressInfo")) {
            ReadableMap p = options.getMap("android.ongoingActivityNoti.progressInfo");
            Bundle progressBundle = new Bundle();
            if (p.hasKey("progress"))    progressBundle.putInt("progress",    p.getInt("progress"));
            if (p.hasKey("maxProgress")) progressBundle.putInt("maxProgress", p.getInt("maxProgress"));
            if (p.hasKey("label"))       progressBundle.putString("label",    p.getString("label"));
            samsungExtras.putBundle("android.ongoingActivityNoti.progressInfo", progressBundle);
        }

        // ── textInfo ───────────────────────────────────────────────────────
        if (options.hasKey("android.ongoingActivityNoti.textInfo")) {
            ReadableMap tx = options.getMap("android.ongoingActivityNoti.textInfo");
            Bundle textBundle = new Bundle();
            if (tx.hasKey("text")) textBundle.putString("text", tx.getString("text"));
            samsungExtras.putBundle("android.ongoingActivityNoti.textInfo", textBundle);
        }

        // ── segmentInfo ────────────────────────────────────────────────────
        if (options.hasKey("android.ongoingActivityNoti.segmentInfo")) {
            ReadableMap s = options.getMap("android.ongoingActivityNoti.segmentInfo");
            Bundle segBundle = new Bundle();
            if (s.hasKey("current")) segBundle.putInt("current",    s.getInt("current"));
            if (s.hasKey("total"))   segBundle.putInt("total",      s.getInt("total"));
            if (s.hasKey("label"))   segBundle.putString("label",   s.getString("label"));
            samsungExtras.putBundle("android.ongoingActivityNoti.segmentInfo", segBundle);
        }

        // ── pointsInfo (ArrayList<Bundle>) ─────────────────────────────────
        if (options.hasKey("android.ongoingActivityNoti.pointsInfo")) {
            com.facebook.react.bridge.ReadableArray pts =
                options.getArray("android.ongoingActivityNoti.pointsInfo");
            ArrayList<Bundle> pointsList = new ArrayList<>();
            for (int i = 0; i < pts.size(); i++) {
                ReadableMap pt = pts.getMap(i);
                Bundle ptBundle = new Bundle();
                if (pt.hasKey("label"))  ptBundle.putString("label",   pt.getString("label"));
                if (pt.hasKey("active")) ptBundle.putBoolean("active",  pt.getBoolean("active"));
                pointsList.add(ptBundle);
            }
            samsungExtras.putParcelableArrayList(
                "android.ongoingActivityNoti.pointsInfo", pointsList);
        }

        builder.addExtras(samsungExtras);

        NotificationManagerCompat.from(ctx).notify(notifId, builder.build());
    }

    // ─── Send Android 16 Live Update notification ─────────────────────────────
    // Uses the official NotificationCompat.ProgressStyle API introduced in
    // Android 16 (API 36 / codename BAKLAVA).
    //
    // On Samsung One UI 8 (Android 16), this automatically shows in the Now Bar
    // without any whitelist or private extras.
    //
    // Reference: https://developer.android.com/develop/ui/views/notifications/live-update
    @ReactMethod
    public void sendAndroid16LiveUpdate(ReadableMap options) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.BAKLAVA) {
            // Fallback to Samsung path on older devices
            sendSamsungNowBarNotification(options);
            return;
        }

        Context ctx        = reactContext.getApplicationContext();
        String  channelId  = options.getString("channelId");
        int     notifId    = options.getInt("id");
        String  title      = options.getString("title");
        String  body       = options.getString("body");
        String  chipText   = options.hasKey("chipText")        ? options.getString("chipText")       : title;
        int     progress   = options.hasKey("progressCurrent") ? options.getInt("progressCurrent")   : 0;
        int     maxProg    = options.hasKey("progressMax")     ? options.getInt("progressMax")        : 100;
        boolean useChron   = options.hasKey("usesChronometer") && options.getBoolean("usesChronometer");
        boolean countdown  = options.hasKey("chronometerCountdown") && options.getBoolean("chronometerCountdown");
        long    whenTs     = options.hasKey("whenTimestamp")   ? (long) options.getDouble("whenTimestamp") : 0;

        // ── NotificationCompat.ProgressStyle ─────────────────────────────────
        // This is the Android 16 Live Updates style. It renders a progress bar
        // in the notification and promotes the notification to the Live Updates
        // area at the top of the shade + status bar chip.
        NotificationCompat.ProgressStyle progressStyle = new NotificationCompat.ProgressStyle()
            .setProgress(maxProg, progress, false);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setColor(0xFF1565C0)
            .setOngoing(true)
            .setAutoCancel(false)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setStyle(progressStyle)
            // setRequestPromotedOngoing(true) promotes this to "Live Update" tier
            // This is the key API — it tells Android to show this in the Live Updates
            // area (equivalent to Samsung's Now Bar on One UI 8)
            .setRequestPromotedOngoing(true)
            // setShortCriticalText = the text in the status bar chip
            .setShortCriticalText(chipText);

        if (useChron && whenTs > 0) {
            // Shows a countdown timer in the chip (e.g. "5 min" counting down)
            builder.setWhen(whenTs)
                   .setUsesChronometer(true)
                   .setChronometerCountDown(countdown);
        }

        NotificationManagerCompat.from(ctx).notify(notifId, builder.build());
    }

    // ─── Cancel a live notification ────────────────────────────────────────────
    @ReactMethod
    public void cancelNotification(int notifId) {
        NotificationManagerCompat.from(reactContext).cancel(notifId);
    }
}
