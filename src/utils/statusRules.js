export const STATUS_TEXT_LIMIT = 700;
export const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const STATUS_EXPIRY_OPTIONS_HOURS = Object.freeze([6, 12, 24, 48]);

export function normalizeStatusExpiryHours(value = 24) {
  const hours = Number(value);
  if (!STATUS_EXPIRY_OPTIONS_HOURS.includes(hours)) {
    throw new Error(`Status expiry must be one of: ${STATUS_EXPIRY_OPTIONS_HOURS.join(', ')} hours.`);
  }
  return hours;
}

export function normalizeStatusText(value) {
  return String(value ?? '').trim().slice(0, STATUS_TEXT_LIMIT);
}

export function statusExpiryFrom(createdAt, lifetimeHours = 24) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) throw new Error('Invalid status creation time');
  const hours = normalizeStatusExpiryHours(lifetimeHours);
  return new Date(created.getTime() + hours * 60 * 60 * 1000).toISOString();
}
