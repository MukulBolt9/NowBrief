// App.js — Root of NowBrief
// Sets up navigation, boots foreground service & notification scheduler

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator }  from '@react-navigation/stack';
import { Platform, Linking }     from 'react-native';
import { SafeAreaProvider }      from 'react-native-safe-area-context';

import HomeScreen               from './src/screens/HomeScreen';
import LiveNotificationService  from './src/services/LiveNotificationService';

const Stack = createStackNavigator();

// Deep-link config — tapping a notification opens the right screen
const linking = {
  prefixes: ['nowbrief://'],
  config:   {
    screens: {
      Home:    'home',
      Weather: 'weather',
      News:    'news',
      Article: 'article',
    },
  },
};

export default function App() {
  useEffect(() => {
    bootstrap();
    return () => {
      // Cleanup on unmount (dev only — prod keeps FG service alive)
      LiveNotificationService.stopScheduler();
    };
  }, []);

  async function bootstrap() {
    // 1. Create notification channels + request permissions
    await LiveNotificationService.init();

    // 2. Start Android Foreground Service so we survive background kill
    if (Platform.OS === 'android') {
      await LiveNotificationService.startForegroundService();
    }

    // 3. Start timed message scheduler (fires Good morning, news, weather etc.)
    LiveNotificationService.startScheduler();

    console.log('[NowBrief] App bootstrapped ✓');
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home"    component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
