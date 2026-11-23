import { supabase, SUPABASE_ENABLED } from './supabaseClient';
import { debugLog } from '../utils/diagnostics';
import { createBackendTransport } from './backendTransport';

// Keep environment and platform-specific dependencies at the composition
// boundary. The transport itself is dependency-injected and independently tested.
const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export const BACKEND_ENABLED = Boolean(BACKEND_URL);

const transport = createBackendTransport({
  backendUrl: BACKEND_URL,
  supabase,
  supabaseEnabled: SUPABASE_ENABLED,
  debugLog,
});

export const backendFetch = transport.backendFetch;
export const checkBackendHealth = transport.checkBackendHealth;
