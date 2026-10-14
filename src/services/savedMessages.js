import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeSavedMessage } from '../utils/savedMessages';

const keyFor = (userId) => `zannychat.savedMessages.v1.${String(userId || 'guest')}`;

export async function loadSavedMessages(userId) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id && item.conversationId && item.messageId) : [];
  } catch (_) { return []; }
}

export async function saveMessageLocally(userId, message, conversation) {
  if (!userId) throw new Error('Sign in to save messages on this device.');
  const item = makeSavedMessage(message, conversation);
  const existing = await loadSavedMessages(userId);
  const next = [item, ...existing.filter((saved) => saved.id !== item.id)].slice(0, 500);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}

export async function removeSavedMessage(userId, savedId) {
  const next = (await loadSavedMessages(userId)).filter((item) => item.id !== savedId);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}
