// App.js — Root of NowBrief
import React, { useEffect } from 'react';
import { NavigationContainer }       from '@react-navigation/native';
import { createStackNavigator }      from '@react-navigation/stack';
import { Platform, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider }          from 'react-native-safe-area-context';

import { UserProvider, useUser }     from './src/context/UserContext';
import OnboardingScreen              from './src/screens/OnboardingScreen';
import HomeScreen                    from './src/screens/HomeScreen';
import ArticleScreen                 from './src/screens/ArticleScreen';
import LiveNotificationService       from './src/services/LiveNotificationService';

const Stack = createStackNavigator();

const linking = {
  prefixes: ['nowbrief://'],
  config: { screens: { Home: 'home', Article: 'article' } },
};

function AppNavigator() {
  const { userName, loaded } = useUser();

  useEffect(() => {
    if (!loaded || !userName) return;
    (async () => {
      await LiveNotificationService.init();
      if (Platform.OS === 'android') await LiveNotificationService.startForegroundService();
      LiveNotificationService.startScheduler();
    })();
    return () => LiveNotificationService.stopScheduler();
  }, [loaded, userName]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D47A1' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!userName ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Home"    component={HomeScreen} />
            <Stack.Screen name="Article" component={ArticleScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <AppNavigator />
      </UserProvider>
    </SafeAreaProvider>
  );
}
