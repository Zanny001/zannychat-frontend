const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Android killed-app receiver reconciles native end and reported-end events', () => {
  const kotlin = fs.readFileSync(path.join(__dirname, '../plugins/CallEndedReceiver.kt'), 'utf8');
  const plugin = fs.readFileSync(path.join(__dirname, '../plugins/withCallEndedReceiver.js'), 'utf8');
  assert.ok(kotlin.includes('"onCallEnded", "onCallReportedEnded"'));
  assert.ok(kotlin.includes('payload.optString("reason"'));
  assert.ok(kotlin.includes('serverEventToken'));
  assert.ok(kotlin.includes('zannychat_native_call_mapping'));
  assert.ok(kotlin.includes('outgoingMapping?.optString("serverCallId"'));
  assert.ok(kotlin.includes('outgoingMapping?.optString("token"'));
  assert.ok(kotlin.includes('remove(nativeCallId)'));
  assert.ok(kotlin.includes('/calls/native-event'));
  assert.ok(kotlin.includes('goAsync()'));
  assert.ok(plugin.includes('android.package'));
  assert.ok(plugin.includes('extra.backendUrl'));
});

test('native outgoing call credentials are stored in Android private preferences, not JS storage', () => {
  const moduleConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../modules/zannychat-native-call-mapping/expo-module.config.json'), 'utf8'));
  const moduleSource = fs.readFileSync(path.join(__dirname, '../modules/zannychat-native-call-mapping/android/src/main/java/expo/modules/zannychatcallmapping/ZannyChatNativeCallMappingModule.kt'), 'utf8');
  const nativeService = fs.readFileSync(path.join(__dirname, '../src/services/nativeCallSystem.native.js'), 'utf8');
  const cryptoSource = fs.readFileSync(path.join(__dirname, '../modules/zannychat-native-call-mapping/android/src/main/java/expo/modules/zannychatcallmapping/NativeCallMappingCrypto.kt'), 'utf8');
  const kotlin = fs.readFileSync(path.join(__dirname, '../plugins/CallEndedReceiver.kt'), 'utf8');
  assert.deepEqual(moduleConfig.platforms, ['android']);
  assert.ok(moduleSource.includes('getSharedPreferences("zannychat_native_call_mapping"'));
  assert.ok(moduleSource.includes('NativeCallMappingCrypto.encrypt(value)'));
  assert.ok(moduleSource.includes('NativeCallMappingCrypto.decrypt(raw)'));
  assert.ok(cryptoSource.includes('AndroidKeyStore'));
  assert.ok(cryptoSource.includes('AES/GCM/NoPadding'));
  assert.ok(kotlin.includes('NativeCallMappingCrypto.decrypt(encrypted)'));
  assert.ok(moduleSource.includes('AsyncFunction("setPendingCallMapping")'));
  assert.ok(moduleSource.includes('AsyncFunction("bindPendingCallMapping")'));
  assert.ok(moduleSource.includes('PENDING_CALL_MAPPING_KEY'));
  assert.ok(moduleSource.includes('.remove(PENDING_CALL_MAPPING_KEY)'));
  assert.ok(moduleSource.includes('AsyncFunction("setCallMapping")'));
  assert.ok(moduleSource.includes('AsyncFunction("getCallMapping")'));
  assert.ok(moduleSource.includes('AsyncFunction("clearCallMapping")'));
  assert.ok(fs.existsSync(path.join(__dirname, '../modules/zannychat-native-call-mapping/android/build.gradle')));
  assert.ok(fs.existsSync(path.join(__dirname, '../modules/zannychat-native-call-mapping/android/src/main/AndroidManifest.xml')));
  assert.ok(nativeService.includes("requireOptionalNativeModule('ZannyChatNativeCallMapping')"));
  assert.ok(nativeService.includes('setPendingNativeCallMapping'));
  assert.ok(nativeService.includes('bindPendingNativeCallMapping'));
  assert.ok(!nativeService.includes('@react-native-async-storage/async-storage'));
});

test('outgoing calls obtain the server credential before native session creation', () => {
  const callsService = fs.readFileSync(path.join(__dirname, '../src/services/calls.js'), 'utf8');
  const tokenRequest = callsService.indexOf('/native-event-token');
  const nativeStart = callsService.indexOf('startNativeOutgoingCall(');
  const pendingWrite = callsService.indexOf('setPendingNativeCallMapping(data.id, nativeEventToken)');
  const mappingBind = callsService.indexOf('bindPendingNativeCallMapping(nativeCallId)');
  assert.ok(tokenRequest >= 0 && pendingWrite > tokenRequest && nativeStart > pendingWrite && mappingBind > nativeStart);
  const receiver = fs.readFileSync(path.join(__dirname, '../plugins/CallEndedReceiver.kt'), 'utf8');
  assert.ok(receiver.includes('session.optString("origin") == "outgoingApp"'));
  assert.ok(receiver.includes('prefs.getString("pending_outgoing_call", null)'));
  assert.ok(receiver.includes('.remove("pending_outgoing_call")'));
});
