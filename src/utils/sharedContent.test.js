import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySharedContent, extractSafeLinks } from './sharedContent.js';

test('extracts only safe HTTP(S) links and removes trailing punctuation', () => {
  const links = extractSafeLinks('Read https://example.com/path). and http://news.example.org, javascript:alert(1)');
  assert.deepEqual(links.map((item) => item.url), ['https://example.com/path', 'http://news.example.org/']);
});

test('deduplicates links and rejects credential-bearing URLs', () => {
  const links = extractSafeLinks('https://example.com https://example.com/ https://user:pass@example.com');
  assert.equal(links.length, 1);
});

test('classifies visible, non-deleted media and links', () => {
  const result = classifySharedContent([
    { id: '1', mediaType: 'image', mediaUrl: 'https://signed.example/image', text: 'See https://example.com' },
    { id: '2', mediaType: 'file', mediaUrl: 'https://signed.example/file', mediaName: 'notes.pdf' },
    { id: '3', mediaType: 'image', mediaUrl: 'https://signed.example/deleted', deletedAt: 'now' },
  ]);
  assert.equal(result.photos.length, 1);
  assert.equal(result.files.length, 1);
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].host, 'example.com');
});
