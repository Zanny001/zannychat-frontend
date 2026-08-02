import { supabase, SUPABASE_ENABLED } from './supabaseClient';

// Same pattern as supabaseClient.js, including the same Snack fallback
// reasoning — a deployed backend's URL isn't secret either.
const FALLBACK_BACKEND_URL = 'https://zannychat-backend.onrender.com';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || FALLBACK_BACKEND_URL;

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

// Hits /health directly — no auth token, since that route doesn't
// require one. Used by the Connections panel in Settings to show real
// status instead of just "a URL is set", and returns null rather than
// throwing so a slow/unreachable backend never breaks the screen that
// calls it.
export async function checkBackendHealth() {
  if (!BACKEND_ENABLED) return null;
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) return { reachable: false };
    const body = await response.json();
    return { reachable: true, ...body };
  } catch (err) {
    return { reachable: false };
  }
}
