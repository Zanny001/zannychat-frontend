import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useAppFonts } from './src/theme/fonts';
import { supabase, SUPABASE_ENABLED } from './src/services/supabaseClient';
import {
  registerForPushNotifications,
  subscribeToNotificationTaps,
} from './src/services/notifications';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useAppFonts();
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function resolveInitialRoute() {
      if (!SUPABASE_ENABLED || !supabase) {
        if (mounted) setInitialRoute('Onboarding');
        return;
      }

      // Supabase restores and processes the OAuth callback automatically.
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          'Could not restore Supabase session:',
          sessionError.message
        );
      }

      const session = data?.session || null;

      if (mounted) {
        setInitialRoute(session ? 'Main' : 'Onboarding');
      }

      if (session) {
        registerForPushNotifications();
      }

      // Remove OAuth tokens from the URL only after session restoration.
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        const fragment = currentUrl.hash.replace(/^#/, '');
        const hasAuthFragment =
          /(?:^|&)(?:access_token|refresh_token|error|error_description)=/.test(
            fragment
          );

        if (hasAuthFragment) {
          currentUrl.hash = '';
          window.history.replaceState(
            {},
            document.title,
            currentUrl.pathname + currentUrl.search
          );
        }
      }
    }

    resolveInitialRoute().catch((error) => {
      console.error('Could not resolve initial app route:', error);
      if (mounted) setInitialRoute('Onboarding');
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = subscribeToNotificationTaps(navigationRef);
    return () => subscription.remove();
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
    <GestureHandlerRootView
      style={{ flex: 1 }}
      onLayout={onLayoutRootView}
    >
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="light" />
          <AppNavigator initialRouteName={initialRoute} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
