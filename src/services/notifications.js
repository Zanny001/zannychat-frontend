import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { updateCallStatus, getCallParticipantName } from './calls';
import { getNotificationPrefs, loadNotificationPrefs } from './notificationPrefs';
import { shouldQuietForegroundNotification } from '../utils/quietHours';

// Preferences are loaded once at module scope (module-level handlers
// can't await a fresh read per notification) and kept warm in memory —
// setNotificationPrefs updates the same cache the handler reads.
loadNotificationPrefs();

// Foreground notifications get a banner + sound too, not just
// background ones — a message you're not currently looking at should
// still announce itself even while the app is open. Both honor the
// user's notification preferences (see NotificationsScreen).
Notifications.setNotificationHandler({
  handleNotification: async ({ notification } = {}) => {
    const prefs = getNotificationPrefs();
    const isIncomingCall = notification?.request?.content?.data?.type === 'incoming_call';
    const quietNow = shouldQuietForegroundNotification(new Date(), prefs);
    return {
      shouldShowAlert: prefs.bannersEnabled && !quietNow,
      shouldPlaySound: !isIncomingCall && prefs.soundEnabled && !quietNow,
      shouldSetBadge: false,
    };
  },
});

// Registers this device for push and upserts the token to Supabase —
// called once from App.js after a session exists. Returns null (with a
// console log explaining why) for every legitimate reason this can't
// proceed, rather than throwing: a simulator, a denied permission, and
// no EAS project configured are all expected, recoverable states, not
// bugs to alarm the user about.
//
// IMPORTANT: remote push requires a physical device AND a development
// build — it does not work in Expo Go on Android (SDK 53+) or in
// Snack's Web/iframe preview at all. See the frontend README.
export async function registerForPushNotifications() {
  try {
    await Notifications.setNotificationCategoryAsync('incoming-call', [
      { identifier: 'ANSWER_CALL', buttonTitle: 'Answer', options: { opensAppToForeground: true } },
      { identifier: 'DECLINE_CALL', buttonTitle: 'Decline', options: { opensAppToForeground: true, isDestructive: true } },
    ]);
  } catch (error) {
    console.warn('[notifications] call actions unavailable:', error?.message || error);
  }
  if (!SUPABASE_ENABLED) return null;

  if (!Device.isDevice) {
    console.log('[push] skipped — physical device required (this is a simulator/emulator).');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] skipped — notification permission was not granted.');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('[push] skipped — no EAS project ID found. Run `eas init` (see README) first.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('calls', {
      name: 'Incoming calls',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'call_ring.wav',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return null;

    await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: authData.user.id,
          expo_push_token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'expo_push_token' }
      );

    return token;
  } catch (err) {
    console.warn('[push] registration failed:', err.message);
    return null;
  }
}

// Removes every push token this account has registered (all devices) —
// the real effect behind the Notifications screen's master toggle.
// Turning push "off" here means the server genuinely stops having a
// token to send to, not just a local visual switch.
export async function unregisterPushNotifications() {
  if (!SUPABASE_ENABLED) return;
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) return;
    await supabase.from('push_tokens').delete().eq('user_id', authData.user.id);
  } catch (err) {
    console.warn('[push] unregister failed:', err.message);
  }
}

// Called once from App.js with the navigationRef AppNavigator exports.
// When someone taps a notification (app was backgrounded or fully
// closed), this opens the conversation it was about. Only a
// conversation id travels in the push payload, not the full
// participant details ChatScreen's header wants — ChatScreen itself
// resolves those via fetchConversations() when it notices they're
// missing, so this stays simple rather than duplicating that lookup.
export function subscribeToNotificationTaps(navigationRef) {
  const handled = new Set();
  let pending = null;
  let active = true;

  const navigateResponse = async (response) => {
    if (!active || !response) return;
    const data = response.notification?.request?.content?.data || {};
    const callId = typeof data.callId === 'string' ? data.callId : null;
    const groupCallId = typeof data.groupCallId === 'string' ? data.groupCallId : null;
    const callType = data.callType === 'video' ? 'video' : 'audio';
    const conversationId = typeof data.conversationId === 'string' ? data.conversationId : null;
    const liveType = typeof data.type === 'string' && data.type.startsWith('live_') ? data.type : null;
    const liveStreamId = typeof data.streamId === 'string' ? data.streamId : null;
    const actionIdentifier = response.actionIdentifier;
    const key = callId ? `call:${callId}:${actionIdentifier}`
      : groupCallId ? `group-call:${groupCallId}`
        : conversationId ? `chat:${conversationId}`
          : liveType ? `live:${liveType}:${data.replayId || liveStreamId || data.creatorId || data.followerId || 'hub'}`
            : null;
    if (!key || handled.has(key)) return;
    if (!navigationRef.isReady()) { pending = response; return; }
    handled.add(key);
    if (handled.size > 100) handled.delete(handled.values().next().value);

    if (callId && supabase && SUPABASE_ENABLED) {
      const { data: call, error } = await supabase.from('call_sessions')
        .select('id,conversation_id,caller_id,callee_id,call_type,status,expires_at')
        .eq('id', callId).maybeSingle();
      if (!active || error || !call || call.status !== 'ringing' || new Date(call.expires_at).getTime() <= Date.now()) return;
      if (actionIdentifier === 'DECLINE_CALL') {
        await updateCallStatus(callId, 'declined');
        return;
      }
      const participantName = await getCallParticipantName(call.caller_id);
      if (active && navigationRef.isReady()) {
        navigationRef.navigate('IncomingCall', { call, participantName, autoAnswer: actionIdentifier === 'ANSWER_CALL' });
      }
      return;
    }
    if (groupCallId) {
      navigationRef.navigate('GroupCall', { roomId: groupCallId, conversationId, conversationName: 'Group call', callType });
      return;
    }
    if (liveType) {
      navigationRef.navigate('LiveHub', { liveNotification: data });
      return;
    }
    if (conversationId) navigationRef.navigate('Chat', { conversation: { id: conversationId, participant: {} } });
  };

  const flush = () => {
    if (!pending || !navigationRef.isReady()) return;
    const response = pending;
    pending = null;
    navigateResponse(response).catch(() => {});
  };
  const readySubscription = navigationRef.addListener?.('ready', flush);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateResponse(response).catch(() => {});
  });
  Promise.resolve(Notifications.getLastNotificationResponseAsync?.()).then((response) => {
    if (response) navigateResponse(response).catch(() => {});
  }).catch(() => {});

  return {
    remove() {
      active = false;
      pending = null;
      responseSubscription.remove();
      readySubscription?.();
    },
  };
}
