import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('Events form fields, publish, retry and RSVP controls use moderate 48-point sizing', () => {
  const source = read('EventsScreen.js');
  assert.match(source, /minHeight: 48, width: '100%'/);
  assert.match(source, /minHeight: 48, borderRadius: radii\.md/);
  assert.match(source, /Retry loading events" style=\{\{ minHeight: 48/);
  assert.match(source, /borderRadius: radii\.md, minHeight: 48, paddingVertical/);
});

test('Poll form, multi-select, option rows, voting and pagination controls use 48-point sizing', () => {
  const source = read('PollsScreen.js');
  assert.match(source, /minHeight: 48, padding: spacing\.md/);
  assert.match(source, /minHeight: 48, flexDirection: 'row'/);
  assert.match(source, /minHeight: 48, borderRadius: radii\.md/);
  assert.match(source, /minHeight: 48, borderWidth: 1, borderColor: selected/);
  assert.match(source, /minHeight: 48, marginVertical: spacing\.md/);
});
