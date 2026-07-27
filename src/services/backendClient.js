import { supabase, SUPABASE_ENABLED } from './supabaseClient';

// Same pattern as supabaseClient.js: read an EXPO_PUBLIC_ env var, and
// let everything downstream check a boolean instead of the URL itself.
// Set EXPO_PUBLIC_BACKEND_URL once the backend is deployed on Render
// (or running locally, e.g. http://localhost:3000 in dev).
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const BACKEND_ENABLED = Boolean(BACKEND_URL);

// Calls the backend with the current Supabase session's access token
// attached, so requireAuth on the server can verify who's asking.
export async function backendFetch(path, options = {}) {
  if (!BACKEND_ENABLED) {
    throw new Error('EXPO_PUBLIC_BACKEND_URL is not set');
  }

  let token;
  if (SUPABASE_ENABLED) {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }
  return body;
}
