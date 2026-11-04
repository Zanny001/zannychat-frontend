import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../services/statusUpdates.js', import.meta.url), 'utf8');
test('status feed uses bounded SQL aggregate calls instead of fetching every view receipt', () => {
  assert.match(source, /supabase\.rpc\('get_own_status_view_counts'/);
  assert.match(source, /offset \+= 200/);
  assert.doesNotMatch(source, /from\('status_views'\)\.select\('status_id,viewer_id'\)/);
});
test('status view count failures are not silently presented as zero views', () => {
  assert.match(source, /Could not load status view counts/);
});
