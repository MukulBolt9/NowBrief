package com.nowbrief;
import android.app.Application;
import com.facebook.react.*;
import com.facebook.react.defaults.*;
import com.facebook.soloader.SoLoader;
import java.util.*;

public class MainApplication extends Application implements ReactApplication {
    private final ReactNativeHost mReactNativeHost = new DefaultReactNativeHost(this) {
        @Override public boolean getUseDeveloperSupport() { return BuildConfig.DEBUG; }
        @Override protected List<ReactPackage> getPackages() {
            List<ReactPackage> packages = new PackageList(this).getPackages();
            packages.add(new NowBriefPackage());
            return packages;
        }
        @Override protected String getJSMainModuleName() { return "index"; }
        @Override protected Boolean isNewArchEnabled() { return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED; }
        @Override protected Boolean isHermesEnabled() { return BuildConfig.IS_HERMES_ENABLED; }
    };

    @Override public ReactNativeHost getReactNativeHost() { return mReactNativeHost; }

    @Override public void onCreate() {
        super.onCreate();
        SoLoader.init(this, false);
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            DefaultNewArchitectureEntryPoint.load();
        }
        NowBriefNotificationHelper.ensureChannels(this);
    }
}
