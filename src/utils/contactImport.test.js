import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewableContacts, MAX_REVIEWABLE_CONTACT_NUMBERS, MAX_MATCH_PHONE_NUMBERS, normalizeE164, normalizeSelectedPhoneInput, selectedPhoneNumbers } from './contactImport.js';

test('normalizes only explicitly international E.164 phone values without guessing region', () => {
  assert.equal(normalizeE164('+234 801-234-5678'), '+2348012345678');
  assert.equal(normalizeE164('08012345678'), null);
  assert.equal(normalizeE164('+123'), null);
  assert.equal(normalizeE164('+1234567890123456'), null);
});

test('deduplicates imported phone numbers and keeps selection opt-in', () => {
  const rows = buildReviewableContacts([
    { firstName: 'Ada', phoneNumbers: [{ number: '+234 801 234 5678' }, { number: '08012345678' }] },
    { name: 'Ada Duplicate', phoneNumbers: [{ number: '+2348012345678' }, { number: '+14155552671' }] },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].selected, false);
  assert.deepEqual(selectedPhoneNumbers(rows), []);
  rows[1].selected = true;
  assert.deepEqual(selectedPhoneNumbers(rows), ['+14155552671']);
});

test('selected list is unique and capped at 100', () => {
  const rows = Array.from({ length: 120 }, (_, i) => ({ phone: `+234800000${String(i).padStart(4, '0')}`, selected: true }));
  assert.equal(selectedPhoneNumbers(rows).length, 100);
});


test('manual phone input is normalized, deduplicated, and invalid numbers are reported separately', () => {
  const result = normalizeSelectedPhoneInput('+234 801-234-5678\n08012345678, +14155552671; +14155552671');
  assert.deepEqual(result.valid, ['+2348012345678', '+14155552671']);
  assert.deepEqual(result.invalid, ['08012345678']);
});

test('manual phone input never guesses a country or accepts overlong values', () => {
  const result = normalizeSelectedPhoneInput('08012345678\n+123\n+1234567890123456');
  assert.deepEqual(result.valid, []);
  assert.equal(result.invalid.length, 3);
});


test('caps contact review rows to a predictable in-memory bound', () => {
  const contacts = Array.from({ length: MAX_REVIEWABLE_CONTACT_NUMBERS + 50 }, (_, i) => ({
    name: `Contact ${i}`,
    phoneNumbers: [{ number: `+234${String(8000000000 + i).slice(-10)}` }],
  }));
  assert.equal(buildReviewableContacts(contacts).length, MAX_REVIEWABLE_CONTACT_NUMBERS);
});

test('caps selected phone numbers to the documented request batch size', () => {
  const rows = Array.from({ length: MAX_MATCH_PHONE_NUMBERS + 25 }, (_, i) => ({
    phone: `+234${String(8000000000 + i).slice(-10)}`,
    selected: true,
  }));
  assert.equal(selectedPhoneNumbers(rows).length, MAX_MATCH_PHONE_NUMBERS);
});
