import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigation = fs.readFileSync(new URL('../navigation/AppNavigator.js', import.meta.url), 'utf8');
const boundary = fs.readFileSync(new URL('./CallRouteErrorBoundary.js', import.meta.url), 'utf8');

test('all browser and native call routes are isolated from the authenticated chat tree', () => {
  assert.match(navigation, /export default function AppNavigator/);
  for (const [route, wrapper] of [
    ['Calls', 'CallHistoryRoute'],
    ['IncomingCall', 'IncomingCallRoute'],
    ['OutgoingCall', 'OutgoingCallRoute'],
    ['Call', 'DirectCallRoute'],
    ['GroupCall', 'GroupCallRoute'],
  ]) {
    assert.match(navigation, new RegExp(`name="${route}" component={${wrapper}}`));
  }
  assert.match(navigation, /withCallRouteBoundary\(CallHistoryScreen, 'CallHistory'\)/);
  assert.match(navigation, /withCallRouteBoundary\(CallScreen, 'Call'\)/);
  assert.match(navigation, /withCallRouteBoundary\(GroupCallScreen, 'GroupCall'\)/);
});

test('call route render failures are logged without user or session payloads', () => {
  assert.match(boundary, /componentDidCatch\(error, info\)/);
  assert.match(boundary, /\[calls\] Unhandled call-view render error/);
  assert.match(boundary, /route: this\.props\.routeName/);
  assert.match(boundary, /componentStack: info\?\.componentStack/);
  assert.doesNotMatch(boundary, /access_token|refresh_token|callId|conversationId/);
});

test('call route fallback returns to the existing app instead of reloading the whole page', () => {
  assert.match(boundary, /navigation\?\.canGoBack\?\.\(\)/);
  assert.match(boundary, /navigation\.goBack\(\)/);
  assert.match(boundary, /navigation\?\.navigate\?\.\('Main'\)/);
  assert.match(boundary, /Your chats are still available/);
  assert.doesNotMatch(boundary, /window\.location\.reload/);
});
