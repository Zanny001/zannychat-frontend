import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = {
  direct: readFileSync(new URL('./CallScreen.js', import.meta.url), 'utf8'),
  incoming: readFileSync(new URL('./IncomingCallScreen.js', import.meta.url), 'utf8'),
  outgoing: readFileSync(new URL('./OutgoingCallScreen.js', import.meta.url), 'utf8'),
  history: readFileSync(new URL('./CallHistoryScreen.js', import.meta.url), 'utf8'),
  group: readFileSync(new URL('./GroupCallScreen.js', import.meta.url), 'utf8'),
};

test('direct, incoming and outgoing call identity/control surfaces use shared moderate widths', () => {
  for (const name of ['direct', 'incoming', 'outgoing']) {
    assert.match(files[name], /layout\.formMaxWidth/, name + ' must use the form measure');
    assert.match(files[name], /maxWidth: layout\.formMaxWidth/, name + ' must cap identity content');
  }
  assert.match(files.direct, /maxWidth: layout\.contentMaxWidth/, 'direct call control dock must be bounded');
});

test('call history uses the shared content width', () => {
  assert.match(files.history, /maxWidth: layout\.contentMaxWidth/);
  assert.match(files.history, /alignSelf: 'center'/);
});

test('group video stage and control dock use separate media and content measures', () => {
  const tokens = readFileSync(new URL('../theme/colors.js', import.meta.url), 'utf8');
  assert.match(tokens, /mediaStageMaxWidth: 1280/);
  assert.match(files.group, /maxWidth: layout\.mediaStageMaxWidth/);
  assert.match(files.group, /maxWidth: layout\.contentMaxWidth/);
});
