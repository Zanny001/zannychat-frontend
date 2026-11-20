import test from 'node:test';
import assert from 'node:assert/strict';
import { getLiveStageTileFrame } from './liveStageLayout.js';

function assertFramesFitAndDoNotOverlap(count, width, height) {
  const frames = Array.from({ length: count }, (_, index) => getLiveStageTileFrame({ index, count, width, height }));
  for (const frame of frames) {
    assert.ok(frame.x >= 0 && frame.y >= 0);
    assert.ok(frame.x + frame.width <= width);
    assert.ok(frame.y + frame.height <= height);
  }
  for (let i = 0; i < frames.length; i += 1) {
    for (let j = i + 1; j < frames.length; j += 1) {
      const a = frames[i], b = frames[j];
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x
        && a.y < b.y + b.height && a.y + a.height > b.y;
      assert.equal(overlaps, false, `frames ${i} and ${j} overlap`);
    }
  }
}

test('LIVE guest tiles remain distinct and inside a portrait phone stage with five guests', () => {
  assertFramesFitAndDoNotOverlap(5, 387, 476);
});

test('LIVE guest tiles adapt to a wide stage without overlap', () => {
  assertFramesFitAndDoNotOverlap(5, 872, 608);
});

test('LIVE guest tiles fit a compact stage with four participants', () => {
  assertFramesFitAndDoNotOverlap(4, 352, 390);
});
