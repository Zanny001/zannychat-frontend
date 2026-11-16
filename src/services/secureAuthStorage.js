const DEFAULT_CHUNK_BYTES = 1500;
const MAX_CHUNKS = 128;
let generationSequence = 0;

function utf8ByteLength(value) {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function splitUtf8(value, maxBytes) {
  const chunks = [];
  let current = '';
  let currentBytes = 0;

  for (const character of value) {
    const codePoint = character.codePointAt(0);
    const characterBytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    if (current && currentBytes + characterBytes > maxBytes) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += character;
    currentBytes += characterBytes;
  }

  if (current || chunks.length === 0) chunks.push(current);
  return chunks;
}

function makeManifestKey(key) {
  return `${key}.secure-v2.manifest`;
}

function makeRevocationKey(key) {
  return `${key}.secure-v2.revoked`;
}

function makeChunkKey(key, generation, index) {
  return `${key}.secure-v2.${generation}.${index}`;
}

function parseManifest(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      value?.version !== 2 ||
      typeof value.generation !== 'string' ||
      !/^[a-z0-9-]{1,64}$/.test(value.generation) ||
      !Number.isSafeInteger(value.count) ||
      value.count < 1 ||
      value.count > MAX_CHUNKS ||
      !Number.isSafeInteger(value.byteLength) ||
      value.byteLength < 0 ||
      value.byteLength > DEFAULT_CHUNK_BYTES * MAX_CHUNKS
    ) return null;
    return value;
  } catch {
    return null;
  }
}

async function readSecureValue(secureStore, key, manifest) {
  const parts = [];
  for (let index = 0; index < manifest.count; index += 1) {
    const part = await secureStore.getItemAsync(makeChunkKey(key, manifest.generation, index));
    if (typeof part !== 'string') return null;
    parts.push(part);
  }
  const value = parts.join('');
  return utf8ByteLength(value) === manifest.byteLength ? value : null;
}

async function deleteGeneration(secureStore, key, manifest) {
  if (!manifest) return;
  for (let index = 0; index < manifest.count; index += 1) {
    try {
      await secureStore.deleteItemAsync(makeChunkKey(key, manifest.generation, index));
    } catch {
      // The manifest pointer has already moved, so an orphaned old chunk is inaccessible.
    }
  }
}

/**
 * Supabase auth storage backed by the platform Keychain/Android Keystore.
 *
 * Values are split into small UTF-8-safe chunks because SecureStore may reject
 * individual values above roughly 2 KiB on some iOS versions. A manifest is
 * written last, making each replacement atomic from the reader's perspective.
 * Existing AsyncStorage sessions are migrated on first read and are retained
 * if SecureStore is temporarily unavailable, avoiding an involuntary sign-out.
 */
export function createSecureAuthStorage({
  secureStore,
  legacyStorage,
  chunkBytes = DEFAULT_CHUNK_BYTES,
} = {}) {
  if (
    !secureStore ||
    typeof secureStore.getItemAsync !== 'function' ||
    typeof secureStore.setItemAsync !== 'function' ||
    typeof secureStore.deleteItemAsync !== 'function' ||
    !legacyStorage ||
    typeof legacyStorage.getItem !== 'function' ||
    typeof legacyStorage.setItem !== 'function' ||
    typeof legacyStorage.removeItem !== 'function'
  ) {
    throw new TypeError('Secure auth storage requires SecureStore and legacy storage adapters.');
  }
  if (!Number.isSafeInteger(chunkBytes) || chunkBytes < 256 || chunkBytes > DEFAULT_CHUNK_BYTES) {
    throw new RangeError(`Secure auth chunk size must be between 256 and ${DEFAULT_CHUNK_BYTES} bytes.`);
  }

  const secureOptions = secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY === undefined
    ? undefined
    : { keychainAccessible: secureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

  async function readManifest(key) {
    const raw = await secureStore.getItemAsync(makeManifestKey(key));
    return { raw, manifest: parseManifest(raw) };
  }

  async function getItem(key) {
      if (typeof key !== 'string' || !key) throw new TypeError('Auth storage key is required.');
      // Check the legacy marker first, then the Keychain/Keystore marker. The
      // secure marker survives an iOS app reinstall if manifest deletion failed.
      if (await legacyStorage.getItem(makeRevocationKey(key)) === '1') return null;
      let secureRevocation;
      try {
        secureRevocation = await secureStore.getItemAsync(makeRevocationKey(key));
      } catch {
        // Older binaries without the native module can still read legacy sessions.
        // During sign-out, the legacy marker is written before any secure operation.
        return legacyStorage.getItem(key);
      }
      if (secureRevocation === '1') return null;
      let stored;
      try {
        stored = await readManifest(key);
      } catch {
        // A JS update can briefly run against an older native binary without SecureStore.
        // Keep the existing session readable until the native module is installed.
        return legacyStorage.getItem(key);
      }

      if (stored.raw !== null) {
        if (!stored.manifest) return null;
        return readSecureValue(secureStore, key, stored.manifest);
      }

      const legacyValue = await legacyStorage.getItem(key);
      if (legacyValue === null || legacyValue === undefined) return null;

      try {
        await setItem(key, legacyValue);
        const migrated = await getItem(key);
        if (migrated === legacyValue) return migrated;
      } catch {
        // Do not discard the only surviving copy of a user's current session.
      }
      return legacyValue;
    }

  async function setItem(key, value) {
      if (typeof key !== 'string' || !key || typeof value !== 'string') {
        throw new TypeError('Auth storage requires a key and string value.');
      }
      const byteLength = utf8ByteLength(value);
      const chunks = splitUtf8(value, chunkBytes);
      if (chunks.length > MAX_CHUNKS) {
        throw new RangeError('Supabase auth session exceeds the secure storage capacity.');
      }

      const previous = await readManifest(key);
      generationSequence += 1;
      const generation = `${Date.now().toString(36)}-${generationSequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      for (let index = 0; index < chunks.length; index += 1) {
        await secureStore.setItemAsync(makeChunkKey(key, generation, index), chunks[index], secureOptions);
      }

      const nextManifest = {
        version: 2,
        generation,
        count: chunks.length,
        byteLength,
      };
      await secureStore.setItemAsync(makeManifestKey(key), JSON.stringify(nextManifest), secureOptions);

      // Publish the new manifest before clearing revocation. The legacy marker
      // remains in place until the secure marker is gone, so a crash cannot
      // expose the previous session between these operations.
      const secureRevocation = await secureStore.getItemAsync(makeRevocationKey(key));
      if (secureRevocation === '1') await secureStore.deleteItemAsync(makeRevocationKey(key));
      try {
        await legacyStorage.removeItem(key);
      } catch {
        // SecureStore is now authoritative; a stale legacy copy is not read while a manifest exists.
      }
      await legacyStorage.removeItem(makeRevocationKey(key));
      if (previous.manifest) await deleteGeneration(secureStore, key, previous.manifest);
    }

  async function removeItem(key) {
      if (typeof key !== 'string' || !key) throw new TypeError('Auth storage key is required.');
      // Persist revocation in AsyncStorage first for immediate same-install
      // protection, then in Keychain/Keystore so it survives iOS reinstall if
      // manifest deletion fails.
      await legacyStorage.setItem(makeRevocationKey(key), '1');
      try {
        await secureStore.setItemAsync(makeRevocationKey(key), '1', secureOptions);
      } catch (markerError) {
        // If a durable marker cannot be written, still try to remove the
        // manifest. Without its pointer, leftover chunks cannot restore a session.
        try {
          const stored = await readManifest(key);
          await secureStore.deleteItemAsync(makeManifestKey(key));
          if (stored.manifest) await deleteGeneration(secureStore, key, stored.manifest);
          await legacyStorage.removeItem(key);
          await legacyStorage.removeItem(makeRevocationKey(key));
          return;
        } catch {
          throw markerError;
        }
      }
      await legacyStorage.removeItem(key);
      const stored = await readManifest(key);
      await secureStore.deleteItemAsync(makeManifestKey(key));
      if (stored.manifest) await deleteGeneration(secureStore, key, stored.manifest);
      // Keep both revocation markers until a fresh session has been fully written.
    }

  return { getItem, setItem, removeItem };
}

export const secureAuthStorageLimits = Object.freeze({
  chunkBytes: DEFAULT_CHUNK_BYTES,
  maxChunks: MAX_CHUNKS,
  maxValueBytes: DEFAULT_CHUNK_BYTES * MAX_CHUNKS,
});
