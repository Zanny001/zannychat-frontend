import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const panel = fs.readFileSync(new URL('./LiveEconomyPanel.js', import.meta.url), 'utf8');
const nativeStream = fs.readFileSync(new URL('../screens/LiveStreamScreen.js', import.meta.url), 'utf8');
const webStream = fs.readFileSync(new URL('../screens/LiveStreamScreen.web.js', import.meta.url), 'utf8');

test('LIVE gift studio opens the server-backed Sparks wallet and store from inside the room', () => {
  assert.ok(panel.includes("navigation?.navigate('LiveWallet')"));
  assert.ok(panel.includes('Wallet & Store'));
  assert.ok(panel.includes('navigation={navigation}') === false);
  assert.ok(nativeStream.includes('navigation={navigation}'));
  assert.ok(webStream.includes('navigation={navigation}'));
});

test('LIVE creators can open their separate creator earnings dashboard from the room', () => {
  assert.ok(panel.includes("navigation?.navigate('LiveCreatorEarnings')"));
  assert.ok(panel.includes('Creator earnings'));
});

test('gift studio explains purchased Sparks and creator rewards without claiming there is no store', () => {
  assert.ok(panel.includes('Purchased and promotional Sparks are tracked separately'));
  assert.ok(panel.includes('Only purchased Sparks spent on gifts can create eligible creator rewards'));
  assert.ok(panel.includes('Open Wallet & Store to check available packages'));
  assert.ok(!panel.includes('there is no purchase or top-up screen'));
  assert.ok(!panel.includes('Promotional credits only · no purchase'));
});

test('compact panel actions expose accessible names', () => {
  assert.ok(panel.includes('accessibilityLabel={label}'));
});
