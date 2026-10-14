import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase, SUPABASE_ENABLED } from './supabaseClient';
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
  handleNotification: async () => {
    const prefs = getNotificationPrefs();
    const quietNow = shouldQuietForegroundNotification(new Date(), prefs);
    return {
      shouldShowAlert: prefs.bannersEnabled && !quietNow,
      shouldPlaySound: prefs.soundEnabled && !quietNow,
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

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[push] skipped — no EAS project ID found. Run `eas init` (see README) first.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
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
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const conversationId = response.notification.request.content.data?.conversationId;
    if (conversationId && navigationRef.isReady()) {
      navigationRef.navigate('Chat', { conversation: { id: conversationId, participant: {} } });
    }
  });
}
