// Serialize asynchronous read-modify-write operations for each storage key.
// A rejected operation does not poison the queue for later operations.
const queues = new Map();

export function serializeByKey(key, operation) {
  if (!key || typeof operation !== 'function') return Promise.reject(new TypeError('A key and operation are required.'));
  const previous = queues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  queues.set(key, current);
  return current.finally(() => {
    if (queues.get(key) === current) queues.delete(key);
  });
}
