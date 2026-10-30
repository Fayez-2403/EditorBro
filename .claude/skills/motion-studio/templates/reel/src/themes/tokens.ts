// The reel's style tokens: ONE world per reel (copy docs/style_guide.md here). Replace every value for the new look;
// never reuse the previous reel's palette. Base, text, one accent, one secondary accent (rarely more).
export const FPS = 60;
export const W = 1080, H = 1920;
export const C = {
  base: '#F6F1EA',     // ground / paper
  ink: '#1C1B22',      // text
  ink2: '#55525E',     // secondary text
  accent: '#D97757',   // the one accent (keywords, hero)
  accent2: '#2F6FEB',  // rare secondary accent
  card: '#FFFFFF',
  warn: '#E5484D',     // caveats / limits
};
export const FONT = {
  display: 'Archivo, Inter, sans-serif',  // condensed display (variable width 62-125 %)
  ui: 'Inter, sans-serif',
  mono: '"JetBrains Mono", monospace',
};
/** hard offset shadow, the house "printed" depth */
export const ink = (d = 6, col = C.ink) => `${d}px ${d}px 0 ${col}`;
/** Instagram 9:16 safe area: keep captions/CTA inside (top 220, bottom 380 for the UI, sides 90) */
export const SAFE = { top: 220, bottom: 1540, left: 90, right: 990 };
