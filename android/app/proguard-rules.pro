# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# NowBrief native modules
-keep class com.nowbrief.** { *; }

# Push notifications
-keep class com.dieam.reactnativepushnotification.** { *; }
-keep class com.google.firebase.** { *; }

# Foreground service
-keep class com.vitnc.foreground.** { *; }

# Keep Samsung Now Bar bundle keys (must not be obfuscated)
-keepclassmembers class * {
    @android.os.Bundle *;
}
