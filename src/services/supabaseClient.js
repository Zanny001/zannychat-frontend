import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage's web implementation is IndexedDB-backed, which has a
// known failure mode in sandboxed/iframed contexts like Snack's web
// preview — surfaces as "Failed to execute 'put' on 'IDBObjectStore':
// the transaction is not active" in the console (a transaction
// auto-closing before an awaited write lands, a classic IndexedDB
// gotcha). Plain localStorage doesn't have that lifecycle problem and
// is more than adequate for a session token, so web gets that instead;
// native keeps AsyncStorage, which is the only real option there.
// Browsers can disable localStorage (private mode, embedded/sandboxed views,
// or enterprise policy). Never let a storage SecurityError crash auth startup;
// use a tab-memory fallback for the current runtime when persistence is blocked.
const memoryWebStorage = new Map();
function readLocalStorage(key) {
  try { return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null; }
  catch (_) { return memoryWebStorage.has(key) ? memoryWebStorage.get(key) : null; }
}
function writeLocalStorage(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      memoryWebStorage.delete(key);
      return;
    }
  } catch (_) { /* Fall through to tab-memory storage. */ }
  memoryWebStorage.set(key, value);
}
function removeLocalStorage(key) {
  try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(key); }
  catch (_) { /* The fallback still needs to be cleared. */ }
  memoryWebStorage.delete(key);
}
const webStorage = {
  getItem: async (key) => readLocalStorage(key),
  setItem: async (key, value) => writeLocalStorage(key, value),
  removeItem: async (key) => removeLocalStorage(key),
};

const authStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

// Hosted services are opt-in. With no EXPO_PUBLIC_* configuration the app
// stays in local mock-data mode, so a fresh checkout cannot accidentally
// contact a shared or production project. Snack/preview users should set
// these public client values explicitly when they want a real backend.
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && supabaseAnonKey);

export const supabase = SUPABASE_ENABLED
  ? createClient(SUPABASE_URL, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
