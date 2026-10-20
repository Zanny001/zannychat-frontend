import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent } from './eventRules.js';
test('normalizes valid event fields and ISO start time', () => {
 const result = normalizeEvent({ title: '  Team meetup ', description: ' hello ', location: ' Room 2 ', startsAt: '2030-05-01T12:00:00Z' }, Date.parse('2030-01-01T00:00:00Z'));
 assert.equal(result.title, 'Team meetup'); assert.equal(result.description, 'hello'); assert.equal(result.location, 'Room 2'); assert.equal(result.startsAt, '2030-05-01T12:00:00.000Z');
});
test('rejects missing/oversized titles and invalid or past times', () => {
 assert.throws(() => normalizeEvent({ title: ' ', startsAt: '2030-05-01T12:00:00Z' }, 0), /title/i);
 assert.throws(() => normalizeEvent({ title: 'x'.repeat(161), startsAt: '2030-05-01T12:00:00Z' }, 0), /title/i);
 assert.throws(() => normalizeEvent({ title: 'Valid', startsAt: 'bad-date' }, 0), /future/i);
 assert.throws(() => normalizeEvent({ title: 'Valid', startsAt: '2020-01-01T00:00:00Z' }, Date.parse('2021-01-01T00:00:00Z')), /future/i);
});
test('rejects overlong description and location', () => {
 assert.throws(() => normalizeEvent({ title: 'Valid', description: 'x'.repeat(1001), startsAt: '2030-05-01T12:00:00Z' }, 0), /description/i);
 assert.throws(() => normalizeEvent({ title: 'Valid', location: 'x'.repeat(241), startsAt: '2030-05-01T12:00:00Z' }, 0), /location/i);
});
