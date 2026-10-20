export const CHANNEL_TITLE_LIMIT = 60;
export const CHANNEL_DESCRIPTION_LIMIT = 500;
export const CHANNEL_POST_LIMIT = 4000;

export function normalizeChannelTitle(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, CHANNEL_TITLE_LIMIT) : '';
}

export function validateChannel({ title, description = '' }) {
  const normalizedTitle = normalizeChannelTitle(title);
  if (normalizedTitle.length < 2) return { ok: false, error: 'Channel name must be 2–60 characters' };
  if (typeof description !== 'string' || description.trim().length > CHANNEL_DESCRIPTION_LIMIT) return { ok: false, error: 'Description must be 500 characters or fewer' };
  return { ok: true, title: normalizedTitle, description: description.trim() };
}

export function normalizeChannelPost(value) {
  return typeof value === 'string' ? value.trim().slice(0, CHANNEL_POST_LIMIT) : '';
}
