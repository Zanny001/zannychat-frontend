import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySharedContent, extractSafeLinks, filterSharedItems, getSafeSharedMediaUrl, mergeOlderMessages } from './sharedContent.js';

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


test('filters shared items by filename, link host, sender and media type', () => {
  const items = [
    { id: '1', mediaName: 'Holiday Photo.jpg', mediaType: 'image' },
    { id: '2', title: 'Project notes', host: 'docs.example.com', senderName: 'Ada', url: 'https://docs.example.com' },
    { id: '3', mediaName: 'Meeting recording', mediaType: 'video' },
  ];
  assert.deepEqual(filterSharedItems(items, 'HOLIDAY').map((item) => item.id), ['1']);
  assert.deepEqual(filterSharedItems(items, 'ada').map((item) => item.id), ['2']);
  assert.deepEqual(filterSharedItems(items, 'video').map((item) => item.id), ['3']);
  assert.equal(filterSharedItems(items, '   ').length, 3);
  assert.deepEqual(filterSharedItems(null, 'anything'), []);
});


test('merges older message pages in order and deduplicates overlap and malformed rows', () => {
  const existing = [{ id: '3', text: 'newest' }, { id: '4', text: 'latest' }];
  const older = [{ id: '1', text: 'oldest' }, { id: '2', text: 'older' }, { id: '3', text: 'duplicate stale copy' }, null, { text: 'missing id' }];
  assert.deepEqual(mergeOlderMessages(existing, older), [
    { id: '1', text: 'oldest' }, { id: '2', text: 'older' },
    { id: '3', text: 'newest' }, { id: '4', text: 'latest' },
  ]);
});

test('older message merge tolerates non-array page responses', () => {
  assert.deepEqual(mergeOlderMessages([{ id: 1 }], { id: 2 }), [{ id: 1 }]);
  assert.deepEqual(mergeOlderMessages(null, [{ id: 2 }]), [{ id: 2 }]);
});


test('shared media URLs allow absolute HTTP(S) URLs and reject unsafe or malformed values', () => {
  assert.equal(getSafeSharedMediaUrl(' https://cdn.example.com/file?token=abc '), 'https://cdn.example.com/file?token=abc');
  assert.equal(getSafeSharedMediaUrl('http://cdn.example.com/photo.png'), 'http://cdn.example.com/photo.png');
  assert.equal(getSafeSharedMediaUrl('javascript:alert(1)'), null);
  assert.equal(getSafeSharedMediaUrl('file:///private/photo.jpg'), null);
  assert.equal(getSafeSharedMediaUrl('//cdn.example.com/photo.jpg'), null);
  assert.equal(getSafeSharedMediaUrl('https://user:pass@cdn.example.com/photo.jpg'), null);
  assert.equal(getSafeSharedMediaUrl('not a url'), null);
  assert.equal(getSafeSharedMediaUrl(null), null);
});

test('shared media classification excludes unsafe attachment URLs', () => {
  const result = classifySharedContent([
    { id: 'safe', mediaType: 'image', mediaUrl: 'https://cdn.example.com/photo.jpg' },
    { id: 'unsafe', mediaType: 'image', mediaUrl: 'javascript:alert(1)' },
    { id: 'credentialed', mediaType: 'file', mediaUrl: 'https://user:pass@example.com/file.pdf' },
  ]);
  assert.deepEqual(result.photos.map((item) => item.id), ['safe']);
  assert.equal(result.files.length, 0);
});
