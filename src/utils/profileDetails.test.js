import test from 'node:test';
import assert from 'node:assert/strict';
import { getProfileDetails } from './profileDetails.js';

test('profile details include only explicitly supplied non-empty values', () => {
  assert.deepEqual(getProfileDetails({ pronouns: ' they/them ', location: '', birthday: null }), [
    { key: 'pronouns', label: 'Pronouns', icon: 'person-outline', value: 'they/them' },
  ]);
});

test('profile details support backend aliases and string arrays', () => {
  const details = getProfileDetails({ city_name: 'Lagos', company: 'Studio', languages: ['English', 'Yoruba', '', 4] });
  assert.deepEqual(details.map(({ key, value }) => ({ key, value })), [
    { key: 'location', value: 'Lagos' },
    { key: 'work', value: 'Studio' },
    { key: 'languages', value: 'English, Yoruba' },
  ]);
});

test('profile details ignore objects and do not invent missing details', () => {
  assert.deepEqual(getProfileDetails({ location: { city: 'Lagos' }, website: 123 }), []);
});


test('website details normalize bare domains and preserve only safe web URLs', () => {
  assert.equal(getProfileDetails({ website: 'example.com' }).find((item) => item.key === 'website').value, 'https://example.com/');
  assert.equal(getProfileDetails({ website: 'https://example.com/profile' }).find((item) => item.key === 'website').value, 'https://example.com/profile');
  assert.deepEqual(getProfileDetails({ website: 'javascript:alert(1)' }), []);
  assert.deepEqual(getProfileDetails({ website: 'https://user:pass@example.com' }), []);
  assert.deepEqual(getProfileDetails({ website: 'file:///etc/passwd' }), []);
});

test('profile detail strings are length-limited before display', () => {
  const value = 'x'.repeat(500);
  assert.equal(getProfileDetails({ work: value })[0].value.length, 160);
});


test('profile details collapse control characters and confusing whitespace', () => {
  assert.equal(getProfileDetails({ work: '  Studio\n\tNorth\u0000  ' })[0].value, 'Studio North');
});

test('profile language arrays are bounded and each item is normalized', () => {
  const languages = Array.from({ length: 20 }, (_, index) => ` Language ${index}\n`);
  const value = getProfileDetails({ languages })[0].value;
  assert.equal(value.length <= 160, true);
  assert.equal(value.includes('\n'), false);
  assert.equal(value.includes('Language 19'), false);
});

test('website URLs containing control characters are rejected or normalized safely', () => {
  const details = getProfileDetails({ website: 'https://example.com\n/path' });
  assert.equal(details[0]?.value.includes('\n') ?? false, false);
});
