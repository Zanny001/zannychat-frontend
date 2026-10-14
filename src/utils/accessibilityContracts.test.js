import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const componentPath = resolve(here, '../components/ChatBubble.js');
const source = await readFile(componentPath, 'utf8');

test('voice-message playback exposes a dynamic screen-reader label', () => {
  assert.match(source, /accessibilityLabel=\{status\.playing \? 'Pause voice message' : 'Play voice message'\}/);
  assert.match(source, /accessibilityHint="Plays or pauses this voice message"/);
});

test('link preview is announced as a link with a useful destination label', () => {
  assert.match(source, /accessibilityRole="link"/);
  assert.match(source, /accessibilityLabel=\{`Open link: \${preview\.title \|\| preview\.siteName \|\| url}`\}/);
});

test('image, file, and contact attachments expose actionable labels', () => {
  assert.match(source, /accessibilityLabel=\{message\.text \? `Open image: \${message\.text}` : 'Open image attachment'\}/);
  assert.match(source, /accessibilityLabel=\{`Open file \${message\.mediaName \|\| 'attachment'}/);
  assert.match(source, /accessibilityLabel=\{`Open contact card for \${message\.mediaName \|\| 'contact'}`\}/);
});

test('message bubble describes long-press actions and swipe-to-reply', () => {
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityHint="Long-press for reactions and message actions\. Swipe right to reply\."/);
});
