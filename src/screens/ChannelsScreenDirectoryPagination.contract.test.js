import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./ChannelsScreen.js', import.meta.url), 'utf8');

test('channel directory renders a bounded first batch and progressively reveals more', () => {
  assert.ok(source.includes('const [directoryLimit, setDirectoryLimit] = useState(40)'));
  assert.ok(source.includes('visibleChannels.slice(0, directoryLimit)'));
  assert.ok(source.includes('displayedChannels.map((channel) =>'));
  assert.ok(source.includes('Show more channels'));
  assert.ok(!source.includes('visibleChannels.map((channel) =>'));
});

test('directory paging resets after search, refresh and filter changes', () => {
  assert.ok(source.includes('setChannels(safeRows);\n      setDirectoryLimit(40);'));
  assert.ok(source.includes('setDirectoryFilter(item.key); setDirectoryLimit(40);'));
  assert.ok(source.includes('setDirectoryFilter(\'all\'); setDirectoryLimit(40);'));
});

test('channel directory refresh and clear-search icon controls meet 48-point mobile targets', () => {
  assert.ok(source.includes('accessibilityLabel="Refresh channels" style={{ width: 48, height: 48'));
  assert.ok(source.includes('accessibilityLabel="Clear channel search" style={{ width: 48, height: 48'));
});
