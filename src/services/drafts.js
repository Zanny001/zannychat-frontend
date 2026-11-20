import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeDraftText, parseDraftRecord, shouldPersistDraft } from '../utils/drafts';

export async function loadDraft(key) {
  if (!key) return '';
  try {
    const raw = await AsyncStorage.getItem(key);
    return parseDraftRecord(raw).text;
  } catch {
    throw new Error('Your saved message draft could not be read from this device. The composer is paused to protect the existing draft. Retry before editing.');
  }
}

export async function saveDraft(key, value) {
  if (!key) return false;
  const text = normalizeDraftText(value);
  try {
    if (!shouldPersistDraft(text)) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify({ __zannychatDraft: true, text, updatedAt: new Date().toISOString() }));
    return true;
  } catch (_) {
    return false;
  }
}

export async function clearDraft(key) {
  if (!key) return false;
  try { await AsyncStorage.removeItem(key); return true; }
  catch (_) { return false; }
}

export async function clearDraftsForUser(userId) {
  if (!userId) return false;
  const prefix = `zannychat.draft.v1.${encodeURIComponent(String(userId))}.`;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matches = keys.filter((key) => key.startsWith(prefix));
    if (matches.length) await AsyncStorage.multiRemove(matches);
    return true;
  } catch (_) { return false; }
}

export async function loadDraftsForUser(userId) {
  if (!userId) return [];
  const prefix = `zannychat.draft.v1.${encodeURIComponent(String(userId))}.`;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const draftKeys = keys.filter((key) => key.startsWith(prefix));
    const drafts = await Promise.all(draftKeys.map(async (key) => {
      let conversationId = '';
      try { conversationId = decodeURIComponent(key.slice(prefix.length)); } catch (_) { return null; }
      const record = parseDraftRecord(await AsyncStorage.getItem(key));
      if (!record.text.trim()) return null;
      return { id: key, key, conversationId, text: record.text, updatedAt: record.updatedAt };
    }));
    return drafts.filter(Boolean).sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    });
  } catch {
    throw new Error('Your drafts could not be read from this device. No drafts were changed. Check device storage and retry.');
  }
}
