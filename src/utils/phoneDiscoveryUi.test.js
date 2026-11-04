import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const screen = fs.readFileSync(path.join(here, '../screens/ContactDiscoveryScreen.js'), 'utf8');
const api = fs.readFileSync(path.join(here, '../services/api.js'), 'utf8');
const navigator = fs.readFileSync(path.join(here, '../navigation/AppNavigator.js'), 'utf8');
const newChat = fs.readFileSync(path.join(here, '../screens/NewChatScreen.js'), 'utf8');

test('phone discovery screen is opt-in, bounded, and clears raw phone input after matching', () => {
  assert.match(screen, /setPhoneDiscoverability\(!settings\.discoverable\)/);
  assert.match(screen, /selected\.length > MAX_MATCH_PHONE_NUMBERS/);
  assert.match(screen, /setPhones\(''\)/);
  assert.match(screen, /E\.164/);
  assert.match(screen, /Who can find you\?/);
});

test('phone discovery API sends explicit batches to the authenticated backend', () => {
  assert.match(api, /backendFetch\('\/discovery\/match'/);
  assert.match(api, /backendFetch\('\/discovery\/enrollment'/);
});

test('find friends screen is reachable from new chat navigation', () => {
  assert.match(navigator, /name="ContactDiscovery" component=\{ContactDiscoveryScreen\}/);
  assert.match(newChat, /navigation\.navigate\('ContactDiscovery'\)/);
});
