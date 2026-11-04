import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrivacyCheckupItems, PRIVACY_CHECKUP_ITEMS } from './privacyCheckup.js';

test('privacy checkup exposes only known, honest capabilities', () => {
  const items = getPrivacyCheckupItems();
  assert.equal(items.length, 4);
  assert.ok(items.some((item) => item.id === 'encryption' && /not currently end-to-end encrypted/i.test(item.detail)));
  assert.ok(items.some((item) => item.id === 'sessions' && item.action === 'Sessions'));
  assert.ok(items.some((item) => item.id === 'data' && item.action === 'Data export'));
});

test('privacy checkup returns copies so UI callers cannot mutate canonical metadata', () => {
  const items = getPrivacyCheckupItems();
  items[0].title = 'changed';
  assert.notEqual(getPrivacyCheckupItems()[0].title, 'changed');
  assert.equal(PRIVACY_CHECKUP_ITEMS[0].title, 'Review signed-in sessions');
});
