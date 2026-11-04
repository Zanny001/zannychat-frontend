/**
 * Parse a native OAuth redirect. Only the configured app callback route
 * is accepted; query parameters and URL fragments are both supported.
 */
export function parseGoogleOAuthCallback(callbackUrl) {
  if (typeof callbackUrl !== 'string' || !callbackUrl) return null;

  try {
    const parsed = new URL(callbackUrl);
    if (
      parsed.protocol !== 'zannychat:' ||
      parsed.hostname !== 'auth' ||
      parsed.pathname.replace(/\/+$/, '') !== '/callback'
    ) {
      return null;
    }

    const query = new URLSearchParams(parsed.search);
    const fragment = new URLSearchParams(
      parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
    );
    const get = (key) => query.get(key) || fragment.get(key);

    const error = get('error_description') || get('error');
    if (error) return { error };

    const code = get('code');
    return code ? { code } : null;
  } catch (_) {
    return null;
  }
}
