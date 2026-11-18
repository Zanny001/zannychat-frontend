export const LIVE_CATEGORY_THEMES = Object.freeze({
  entertainment: { label: 'Entertainment', icon: 'film-outline', background: '#160D23', glow: '#8E3D85', accent: '#F3A5D0' },
  social: { label: 'Social', icon: 'chatbubbles-outline', background: '#0B1B2A', glow: '#176D8C', accent: '#86D8F2' },
  politics: { label: 'Politics', icon: 'podium-outline', background: '#20151D', glow: '#87552F', accent: '#E8C18D' },
  science: { label: 'Science', icon: 'flask-outline', background: '#0B2023', glow: '#197C77', accent: '#8BE1D8' },
  education: { label: 'Education', icon: 'school-outline', background: '#151B30', glow: '#465CA4', accent: '#A9B8FF' },
  finance: { label: 'Finance', icon: 'trending-up-outline', background: '#1B1A20', glow: '#806A32', accent: '#E7D18A' },
  technology: { label: 'Technology', icon: 'hardware-chip-outline', background: '#0D1428', glow: '#435CB2', accent: '#9DB7FF' },
  sports: { label: 'Sports', icon: 'trophy-outline', background: '#20151B', glow: '#9B4A31', accent: '#FFB18C' },
  business: { label: 'Business', icon: 'briefcase-outline', background: '#151C22', glow: '#526D7B', accent: '#B8D8E7' },
  health: { label: 'Health', icon: 'heart-outline', background: '#21131D', glow: '#98466C', accent: '#F0A7C8' },
  other: { label: 'Other', icon: 'sparkles-outline', background: '#171426', glow: '#6755A6', accent: '#C4B5FF' },
});

export function getLiveCategoryTheme(category) {
  return LIVE_CATEGORY_THEMES[category] || LIVE_CATEGORY_THEMES.social;
}
