package com.nowbrief;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.*;

public class NowBriefModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext ctx;
    public NowBriefModule(ReactApplicationContext c) { super(c); this.ctx = c; }

    @NonNull @Override public String getName() { return "NowBriefModule"; }

    @ReactMethod
    public void sendLiveNotification(ReadableMap o, Promise p) {
        try {
            NowBriefNotificationHelper.sendLiveNotification(
                ctx.getApplicationContext(),
                o.hasKey("id")              ? o.getInt("id")            : 9001,
                o.hasKey("title")           ? o.getString("title")      : "NowBrief",
                o.hasKey("body")            ? o.getString("body")       : "",
                o.hasKey("primaryInfo")     ? o.getString("primaryInfo"): o.hasKey("title") ? o.getString("title") : "NowBrief",
                o.hasKey("secondaryInfo")   ? o.getString("secondaryInfo"): "",
                o.hasKey("nowBarPrimary")   ? o.getString("nowBarPrimary")  : o.hasKey("primaryInfo") ? o.getString("primaryInfo") : "NowBrief",
                o.hasKey("nowBarSecondary") ? o.getString("nowBarSecondary"): "",
                o.hasKey("chipText")        ? o.getString("chipText")   : "NowBrief",
                o.hasKey("chipColor")       ? o.getString("chipColor")  : "#1565C0",
                o.hasKey("progress")        ? o.getInt("progress")      : -1,
                o.hasKey("progressMax")     ? o.getInt("progressMax")   : 100
            );
            p.resolve(true);
        } catch (Exception e) { p.reject("ERR", e.getMessage()); }
    }

    @ReactMethod
    public void sendSimpleNotification(ReadableMap o, Promise p) {
        try {
            NowBriefNotificationHelper.sendSimpleNotification(
                ctx.getApplicationContext(),
                o.hasKey("id")     ? o.getInt("id")         : 8001,
                o.hasKey("title")  ? o.getString("title")   : "NowBrief",
                o.hasKey("body")   ? o.getString("body")    : "",
                o.hasKey("screen") ? o.getString("screen")  : "summary"
            );
            p.resolve(true);
        } catch (Exception e) { p.reject("ERR", e.getMessage()); }
    }

    @ReactMethod
    public void cancelNotification(int id, Promise p) {
        try { NowBriefNotificationHelper.cancel(ctx.getApplicationContext(), id); p.resolve(true); }
        catch (Exception e) { p.reject("ERR", e.getMessage()); }
    }

    @ReactMethod
    public void createChannels(Promise p) {
        try { NowBriefNotificationHelper.ensureChannels(ctx.getApplicationContext()); p.resolve(true); }
        catch (Exception e) { p.reject("ERR", e.getMessage()); }
    }

    @ReactMethod
    public void canPostPromotedNotifications(Promise p) {
        p.resolve(NowBriefNotificationHelper.canPostPromotedNotifications(ctx.getApplicationContext()));
    }
}
