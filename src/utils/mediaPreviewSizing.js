const PREVIEW_LIMITS = Object.freeze({
  image: { min: 152, max: 232, fraction: 0.6 },
  video: { min: 176, max: 260, fraction: 0.66 },
});

export function getMediaPreviewSize(viewportWidth, kind = 'image') {
  const config = PREVIEW_LIMITS[kind] || PREVIEW_LIMITS.image;
  const viewport = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 390;
  const width = Math.round(Math.min(config.max, Math.max(config.min, viewport * config.fraction)));
  return {
    width,
    height: kind === 'video' ? Math.round(width * 9 / 16) : width,
  };
}
