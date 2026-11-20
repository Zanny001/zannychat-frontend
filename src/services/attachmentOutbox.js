import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeByKey } from '../utils/serializeByKey';
import { getAttachmentNextRetryAt } from '../utils/attachmentRetryPolicy';
import { getAttachmentOutboxStorageKey, getAttachmentOutboxStoragePrefix } from '../utils/attachmentOutboxKeys';
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
    if (!Array.isArray(parsed)) throw new Error('Saved attachment queue has an unexpected format.');
    return normalizePendingAttachments(parsed);
  } catch (error) {
    throw new Error('Your pending attachment uploads could not be read from this device. No queued uploads were changed. Check device storage and retry.');
  }
}

export async function savePendingAttachment(userId, conversationId, attachment) {
  if (!conversationId || typeof attachment?.id !== 'string' || !attachment.id.trim() || !attachment.uri || !['image', 'video', 'file', 'voice'].includes(attachment.kind)) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const current = await loadPendingAttachments(userId, conversationId);
      const next = normalizePendingAttachments([...current.filter((item) => item.id !== attachment.id), { ...attachment, createdAt: attachment.createdAt || new Date().toISOString() }]);
      try { await AsyncStorage.setItem(key, JSON.stringify(next)); return true; }
      catch (_) { return false; }
    } catch (error) { throw error; }
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


/** Remove all queued attachment metadata for one account after account deletion. */
export async function clearPendingAttachmentsForUser(userId) {
  if (!userId) return false;
  const prefix = getAttachmentOutboxStoragePrefix(userId);
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    await Promise.all(keys.map((key) => serializeByKey(key, async () => {
      await AsyncStorage.removeItem(key);
      return true;
    })));
    return true;
  } catch (_) { return false; }
}
