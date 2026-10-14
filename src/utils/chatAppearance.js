export const CHAT_CANVASES = [
  { key: 'theme', label: 'Mood matched', description: 'Follow your current ZannyChat mood', color: null },
  { key: 'obsidian', label: 'Obsidian', description: 'Deep charcoal with a quiet, premium feel', color: '#101116' },
  { key: 'plum', label: 'Velvet plum', description: 'A rich aubergine night canvas', color: '#1A1320' },
  { key: 'ocean', label: 'Midnight ocean', description: 'A calm blue-black conversation space', color: '#101B27' },
  { key: 'forest', label: 'Pine glass', description: 'A subtle, deep green tint', color: '#101D1A' },
  { key: 'ember', label: 'Warm ember', description: 'A warm charcoal with a muted red undertone', color: '#211617' },
];

export const DEFAULT_CHAT_CANVAS = 'theme';

export function normalizeChatCanvas(value) {
  return CHAT_CANVASES.some((item) => item.key === value) ? value : DEFAULT_CHAT_CANVAS;
}

export function resolveChatCanvas(value, themeBackground) {
  const key = normalizeChatCanvas(value);
  return CHAT_CANVASES.find((item) => item.key === key)?.color || themeBackground;
}
