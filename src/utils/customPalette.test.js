import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomMood, normalizeCustomPalette, normalizeHexColor } from '../theme/customPalette.js';
import { DEFAULT_MOOD_KEY, MOODS, resolveMoodColors } from '../theme/colors.js';

test('normalizes valid three- and six-digit hex colours', () => {
  assert.equal(normalizeHexColor('#abc'), '#AABBCC');
  assert.equal(normalizeHexColor('#795cff'), '#795CFF');
});

test('rejects malformed and non-string colour values', () => {
  assert.equal(normalizeHexColor('795CFF'), null);
  assert.equal(normalizeHexColor('#12'), null);
  assert.equal(normalizeHexColor('red'), null);
  assert.equal(normalizeHexColor(null), null);
});

test('requires both signature and conversation colours', () => {
  assert.deepEqual(normalizeCustomPalette({ signal: '#795CFF', thread: '#39E7E0' }), {
    signal: '#795CFF',
    thread: '#39E7E0',
    gold: '#FFD58A',
  });
  assert.equal(normalizeCustomPalette({ signal: 'invalid', thread: '#39E7E0' }), null);
});

test('builds a complete semantic mood without changing surface contrast tokens', () => {
  const mood = createCustomMood({ signal: '#795CFF', thread: '#39E7E0', gold: '#FFD58A' });
  assert.equal(mood.key, 'custom');
  assert.equal(mood.signal, '#795CFF');
  assert.equal(mood.thread, '#39E7E0');
  assert.equal(mood.ink, '#080B18');
  assert.equal(mood.paper, '#F3F5FF');
  assert.equal(createCustomMood({ signal: 'bad', thread: '#39E7E0' }), null);
});

function contrastRatio(first, second) {
  const luminance = (hex) => {
    const clean = hex.replace('#', '');
    const values = [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255);
    const linear = values.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('Royal Neon is the first-run default and premium presets are available', () => {
  assert.equal(DEFAULT_MOOD_KEY, 'royalNeon');
  for (const key of ['royalNeon', 'ocean', 'emerald', 'roseGold', 'sunset']) {
    assert.ok(MOODS[key]);
    assert.match(MOODS[key].signal, /^#[0-9A-F]{6}$/);
    assert.match(MOODS[key].thread, /^#[0-9A-F]{6}$/);
  }
});

test('light-mode dynamic primary accent keeps readable white button text', () => {
  const colors = resolveMoodColors(MOODS.royalNeon, 'light');
  assert.notEqual(colors.primary, '#B93825');
  assert.ok(contrastRatio(colors.primary, '#FFFFFF') >= 4.5);
  assert.equal(colors.onPrimary, '#FFFFFF');
});

test('custom palette accents flow into light and dark semantic colours', () => {
  const mood = createCustomMood({ signal: '#795CFF', thread: '#39E7E0' });
  const dark = resolveMoodColors(mood, 'dark');
  const light = resolveMoodColors(mood, 'light');
  assert.equal(dark.signal, '#795CFF');
  assert.equal(dark.accent, '#39E7E0');
  assert.equal(light.signal, '#795CFF');
  assert.notEqual(light.primary, '#B93825');
  assert.ok(contrastRatio(light.primary, '#FFFFFF') >= 4.5);
});

test('custom dark accents receive light foregrounds for readable controls and bubbles', () => {
  const mood = createCustomMood({ signal: '#172033', thread: '#202A40' });
  const colors = resolveMoodColors(mood, 'dark');
  assert.equal(colors.onPrimary, '#FFFFFF');
  assert.equal(colors.onAccent, '#FFFFFF');
  assert.equal(colors.bubbleMineText, '#FFFFFF');
  assert.equal(colors.bubbleMineMeta, '#FFFFFF');
  assert.ok(contrastRatio(colors.onPrimary, colors.primary) >= 4.5);
});
