package com.nowbrief;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.*;
import com.facebook.react.uimanager.ViewManager;
import java.util.*;
public class NowBriefPackage implements ReactPackage {
    @Override public List<NativeModule> createNativeModules(ReactApplicationContext ctx) {
        List<NativeModule> l = new ArrayList<>(); l.add(new NowBriefModule(ctx)); return l;
    }
    @Override public List<ViewManager> createViewManagers(ReactApplicationContext ctx) { return Collections.emptyList(); }
}
