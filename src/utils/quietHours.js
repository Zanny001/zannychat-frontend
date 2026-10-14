/** Local-clock quiet-hours helpers for foreground notification presentation. */
export function parseClockTime(value) {
  if (typeof value !== 'string') return null;
  const match = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isWithinQuietHours(date = new Date(), start = '22:00', end = '08:00') {
  const startMinutes = parseClockTime(start);
  const endMinutes = parseClockTime(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) return false;
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  // Overnight ranges (for example 22:00–08:00) wrap across midnight.
  if (startMinutes > endMinutes) return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

export function shouldQuietForegroundNotification(date, prefs = {}) {
  return Boolean(prefs.quietHoursEnabled) && isWithinQuietHours(date, prefs.quietHoursStart, prefs.quietHoursEnd);
}
