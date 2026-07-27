import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useAppFonts } from './src/theme/fonts';
import { supabase, SUPABASE_ENABLED } from './src/services/supabaseClient';
import AppNavigator from './src/navigation/AppNavigator';

// Keeps the native splash screen up until Space Grotesk & Manrope are
// ready, so the app never flashes the system font before swapping —
// same technique Expo's own docs use for font loading.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useAppFonts();
  const [initialRoute, setInitialRoute] = useState(null);

  // The other half of "connect the backend": if Supabase is configured
  // and a session is already persisted (AsyncStorage, see
  // supabaseClient.js), a returning signed-in user should land in Main
  // directly instead of seeing Onboarding on every cold start.
  useEffect(() => {
    let mounted = true;
    async function resolveInitialRoute() {
      if (!SUPABASE_ENABLED) {
        if (mounted) setInitialRoute('Onboarding');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (mounted) setInitialRoute(data?.session ? 'Main' : 'Onboarding');
    }
    resolveInitialRoute();
    return () => {
      mounted = false;
    };
  }, []);

  const appReady = fontsLoaded && initialRoute !== null;

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="light" />
          <AppNavigator initialRouteName={initialRoute} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
