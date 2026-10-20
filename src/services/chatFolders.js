import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (userId) => `zannychat.chatFolders.v1.${encodeURIComponent(String(userId || 'guest'))}`;
const RULES = new Set(['unread', 'favorites', 'groups', 'private']);

export function normalizeChatFolder(folder) {
  if (!folder || typeof folder !== 'object') return null;
  const name = String(folder.name || '').trim().slice(0, 32);
  const rules = Array.isArray(folder.rules) ? [...new Set(folder.rules.filter((rule) => RULES.has(rule)))] : [];
  const excluded = Array.isArray(folder.excluded) ? [...new Set(folder.excluded.filter((rule) => ['muted', 'archived', 'read'].includes(rule)))] : [];
  if (!name || !folder.id) return null;
  return { id: String(folder.id), name, rules, excluded, createdAt: folder.createdAt || null };
}

export async function loadChatFolders(userId) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeChatFolder).filter(Boolean) : [];
  } catch (_) { return []; }
}

export async function saveChatFolder(userId, folder) {
  if (!userId) throw new Error('Sign in to create a chat folder.');
  const normalized = normalizeChatFolder(folder);
  if (!normalized) throw new Error('Enter a folder name.');
  const folders = await loadChatFolders(userId);
  const duplicate = folders.some((item) => item.id !== normalized.id && item.name.toLocaleLowerCase() === normalized.name.toLocaleLowerCase());
  if (duplicate) throw new Error('A folder with that name already exists.');
  const next = folders.some((item) => item.id === normalized.id)
    ? folders.map((item) => item.id === normalized.id ? normalized : item)
    : [...folders, normalized];
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}

export async function deleteChatFolder(userId, folderId) {
  const next = (await loadChatFolders(userId)).filter((item) => item.id !== folderId);
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}

export async function clearChatFoldersForUser(userId) {
  if (!userId) return false;
  try { await AsyncStorage.removeItem(keyFor(userId)); return true; } catch (_) { return false; }
}
