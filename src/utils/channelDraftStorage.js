import { CHANNEL_POST_DRAFT_PREFIX } from './channelDrafts.js';

// Serialize draft writes and clears per key so a slow autosave cannot resurrect
// a draft after a successful publish has requested its removal.
const pendingOperations = new Map();

function enqueue(key, operation) {
  if (typeof key !== 'string' || !key) return Promise.resolve(false);
  const previous = pendingOperations.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  pendingOperations.set(key, next);
  return next.finally(() => {
    if (pendingOperations.get(key) === next) pendingOperations.delete(key);
  });
}

export function saveChannelPostDraft(storage, key, value) {
  if (!storage || typeof storage.setItem !== 'function' || typeof value !== 'string') return Promise.resolve(false);
  return enqueue(key, async () => {
    await storage.setItem(key, value);
    return true;
  });
}

export function clearChannelPostDraft(storage, key) {
  if (!storage || typeof storage.removeItem !== 'function') return Promise.resolve(false);
  return enqueue(key, async () => {
    await storage.removeItem(key);
    return true;
  });
}


export async function clearChannelPostDraftsForUser(storage, userId) {
  const user = typeof userId === 'string' ? userId.trim() : '';
  if (!storage || !user || typeof storage.getAllKeys !== 'function' || typeof storage.multiRemove !== 'function') return false;
  const prefix = `${CHANNEL_POST_DRAFT_PREFIX}${user}/`;
  try {
    const keys = await storage.getAllKeys();
    const matches = keys.filter((key) => key.startsWith(prefix));
    if (matches.length) await storage.multiRemove(matches);
    if (typeof storage.removeItem === 'function') await storage.removeItem(`zannychat:recent-channels:${user}`);
    return true;
  } catch (_) { return false; }
}
