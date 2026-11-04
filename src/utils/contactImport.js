// Privacy-first native contact import helpers. Raw contacts stay in memory and are never persisted.
export const MAX_REVIEWABLE_CONTACT_NUMBERS = 1000;
export const MAX_MATCH_PHONE_NUMBERS = 100;
export function normalizeE164(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('+')) return null;
  const digits = trimmed.slice(1).replace(/[ .()\-]/g, '');
  if (!/^\d{8,15}$/.test(digits) || digits.startsWith('0')) return null;
  return `+${digits}`;
}

export function buildReviewableContacts(nativeContacts) {
  const rows = [];
  const seen = new Set();
  for (const contact of Array.isArray(nativeContacts) ? nativeContacts : []) {
    if (rows.length >= MAX_REVIEWABLE_CONTACT_NUMBERS) break;
    const name = [contact?.firstName, contact?.middleName, contact?.lastName].filter((part) => typeof part === 'string' && part.trim()).join(' ').trim() || contact?.name || 'Unnamed contact';
    for (const phone of Array.isArray(contact?.phoneNumbers) ? contact.phoneNumbers : []) {
      const e164 = normalizeE164(phone?.number);
      if (!e164 || seen.has(e164)) continue;
      if (rows.length >= MAX_REVIEWABLE_CONTACT_NUMBERS) break;
      seen.add(e164);
      rows.push({ id: e164, name, phone: e164, selected: false });
    }
  }
  return rows;
}

export function selectedPhoneNumbers(rows) {
  return [...new Set((Array.isArray(rows) ? rows : []).filter((row) => row?.selected).map((row) => normalizeE164(row.phone)).filter(Boolean))].slice(0, 100);
}


// Normalize manually entered numbers using the same strict rule as imported contacts.
// Invalid values are returned separately so the UI can explain skipped entries.
export function normalizeSelectedPhoneInput(value) {
  const entries = typeof value === 'string' ? value.split(/[\n,;]+/).map((entry) => entry.trim()).filter(Boolean) : [];
  const valid = [];
  const invalid = [];
  const seen = new Set();
  for (const entry of entries) {
    const normalized = normalizeE164(entry);
    if (!normalized) { invalid.push(entry); continue; }
    if (!seen.has(normalized)) { seen.add(normalized); valid.push(normalized); }
  }
  return { valid, invalid };
}
