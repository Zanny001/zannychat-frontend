import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePoll } from './pollRules.js';
test('normalizes poll question and options', () => { assert.deepEqual(normalizePoll('  Lunch? ', [' Pizza ', 'Salad']), { question: 'Lunch?', options: ['Pizza', 'Salad'] }); });
test('rejects too few options and oversized question', () => { assert.throws(() => normalizePoll('Question', ['One']), /2 and 10/); assert.throws(() => normalizePoll('x'.repeat(241), ['One', 'Two']), /1–240/); });
test('rejects duplicate options ignoring case and oversized option', () => { assert.throws(() => normalizePoll('Question', ['Pizza', 'pizza']), /unique/); assert.throws(() => normalizePoll('Question', ['x'.repeat(121), 'Two']), /120 characters/); });


test('poll creation supports a multi-select flag as a separate explicit choice', async () => {
  const { readFile } = await import('node:fs/promises');
  const service = await readFile(new URL('../services/polls.js', import.meta.url), 'utf8');
  assert.match(service, /p_allow_multiple: Boolean\(allowMultiple\)/);
  assert.match(service, /p_option_ids: ids/);
});
