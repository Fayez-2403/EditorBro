// EditorBro: one world in four rooms. The road (golden hour, captured from web/), the code world (teal on black),
// the desk (near-black with screen glow) and the editorial page (paper, red disc, black type). Gold = the billboard.
export const FPS = 60;
export const W = 1080, H = 1920;
export const C = {
  base: '#050608',     // night / the code world
  ink: '#F4F1EA',      // text on dark
  ink2: '#9A978F',     // secondary text on dark
  gold: '#F2C35A',     // the billboard lettering: hero words, keywords
  gold2: '#FFE08A',
  goldDeep: '#B9822C',
  brown: '#47270F',    // the sign's outline ink
  teal: '#1FE5C8',     // code
  tealDeep: '#0B6E66',
  red: '#E0262B',      // the editorial disc
  paper: '#E8E5DE',
  paperInk: '#141414',
  glass: 'rgba(10,12,14,0.74)',
  green: '#38D67A',    // gate ticks
  accent: '#F2C35A',
  card: 'rgba(10,12,14,0.74)',
  warn: '#E5484D',
};
export const FONT = {
  brand: 'Fraunces, serif',                 // the painted sign voice
  display: 'Archivo, Inter, sans-serif',    // condensed headlines (variable width 62-125 %)
  ui: 'Inter, sans-serif',
  mono: '"JetBrains Mono", monospace',
};
/** hard offset shadow */
export const ink = (d = 6, col = '#000') => `${d}px ${d}px 0 ${col}`;
/** Instagram 9:16 safe area: keep captions/CTA inside (top 220, bottom 380 for the UI, sides 90) */
export const SAFE = { top: 220, bottom: 1540, left: 90, right: 990 };
