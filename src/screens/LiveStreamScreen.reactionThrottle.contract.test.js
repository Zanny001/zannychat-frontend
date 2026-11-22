import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./LiveStreamScreen.js', import.meta.url), 'utf8');

test('LIVE reactions serialize requests and stay below the server rate limit', () => {
  assert.ok(screen.includes('const reactionRequestInFlight = useRef(false)'));
  assert.ok(screen.includes('const lastReactionRequestAt = useRef(0)'));
  assert.ok(screen.includes('if (!stream?.id || reactionRequestInFlight.current) return'));
  assert.ok(screen.includes('now - lastReactionRequestAt.current < 1300'));
  assert.ok(screen.includes('reactionRequestInFlight.current = true'));
  assert.ok(screen.includes('finally {\n      reactionRequestInFlight.current = false;'));
});
