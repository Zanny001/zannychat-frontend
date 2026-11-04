const VERSION = 1;

function createRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : ((random & 0x3) | 0x8)).toString(16);
  });
}

/**
 * Keep a channel post's idempotency key on-device until the server confirms
 * success. This allows a retry after app restart to reuse the same key when a
 * previous request may have reached the server but its response was lost.
 */
export async function getChannelPublishRequest(storage, key, body, makeId = createRequestId) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || !key || typeof body !== 'string' || !body.trim()) {
    throw new Error('Cannot prepare a safe channel publish request.');
  }
  let previous = null;
  try {
    const raw = await storage.getItem(key);
    if (raw) previous = JSON.parse(raw);
  } catch { /* Corrupt or unavailable prior state is replaced with a fresh key. */ }
  if (previous?.version === VERSION && previous.completed !== true && previous.body === body && typeof previous.requestId === 'string' && previous.requestId.length >= 16) {
    return previous.requestId;
  }
  const requestId = makeId();
  await storage.setItem(key, JSON.stringify({ version: VERSION, body, requestId }));
  return requestId;
}

export async function markChannelPublishRequestComplete(storage, key) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || !key) return false;
  try {
    const raw = await storage.getItem(key);
    if (!raw) return false;
    const previous = JSON.parse(raw);
    if (previous?.version !== VERSION || typeof previous.requestId !== 'string') return false;
    await storage.setItem(key, JSON.stringify({ ...previous, completed: true }));
    return true;
  } catch { return false; }
}

export async function clearChannelPublishRequest(storage, key) {
  if (!storage || typeof storage.removeItem !== 'function' || !key) return false;
  await storage.removeItem(key);
  return true;
}
