import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./ContactDiscoveryScreen.js', import.meta.url), 'utf8');

test('Contact Discovery introduces a Crown Aurora privacy-first welcome', () => {
  assert.match(screen, /CONNECTIONS, ON YOUR TERMS/);
  assert.match(screen, /Your circle starts here\./);
  assert.match(screen, /You choose what gets checked/);
  assert.match(screen, /Selected numbers are processed in memory on the secure backend/);
});

test('Contact Discovery preserves explicit opt-in and selected-number matching', () => {
  assert.match(screen, /Contacts\.requestPermissionsAsync\(\)/);
  assert.match(screen, /Only numbers you select and submit are sent for matching/);
  assert.match(screen, /matchPhoneContacts\(selected\)/);
  assert.match(screen, /MAX_MATCH_PHONE_NUMBERS/);
  assert.match(screen, /setPhones\(''\)/);
});

test('Contact Discovery protects privacy settings and clears sensitive data on blur', () => {
  assert.match(screen, /setPhoneDiscoverability\(!settings\.discoverable\)/);
  assert.match(screen, /setPhones\(''\);/);
  assert.match(screen, /setImportedContacts\(\[\]\);/);
  assert.match(screen, /screenEpoch\.current \+= 1/);
  assert.match(screen, /accessibilityRole="switch"/);
});

test('Contact Discovery keeps accessible review and match controls', () => {
  assert.match(screen, /accessibilityLabel="Import contacts for private review"/);
  assert.match(screen, /accessibilityLabel="Match selected phone numbers"/);
  assert.match(screen, /accessibilityRole="checkbox"/);
  assert.match(screen, /accessibilityRole="alert"/);
});
