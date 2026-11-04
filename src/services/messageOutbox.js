import AsyncStorage from '@react-native-async-storage/async-storage';
import { serializeByKey } from '../utils/serializeByKey';
import { MAX_PENDING_MESSAGES, normalizePendingMessages } from '../utils/normalizePendingMessages';
import { getMessageOutboxStorageKey } from '../utils/messageOutboxKeys';
import { getSafeRetryError, normalizeSafeRetryError } from '../utils/safeRetryError';

const keyFor = getMessageOutboxStorageKey;

export async function savePendingMessage(userId, conversationId, message) {
  if (!conversationId || !message?.requestId || !String(message.text || '').trim()) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const current = await AsyncStorage.getItem(key);
      const queue = normalizePendingMessages(current ? JSON.parse(current) : []);
      const alreadyQueued = queue.some((item) => item.requestId === message.requestId);
      const next = queue.filter((item) => item.requestId !== message.requestId);
      // Never report a successful save if the bounded queue cannot retain this new message.
      if (!alreadyQueued && next.length >= MAX_PENDING_MESSAGES) return false;
      next.push({ requestId: message.requestId, text: String(message.text).trim(), replyToId: message.replyToId || null, createdAt: message.createdAt || new Date().toISOString(), attempts: Number.isInteger(message.attempts) ? Math.max(0, Math.min(100, message.attempts)) : 0, lastAttemptAt: message.lastAttemptAt || null, lastError: normalizeSafeRetryError(message.lastError, 'message') });
      await AsyncStorage.setItem(key, JSON.stringify(normalizePendingMessages(next)));
      return true;
    } catch (_) { return false; }
  });
}

export async function loadPendingMessages(userId, conversationId) {
  if (!conversationId) return [];
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId, conversationId));
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizePendingMessages(parsed);
  } catch (_) { return []; }
}

export async function removePendingMessage(userId, conversationId, requestId) {
  if (!conversationId || !requestId) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      // Normalize legacy/corrupt storage on every mutation, not only on load.
      const next = normalizePendingMessages(parsed).filter((item) => item.requestId !== requestId);
      if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
      else await AsyncStorage.removeItem(key);
      return true;
    } catch (_) { return false; }
  });
}

export async function recordMessageRetryFailure(userId, conversationId, requestId, error) {
  if (!conversationId || !requestId) return false;
  const key = keyFor(userId, conversationId);
  return serializeByKey(key, async () => {
    try {
      const raw = await AsyncStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      // Retry diagnostics must never re-persist malformed or duplicate records.
      const normalized = normalizePendingMessages(parsed);
      let found = false;
      const next = normalized.map((item) => {
        if (item.requestId !== requestId) return item;
        found = true;
        return { ...item, attempts: Math.min(100, (Number.isInteger(item.attempts) ? item.attempts : 0) + 1), lastAttemptAt: new Date().toISOString(), lastError: getSafeRetryError(error, 'message') };
      });
      const safeNext = normalizePendingMessages(next);
      if (safeNext.length) await AsyncStorage.setItem(key, JSON.stringify(safeNext));
      else await AsyncStorage.removeItem(key);
      return found;
    } catch (_) { return false; }
  });
}

export function isMessageRetryDue(message, now = Date.now()) {
  const attempts = Number.isInteger(message?.attempts) ? Math.max(0, message.attempts) : 0;
  if (attempts >= 100) return false;
  if (!message?.lastAttemptAt) return true;
  const lastAttempt = Date.parse(message.lastAttemptAt);
  if (!Number.isFinite(lastAttempt)) return true;
  // Device clock changes can leave a queued message with a timestamp far in
  // the future. Treat that timestamp as stale instead of blocking retries
  // until the device clock catches up; a successful failure record will then
  // replace it with the current clock time and restore normal backoff.
  if (lastAttempt > now) return true;
  const delayMs = Math.min(5 * 60 * 1000, 5000 * (2 ** Math.min(attempts, 6)));
  return now - lastAttempt >= delayMs;
}
