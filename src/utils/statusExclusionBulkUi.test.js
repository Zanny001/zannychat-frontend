import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('../screens/StatusUpdatesScreen.js', import.meta.url), 'utf8');

test('Status privacy provides bulk exclude and allow actions for filtered contacts', () => {
  assert.match(screen, /Exclude all matching contacts/);
  assert.match(screen, /Allow all matching contacts/);
  assert.match(screen, /applyBulkExclusions\(true\)/);
  assert.match(screen, /applyBulkExclusions\(false\)/);
  assert.match(screen, /planStatusExclusionChanges\(visibleContacts, excludedUsers, shouldExclude\)/);
});

test('bulk privacy changes report partial failure rather than claiming all succeeded', () => {
  assert.match(screen, /Partially updated/);
  assert.match(screen, /of \$\{changes\.length\} changes succeeded/);
});
