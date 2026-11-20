import AsyncStorage from '@react-native-async-storage/async-storage';

// Local notification preferences, persisted to AsyncStorage and read
// by notifications.js's foreground handler and by NotificationsScreen.
// These control this device's presentation only; server-side conversation mute
// remains a separate feature enforced by the backend webhook.

const PREFS_KEY = 'zannychat.notificationPrefs';

const DEFAULTS = {
  pushEnabled: true,
  bannersEnabled: true,
  soundEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

let cache = { ...DEFAULTS };
let persistenceError = '';

export async function loadNotificationPrefs() {
  try {
    const stored = await AsyncStorage.getItem(PREFS_KEY);
    if (stored) cache = { ...DEFAULTS, ...JSON.parse(stored) };
    else cache = { ...DEFAULTS };
    persistenceError = '';
  } catch {
    cache = { ...DEFAULTS };
    persistenceError = 'Notification preferences could not be loaded from this device. Defaults are active for this session.';
  }
  return { ...cache };
}

export function getNotificationPrefs() {
  return { ...cache };
}

export function getNotificationPrefsPersistenceError() {
  return persistenceError;
}

export async function setNotificationPrefs(update) {
  cache = { ...cache, ...(update || {}) };
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(cache));
    persistenceError = '';
  } catch {
    // Keep this session usable, but make the failed persistence visible to the UI.
    persistenceError = 'Your notification preferences are active for this session, but could not be saved on this device. Check device storage and try again.';
  }
  return { ...cache };
}
