export function normalizeUsername(value) {
  return typeof value === 'string'
    ? value.trim().replace(/^@/, '').toLowerCase()
    : '';
}

export function isValidUsername(value) {
  const username = normalizeUsername(value);
  return /^[a-z0-9_]{3,24}$/.test(username);
}
