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
