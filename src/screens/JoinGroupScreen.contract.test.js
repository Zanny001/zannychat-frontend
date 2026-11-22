import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./JoinGroupScreen.js', import.meta.url), 'utf8');

test('join group presents a Crown Aurora welcome and clear invite steps', () => {
  assert.ok(source.includes('YOUR NEXT CIRCLE'));
  assert.ok(source.includes('Good things happen together.'));
  assert.ok(source.includes('Paste your private invite'));
  assert.ok(source.includes('Only the token is needed to continue.'));
});

test('join group keeps secure token validation and backend acceptance intact', () => {
  assert.ok(source.includes('const value = token.trim()'));
  assert.ok(source.includes('value.length < 30'));
  assert.ok(source.includes('await acceptGroupInvite(value)'));
  assert.ok(source.includes("navigation.navigate('Main', { screen: 'Chats' })"));
  assert.ok(source.includes('Invites can expire or be revoked.'));
  assert.ok(source.includes('accessibilityRole="alert"'));
});

test('join action remains a large accessible busy-aware control', () => {
  assert.ok(source.includes('accessibilityLabel="Join group with invite token"'));
  assert.ok(source.includes('minHeight: 54'));
  assert.ok(source.includes('accessibilityState={{ disabled: busy, busy }}'));
});
