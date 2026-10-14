import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPinnedMessage, upsertPinnedMessage, removePinnedMessage } from '../utils/pinnedMessages';

const keyFor = (userId) => `zannychat.pinnedMessages.v1.${encodeURIComponent(String(userId || 'guest'))}`;

export async function loadPinnedMessages(userId) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.messageId && item.conversationId) : [];
  } catch (_) { return []; }
}

export async function pinMessageLocally(userId, message, conversation) {
  if (!userId) throw new Error('Sign in to pin messages on this device.');
  const item = createPinnedMessage(message, conversation);
  const next = upsertPinnedMessage(await loadPinnedMessages(userId), item);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}

export async function unpinMessageLocally(userId, pinId) {
  const next = removePinnedMessage(await loadPinnedMessages(userId), pinId);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}

export async function clearPinnedMessagesForUser(userId) {
  if (!userId) return false;
  try { await AsyncStorage.removeItem(keyFor(userId)); return true; }
  catch (_) { return false; }
}
