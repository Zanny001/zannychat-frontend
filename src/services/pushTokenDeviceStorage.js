export function expoPushTokenStorageKey(userId) {
  if (typeof userId !== 'string' || !userId) throw new TypeError('A user id is required.');
  return `@zannychat/expo_push_token:${userId}`;
}

export async function persistExpoPushToken({ storage, userId, token }) {
  if (!storage || typeof storage.setItem !== 'function') throw new TypeError('Push-token storage is required.');
  if (typeof token !== 'string' || !token) throw new TypeError('A valid Expo push token is required.');
  await storage.setItem(expoPushTokenStorageKey(userId), token);
  return true;
}

export async function readExpoPushToken({ storage, userId }) {
  if (!storage || typeof storage.getItem !== 'function') throw new TypeError('Push-token storage is required.');
  return storage.getItem(expoPushTokenStorageKey(userId));
}

export async function clearExpoPushToken({ storage, userId }) {
  if (!storage || typeof storage.removeItem !== 'function') throw new TypeError('Push-token storage is required.');
  await storage.removeItem(expoPushTokenStorageKey(userId));
  return true;
}
