package com.nowbrief;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

/**
 * NowBriefActivity
 * Dedicated entry point launched when the user taps the Now Bar chip
 * or any live notification. Redirects to MainActivity with correct tab.
 */
public class NowBriefActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String tab = getIntent() != null ? getIntent().getStringExtra("openTab") : "summary";
        Log.d("NowBriefActivity", "Launching from notification, tab=" + tab);
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("openTab", tab != null ? tab : "summary");
        intent.putExtra("fromNotification", true);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }
}
