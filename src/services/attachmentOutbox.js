import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeByKey } from '../utils/serializeByKey';
import { getAttachmentNextRetryAt } from '../utils/attachmentRetryPolicy';

const MAX_PENDING_ATTACHMENTS = 20;
const keyFor = (userId, conversationId) => `zannychat:attachment-outbox:v1:${userId || 'guest'}:${conversationId}`;

export async function loadPendingAttachments(userId, conversationId) {
  if (!conversationId) return [];
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId, conversationId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.uri && ['image', 'file', 'voice'].includes(item.kind)) : [];
  } catch (_) { return []; }
}

export async function savePendingAttachment(userId, conversationId, attachment) {
  if (!conversationId || !attachment?.uri || !['image', 'file', 'voice'].includes(attachment.kind)) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const current = await loadPendingAttachments(userId, conversationId);
      const next = current.filter((item) => item.id !== attachment.id);
      next.push({ ...attachment, createdAt: attachment.createdAt || new Date().toISOString() });
      await AsyncStorage.setItem(key, JSON.stringify(next.slice(-MAX_PENDING_ATTACHMENTS)));
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
      const next = current.map((item) => item.id === id ? {
        ...item,
        attempts: Math.min(100, (Number.isInteger(item.attempts) ? item.attempts : 0) + 1),
        lastAttemptAt: new Date().toISOString(),
        nextRetryAt: getAttachmentNextRetryAt(Math.min(100, (Number.isInteger(item.attempts) ? item.attempts : 0) + 1)),
        lastError: String(error?.message || error || 'Upload failed').slice(0, 240),
      } : item);
      await AsyncStorage.setItem(key, JSON.stringify(next));
      return next.some((item) => item.id === id);
    } catch (_) { return false; }
  });
}

export async function removePendingAttachment(userId, conversationId, id) {
  if (!conversationId || !id) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const next = (await loadPendingAttachments(userId, conversationId)).filter((item) => item.id !== id);
      if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
      else await AsyncStorage.removeItem(key);
      return true;
    } catch (_) { return false; }
  });
}
