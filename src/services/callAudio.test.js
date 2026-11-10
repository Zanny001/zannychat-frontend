import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const incoming = fs.readFileSync(new URL('../screens/IncomingCallScreen.js', import.meta.url), 'utf8');
const outgoing = fs.readFileSync(new URL('../screens/OutgoingCallScreen.js', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('./callAudio.js', import.meta.url), 'utf8');
const ringtone = fs.readFileSync(new URL('../../assets/sounds/call_ring.wav', import.meta.url));

test('incoming call screen starts and always stops its ringtone and vibration', () => {
  assert.ok(incoming.includes('startCallTone()'));
  assert.ok(incoming.includes('stopCallTone()'));
  assert.ok(incoming.includes('Vibration.cancel()'));
  assert.ok(incoming.includes("updateCallStatus(call.id, 'accepted')"));
  assert.ok(incoming.includes("updateCallStatus(call.id, 'declined')"));
});

test('outgoing call screen plays ringback until accepted, terminal, cancelled, or unmounted', () => {
  assert.ok(outgoing.includes("startCallTone('outgoing')"));
  assert.equal(outgoing.includes("if (!initialCall.nativeCallId) startCallTone('outgoing')"), false);
  assert.ok(outgoing.includes("if (next.status === 'accepted')"));
  assert.ok(outgoing.includes('stopCallTone()'));
  assert.ok(outgoing.includes("next.status === 'accepted'"));
  assert.ok(outgoing.includes('isTerminalCallStatus(next.status)'));
});

test('ringtone service uses separate bundled looping sources for incoming and outgoing calls', () => {
  assert.ok(audio.includes("require('../../assets/sounds/call_ring.wav')"));
  assert.ok(audio.includes("require('../../assets/sounds/call_dialtone.wav')"));
  assert.ok(outgoing.includes("startCallTone('outgoing')"));
  assert.ok(audio.includes('createAudioPlayer'));
  assert.ok(audio.includes('activePlayer.loop = true'));
  assert.ok(audio.includes('export function stopCallTone'));
  assert.equal(ringtone.toString('ascii', 0, 4), 'RIFF');
  assert.equal(ringtone.toString('ascii', 8, 12), 'WAVE');
  assert.ok(audio.includes('if (token !== generation) return false'));
});
