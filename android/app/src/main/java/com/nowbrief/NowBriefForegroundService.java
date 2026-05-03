package com.nowbrief;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import androidx.annotation.Nullable;

public class NowBriefForegroundService extends Service {
    private static final String TAG = "NowBriefFgSvc";

    @Override public void onCreate() {
        super.onCreate();
        NowBriefNotificationHelper.ensureChannels(this);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Starting foreground");
        startForeground(2001, NowBriefNotificationHelper.buildServiceNotification(this));
        return START_STICKY;
    }

    @Override public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Destroyed — restarting");
        startService(new Intent(getApplicationContext(), NowBriefForegroundService.class));
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
