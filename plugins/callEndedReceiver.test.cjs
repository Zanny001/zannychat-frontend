const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Android killed-app call-end receiver forwards only signed call metadata', () => {
  const kotlin = fs.readFileSync(path.join(__dirname, '../plugins/CallEndedReceiver.kt'), 'utf8');
  const plugin = fs.readFileSync(path.join(__dirname, '../plugins/withCallEndedReceiver.js'), 'utf8');
  assert.ok(kotlin.includes('serverEventToken'));
  assert.ok(kotlin.includes('/calls/native-event'));
  assert.ok(kotlin.includes('goAsync()'));
  assert.ok(plugin.includes('android.package'));
  assert.ok(plugin.includes('extra.backendUrl'));
});
