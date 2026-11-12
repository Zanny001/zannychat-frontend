import test from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, resolveMoodColors } from '../theme/colors.js';

function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const mood of Object.values(MOODS)) {
  test(`${mood.label} theme keeps primary action text readable in dark and light modes`, () => {
    for (const mode of ['dark', 'light']) {
      const colors = resolveMoodColors(mood, mode);
      assert.ok(
        contrastRatio(colors.onPrimary, colors.primary) >= 4.5,
        `${mood.key} ${mode} primary contrast was ${contrastRatio(colors.onPrimary, colors.primary).toFixed(2)}:1`,
      );
    }
  });

  test(`${mood.label} theme keeps sent-message text and metadata readable`, () => {
    for (const mode of ['dark', 'light']) {
      const colors = resolveMoodColors(mood, mode);
      assert.ok(
        contrastRatio(colors.bubbleMineText, colors.bubbleMine) >= 4.5,
        `${mood.key} ${mode} message text contrast was ${contrastRatio(colors.bubbleMineText, colors.bubbleMine).toFixed(2)}:1`,
      );
      assert.ok(
        contrastRatio(colors.bubbleMineMeta, colors.bubbleMine) >= 4.5,
        `${mood.key} ${mode} message metadata contrast was ${contrastRatio(colors.bubbleMineMeta, colors.bubbleMine).toFixed(2)}:1`,
      );
    }
  });
}
