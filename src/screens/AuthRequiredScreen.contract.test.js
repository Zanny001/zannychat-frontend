import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync(new URL('./AuthRequiredScreen.js', import.meta.url), 'utf8');

test('protected-link gate has contextual Crown Aurora identity for contact, group and LIVE links', () => {
  for (const route of ['QRContact', 'JoinGroup', 'LiveStream', 'LiveReplay']) {
    assert.match(screen, new RegExp(route + ':'));
  }
  assert.match(screen, /YOUR LINK, READY WHEN YOU ARE/);
  assert.match(screen, /iconTile/);
  assert.match(screen, /GlassCard intensity=\{22\}/);
  assert.match(screen, /Your destination is protected/);
});

test('protected-link gate preserves secure pending-route validation before authentication', () => {
  assert.match(screen, /normalizePendingAuthRoute\(returnRoute\)/);
  assert.match(screen, /if \(!setPendingAuthRoute\(returnRoute\)\) return/);
  assert.match(screen, /navigation\.navigate\(screen\)/);
  assert.match(screen, /This link needs a refresh\./);
  assert.match(screen, /Nothing has been opened yet/);
});

test('protected-link actions remain accessible and comfortably touchable', () => {
  assert.match(screen, /accessibilityLabel="Sign in to continue to this link"/);
  assert.match(screen, /accessibilityLabel="Create an account to continue to this link"/);
  assert.match(screen, /primaryButton: \{ minHeight: 54/);
  assert.match(screen, /secondaryButton: \{ minHeight: 54/);
});
