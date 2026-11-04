import { getMediaSaveRequest, isCompatibleMediaContentType } from '../utils/mediaSavePolicy.js';

/** Download remote chat/status media, validate the response, save it, then clean up cache files. */
export async function saveMediaToLibrary({ uri, kind, FileSystem, MediaLibrary, prefix = 'zannychat-media' }) {
  const request = getMediaSaveRequest(uri, kind, prefix);
  if (!request) throw new Error('This media link is invalid or the media type is unsupported.');

  const permission = await MediaLibrary.requestPermissionsAsync(true, []);
  if (!permission?.granted) throw new Error('Photo library permission is required to save media.');

  const destination = `${FileSystem.cacheDirectory}${request.filename}`;
  let downloadedUri;
  try {
    const downloaded = await FileSystem.downloadAsync(request.uri, destination);
    downloadedUri = downloaded?.uri;
    if (!downloadedUri || !Number.isInteger(downloaded.status) || downloaded.status < 200 || downloaded.status >= 300) {
      throw new Error('The media could not be downloaded. Check your connection and try again.');
    }
    const contentType = downloaded.headers?.['content-type'] || downloaded.headers?.['Content-Type'];
    if (!isCompatibleMediaContentType(contentType, request.kind)) {
      throw new Error('The downloaded file type does not match the selected media.');
    }
    await MediaLibrary.saveToLibraryAsync(downloadedUri);
    return { kind: request.kind, uri: downloadedUri };
  } finally {
    const cleanupUri = downloadedUri || destination;
    try {
      if (cleanupUri && FileSystem.deleteAsync) await FileSystem.deleteAsync(cleanupUri, { idempotent: true });
    } catch (_) { /* A leftover cache file must not turn a successful save into a failure. */ }
  }
}
