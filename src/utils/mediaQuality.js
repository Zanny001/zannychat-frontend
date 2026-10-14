export const PHOTO_QUALITY_OPTIONS = {
  compact: { key: 'compact', label: 'Data saver', detail: 'Smaller uploads', quality: 0.45 },
  balanced: { key: 'balanced', label: 'Balanced', detail: 'Everyday sharing', quality: 0.7 },
  high: { key: 'high', label: 'High detail', detail: 'Sharper photos', quality: 0.9 },
};

export const DEFAULT_MEDIA_PREFERENCES = {
  photoQuality: 'balanced',
  dataSaver: false,
};

export function normalizeMediaPreferences(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    photoQuality: Object.prototype.hasOwnProperty.call(PHOTO_QUALITY_OPTIONS, source.photoQuality)
      ? source.photoQuality
      : DEFAULT_MEDIA_PREFERENCES.photoQuality,
    dataSaver: source.dataSaver === true,
  };
}

export function resolvePhotoUploadQuality(preferences) {
  const normalized = normalizeMediaPreferences(preferences);
  if (normalized.dataSaver) return PHOTO_QUALITY_OPTIONS.compact.quality;
  return PHOTO_QUALITY_OPTIONS[normalized.photoQuality].quality;
}
