import React, { useEffect, useRef } from 'react';
import { DeviceEventEmitter, StyleSheet, View, Platform, Linking } from 'react-native';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';

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
  const { colors } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={32}
        tint="dark"
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(colors.background, 0.72) }]} />
    </View>
  );
}

function MainTabNavigator() {
  const { colors } = useTheme();

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
          overflow: 'hidden',
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
          const icons = { Chats: 'chatbubbles', Calls: 'call', Updates: 'aperture', Channels: 'compass', Profile: 'person-circle' };
          return (
            <View style={[
              styles.tabIconShell,
              {
                backgroundColor: focused ? hexToRgba(colors.primary, 0.17) : 'transparent',
                borderColor: focused ? hexToRgba(colors.primary, 0.38) : 'transparent',
                shadowColor: colors.primary,
                shadowOpacity: focused ? 0.32 : 0,
                shadowRadius: focused ? 11 : 0,
                elevation: focused ? 4 : 0,
              },
            ]}>
              <Ionicons name={icons[route.name]} size={focused ? 23 : size} color={color} />
            </View>
          );
        },
      })}
    >
      <MainTabs.Screen name="Chats" component={ChatListScreen} />
      <MainTabs.Screen name="Calls" component={CallHistoryScreen} />
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
    const attach = (userId) => {
      if (userId === attachedUserId) return;
      attachedUserId = userId;
      incomingUnsubscribeRef.current?.();
      incomingUnsubscribeRef.current = null;
      if (userId) incomingUnsubscribeRef.current = subscribeToIncomingCalls(userId, async (incoming) => {
        if (!active || incomingIdsRef.current.has(incoming.id)) return;
        const callerName = await getCallParticipantName(incoming.caller_id);
        const nativeCallId = Platform.OS === 'web' ? null : await reportIncomingCallIfNeeded(incoming, callerName);
        if (!active || incomingIdsRef.current.has(incoming.id)) return;
        incomingIdsRef.current.add(incoming.id);
        if (incomingIdsRef.current.size > 50) incomingIdsRef.current.delete(incomingIdsRef.current.values().next().value);
        const params = { call: incoming, participantName: callerName, ...(nativeCallId ? { nativeCallId } : {}) };
        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof Notification !== 'undefined'
          && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
          const notice = new Notification(incoming.call_type === 'video' ? 'Incoming video call' : 'Incoming audio call', {
            body: `${callerName} is calling you`, tag: `zannychat-call-${incoming.id}`,
          });
          notice.onclick = () => { window.focus(); if (navigationRef.isReady()) navigationRef.navigate('IncomingCall', params); notice.close(); };
        }
        if (navigationRef.isReady()) navigationRef.navigate('IncomingCall', params);
        else pendingIncomingRef.current = params;
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
    <NavigationContainer ref={navigationRef} onReady={() => { if (pendingIncomingRef.current) { const pending = pendingIncomingRef.current; pendingIncomingRef.current = null; navigationRef.navigate('IncomingCall', pending); } }} theme={navTheme} linking={{ prefixes: ['zannychat://'], config: { screens: { PasswordReset: 'reset-password', JoinGroup: 'join-group' } } }}>
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
