export function getLiveStageTileFrame({ index = 0, count = 1, width, height }) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeCount = Math.max(1, Math.floor(Number(count) || 1));
  const columns = safeCount === 1 ? 1 : safeWidth >= 620 ? 3 : 2;
  const rows = Math.ceil(safeCount / columns);
  const gap = 8;
  const maxColumnWidth = Math.max(1, Math.floor((safeWidth - gap * (columns - 1)) / columns));
  const maxRowHeight = Math.max(1, Math.floor((safeHeight - gap * (rows - 1)) / rows));
  const tileHeight = Math.max(1, Math.min(208, maxRowHeight, Math.floor(maxColumnWidth / 0.75)));
  const tileWidth = Math.max(1, Math.min(156, Math.floor(tileHeight * 0.75), maxColumnWidth));
  const column = Math.max(0, Math.floor(index) % columns);
  const row = Math.max(0, Math.floor(index / columns));
  return {
    x: Math.max(0, safeWidth - tileWidth - column * (tileWidth + gap)),
    y: Math.max(0, row * (tileHeight + gap)),
    width: tileWidth,
    height: tileHeight,
  };
}
