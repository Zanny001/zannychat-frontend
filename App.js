import 'react-native-url-polyfill/auto';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { getStatusBarStyle } from './src/utils/themeAppearance';
import { useAppFonts } from './src/theme/fonts';
import { supabase, SUPABASE_ENABLED } from './src/services/supabaseClient';
import {
  registerForPushNotifications,
  subscribeToNotificationTaps,
} from './src/services/notifications';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import VoIPPushRegistrar from './src/components/VoIPPushRegistrar';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedStatusBar() {
  const { resolvedMode } = useTheme();
  return <StatusBar style={getStatusBarStyle(resolvedMode)} />;
}

export default function App() {
  const [fontsLoaded] = useAppFonts();
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    let mounted = true;
    let authSubscription = null;
    let pushRegistrationStarted = false;
    let authStateObserved = false;

    function registerPushOnce() {
      if (pushRegistrationStarted) return;
      pushRegistrationStarted = true;
      // This can be reached by both SIGNED_IN and the initial getSession result.
      // Keep the permission prompt/token upsert from running twice on OAuth return.
      Promise.resolve(registerForPushNotifications()).catch((error) => {
        console.warn('Push registration could not start:', error?.message || error);
      });
    }

    async function resolveInitialRoute() {
      const isWebRecoveryCallback = Platform.OS === 'web' && typeof window !== 'undefined'
        && new URL(window.location.href).searchParams.get('reset-password') === '1';
      if (!SUPABASE_ENABLED || !supabase) {
        if (mounted) setInitialRoute('Onboarding');
        return;
      }

      // Keep navigation synchronized with auth state. OAuth can finish after
      // the first route was selected; without this listener the app can remain
      // on Onboarding even though Supabase has a valid signed-in session.
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          authStateObserved = true;
        }
        if (session) {
          setInitialRoute(isWebRecoveryCallback ? 'PasswordReset' : 'Main');
          // Only a new sign-in should redirect from an auth screen. Token refreshes
          // must never reset a user's active chat/call/navigation stack.
          if (event === 'SIGNED_IN') {
            registerPushOnce();
          }
        } else if (event === 'SIGNED_OUT') {
          setInitialRoute('Onboarding');
        } else if (event === 'INITIAL_SESSION') {
          // Resolve the unauthenticated initial state even if getSession fails.
          setInitialRoute(isWebRecoveryCallback ? 'PasswordReset' : 'Onboarding');
        }
      });
      authSubscription = authListener?.subscription;

      // Supabase restores and processes the OAuth callback automatically on web.
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          'Could not restore Supabase session:',
          sessionError.message
        );
      }

      const session = data?.session || null;

      // Auth events may win this race (notably OAuth callback processing).
      // Never let a stale getSession snapshot overwrite a newer auth event.
      if (mounted && !authStateObserved) {
        setInitialRoute(isWebRecoveryCallback ? 'PasswordReset' : session ? 'Main' : 'Onboarding');
      }

      if (session) {
        registerPushOnce();
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
      // Never overwrite a SIGNED_IN result with Onboarding because a parallel
      // session lookup failed. Fall back only if no auth event resolved state.
      if (mounted && !authStateObserved) setInitialRoute('Onboarding');
    });

    return () => {
      mounted = false;
      // Supabase auth subscription is cleaned up when the app unmounts.
      // Store it on the effect scope to avoid listeners surviving hot reloads.
      authSubscription?.unsubscribe?.();
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
          <ThemedStatusBar />
          <VoIPPushRegistrar />
          <AppNavigator initialRouteName={initialRoute} isAuthenticated={initialRoute === 'Main'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
