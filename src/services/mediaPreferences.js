import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_MEDIA_PREFERENCES, normalizeMediaPreferences } from '../utils/mediaQuality';

const STORAGE_KEY = 'zannychat.mediaPreferences';
let cache = { ...DEFAULT_MEDIA_PREFERENCES };

export async function loadMediaPreferences() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cache = normalizeMediaPreferences(stored ? JSON.parse(stored) : DEFAULT_MEDIA_PREFERENCES);
    return { ...cache };
  } catch (error) {
    cache = { ...DEFAULT_MEDIA_PREFERENCES };
    throw new Error('Media preferences could not be loaded from this device. Defaults are active for this session.');
  }
}

export function getMediaPreferences() {
  return { ...cache };
}

export async function updateMediaPreferences(patch) {
  cache = normalizeMediaPreferences({ ...cache, ...(patch || {}) });
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Keep the selected value active in memory, but never report it as saved.
    throw new Error('Your media preferences are active for this session, but could not be saved on this device. Check device storage and try again.');
  }
  return { ...cache };
}
