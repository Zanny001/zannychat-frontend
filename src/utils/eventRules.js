export function normalizeEvent({ title, description = '', startsAt, location = '' }, now = Date.now()) {
  const cleanTitle = String(title || '').trim();
  const cleanDescription = String(description || '').trim();
  const cleanLocation = String(location || '').trim();
  const start = new Date(startsAt).getTime();
  if (cleanTitle.length < 1 || cleanTitle.length > 160) throw new Error('Event title must be 1–160 characters.');
  if (cleanDescription.length > 1000) throw new Error('Description must be 1,000 characters or fewer.');
  if (cleanLocation.length > 240) throw new Error('Location must be 240 characters or fewer.');
  if (!Number.isFinite(start) || start <= now) throw new Error('Choose a valid future date and time.');
  return { title: cleanTitle, description: cleanDescription, location: cleanLocation, startsAt: new Date(start).toISOString() };
}
