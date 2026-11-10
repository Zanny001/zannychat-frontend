import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const incoming = fs.readFileSync(new URL('../screens/IncomingCallScreen.js', import.meta.url), 'utf8');
const outgoing = fs.readFileSync(new URL('../screens/OutgoingCallScreen.js', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('./callAudio.js', import.meta.url), 'utf8');

test('incoming call screen starts and always stops its ringtone and vibration', () => {
  assert.match(incoming, /startCallTone\\(\\)/);
  assert.match(incoming, /stopCallTone\\(\\)/);
  assert.match(incoming, /Vibration\\.cancel\\(\\)/);
  assert.match(incoming, /updateCallStatus\\(call\\.id, 'accepted'\\)/);
  assert.match(incoming, /updateCallStatus\\(call\\.id, 'declined'\\)/);
});

test('outgoing call screen plays ringback until accepted, terminal, cancelled, or unmounted', () => {
  assert.match(outgoing, /startCallTone\\(\\)/);
  assert.match(outgoing, /stopCallTone\\(\\)/);
  assert.match(outgoing, /next\\.status === 'accepted'/);
  assert.match(outgoing, /isTerminalCallStatus\\(next\\.status\\)/);
});

test('ringtone player uses a bundled local source and a single looping player', () => {
  assert.match(audio, /require\\('\\.\\.\\/\\.\\.\\/assets\\/sounds\\/call-ring\\.wav'\\)/);
  assert.match(audio, /createAudioPlayer/);
  assert.match(audio, /activePlayer\\.loop = true/);
  assert.match(audio, /export function stopCallTone/);
});