import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./NotificationsScreen.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');

test('web users can explicitly grant browser call-alert permission from a user action', () => {
  assert.ok(screen.includes('window.Notification.requestPermission()'));
  assert.ok(screen.includes('Browser call alerts'));
  assert.ok(screen.includes("Platform.OS === 'web'"));
  assert.ok(screen.includes('Native device push is not available in the browser'));
});

test('incoming browser call alerts are displayed only when permission is granted', () => {
  assert.ok(app.includes('window.Notification.permission === \'granted\''));
  assert.ok(app.includes('new window.Notification('));
  assert.ok(app.includes("navigationRef.navigate('IncomingCall', params)"));
});
