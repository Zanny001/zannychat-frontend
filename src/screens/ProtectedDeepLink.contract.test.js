import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const navigatorSource = readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const gateSource = readFileSync(new URL('./AuthRequiredScreen.js', import.meta.url), 'utf8');

test('shared contact, group, LIVE and replay links remain routable before sign-in', () => {
  for (const route of ['QRContact', 'JoinGroup', 'LiveStream', 'LiveReplay']) {
    assert.match(navigatorSource, new RegExp(`RootStack\\.Screen name="${route}" component=\\{AuthRequiredScreen\\}`));
  }
  assert.match(navigatorSource, /LiveStream: 'LiveStream'/);
  assert.match(navigatorSource, /LiveReplay: 'LiveReplay'/);
});

test('authentication restores the pending protected route after Main is mounted', () => {
  assert.match(navigatorSource, /takePendingAuthRoute\(\)/);
  assert.match(navigatorSource, /const routes = \[\{ name: 'Main' \}, pendingRoute\]/);
  assert.match(gateSource, /setPendingAuthRoute\(returnRoute\)/);
  assert.match(gateSource, /navigation\.navigate\(screen\)/);
});

test('protected-link handoff uses a Crown Aurora context icon and a clear secure-link explanation', () => {
  assert.match(gateSource, /ZANNYCHAT · SECURE LINK/);
  assert.match(gateSource, /GlassCard glow intensity=\{22\}/);
  assert.match(gateSource, /const linkIcon = \(\{ QRContact:/);
  assert.match(gateSource, /Your link is only used to resume the requested action after authentication\./);
  assert.match(gateSource, /accessibilityLabel="Sign in to continue to this link"/);
  assert.match(gateSource, /accessibilityLabel="Create an account to continue to this link"/);
});

test('invalid protected links never resume an action and explain how to recover', () => {
  assert.match(gateSource, /const validLink = Boolean\(normalizePendingAuthRoute\(returnRoute\)\)/);
  assert.match(gateSource, /No action has been resumed\. Request a fresh link from the sender\./);
  assert.match(gateSource, /!validLink/);
  assert.match(gateSource, /if \(!setPendingAuthRoute\(returnRoute\)\) return/);
});
