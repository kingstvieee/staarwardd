// StarCenttinel visual tokens — taken from the approved concept boards:
// chrome bevels, laser red, gold accents, caution yellow, glass-blue module tiles.
export const C = {
  bg: '#040507',
  panel: '#0d0f14',
  panelHi: '#161921',
  red: '#ff233d',
  redHot: '#ff4d5e',
  redDeep: '#2a070e',
  gold: '#e8ba6a',
  goldHi: '#ffd98f',
  caution: '#ffcc33',
  ok: '#3ddc84',
  pending: '#f59e0b',
  off: '#6b7280',
  ice: '#9fd8ff',
  text: '#ffffff',
  muted: '#a8abb5',
  faint: '#6f727b',
};

export const F = {
  display: 'Orbitron_900Black',
  displayB: 'Orbitron_700Bold',
  ui: 'Rajdhani_600SemiBold',
  uiB: 'Rajdhani_700Bold',
};

// Chrome gradient stops used for every bevelled frame.
export const CHROME = ['#ffffff', '#9a9ea8', '#2c2f36', '#d7dae0', '#3a3d44', '#b9bcc4'];
export const CHROME_RED = ['#ffb3bb', '#ff233d', '#4a0912', '#ff5a6a', '#7a0f1e', '#ff8a96'];
export const CHROME_ICE = ['#e6f6ff', '#6fb6e6', '#1b2a38', '#bfe6ff', '#24384a', '#8fd0ff'];

export const glow = (color = C.red, r = 14) => ({
  shadowColor: color, shadowOpacity: 0.9, shadowRadius: r, shadowOffset: { width: 0, height: 0 }, elevation: 8,
});
export const textGlow = (color = C.red, r = 10) => ({
  textShadowColor: color, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 },
});
