import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = (name) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');

test('incoming and outgoing call screens use the active premium typography scale', () => {
  for (const name of ['IncomingCallScreen.js', 'OutgoingCallScreen.js']) {
    const source = screen(name);
    assert.match(source, /const \{ colors, typography, resolvedMode \} = useTheme\(\)/, name);
    assert.match(source, /typography\.display/, `${name} participant name`);
    assert.match(source, /typography\.heading/, `${name} brand title`);
    assert.match(source, /typography\.body/, `${name} call description`);
    assert.match(source, /typography\.small/, `${name} status and helper text`);
  }
});

test('incoming and outgoing call screens use semantic theme colours, not a fixed dark palette', () => {
  for (const name of ['IncomingCallScreen.js', 'OutgoingCallScreen.js']) {
    const source = screen(name);
    assert.match(source, /backgroundColor: colors\.background/);
    assert.match(source, /color: colors\.textPrimary/);
    assert.match(source, /color: colors\.textSecondary/);
    assert.match(source, /backgroundColor: colors\.primary/);
    assert.match(source, /backgroundColor: colors\.danger/);
    assert.doesNotMatch(source, /#[0-9A-Fa-f]{3,8}/, `${name} should not embed fixed palette colours`);
  }
});

test('incoming call actions retain accessible labels and a generous touch target', () => {
  const source = screen('IncomingCallScreen.js');
  assert.match(source, /accessibilityLabel="Decline call"/);
  assert.match(source, /accessibilityLabel="Answer call"/);
  assert.match(source, /width: 84, height: 84/);
});

test('outgoing call cancellation remains an accessible, generously sized action', () => {
  const source = screen('OutgoingCallScreen.js');
  assert.match(source, /accessibilityLabel="Cancel outgoing call"/);
  assert.match(source, /width: 72, height: 72/);
});
