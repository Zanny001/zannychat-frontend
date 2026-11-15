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
