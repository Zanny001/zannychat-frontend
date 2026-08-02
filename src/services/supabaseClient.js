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
const webStorage = {
  getItem: (key) => Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const authStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

// Expo CLI (`npx expo start`) and EAS Build read EXPO_PUBLIC_ vars from
// .env automatically. Snack does NOT reliably do this — it's a known,
// confirmed limitation (github.com/expo/expo/issues/24180), not
// something wrong with your .env file. So env vars still take
// priority when they ARE available (a real `expo start` or EAS build),
// but fall back to this project's actual public values otherwise —
// safe to hardcode because a Supabase URL + publishable key are
// designed to be public (see the SUPABASE_SERVICE_ROLE_KEY discussion
// in zannychat-backend's README — that one, never this pattern).
const FALLBACK_SUPABASE_URL = 'https://vithpppgyjmazxvogvno.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_l7pVchKAgwv1ydWpkSBfRA_q0CXM195';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const SUPABASE_ENABLED = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = SUPABASE_ENABLED
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
