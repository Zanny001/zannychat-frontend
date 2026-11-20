import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, resolveMoodColors } from './colors.js';
import { createCustomMood } from './customPalette.js';

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const palettes = [...Object.values(MOODS), createCustomMood({ signal: '#FFFFFF', thread: '#000000', gold: '#F0C' })];

for (const mode of ['dark', 'light']) {
  for (const highContrast of [false, true]) {
    test('semantic theme colors meet ' + (highContrast ? '7:1' : '4.5:1') + ' contrast in ' + mode + ' mode', () => {
      const minimum = highContrast ? 7 : 4.5;
      for (const mood of palettes) {
        const colors = resolveMoodColors(mood, mode, highContrast);
        const surface = colors.surfaceAlt;
        const label = mood.label || mood.key;
        for (const [name, value] of [
          ['primary', colors.primary],
          ['primaryDark', colors.primaryDark],
          ['accent', colors.accent],
          ['danger', colors.danger],
          ['success', colors.success],
          ['warning', colors.warning],
          ['online', colors.online],
        ]) {
          assert.ok(contrast(value, surface) >= minimum, label + ' ' + mode + ' ' + name + ' contrast');
        }
        assert.ok(contrast(colors.textPrimary, colors.background) >= minimum, label + ' primary text');
        assert.ok(contrast(colors.textSecondary, colors.background) >= minimum, label + ' secondary text');
        assert.ok(contrast(colors.onPrimary, colors.primary) >= 4.5, label + ' onPrimary');
        assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5, label + ' onAccent');
        assert.ok(contrast(colors.onDanger, colors.danger) >= 4.5, label + ' onDanger');
        assert.ok(contrast(colors.bubbleMineText, colors.bubbleMine) >= 4.5, label + ' own message text');
      }
    });
  }
}
