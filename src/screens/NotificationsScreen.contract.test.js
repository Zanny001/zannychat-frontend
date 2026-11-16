import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./NotificationsScreen.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../services/notifications.js', import.meta.url), 'utf8');

test('push registration respects the persisted master preference on app startup', () => {
  assert.match(service, /const prefs = await loadNotificationPrefs\(\)/);
  assert.match(service, /if \(!prefs\.pushEnabled\)\s*\{/);
  assert.match(service, /push notifications are disabled/);
});

test('push registration only reports success after the token is saved', () => {
  assert.match(service, /const \{ error: tokenError \} = await supabase/);
  assert.match(service, /if \(tokenError\) throw tokenError/);
  assert.match(service, /const \{ data: authData, error: authError \} = await supabase\.auth\.getUser\(\)/);
});

test('push opt-out confirms server token deletion before changing the local master preference', () => {
  assert.match(service, /export async function unregisterPushNotifications\(\)[\s\S]*?return true/);
  assert.match(service, /catch \(err\) \{[\s\S]*?return false/);
  const handlerStart = screen.indexOf('async function handlePushToggle');
  const handlerEnd = screen.indexOf('\n  }', handlerStart) + 4;
  const handler = screen.slice(handlerStart, handlerEnd);
  assert.ok(handler.indexOf('await unregisterPushNotifications()') < handler.indexOf("await update({ pushEnabled: false })"));
  assert.match(handler, /if \(!removed\)/);
});

test('notification settings distinguish preference state from confirmed device registration', () => {
  assert.match(screen, /const \[pushRegistrationState, setPushRegistrationState\] = useState\('unknown'\)/);
  assert.match(screen, /const token = await registerForPushNotifications\(\)/);
  assert.match(screen, /setPushRegistrationState\(token \? 'registered' : 'not_registered'\)/);
  assert.match(screen, /Registered on this device/);
  assert.match(screen, /device is not registered yet/);
  assert.match(screen, /pushActionBusy/);
});
