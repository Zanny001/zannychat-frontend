const STORAGE_KEY = 'zannychat.pending-auth-route.v1';
const MAX_AGE_MS = 30 * 60 * 1000;
const ALLOWED_PARAMS = {
  QRContact: ['userId'],
  JoinGroup: ['token'],
  LiveStream: ['streamId', 'creatorMode'],
  LiveReplay: ['replayId'],
};

let pendingRoute = null;

export function normalizePendingAuthRoute(route) {
  if (!route || !Object.prototype.hasOwnProperty.call(ALLOWED_PARAMS, route.name)) return null;
  const params = {};
  for (const key of ALLOWED_PARAMS[route.name]) {
    const value = route.params?.[key];
    if (typeof value === 'string' && value.length > 0 && value.length <= 4096) {
      params[key] = key === 'creatorMode' && (value === 'true' || value === 'false') ? value === 'true' : value;
    } else if (typeof value === 'boolean' && key === 'creatorMode') {
      params[key] = value;
    }
  }
  const requiredParam = {
    QRContact: 'userId',
    JoinGroup: 'token',
    LiveStream: 'streamId',
    LiveReplay: 'replayId',
  }[route.name];
  if (!params[requiredParam]) return null;
  return { name: route.name, params, expiresAt: Date.now() + MAX_AGE_MS };
}

export function setPendingAuthRoute(route) {
  const safeRoute = normalizePendingAuthRoute(route);
  if (!safeRoute) return false;
  pendingRoute = safeRoute;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeRoute));
    }
  } catch (_) {
    // In-memory continuation still works for native and same-page web auth.
  }
  return true;
}

export function takePendingAuthRoute() {
  let candidate = pendingRoute;
  pendingRoute = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (!candidate) {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) candidate = JSON.parse(raw);
      }
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (_) {
    // Ignore unavailable or malformed session storage and fail closed.
  }
  if (!candidate || !Number.isFinite(candidate.expiresAt) || candidate.expiresAt < Date.now()) return null;
  const safeRoute = normalizePendingAuthRoute(candidate);
  return safeRoute ? { name: safeRoute.name, params: safeRoute.params } : null;
}

export function clearPendingAuthRoute() {
  pendingRoute = null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}
