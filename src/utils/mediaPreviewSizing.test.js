import test from 'node:test';
import assert from 'node:assert/strict';
import { getMediaPreviewSize } from './mediaPreviewSizing.js';

test('message media previews remain moderate and fit narrow phone widths', () => {
  for (const viewport of [280, 320, 360, 390, 430]) {
    const image = getMediaPreviewSize(viewport, 'image');
    const video = getMediaPreviewSize(viewport, 'video');
    assert.ok(image.width <= viewport * 0.66, `image width at ${viewport}px`);
    assert.equal(image.width, image.height, 'image preview remains square');
    assert.ok(video.width <= viewport * 0.72, `video width at ${viewport}px`);
    assert.equal(video.height, Math.round(video.width * 9 / 16), 'video preview remains 16:9');
  }
});

test('message media previews use bounded fallbacks for missing and large viewport values', () => {
  assert.deepEqual(getMediaPreviewSize(undefined, 'video'), { width: 257, height: 145 });
  assert.deepEqual(getMediaPreviewSize(1440, 'video'), { width: 260, height: 146 });
  assert.deepEqual(getMediaPreviewSize(1440, 'image'), { width: 232, height: 232 });
});
