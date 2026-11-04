import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStatusPublishAudience } from './statusPublishAudience.js';

test('non-selected audiences never send explicit recipient IDs', () => {
  assert.deepEqual(resolveStatusPublishAudience('contacts', ['a'], [{ id: 'a' }], []), []);
  assert.deepEqual(resolveStatusPublishAudience('only_me', [], [], []), []);
});

test('selected audience is deduplicated and accepted when every recipient remains eligible', () => {
  assert.deepEqual(resolveStatusPublishAudience('selected_contacts', ['a', 'a', 'b'], [{ id: 'a' }, { id: 'b' }], []), ['a', 'b']);
});

test('selected audience fails closed if a contact was removed or excluded', () => {
  assert.throws(() => resolveStatusPublishAudience('selected_contacts', ['a', 'gone'], [{ id: 'a' }], []), /audience changed/);
  assert.throws(() => resolveStatusPublishAudience('selected_contacts', ['a'], [{ id: 'a' }], [{ excluded_user_id: 'a' }]), /audience changed/);
});

test('selected audience cannot publish with an empty recipient list', () => {
  assert.throws(() => resolveStatusPublishAudience('selected_contacts', [], [{ id: 'a' }], []), /Choose at least one contact/);
});
