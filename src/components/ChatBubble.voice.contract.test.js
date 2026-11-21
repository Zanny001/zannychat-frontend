import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./ChatBubble.js', import.meta.url), 'utf8');

test('voice message player exposes playback speed controls supported by expo-audio', () => {
  assert.match(source, /const rates = \[1, 1\.25, 1\.5, 2\]/);
  assert.match(source, /player\.setPlaybackRate\(nextRate\)/);
  assert.match(source, /Playback speed \$\{playbackRate\} times/);
});

test('voice message player exposes an accessible seek target and elapsed/total time', () => {
  assert.match(source, /player\.seekTo\(fraction \* duration\)/);
  assert.match(source, /accessibilityRole="adjustable"/);
  assert.match(source, /formatDuration\(currentTime\)\} \/ \{formatDuration\(duration\)/);
  assert.match(source, /onLayout=\{\(event\) => setTrackWidth\(event\.nativeEvent\.layout\.width\)\}/);
});

test('voice playback speed and seeking remain isolated to voice message content', () => {
  const voiceStart = source.indexOf('function VoiceBubbleContent');
  const voiceEnd = source.indexOf('// Fetches once per message', voiceStart);
  assert.ok(voiceStart >= 0 && voiceEnd > voiceStart);
  const voiceSource = source.slice(voiceStart, voiceEnd);
  assert.match(voiceSource, /useAudioPlayer\(message\.mediaUrl\)/);
  assert.match(voiceSource, /player\.pause\(\)/);
  assert.match(voiceSource, /player\.play\(\)/);
});
