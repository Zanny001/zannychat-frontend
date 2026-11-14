import React, { useEffect, useRef } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, View, Platform, Linking } from 'react-native';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { useReducedMotion } from '../utils/motion';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import PasswordRecoveryScreen from '../screens/PasswordRecoveryScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import PasswordResetScreen from '../screens/PasswordResetScreen';
import ChatListScreen from '../screens/ChatListScreen';
import StatusUpdatesScreen from '../screens/StatusUpdatesScreen';
import ChannelsScreen from '../screens/ChannelsScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PeerProfileScreen from '../screens/PeerProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacySecurityScreen from '../screens/PrivacySecurityScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpScreen from '../screens/HelpScreen';
import QRContactScreen from '../screens/QRContactScreen';
import ContactDiscoveryScreen from '../screens/ContactDiscoveryScreen';
import ForwardMessageScreen from '../screens/ForwardMessageScreen';
import DataStorageScreen from '../screens/DataStorageScreen';
import DataExportScreen from '../screens/DataExportScreen';
import SessionsScreen from '../screens/SessionsScreen';
import ChatAppearanceScreen from '../screens/ChatAppearanceScreen';
import SharedMediaScreen from '../screens/SharedMediaScreen';
import SavedMessagesScreen from '../screens/SavedMessagesScreen';
import DraftsScreen from '../screens/DraftsScreen';
import PinnedMessagesScreen from '../screens/PinnedMessagesScreen';
import ChatFoldersScreen from '../screens/ChatFoldersScreen';
import PollsScreen from '../screens/PollsScreen';
import EventsScreen from '../screens/EventsScreen';
import GroupManagementScreen from '../screens/GroupManagementScreen';
import JoinGroupScreen from '../screens/JoinGroupScreen';
import ScheduledMessagesScreen from '../screens/ScheduledMessagesScreen';
import CallScreen from '../screens/CallScreen';
import IncomingCallScreen from '../screens/IncomingCallScreen';
import OutgoingCallScreen from '../screens/OutgoingCallScreen';
import CallHistoryScreen from '../screens/CallHistoryScreen';
import GroupCallScreen from '../screens/GroupCallScreen';
import LiveHubScreen from '../screens/LiveHubScreen';
import LiveStreamScreen from '../screens/LiveStreamScreen';
import LiveReplayScreen from '../screens/LiveReplayScreen';
import { supabase, SUPABASE_ENABLED } from '../services/supabaseClient';
import { getCallParticipantName, getCallSessionById, subscribeToIncomingCalls, updateCallStatus } from '../services/calls';
import { clearNativeCallMapping, getNativeCallMapping, initializeNativeCallSystem, reportIncomingCallIfNeeded, reportNativeCallEnded } from '../services/nativeCallSystem';
import { completeGoogleOAuthCallback } from '../services/googleAuth';

// Lets code outside the component tree (the push-notification tap
// handler in App.js) trigger navigation — the standard React
// Navigation pattern for exactly that case.
export const navigationRef = createNavigationContainerRef();

const RootStack = createNativeStackNavigator();

const styles = StyleSheet.create({
  tabBackground: { borderRadius: 26, overflow: 'hidden' },
  cameraTabIcon: { width: 50, height: 50, borderRadius: 25, marginTop: -18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.48)' },
  tabIconShell: {
    width: 38,
    height: 34,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
const MainTabs = createBottomTabNavigator();

// The bottom tab bar's background — real blur of whatever's scrolling
// underneath, tinted toward the mood's background color.
function GlassTabBackground() {
  const { colors, resolvedMode } = useTheme();
  // Match GlassCard's low-end Android fallback so the floating tab bar
  // never forces a live blur pass on Android 10/11 devices.
  const supportsBackdropBlur = Platform.OS !== 'android' || Number(Platform.Version) >= 31;
  return (
    <View style={[StyleSheet.absoluteFill, styles.tabBackground]}>
      {supportsBackdropBlur ? (
        <BlurView
          intensity={32}
          tint={resolvedMode}
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.background, 0.84) }]} />
    </View>
  );
}

function TabIcon({ name, color, size, focused, accent, cameraAccent, cameraForeground, isCamera, reducedMotion }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      return undefined;
    }
    const animation = Animated.spring(scale, {
      toValue: focused ? 1.08 : 1,
      useNativeDriver: true,
      tension: 170,
      friction: 13,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, reducedMotion, scale]);

  const activeAccent = isCamera ? cameraAccent : accent;
  return (
    <Animated.View
      style={[
        styles.tabIconShell,
        isCamera && styles.cameraTabIcon,
        {
          transform: [{ scale }],
          backgroundColor: isCamera ? cameraAccent : focused ? hexToRgba(activeAccent, 0.17) : 'transparent',
          borderColor: isCamera ? hexToRgba(cameraAccent, 0.72) : focused ? hexToRgba(activeAccent, 0.38) : 'transparent',
          shadowColor: activeAccent,
          shadowOpacity: isCamera ? 0.42 : focused ? 0.32 : 0,
          shadowRadius: isCamera ? 17 : focused ? 11 : 0,
          elevation: isCamera ? 8 : focused ? 4 : 0,
        },
      ]}
    >
      <Ionicons name={name} size={isCamera ? 25 : focused ? 23 : size} color={isCamera ? cameraForeground : color} />
    </Animated.View>
  );
}

function MainTabNavigator() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarAccessibilityLabel: route.name === 'Channels' ? 'Explore tab' : `${route.name} tab`,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2, marginTop: 1 },
        tabBarItemStyle: { paddingTop: 5, paddingBottom: 5 },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: hexToRgba(colors.textPrimary, 0.12),
          position: 'absolute',
          height: 76,
          marginHorizontal: 10,
          marginBottom: Platform.OS === 'ios' ? 0 : 7,
          paddingTop: 7,
          paddingBottom: Platform.OS === 'ios' ? 18 : 9,
          borderTopWidth: 1,
          borderWidth: 1,
          borderColor: hexToRgba(colors.textPrimary, 0.1),
          borderRadius: 26,
          elevation: 12,
          shadowColor: colors.primary,
          shadowOpacity: 0.18,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarBackground: () => <GlassTabBackground />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size, focused }) => {
          const icons = { Chats: 'chatbubbles', Calls: 'call', LIVE: 'radio', Updates: 'camera', Channels: 'compass', Profile: 'person-circle' };
          return <TabIcon name={icons[route.name]} color={color} size={size} focused={focused} accent={colors.primary} cameraAccent={colors.accent} cameraForeground={colors.onAccent} isCamera={route.name === 'Updates'} reducedMotion={reducedMotion} />;
        },
      })}
    >
      <MainTabs.Screen name="Chats" component={ChatListScreen} />
      <MainTabs.Screen name="Calls" component={CallHistoryScreen} />
      <MainTabs.Screen name="LIVE" component={LiveHubScreen} options={{ tabBarLabel: "LIVE" }} />
      <MainTabs.Screen name="Updates" component={StatusUpdatesScreen} options={{ tabBarLabel: 'Updates' }} />
      <MainTabs.Screen name="Channels" component={ChannelsScreen} options={{ tabBarLabel: 'Explore' }} />
      <MainTabs.Screen name="Profile" component={ProfileScreen} />
    </MainTabs.Navigator>
  );
}

// initialRouteName is resolved once in App.js from whether a Supabase
// session already exists, so a returning, signed-in user lands
// straight in Main instead of seeing Onboarding again every launch.
export default function AppNavigator({ initialRouteName = 'Onboarding', isAuthenticated = false }) {
  const { colors } = useTheme();
  // In a configured production build, register private app routes only after a
  // Supabase session exists. Demo mode intentionally keeps its local preview.
  const canAccessApp = !SUPABASE_ENABLED || isAuthenticated;
  useEffect(() => {
    if (Platform.OS === 'web' || !SUPABASE_ENABLED || !supabase) return undefined;
    let active = true;
    const handleUrl = (url) => {
      if (!url || !url.startsWith('zannychat://auth/callback')) return;
      completeGoogleOAuthCallback(supabase, url).catch(() => {
        // A malformed or expired callback must not crash the app or log OAuth codes.
      });
    };
    Linking.getInitialURL().then((url) => { if (active) handleUrl(url); }).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => { active = false; subscription?.remove?.(); };
  }, []);

  const incomingUnsubscribeRef = useRef(null);
  const incomingIdsRef = useRef(new Set());
  const pendingIncomingRef = useRef(null);

  // Reset only after the route groups have re-rendered. Dispatching a reset
  // from the auth callback races React Navigation's conditional screen removal.
  useEffect(() => {
    if (!SUPABASE_ENABLED || !navigationRef.isReady()) return;
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (!isAuthenticated && ['PasswordRecovery', 'PasswordReset'].includes(currentRoute)) return;
    const targetRoute = isAuthenticated ? 'Main' : 'Onboarding';
    if (currentRoute !== targetRoute) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: targetRoute }] });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return undefined;
    let active = true;
    let attachedUserId = null;
    let activeUserId = null;
    const deliverIncoming = async (incoming) => {
      if (!active || !incoming?.id || incoming.callee_id !== activeUserId || incomingIdsRef.current.has(incoming.id)) return;
      // Claim before awaiting profile/native work so realtime and backfill
      // cannot race and open duplicate incoming-call screens.
      incomingIdsRef.current.add(incoming.id);
      try {
        const callerName = await getCallParticipantName(incoming.caller_id);
        const nativeCallId = Platform.OS === 'web' ? null : await reportIncomingCallIfNeeded(incoming, callerName);
        if (!active || incoming.callee_id !== activeUserId) {
          incomingIdsRef.current.delete(incoming.id);
          return;
        }
        if (incomingIdsRef.current.size > 50) {
          incomingIdsRef.current.delete(incomingIdsRef.current.values().next().value);
        }
        const params = { call: incoming, participantName: callerName, ...(nativeCallId ? { nativeCallId } : {}) };

        if (Platform.OS === 'web' && typeof window !== 'undefined' &&
            typeof Notification !== 'undefined' && Notification.permission === 'granted' &&
            typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          try {
            const notice = new Notification(
              incoming.call_type === 'video' ? 'Incoming video call' : 'Incoming audio call',
              { body: `${callerName} is calling you`, tag: `zannychat-call-${incoming.id}` }
            );
            notice.onclick = () => {
              try { window.focus(); } catch (_) {}
              if (navigationRef.isReady()) navigationRef.navigate('IncomingCall', params);
              notice.close();
            };
          } catch (_) {
            // Browser notifications are optional; the in-app call screen remains available.
          }
        }

        if (navigationRef.isReady()) navigationRef.navigate('IncomingCall', params);
        else pendingIncomingRef.current = params;
      } catch (error) {
        incomingIdsRef.current.delete(incoming.id);
        console.warn('[calls] incoming invitation could not be displayed:', error?.message || error);
      }
    };

    const attach = (userId) => {
      if (userId === attachedUserId) return;
      attachedUserId = userId;
      activeUserId = userId;
      incomingUnsubscribeRef.current?.();
      incomingUnsubscribeRef.current = null;
      incomingIdsRef.current.clear();
      pendingIncomingRef.current = null;
      if (!userId) return;

      // Subscribe first, then recover invitations created before this client
      // connected. This closes the realtime-subscription timing gap.
      incomingUnsubscribeRef.current = subscribeToIncomingCalls(userId, deliverIncoming);
      void (async () => {
        const { data, error } = await supabase.from('call_sessions')
          .select('id,conversation_id,caller_id,callee_id,call_type,status,created_at,expires_at')
          .eq('callee_id', userId)
          .eq('status', 'ringing')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        for (const incoming of data || []) await deliverIncoming(incoming);
      })().catch((error) => {
        if (active) console.warn('[calls] pending invitation backfill failed:', error?.message || error);
      });
    };
    supabase.auth.getSession().then(({ data }) => { if (active) attach(data?.session?.user?.id || null); }).catch(() => {});
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => attach(session?.user?.id || null));
    return () => {
      active = false;
      incomingUnsubscribeRef.current?.();
      incomingUnsubscribeRef.current = null;
      authListener?.subscription?.unsubscribe();
      incomingIdsRef.current.clear();
      pendingIncomingRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !SUPABASE_ENABLED || !supabase) return undefined;
    let active = true;
    const handleIncomingSession = async (event) => {
      const session = event?.session;
      const callId = session?.incomingCallEvent?.serverCallId;
      if (!callId || !active || incomingIdsRef.current.has(callId)) return;
      try {
        const call = await getCallSessionById(callId);
        if (!active || !call || call.status !== 'ringing' || new Date(call.expires_at).getTime() <= Date.now()) {
          if (call?.status === 'ringing') await updateCallStatus(callId, 'missed').catch(() => {});
          if (session?.id) await reportNativeCallEnded(session.id, 'unanswered');
          return;
        }
        incomingIdsRef.current.add(callId);
        const participantName = await getCallParticipantName(call.caller_id);
        if (!active) return;
        const params = { call, participantName, nativeCallId: session.id };
        if (navigationRef.isReady()) navigationRef.navigate('IncomingCall', params);
        else pendingIncomingRef.current = params;
      } catch (error) {
        console.warn('[calls] could not restore native incoming call:', error?.message || error);
      }
    };
    const unsubscribe = initializeNativeCallSystem({
      onSessionAdded: handleIncomingSession,
      onAnswered: async ({ id, requestId, session }) => {
        const callId = session?.incomingCallEvent?.serverCallId;
        if (!active || !callId) return;
        try {
          const call = await getCallSessionById(callId);
          if (!call || call.status !== 'ringing' || new Date(call.expires_at).getTime() <= Date.now()) {
            if (call?.status === 'ringing') await updateCallStatus(callId, 'missed').catch(() => {});
            await reportNativeCallEnded(id, 'unanswered');
            return;
          }
          const accepted = await updateCallStatus(callId, 'accepted');
          const participantName = await getCallParticipantName(call.caller_id);
          if (active && navigationRef.isReady()) {
            navigationRef.navigate('Call', {
              call: accepted, callType: call.call_type, isCaller: false,
              participantName, nativeCallId: id, nativeRequestId: requestId,
            });
          }
        } catch (error) {
          console.warn('[calls] native answer could not be completed:', error?.message || error);
        }
      },
      onEnded: async ({ id, session, reason }) => {
        const nativeMapping = session?.incomingCallEvent?.serverCallId ? null : await getNativeCallMapping(id);
        const callId = session?.incomingCallEvent?.serverCallId || nativeMapping?.serverCallId || null;
        if (!callId) return;
        let mappingCanBeCleared = false;
        try {
          const call = await getCallSessionById(callId);
          if (!call || !['ringing', 'accepted'].includes(call.status)) {
            mappingCanBeCleared = true;
          } else {
            const status = call.status === 'ringing'
              ? (reason === 'unanswered' ? 'missed' : (session?.origin === 'incoming' ? 'declined' : 'cancelled'))
              : 'ended';
            await updateCallStatus(callId, status);
            mappingCanBeCleared = true;
          }
        } catch (error) {
          // Keep the encrypted mapping so the killed-app receiver or a later
          // lifecycle event can retry reconciliation after transient failures.
          console.warn('[calls] native call end could not be synchronized:', error?.message || error);
        } finally {
          if (mappingCanBeCleared) await clearNativeCallMapping(id);
        }
      },
      onMuted: ({ id, isMuted }) => {
        DeviceEventEmitter.emit('zannychat:native-call-muted', { id, isMuted });
      },
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} onReady={() => { if (pendingIncomingRef.current) { const pending = pendingIncomingRef.current; pendingIncomingRef.current = null; navigationRef.navigate('IncomingCall', pending); } }} theme={navTheme} linking={{ prefixes: ['zannychat://'], config: { screens: { PasswordReset: 'reset-password', JoinGroup: 'join-group', QRContact: 'contact/:userId' } } }}>
      <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
        {(!SUPABASE_ENABLED || !isAuthenticated) && <RootStack.Group navigationKey="guest">
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Signup" component={SignupScreen} />
          <RootStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        </RootStack.Group>}
        <RootStack.Screen name="PasswordRecovery" component={PasswordRecoveryScreen} />
        <RootStack.Screen name="PasswordReset" component={PasswordResetScreen} />
        {canAccessApp && <RootStack.Group navigationKey={isAuthenticated ? 'authenticated' : 'demo'}>
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen name="Chat" component={ChatScreen} />
          <RootStack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
          <RootStack.Screen name="OutgoingCall" component={OutgoingCallScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
          <RootStack.Screen name="Call" component={CallScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
          <RootStack.Screen name="GroupCall" component={GroupCallScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
          <RootStack.Screen name="LiveHub" component={LiveHubScreen} options={{ animation: 'fade' }} />
          <RootStack.Screen name="LiveStream" component={LiveStreamScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
          <RootStack.Screen name="LiveReplay" component={LiveReplayScreen} options={{ animation: 'fade' }} />
          <RootStack.Screen name="PeerProfile" component={PeerProfileScreen} />
          <RootStack.Screen name="NewChat" component={NewChatScreen} options={{ presentation: 'modal' }} />
          <RootStack.Screen name="QRContact" component={QRContactScreen} options={{ presentation: 'modal' }} />
          <RootStack.Screen name="ContactDiscovery" component={ContactDiscoveryScreen} options={{ presentation: 'modal' }} />
          <RootStack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{ presentation: 'modal' }} />
          <RootStack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
          <RootStack.Screen name="Settings" component={SettingsScreen} />
          <RootStack.Screen name="ChatAppearance" component={ChatAppearanceScreen} />
          <RootStack.Screen name="SharedMedia" component={SharedMediaScreen} />
          <RootStack.Screen name="SavedMessages" component={SavedMessagesScreen} />
          <RootStack.Screen name="Drafts" component={DraftsScreen} />
          <RootStack.Screen name="PinnedMessages" component={PinnedMessagesScreen} />
          <RootStack.Screen name="ChatFolders" component={ChatFoldersScreen} />
          <RootStack.Screen name="StatusUpdates" component={StatusUpdatesScreen} />
          <RootStack.Screen name="Polls" component={PollsScreen} />
          <RootStack.Screen name="Events" component={EventsScreen} />
          <RootStack.Screen name="ScheduledMessages" component={ScheduledMessagesScreen} />
          <RootStack.Screen name="GroupManagement" component={GroupManagementScreen} />
          <RootStack.Screen name="JoinGroup" component={JoinGroupScreen} />
          <RootStack.Screen name="Channels" component={ChannelsScreen} />
          <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
          <RootStack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
          <RootStack.Screen name="Notifications" component={NotificationsScreen} />
          <RootStack.Screen name="DataStorage" component={DataStorageScreen} />
          <RootStack.Screen name="DataExport" component={DataExportScreen} />
          <RootStack.Screen name="Sessions" component={SessionsScreen} />
          <RootStack.Screen name="Help" component={HelpScreen} />
        </RootStack.Group>}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
