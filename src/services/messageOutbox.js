import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (userId, conversationId) => `zannychat:outbox:v1:${userId || 'guest'}:${conversationId}`;

export async function savePendingMessage(userId, conversationId, message) {
  if (!conversationId || !message?.requestId || !String(message.text || '').trim()) return false;
  const key = keyFor(userId, conversationId);
  try {
    const current = await AsyncStorage.getItem(key);
    const queue = current ? JSON.parse(current) : [];
    const next = Array.isArray(queue) ? queue.filter((item) => item.requestId !== message.requestId) : [];
    next.push({ requestId: message.requestId, text: String(message.text).trim(), replyToId: message.replyToId || null, createdAt: message.createdAt || new Date().toISOString(), attempts: Number.isInteger(message.attempts) ? Math.max(0, Math.min(100, message.attempts)) : 0, lastAttemptAt: message.lastAttemptAt || null, lastError: message.lastError ? String(message.lastError).slice(0, 240) : null });
    await AsyncStorage.setItem(key, JSON.stringify(next.slice(-50)));
    return true;
  } catch (_) { return false; }
}

export async function loadPendingMessages(userId, conversationId) {
  if (!conversationId) return [];
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId, conversationId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.requestId && typeof item.text === 'string') : [];
  } catch (_) { return []; }
}

export async function removePendingMessage(userId, conversationId, requestId) {
  if (!conversationId || !requestId) return false;
  const key = keyFor(userId, conversationId);
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    const next = (Array.isArray(parsed) ? parsed : []).filter((item) => item.requestId !== requestId);
    if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
    else await AsyncStorage.removeItem(key);
    return true;
  } catch (_) { return false; }
}


export async function recordMessageRetryFailure(userId, conversationId, requestId, error) {
  if (!conversationId || !requestId) return false;
  const key = keyFor(userId, conversationId);
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    let found = false;
    const next = (Array.isArray(parsed) ? parsed : []).map((item) => {
      if (item.requestId !== requestId) return item;
      found = true;
      return { ...item, attempts: Math.min(100, (Number.isInteger(item.attempts) ? item.attempts : 0) + 1), lastAttemptAt: new Date().toISOString(), lastError: String(error?.message || error || 'Send failed').slice(0, 240) };
    });
    if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
    return found;
  } catch (_) { return false; }
}

export function isMessageRetryDue(message, now = Date.now()) {
  const attempts = Number.isInteger(message?.attempts) ? Math.max(0, message.attempts) : 0;
  if (attempts >= 100) return false;
  if (!message?.lastAttemptAt) return true;
  const lastAttempt = Date.parse(message.lastAttemptAt);
  if (!Number.isFinite(lastAttempt)) return true;
  const delayMs = Math.min(5 * 60 * 1000, 5000 * (2 ** Math.min(attempts, 6)));
  return now - lastAttempt >= delayMs;
}
