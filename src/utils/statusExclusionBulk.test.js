import test from 'node:test';
import assert from 'node:assert/strict';
import { planStatusExclusionChanges } from './statusExclusionBulk.js';

test('bulk exclusion only returns visible contacts not already excluded', () => {
  const contacts = [{ id: 'a' }, { id: 'b' }, { id: 'a' }, { id: 'c' }];
  const excluded = [{ excluded_user_id: 'b' }];
  assert.deepEqual(planStatusExclusionChanges(contacts, excluded, true), [{ id: 'a' }, { id: 'c' }]);
});

test('bulk allow only returns currently excluded visible contacts', () => {
  assert.deepEqual(
    planStatusExclusionChanges([{ id: 'a' }, { id: 'b' }], [{ excluded_user_id: 'a' }], false),
    [{ id: 'a' }],
  );
});

test('bulk changes tolerate missing arrays and ignore contacts without IDs', () => {
  assert.deepEqual(planStatusExclusionChanges([{}, { id: 'x' }], null, true), [{ id: 'x' }]);
  assert.deepEqual(planStatusExclusionChanges(null, [], false), []);
});
