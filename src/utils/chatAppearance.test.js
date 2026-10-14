import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_CANVASES, DEFAULT_CHAT_CANVAS, normalizeChatCanvas, resolveChatCanvas } from './chatAppearance.js';

test('normalizes unsupported and absent chat canvas preferences', () => {
  assert.equal(normalizeChatCanvas(undefined), DEFAULT_CHAT_CANVAS);
  assert.equal(normalizeChatCanvas('neon'), DEFAULT_CHAT_CANVAS);
  assert.equal(normalizeChatCanvas('ocean'), 'ocean');
});

test('resolves mood-matched canvas from the active theme', () => {
  assert.equal(resolveChatCanvas('theme', '#15111C'), '#15111C');
  assert.equal(resolveChatCanvas('obsidian', '#15111C'), '#101116');
});

test('every canvas has a unique key and valid dark color or theme fallback', () => {
  assert.equal(new Set(CHAT_CANVASES.map((item) => item.key)).size, CHAT_CANVASES.length);
  for (const canvas of CHAT_CANVASES) {
    assert.ok(canvas.color === null || /^#[0-9A-Fa-f]{6}$/.test(canvas.color));
  }
});
