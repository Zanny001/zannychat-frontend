export const STATUS_TEXT_LIMIT = 700;
export const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function normalizeStatusText(value) {
  return String(value ?? '').trim().slice(0, STATUS_TEXT_LIMIT);
}

export function statusExpiryFrom(createdAt) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) throw new Error('Invalid status creation time');
  return new Date(created.getTime() + STATUS_LIFETIME_MS).toISOString();
}
