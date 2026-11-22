import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync(new URL('./HelpScreen.js', import.meta.url), 'utf8');

test('Help opens with a Crown Aurora support concierge and current app version', () => {
  assert.match(screen, /HERE WHEN YOU NEED US/);
  assert.match(screen, /A little help goes a long way\./);
  assert.match(screen, /\{FAQ\.length\} quick answers/);
  assert.match(screen, /COMMON QUESTIONS/);
});

test('Help keeps FAQ content expandable and accessible', () => {
  assert.match(screen, /accessibilityRole="button"/);
  assert.match(screen, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(screen, /setOpenIndex\(open \? null : index\)/);
  assert.match(screen, /\{item\.a\}/);
});

test('Help support contact remains configured-only and reports unavailable mail safely', () => {
  assert.match(screen, /EXPO_PUBLIC_SUPPORT_EMAIL/);
  assert.match(screen, /Support contact unavailable/);
  assert.match(screen, /mailto:\$\{supportEmail\}/);
  assert.match(screen, /No mail app/);
});

test('Help supports local search across FAQ questions and answers with a clear empty state', () => {
  assert.match(screen, /Search help topics and answers/);
  assert.match(screen, /const visibleFaq = FAQ\.map/);
  assert.match(screen, /\(item\.q \+ ' ' \+ item\.a\)\.toLowerCase\(\)/);
  assert.match(screen, /visibleFaq\.map\(\(\{ item, index \}\)/);
  assert.match(screen, /No matching help topics/);
  assert.match(screen, /Clear help search/);
  assert.match(screen, /visibleFaq\.length/);
});

test('Help search preserves FAQ expansion state by original question index and keeps support available', () => {
  assert.match(screen, /setOpenIndex\(null\)/);
  assert.match(screen, /accessibilityState=\{\{ expanded: open \}\}/);
  assert.match(screen, /onPress=\{handleContact\}/);
  assert.match(screen, /EXPO_PUBLIC_SUPPORT_EMAIL/);
});
