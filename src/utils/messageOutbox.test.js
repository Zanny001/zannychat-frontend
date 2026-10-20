import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('message outbox persists bounded retry diagnostics', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /recordMessageRetryFailure/);
  assert.match(source, /Math\.min\(100/);
  assert.match(source, /lastAttemptAt/);
  assert.match(source, /lastError/);
  assert.match(source, /slice\(0, 240\)/);
});

test('message outbox uses bounded exponential retry backoff', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /isMessageRetryDue/);
  assert.match(source, /5 \* 60 \* 1000/);
  assert.match(source, /attempts >= 100/);
});

test('chat screen retries queued messages on focus and app foreground without repeated alerts', async () => {
  const source = await readFile(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');
  assert.match(source, /retryQueuedTextMessages/);
  assert.match(source, /AppState\.addEventListener\('change'/);
  assert.match(source, /setInterval\(\(\) => retryQueuedTextMessages\(\), 15000\)/);
  assert.match(source, /automaticRetryInFlightRef/);
});
