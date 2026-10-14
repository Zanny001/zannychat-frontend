const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isContactUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function buildContactQr(userId) {
  if (!isContactUuid(userId)) return null;
  return `zannychat://contact/${userId}`;
}

export function parseContactQr(value) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'zannychat:' || parsed.hostname !== 'contact') return null;
    const id = parsed.pathname.replace(/^\//, '');
    return isContactUuid(id) ? id : null;
  } catch (_) {
    return null;
  }
}
