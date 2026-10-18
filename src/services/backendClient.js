import { supabase, SUPABASE_ENABLED } from './supabaseClient';

// Backend access is opt-in. A fresh checkout with no .env stays in mock
// mode and never contacts a shared hosted backend by accident.
const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export const BACKEND_ENABLED = Boolean(BACKEND_URL);

// Calls the backend with the current Supabase session's access token
// attached, so requireAuth on the server can verify who's asking.
export async function backendFetch(path, options = {}) {
  const perfStartedAt = Date.now();
  let sessionMs = 0;
  let status = 'no-response';

  try {
    if (!BACKEND_ENABLED) {
      throw new Error('EXPO_PUBLIC_BACKEND_URL is not set');
    }

    let token;
    if (SUPABASE_ENABLED) {
      const sessionStartedAt = Date.now();
      const { data } = await supabase.auth.getSession();
      sessionMs = Date.now() - sessionStartedAt;
      token = data?.session?.access_token;
    }

    const requestStartedAt = Date.now();
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    status = response.status;

    const body = await response.json().catch(() => ({}));

    console.log('[Perf][backendFetch]', {
      path,
      sessionMs,
      responseAndBodyMs: Date.now() - requestStartedAt,
      totalMs: Date.now() - perfStartedAt,
      status,
    });

    if (!response.ok) {
      throw new Error(body.error || `Request failed with status ${response.status}`);
    }
    return body;
  } catch (error) {
    console.warn('[Perf][backendFetch] failed', {
      path,
      sessionMs,
      totalMs: Date.now() - perfStartedAt,
      status,
    });
    throw error;
  }
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
