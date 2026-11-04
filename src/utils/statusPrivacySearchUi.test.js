import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('Status privacy picker exposes accessible contact search and filtered empty state', () => {
  assert.match(screen, /Search status privacy contacts/);
  assert.match(screen, /filterStatusContacts\(privacyContacts, privacySearch\)/);
  assert.match(screen, /No contacts match/);
  assert.match(screen, /accessibilityRole="checkbox"/);
});


test('Status privacy writes lock contact toggles and expose a live summary', () => {
  assert.match(screen, /if \(privacyBusy \|\| privacyLoadError \|\| !contact\?\.id\) return/);
  assert.match(screen, /privacyMode === 'select' \? toggleSelectedAudience\(contact\) : toggleExcluded\(contact\)/);
  assert.match(screen, /accessibilityLiveRegion="polite"/);
  assert.match(screen, /matching contact\(s\).*excluded in total/);
  assert.match(screen, /Retry loading status privacy contacts/);
  assert.match(screen, /privacyBusy \|\| privacyLoadError/);
});
