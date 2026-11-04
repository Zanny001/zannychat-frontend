import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
const start = service.indexOf('export async function deleteStatus(statusId)');
const end = service.indexOf('export const STATUS_REACTIONS', start);
const implementation = service.slice(start, end);

test('status deletion validates ownership before storage cleanup', () => {
  assert.match(implementation, /\.eq\('id', statusId\)\.eq\('user_id', auth\.user\.id\)\.maybeSingle\(\)/);
  assert.match(implementation, /isSafeStatusMediaPath\(row\) \? row\.media_path : null/);
});

test('status media removal failure stops deletion so cleanup can be retried', () => {
  const removeAt = implementation.indexOf("storage.from('status-media').remove([safeMediaPath])");
  const throwAt = implementation.indexOf('if (mediaError) throw new Error');
  const deleteAt = implementation.indexOf("from('status_updates').delete()");
  assert.ok(removeAt >= 0, 'validated media should be removed first');
  assert.ok(throwAt > removeAt && throwAt < deleteAt, 'storage errors must abort before row deletion');
  assert.match(implementation, /The status was kept so you can retry/);
});

test('unsafe legacy paths are never passed to storage deletion', () => {
  assert.match(implementation, /const safeMediaPath = isSafeStatusMediaPath\(row\) \? row\.media_path : null/);
  assert.match(implementation, /if \(safeMediaPath\) \{/);
});
