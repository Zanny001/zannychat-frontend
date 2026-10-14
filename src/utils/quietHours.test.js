import test from 'node:test';
import assert from 'node:assert/strict';
import { isWithinQuietHours, parseClockTime, shouldQuietForegroundNotification } from './quietHours.js';

const at = (hour, minute = 0) => new Date(2026, 0, 2, hour, minute, 0, 0);

test('parses only valid 24-hour HH:MM values', () => {
  assert.equal(parseClockTime('00:00'), 0);
  assert.equal(parseClockTime('23:59'), 1439);
  assert.equal(parseClockTime('8:00'), null);
  assert.equal(parseClockTime('24:00'), null);
  assert.equal(parseClockTime('12:60'), null);
  assert.equal(parseClockTime(null), null);
});

test('handles quiet hours that cross midnight and excludes the end boundary', () => {
  assert.equal(isWithinQuietHours(at(22), '22:00', '08:00'), true);
  assert.equal(isWithinQuietHours(at(2, 30), '22:00', '08:00'), true);
  assert.equal(isWithinQuietHours(at(7, 59), '22:00', '08:00'), true);
  assert.equal(isWithinQuietHours(at(8), '22:00', '08:00'), false);
  assert.equal(isWithinQuietHours(at(12), '22:00', '08:00'), false);
});

test('handles daytime quiet windows and their exact boundaries', () => {
  assert.equal(isWithinQuietHours(at(12), '12:00', '14:00'), true);
  assert.equal(isWithinQuietHours(at(11, 59), '12:00', '14:00'), false);
  assert.equal(isWithinQuietHours(at(14), '12:00', '14:00'), false);
});

test('invalid or identical boundaries fail open instead of muting indefinitely', () => {
  assert.equal(isWithinQuietHours(at(23), 'bad', '08:00'), false);
  assert.equal(isWithinQuietHours(at(23), '22:00', '22:00'), false);
});

test('quiet preference gates the helper and does not infer a setting when disabled', () => {
  assert.equal(shouldQuietForegroundNotification(at(23), { quietHoursEnabled: false, quietHoursStart: '22:00', quietHoursEnd: '08:00' }), false);
  assert.equal(shouldQuietForegroundNotification(at(23), { quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '08:00' }), true);
});
