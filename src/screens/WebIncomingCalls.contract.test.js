import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const navigator = read('../navigation/AppNavigator.js');
const notifications = read('./NotificationsScreen.js');
const status = read('./StatusUpdatesScreen.js');
const incoming = read('./IncomingCallScreen.js');

test('incoming call realtime subscription is enabled on web and native', () => {
  assert.ok(navigator.includes('subscribeToIncomingCalls(userId'));
  assert.ok(navigator.includes("Platform.OS === 'web' && typeof window !== 'undefined'"));
  assert.ok(!navigator.includes("if (Platform.OS === 'web' || !SUPABASE_ENABLED || !supabase) return undefined;\n    let active = true;\n    let attachedUserId = null;\n    const attach = (userId) => {\n      if (userId === attachedUserId) return;\n      attachedUserId = userId;\n      incomingUnsubscribeRef.current?.();\n      incomingUnsubscribeRef.current = null;\n      if (userId) incomingUnsubscribeRef.current = subscribeToIncomingCalls"));
});

test('web browser notification permission can be requested from the Notifications screen', () => {
  assert.ok(notifications.includes('Notification.requestPermission()'));
  assert.ok(notifications.includes('Browser incoming call alerts'));
});

test('web status camera requests browser media permission and captures a photo', () => {
  assert.ok(status.includes('navigator.mediaDevices.getUserMedia'));
  assert.ok(status.includes('videoElement.srcObject = stream'));
  assert.ok(status.includes('canvas.toBlob'));
  assert.ok(!status.includes('Camera capture is available in the ZannyChat mobile app.'));
});

test('incoming call UI does not invoke native vibration APIs on web', () => {
  assert.ok(incoming.includes("else if (Platform.OS !== 'web') Vibration.vibrate()"));
  assert.ok(incoming.includes("if (Platform.OS !== 'web') Vibration.cancel()"));
});
