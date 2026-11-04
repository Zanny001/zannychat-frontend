import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeByKey } from '../utils/serializeByKey';
import { getAttachmentNextRetryAt } from '../utils/attachmentRetryPolicy';
import { getAttachmentOutboxStorageKey } from '../utils/attachmentOutboxKeys';
import { normalizePendingAttachments } from '../utils/normalizePendingAttachments';
import { getSafeRetryError } from '../utils/safeRetryError';

const keyFor = getAttachmentOutboxStorageKey;

export async function loadPendingAttachments(userId, conversationId) {
  if (!conversationId) return [];
  try {
    const key = keyFor(userId, conversationId);
    if (!key) return [];
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizePendingAttachments(parsed);
  } catch (_) { return []; }
}

export async function savePendingAttachment(userId, conversationId, attachment) {
  if (!conversationId || typeof attachment?.id !== 'string' || !attachment.id.trim() || !attachment.uri || !['image', 'video', 'file', 'voice'].includes(attachment.kind)) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const current = await loadPendingAttachments(userId, conversationId);
      const next = normalizePendingAttachments([...current.filter((item) => item.id !== attachment.id), { ...attachment, createdAt: attachment.createdAt || new Date().toISOString() }]);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      return true;
    } catch (_) { return false; }
  });
}

export async function recordAttachmentRetryFailure(userId, conversationId, id, error) {
  if (!conversationId || !id) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const current = await loadPendingAttachments(userId, conversationId);
      let found = false;
      const next = normalizePendingAttachments(current.map((item) => item.id === id ? (found = true, {
        ...item,
        attempts: Math.min(100, (Number.isInteger(item.attempts) ? item.attempts : 0) + 1),
        lastAttemptAt: new Date().toISOString(),
        nextRetryAt: getAttachmentNextRetryAt(Math.min(100, (Number.isInteger(item.attempts) ? item.attempts : 0) + 1)),
        lastError: getSafeRetryError(error, 'attachment'),
      }) : item));
      if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
      else await AsyncStorage.removeItem(key);
      return found;
    } catch (_) { return false; }
  });
}

export async function removePendingAttachment(userId, conversationId, id) {
  if (!conversationId || !id) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const next = normalizePendingAttachments(await loadPendingAttachments(userId, conversationId)).filter((item) => item.id !== id);
      if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
      else await AsyncStorage.removeItem(key);
      return true;
    } catch (_) { return false; }
  });
}
