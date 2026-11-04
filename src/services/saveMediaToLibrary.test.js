import test from 'node:test';
import assert from 'node:assert/strict';
import { saveMediaToLibrary } from './saveMediaToLibrary.js';

function mocks(overrides = {}) {
  const calls = { permission: [], download: [], save: [], delete: [] };
  const FileSystem = {
    cacheDirectory: 'file:///cache/',
    async downloadAsync(uri, destination) {
      calls.download.push({ uri, destination });
      return { uri: destination, status: 200, headers: { 'content-type': 'image/jpeg' } };
    },
    async deleteAsync(uri, options) { calls.delete.push({ uri, options }); },
    ...overrides.FileSystem,
  };
  const MediaLibrary = {
    async requestPermissionsAsync(...args) { calls.permission.push(args); return { granted: true }; },
    async saveToLibraryAsync(uri) { calls.save.push(uri); },
    ...overrides.MediaLibrary,
  };
  return { calls, FileSystem, MediaLibrary };
}

test('media save requests write-only permission with no broad read scopes, validates response, saves, and cleans cache', async () => {
  const { calls, FileSystem, MediaLibrary } = mocks();
  const result = await saveMediaToLibrary({ uri: 'https://cdn.example.com/image.jpg', kind: 'image', FileSystem, MediaLibrary });
  assert.equal(result.kind, 'image');
  assert.deepEqual(calls.permission, [[true, []]]);
  assert.equal(calls.download.length, 1);
  assert.equal(calls.save[0], calls.download[0].destination);
  assert.deepEqual(calls.delete, [{ uri: calls.download[0].destination, options: { idempotent: true } }]);
});

test('media save refuses to download when permission is denied', async () => {
  const { calls, FileSystem, MediaLibrary } = mocks({ MediaLibrary: { async requestPermissionsAsync() { return { granted: false }; } } });
  await assert.rejects(saveMediaToLibrary({ uri: 'https://cdn.example.com/image.jpg', kind: 'image', FileSystem, MediaLibrary }), /permission is required/i);
  assert.equal(calls.download.length, 0);
  assert.equal(calls.save.length, 0);
});

test('media save rejects an unsuccessful download and cleans the intended cache path', async () => {
  const { calls, FileSystem, MediaLibrary } = mocks({ FileSystem: { async downloadAsync(uri, destination) { calls.download.push({ uri, destination }); return { uri: destination, status: 503, headers: {} }; } } });
  await assert.rejects(saveMediaToLibrary({ uri: 'https://cdn.example.com/image.jpg', kind: 'image', FileSystem, MediaLibrary }), /could not be downloaded/i);
  assert.equal(calls.save.length, 0);
  assert.equal(calls.delete[0].uri, calls.download[0].destination);
});

test('media save rejects mismatched content types and does not write to the library', async () => {
  const { calls, FileSystem, MediaLibrary } = mocks({ FileSystem: { async downloadAsync(uri, destination) { calls.download.push({ uri, destination }); return { uri: destination, status: 200, headers: { 'content-type': 'text/html' } }; } } });
  await assert.rejects(saveMediaToLibrary({ uri: 'https://cdn.example.com/image.jpg', kind: 'image', FileSystem, MediaLibrary }), /does not match/i);
  assert.equal(calls.save.length, 0);
  assert.equal(calls.delete.length, 1);
});
