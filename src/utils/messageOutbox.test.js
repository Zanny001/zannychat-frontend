import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('message outbox persists bounded retry diagnostics', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /recordMessageRetryFailure/);
  assert.match(source, /Math\.min\(100/);
  assert.match(source, /lastAttemptAt/);
  assert.match(source, /lastError/);
  assert.match(source, /getSafeRetryError\(error, 'message'\)/);
});

test('message outbox uses bounded exponential retry backoff', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /isMessageRetryDue/);
  assert.match(source, /5 \* 60 \* 1000/);
  assert.match(source, /attempts >= 100/);
});

test('message outbox retries queued messages on focus and app foreground without repeated alerts', async () => {
  const source = await readFile(new URL('../hooks/useMessageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /retryQueuedTextMessages/);
  assert.match(source, /AppState\.addEventListener\('change'/);
  assert.match(source, /setInterval\(\(\) => retryQueuedTextMessages\(\), RETRY_INTERVAL_MS\)/);
  assert.match(source, /RETRY_INTERVAL_MS = 15000/);
  assert.match(source, /retryInFlightRef/);
});

test('message recovery limits automatic retry batches and prioritizes oldest queued messages', async () => {
  const source = await readFile(new URL('../hooks/useMessageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /\.sort\(\(a, b\) => Date\.parse\(a\.createdAt \|\| 0\) - Date\.parse\(b\.createdAt \|\| 0\)\)/);
  assert.match(source, /AUTOMATIC_RETRY_BATCH_SIZE = 5/);
  assert.match(source, /\.slice\(0, force \? MAX_PENDING_MESSAGES : AUTOMATIC_RETRY_BATCH_SIZE\)/);
});


test('message outbox serializes per-conversation read-modify-write operations', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ serializeByKey \} from '\.\.\/utils\/serializeByKey'/);
  assert.equal((source.match(/return serializeByKey\(key, async \(\) => \{/g) || []).length, 3);
});


test('message outbox normalizes persisted data during removal and retry-failure writes', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /const next = \(await readQueue\(key\)\)\.filter/);
  assert.match(source, /const normalized = await readQueue\(key\)/);
  assert.match(source, /const safeNext = normalizePendingMessages\(next\)/);
  assert.match(source, /else await AsyncStorage\.removeItem\(key\)/);
});


test('message retry policy recovers from future timestamps caused by device clock changes', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /if \(lastAttempt > now\) return true/);
  assert.match(source, /Device clock changes can leave a queued message/);
});


test('message outbox refuses a new message when the bounded queue is full', async () => {
  const source = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  assert.match(source, /alreadyQueued = queue\.some/);
  assert.match(source, /if \(!alreadyQueued && next\.length >= MAX_PENDING_MESSAGES\) return false/);
});


test('chat screen surfaces queue persistence failure instead of showing an unqueued message as pending', async () => {
  const screen = await readFile(new URL('../screens/ChatScreen.js', import.meta.url), 'utf8');
  const outbox = await readFile(new URL('../hooks/useMessageOutbox.js', import.meta.url), 'utf8');
  assert.match(screen, /let queued = false/);
  assert.match(screen, /queued = await queuePendingMessage\(pending\)/);
  assert.match(screen, /pending-message queue is full or local storage is unavailable/);
  assert.match(outbox, /const saved = await savePendingMessage/);
  assert.match(outbox, /if \(saved && generation === retryGenerationRef\.current/);
});


test('account deletion clears only the deleted user’s pending text outbox', async () => {
  const service = await readFile(new URL('../services/messageOutbox.js', import.meta.url), 'utf8');
  const api = await readFile(new URL('../services/api.js', import.meta.url), 'utf8');
  assert.match(service, /clearPendingMessagesForUser/);
  assert.match(service, /getMessageOutboxStoragePrefix/);
  assert.match(service, /AsyncStorage\.getAllKeys\(\)/);
  assert.match(service, /key\.startsWith\(prefix\)/);
  assert.match(api, /clearPendingMessagesForUser\(userData\.user\.id\)/);
});
