export function validatePasswordChange(password, confirmation) {
  if (typeof password !== 'string' || password.length < 8) return 'Use a password with at least 8 characters.';
  if (password.length > 128) return 'Your password must be 128 characters or fewer.';
  if (password !== confirmation) return 'Passwords do not match.';
  return null;
}

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || /\s/.test(email)) return false;
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every((label) => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label));
}

export function validateSignup({ name, email, password, confirmPassword }) {
  if (typeof name !== 'string' || name.trim().length < 2) return 'Enter a name with at least 2 characters.';
  if (name.trim().length > 80) return 'Your name must be 80 characters or fewer.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  if (typeof password !== 'string' || password.length < 8) return 'Use a password with at least 8 characters.';
  if (password.length > 128) return 'Your password must be 128 characters or fewer.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

export function parseRecoveryTokens(callbackUrl) {
  const callback = parseRecoveryCallback(callbackUrl);
  if (!callback || callback.code) return null;
  return { accessToken: callback.accessToken, refreshToken: callback.refreshToken };
}

export function parseRecoveryCallback(callbackUrl) {
  if (typeof callbackUrl !== 'string' || !callbackUrl) return null;
  try {
    const parsed = new URL(callbackUrl);
    const isRecoveryRoute = parsed.protocol === 'zannychat:' &&
      (parsed.hostname === 'reset-password' || parsed.pathname === '/reset-password');
    if (!isRecoveryRoute) return null;
    const query = new URLSearchParams(parsed.search);
    const fragment = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash);
    const get = (key) => query.get(key) || fragment.get(key);
    const code = get('code');
    if (code) return { code };
    const accessToken = get('access_token');
    const refreshToken = get('refresh_token');
    const type = get('type');
    if (!accessToken || !refreshToken || type !== 'recovery') return null;
    return { accessToken, refreshToken };
  } catch (_) {
    return null;
  }
}
