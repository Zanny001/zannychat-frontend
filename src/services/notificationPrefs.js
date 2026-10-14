import AsyncStorage from '@react-native-async-storage/async-storage';

// Local notification preferences, persisted to AsyncStorage and read
// by notifications.js's foreground handler and by the
// NotificationsScreen toggles. These are honestly scoped: they control
// how THIS device presents notifications (banner, sound). What a push
// payload contains is decided server-side; muting a conversation
// server-side is a separate, real feature (conversation_participants
// .is_muted, enforced in the backend webhook).

const PREFS_KEY = 'zannychat.notificationPrefs';

const DEFAULTS = {
  pushEnabled: true, // master switch — toggling it registers/removes push tokens server-side
  bannersEnabled: true,
  soundEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

let cache = { ...DEFAULTS };

export async function loadNotificationPrefs() {
  try {
    const stored = await AsyncStorage.getItem(PREFS_KEY);
    if (stored) cache = { ...DEFAULTS, ...JSON.parse(stored) };
  } catch (err) {
    // Corrupt/absent storage → defaults; never worth breaking
    // notification delivery over.
  }
  return cache;
}

export function getNotificationPrefs() {
  return cache;
}

export async function setNotificationPrefs(update) {
  cache = { ...cache, ...update };
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(cache));
  } catch (err) {
    // Same reasoning as load — a failed write shouldn't throw into UI.
  }
  return cache;
}
