import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('draft storage read failures are surfaced instead of becoming empty drafts', () => {
  const service = read('../services/drafts.js');
  assert.match(service, /throw new Error\('Your saved message draft could not be read/);
  assert.match(service, /throw new Error\('Your drafts could not be read/);
  assert.doesNotMatch(service, /catch \(_\) \{\s*return ''/);
  assert.doesNotMatch(service, /catch \(_\) \{\s*return \[\]/);
});

test('chat composer protects unreadable drafts and exposes load/save retry actions', () => {
  const input = read('../components/InputBar.js');
  assert.match(input, /setDraftLoadError\(error\?\.message/);
  assert.match(input, /editable=\{\(draftReady && !draftLoadError\) \|\| Boolean\(editing\)\}/);
  assert.match(input, /Retry loading saved draft/);
  assert.match(input, /Retry saving draft/);
  assert.match(input, /Your text is still in this chat, but the draft could not be saved/);
});

test('drafts library screen can display storage failures and retry without showing a false empty state', () => {
  const screen = read('./DraftsScreen.js');
  assert.match(screen, /Your drafts could not be loaded/);
  assert.match(screen, /Retry loading drafts/);
});
