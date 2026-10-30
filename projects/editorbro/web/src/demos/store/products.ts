// Threadline catalogue + garment illustrations drawn in SVG (no photos). Every product is sample data for a fictional store.
export type Cat = 'tees' | 'jackets' | 'sneakers' | 'bags';
export type Kind =
  | 'tee' | 'tee-stripe' | 'tee-pocket'
  | 'chore' | 'quilted' | 'trucker'
  | 'court' | 'runner' | 'hitop'
  | 'tote' | 'sling' | 'rolltop';

export interface Colourway { name: string; base: string; accent: string; sole?: string }
export interface Product {
  id: string;
  name: string;
  cat: Cat;
  kind: Kind;
  price: number;
  tone: string;
  colours: Colourway[];
  sizes: string[];
  soldOut: string[];
  tag?: string;
  newRank: number; // lower = newer
  rating: number;
  reviews: number;
  material: string;
  fit: string;
}

const APPAREL = ['S', 'M', 'L', 'XL'];
const UK = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'];

export const PRODUCTS: Product[] = [
  { id: 'j01', name: 'Waxed Chore Jacket', cat: 'jackets', kind: 'chore', price: 6490, tone: '#e4e0d3', tag: 'New', newRank: 1, rating: 4.8, reviews: 126,
    colours: [{ name: 'Olive', base: '#5c6341', accent: '#2f3322' }, { name: 'Tobacco', base: '#8a5a33', accent: '#3d2817' }, { name: 'Navy', base: '#2c3651', accent: '#151b2b' }],
    sizes: APPAREL, soldOut: ['S'], material: 'Waxed organic cotton canvas, corozo buttons', fit: 'Relaxed through the body. Size down for a closer fit.' },
  { id: 't01', name: 'Everyday Heavy Tee', cat: 'tees', kind: 'tee', price: 1290, tone: '#e7e2d7', newRank: 6, rating: 4.7, reviews: 412,
    colours: [{ name: 'Ink', base: '#26282e', accent: '#0f1013' }, { name: 'Bone', base: '#efe8da', accent: '#b9ae98' }, { name: 'Sage', base: '#9caa8e', accent: '#5d6b52' }],
    sizes: APPAREL, soldOut: [], material: '240 gsm combed cotton jersey', fit: 'Boxy shoulders, straight body.' },
  { id: 's01', name: 'Court Low Sneaker', cat: 'sneakers', kind: 'court', price: 4290, tone: '#e6e2db', newRank: 4, rating: 4.6, reviews: 208,
    colours: [{ name: 'Chalk / Gum', base: '#f3efe6', accent: '#2934c4', sole: '#c8925a' }, { name: 'Black', base: '#24252a', accent: '#d9d4c8', sole: '#efe9dc' }],
    sizes: UK, soldOut: ['UK 6'], material: 'Full-grain leather upper, rubber cupsole', fit: 'True to size.' },
  { id: 'b01', name: 'Market Tote', cat: 'bags', kind: 'tote', price: 1990, tone: '#ece3d4', newRank: 8, rating: 4.9, reviews: 97,
    colours: [{ name: 'Natural', base: '#e2d3b6', accent: '#2934c4' }, { name: 'Black', base: '#2a2a2c', accent: '#c9b89a' }],
    sizes: ['One size'], soldOut: [], material: '18 oz cotton canvas, webbing straps', fit: '42 × 38 × 14 cm. Fits a 15-inch laptop.' },
  { id: 'j02', name: 'Quilted Liner Jacket', cat: 'jackets', kind: 'quilted', price: 5290, tone: '#e1e4dd', newRank: 3, rating: 4.6, reviews: 84,
    colours: [{ name: 'Moss', base: '#6c7451', accent: '#3c4129' }, { name: 'Black', base: '#2a2b2e', accent: '#121214' }],
    sizes: APPAREL, soldOut: ['XL'], material: 'Recycled nylon shell, light padding', fit: 'Cut to layer under a coat.' },
  { id: 't02', name: 'Breton Stripe Tee', cat: 'tees', kind: 'tee-stripe', price: 1590, tone: '#e3e6e4', newRank: 9, rating: 4.5, reviews: 151,
    colours: [{ name: 'Ecru / Navy', base: '#f1ebdc', accent: '#26386a' }, { name: 'Ecru / Brick', base: '#f1ebdc', accent: '#b4462f' }],
    sizes: APPAREL, soldOut: ['S'], material: 'Midweight cotton jersey, yarn-dyed', fit: 'Regular fit.' },
  { id: 's02', name: 'Trail Runner', cat: 'sneakers', kind: 'runner', price: 5690, tone: '#e2e4e7', tag: 'Low stock', newRank: 2, rating: 4.7, reviews: 63,
    colours: [{ name: 'Slate / Signal', base: '#5d6673', accent: '#e8643a', sole: '#e9e5dc' }, { name: 'Sand', base: '#cbbb9c', accent: '#3f4a3a', sole: '#f2ede2' }],
    sizes: UK.slice(1), soldOut: ['UK 10'], material: 'Engineered mesh, lugged rubber outsole', fit: 'Runs half a size small.' },
  { id: 'b02', name: 'Sling Crossbody', cat: 'bags', kind: 'sling', price: 2490, tone: '#e9e0d6', newRank: 5, rating: 4.6, reviews: 72,
    colours: [{ name: 'Tan', base: '#a8703f', accent: '#5b3a1e' }, { name: 'Charcoal', base: '#3a3b3f', accent: '#1b1c1f' }],
    sizes: ['One size'], soldOut: [], material: 'Water-resistant waxed canvas', fit: '30 × 16 × 8 cm, adjustable strap.' },
  { id: 'j03', name: 'Indigo Trucker Jacket', cat: 'jackets', kind: 'trucker', price: 4790, tone: '#e6e3dc', newRank: 7, rating: 4.7, reviews: 190,
    colours: [{ name: 'Rinse', base: '#2f3d66', accent: '#c98b4a' }, { name: 'Mid wash', base: '#5d77a4', accent: '#c98b4a' }],
    sizes: APPAREL, soldOut: [], material: '13.5 oz selvedge-look denim, copper shanks', fit: 'Classic cropped fit.' },
  { id: 't03', name: 'Boxy Pocket Tee', cat: 'tees', kind: 'tee-pocket', price: 1490, tone: '#ede4d9', tag: 'New', newRank: 2, rating: 4.6, reviews: 58,
    colours: [{ name: 'Clay', base: '#c47b5c', accent: '#8a4f37' }, { name: 'Oat', base: '#dccdb3', accent: '#a7967a' }],
    sizes: APPAREL, soldOut: ['XL'], material: 'Garment-dyed slub cotton', fit: 'Dropped shoulder, cropped length.' },
  { id: 's03', name: 'Canvas Hi-Top', cat: 'sneakers', kind: 'hitop', price: 3490, tone: '#ebe5da', newRank: 10, rating: 4.4, reviews: 133,
    colours: [{ name: 'Indigo', base: '#2f3a6b', accent: '#efe7d6', sole: '#f6f2ea' }, { name: 'Ecru', base: '#efe7d6', accent: '#26282e', sole: '#f6f2ea' }],
    sizes: UK, soldOut: [], material: '12 oz cotton canvas, vulcanised sole', fit: 'True to size.' },
  { id: 'b03', name: 'Roll-top Backpack', cat: 'bags', kind: 'rolltop', price: 3990, tone: '#e3e2da', newRank: 11, rating: 4.8, reviews: 88,
    colours: [{ name: 'Olive', base: '#626a48', accent: '#2a2c22' }, { name: 'Black', base: '#29292c', accent: '#0f0f11' }],
    sizes: ['One size'], soldOut: [], material: 'Coated cordura-look nylon, 22 L', fit: 'Padded laptop sleeve, roll-top closure.' },
];

export const CATS: { id: 'all' | Cat; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'tees', label: 'Tees' }, { id: 'jackets', label: 'Jackets' }, { id: 'sneakers', label: 'Sneakers' }, { id: 'bags', label: 'Bags' },
];
export const PRICES = [
  { id: 'u2', label: 'Under ₹2,000', test: (p: number) => p < 2000 },
  { id: '2to5', label: '₹2,000–4,999', test: (p: number) => p >= 2000 && p < 5000 },
  { id: 'o5', label: '₹5,000+', test: (p: number) => p >= 5000 },
];
export const SIZES = ['S', 'M', 'L', 'XL'];

export const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

// ------------------------------------------------------------------ colour helpers
function hex(c: string) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a: string, b: string, k: number) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
const dk = (c: string, k: number) => mix(c, '#000000', k);
const lt = (c: string, k: number) => mix(c, '#ffffff', k);

let uid = 0;

function frame(inner: string, defs: string, body: string, gid: string, extra = '') {
  return `<svg class="art" viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <linearGradient id="${gid}s" x1="0" y1="0" x2="1" y2="0.25">
    <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/>
  </linearGradient>
  <linearGradient id="${gid}v" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/>
  </linearGradient>
  <clipPath id="${gid}c"><path d="${body}"/></clipPath>
  ${defs}
</defs>
<ellipse cx="120" cy="256" rx="84" ry="7" fill="#1a1712" opacity=".1"/>
${inner}
${extra}
</svg>`;
}
const shadeLayer = (gid: string) => `<g clip-path="url(#${gid}c)"><rect width="240" height="280" fill="url(#${gid}s)"/><rect width="240" height="280" fill="url(#${gid}v)"/></g>`;
const stitch = (d: string, c: string, w = 1.1) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-dasharray="3.2 2.6" stroke-linecap="round"/>`;

function tee(c: Colourway, v: 'plain' | 'stripe' | 'pocket') {
  const g = `t${++uid}`;
  const body = 'M93 50 Q72 55 52 64 L22 112 L46 129 L64 107 L62 238 Q120 247 178 238 L176 107 L194 129 L218 112 L188 64 Q168 55 147 50 C138 65 102 65 93 50 Z';
  const base = v === 'stripe' ? c.base : c.base;
  const line = dk(base, 0.28);
  let pattern = '';
  if (v === 'stripe') {
    let rows = '';
    for (let y = 74; y < 246; y += 15) rows += `<rect x="0" y="${y}" width="240" height="6.5" fill="${c.accent}"/>`;
    pattern = `<g clip-path="url(#${g}c)">${rows}</g>`;
  }
  const pocket = v === 'pocket'
    ? `<path d="M132 94 h28 v30 q-14 6 -28 0 z" fill="${dk(base, 0.05)}" stroke="${dk(base, 0.22)}" stroke-width="1"/>${stitch('M134 98 h24', dk(base, 0.35), 1)}`
    : '';
  const inner = `
<path d="M93 50 C104 41 136 41 147 50 C138 59 102 59 93 50 Z" fill="${dk(base, 0.38)}"/>
<path d="${body}" fill="${base}"/>
${pattern}
<g clip-path="url(#${g}c)" fill="none" stroke-linecap="round">
  <path d="M66 112 Q80 126 74 146" stroke="${dk(base, 0.2)}" stroke-width="5" opacity=".35"/>
  <path d="M174 112 Q160 126 166 146" stroke="${dk(base, 0.2)}" stroke-width="5" opacity=".35"/>
  <path d="M104 150 Q110 196 100 236" stroke="${dk(base, 0.12)}" stroke-width="9" opacity=".25"/>
  <path d="M64 107 L56 66" stroke="${line}" stroke-width="1" opacity=".55"/>
  <path d="M176 107 L184 66" stroke="${line}" stroke-width="1" opacity=".55"/>
</g>
${shadeLayer(g)}
<path d="M93 50 C103 65 137 65 147 50" fill="none" stroke="${dk(base, 0.2)}" stroke-width="6.5" stroke-linecap="round"/>
${stitch('M27 105 L50 121', line)}${stitch('M213 105 L190 121', line)}${stitch('M66 230 Q120 239 174 230', line)}
${pocket}`;
  return frame(inner, '', body, g);
}

function jacket(c: Colourway, v: 'chore' | 'quilted' | 'trucker') {
  const g = `j${++uid}`;
  const base = c.base;
  const body = 'M94 44 L54 58 Q36 68 34 98 L22 232 L48 236 L64 116 L60 246 L180 246 L176 116 L192 236 L218 232 L206 98 Q204 68 186 58 L146 44 L120 84 Z';
  const line = dk(base, 0.35);
  let detail = '';
  let defs = '';
  if (v === 'quilted') {
    defs = `<pattern id="${g}q" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 H22 M0 0 V22" stroke="${dk(base, 0.32)}" stroke-width="1.2" stroke-dasharray="2.6 2.2" fill="none"/></pattern>`;
    detail += `<g clip-path="url(#${g}c)"><rect width="240" height="280" fill="url(#${g}q)"/></g>`;
    detail += `<path d="M94 44 Q120 54 146 44" fill="none" stroke="${dk(base, 0.25)}" stroke-width="7" stroke-linecap="round"/>`;
    detail += `<path d="M120 84 V246" stroke="${dk(base, 0.4)}" stroke-width="2"/>`;
    for (const y of [102, 136, 170, 204, 236]) detail += `<circle cx="120" cy="${y}" r="3.2" fill="${lt(base, 0.35)}" stroke="${dk(base, 0.4)}" stroke-width="1"/>`;
  } else if (v === 'trucker') {
    detail += `<path d="M62 98 Q120 106 178 98" fill="none" stroke="${c.accent}" stroke-width="1.4" stroke-dasharray="3 2.4"/>`;
    detail += `<path d="M62 102 Q120 110 178 102" fill="none" stroke="${c.accent}" stroke-width="1.4" stroke-dasharray="3 2.4"/>`;
    for (const x of [76, 136]) {
      detail += `<path d="M${x} 112 h28 l-3 18 l-11 6 l-11 -6 z" fill="${dk(base, 0.08)}" stroke="${dk(base, 0.3)}" stroke-width="1"/>`;
      detail += stitch(`M${x + 3} 116 h22`, c.accent, 1.2);
      detail += `<circle cx="${x + 14}" cy="128" r="3" fill="${c.accent}"/>`;
      detail += `<path d="M${x + 14} 140 V226" stroke="${c.accent}" stroke-width="1.3" stroke-dasharray="3 2.4"/>`;
    }
    detail += `<path d="M120 84 V246" stroke="${dk(base, 0.4)}" stroke-width="2"/>`;
    for (const y of [104, 150, 194, 236]) detail += `<circle cx="125" cy="${y}" r="3.6" fill="${c.accent}" stroke="${dk(c.accent, 0.35)}" stroke-width="1"/>`;
    detail += `<rect x="60" y="230" width="120" height="14" fill="${dk(base, 0.1)}"/>`;
    detail += stitch('M62 233 H178', c.accent, 1.2);
    detail += `<path d="M94 44 L78 56 L106 96 L120 84 Z M146 44 L162 56 L134 96 L120 84 Z" fill="${lt(base, 0.06)}" stroke="${dk(base, 0.3)}" stroke-width="1"/>`;
  } else {
    // chore: patch pockets, shirt collar, corozo buttons, waxed sheen
    detail += `<path d="M120 84 V246" stroke="${dk(base, 0.4)}" stroke-width="2"/>`;
    detail += stitch('M128 88 V244', dk(base, 0.42));
    for (const y of [104, 138, 172, 206, 236]) detail += `<circle cx="124" cy="${y}" r="3.4" fill="${dk(base, 0.55)}"/>`;
    for (const [x, y, w, h] of [[72, 166, 38, 42], [132, 166, 38, 42], [136, 102, 26, 28]] as const) {
      detail += `<path d="M${x} ${y} h${w} v${h - 5} q0 5 -5 5 h${-(w - 10)} q-5 0 -5 -5 z" fill="${lt(base, 0.04)}" stroke="${dk(base, 0.3)}" stroke-width="1"/>`;
      detail += stitch(`M${x + 3} ${y + 4} h${w - 6}`, dk(base, 0.4));
    }
    detail += `<path d="M94 44 L78 56 L106 96 L120 84 Z M146 44 L162 56 L134 96 L120 84 Z" fill="${dk(base, 0.12)}" stroke="${dk(base, 0.38)}" stroke-width="1"/>`;
    detail += `<g clip-path="url(#${g}c)"><path d="M40 70 L120 250" stroke="#fff" stroke-opacity=".08" stroke-width="26"/><path d="M150 60 L210 210" stroke="#fff" stroke-opacity=".06" stroke-width="14"/></g>`;
  }
  const inner = `
<path d="M94 44 Q120 34 146 44 L120 84 Z" fill="${dk(base, 0.45)}"/>
<path d="${body}" fill="${base}"/>
<g clip-path="url(#${g}c)" fill="none" stroke-linecap="round">
  <path d="M64 116 L60 64" stroke="${line}" stroke-width="1.1" opacity=".6"/>
  <path d="M176 116 L180 64" stroke="${line}" stroke-width="1.1" opacity=".6"/>
  <path d="M40 150 Q46 190 38 226" stroke="${dk(base, 0.2)}" stroke-width="6" opacity=".35"/>
  <path d="M200 150 Q194 190 202 226" stroke="${dk(base, 0.2)}" stroke-width="6" opacity=".35"/>
</g>
${detail}
${shadeLayer(g)}
<path d="M23 216 L48 220 M217 216 L192 220" stroke="${dk(base, 0.35)}" stroke-width="1.2"/>
${stitch('M24 224 L48 228', dk(base, 0.4))}${stitch('M216 224 L192 228', dk(base, 0.4))}`;
  return frame(inner, defs, body, g);
}

function sneaker(c: Colourway, v: 'court' | 'runner' | 'hitop') {
  const g = `s${++uid}`;
  const base = c.base, sole = c.sole ?? '#f1ece2';
  const line = dk(base, 0.32);
  const hi = v === 'hitop';
  const run = v === 'runner';
  // side profile, toe to the right
  const upper = hi
    ? 'M24 172 C20 140 21 104 29 82 Q33 75 44 75 L84 77 Q92 79 95 88 L106 116 C132 131 162 145 190 152 C212 158 224 164 224 172 Z'
    : 'M24 172 C21 150 23 132 30 118 Q34 111 43 114 C55 120 70 125 85 121 L103 111 C130 127 160 143 190 152 C212 158 224 164 224 172 Z';
  const collar = hi ? 'M29 82 Q33 75 44 75 L84 77' : 'M30 118 Q34 111 43 114 C55 120 70 125 85 121';
  const tongue = hi ? 'M83 78 Q85 62 98 62 Q106 62 106 71 L102 92 Z' : 'M84 121 Q86 101 100 99 Q109 99 109 108 L104 116 Z';
  const lace: [number, number][] = hi
    ? [[96, 102], [103, 115], [113, 126], [127, 134], [141, 141], [155, 147]]
    : [[103, 122], [116, 129], [129, 136], [142, 142], [155, 148]];
  const soleTop = run ? 164 : 172, soleBot = run ? 200 : 197;
  const soleD = run
    ? `M20 ${soleTop + 4} Q60 ${soleTop - 4} 110 ${soleTop + 2} T226 ${soleTop + 2} L226 ${soleBot - 9} Q226 ${soleBot} 214 ${soleBot} L32 ${soleBot} Q18 ${soleBot} 18 ${soleBot - 12} Z`
    : `M21 ${soleTop} L214 ${soleTop} Q226 ${soleTop} 226 ${soleTop + 9} L226 ${soleBot - 9} Q226 ${soleBot} 214 ${soleBot} L31 ${soleBot} Q20 ${soleBot} 20 ${soleBot - 10} L20 ${soleTop + 4} Q20 ${soleTop} 21 ${soleTop} Z`;
  let defs = '';
  let over = '';
  if (run) {
    defs = `<pattern id="${g}m" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r=".9" fill="${dk(base, 0.3)}"/></pattern>`;
    over += `<g clip-path="url(#${g}c)"><rect width="240" height="280" fill="url(#${g}m)" opacity=".55"/></g>`;
    over += `<path d="M40 172 C60 146 92 136 128 142 C150 146 168 156 178 172 Z" fill="${c.accent}"/>`;
    over += `<path d="M58 172 C76 154 100 148 126 152" fill="none" stroke="${lt(c.accent, 0.35)}" stroke-width="1.2" stroke-dasharray="3 2.4"/>`;
    over += `<path d="M24 172 C21 150 23 132 30 118 Q34 111 43 114 L50 118 C45 136 46 156 52 172 Z" fill="${dk(base, 0.25)}"/>`;
    over += `<path d="M34 118 q-9 -16 4 -22" fill="none" stroke="${c.accent}" stroke-width="4" stroke-linecap="round"/>`;
    over += `<path d="M180 152 C204 156 222 162 224 172 L176 172 C172 164 172 157 180 152 Z" fill="${dk(base, 0.18)}"/>`;
  } else {
    over += `<path d="M178 152 C200 156 222 162 224 172 L170 172 C166 164 168 156 178 152 Z" fill="${hi ? sole : dk(base, 0.05)}" stroke="${hi ? dk(sole, 0.15) : line}" stroke-width="1"/>`;
    over += stitch('M176 158 C196 161 214 165 219 170', hi ? dk(sole, 0.3) : dk(base, 0.38), 1);
    if (!hi) {
      over += `<path d="M24 172 C21 150 23 132 30 118 Q34 111 43 114 L52 119 C45 136 46 156 54 172 Z" fill="${dk(base, 0.06)}" stroke="${line}" stroke-width="1"/>`;
      over += stitch('M50 124 C45 140 46 156 51 170', dk(base, 0.38), 1);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) over += `<circle cx="${190 + j * 7 + i * 2}" cy="${160 + i * 4}" r=".9" fill="${dk(base, 0.35)}"/>`;
      over += `<rect x="29" y="134" width="10" height="15" rx="1.5" fill="${c.accent}"/>`;
    } else {
      over += `<circle cx="58" cy="118" r="11" fill="none" stroke="${dk(base, 0.25)}" stroke-width="0"/>`;
      over += stitch('M30 100 C40 99 50 100 60 104', dk(base, 0.38), 1);
    }
    over += `<path d="${hi ? 'M96 92 C112 120 150 140 188 150' : 'M100 116 C128 132 160 146 190 153'}" fill="none" stroke="${line}" stroke-width="1"/>`;
    over += stitch(hi ? 'M92 96 C108 124 146 144 182 153' : 'M96 121 C126 137 156 150 184 157', dk(base, 0.38), 1);
  }
  let laces = '';
  lace.forEach(([x, y], i) => {
    laces += `<circle cx="${x}" cy="${y}" r="2.2" fill="${dk(base, 0.55)}"/>`;
    if (i < lace.length - 1) laces += `<path d="M${x - 5} ${y - 4} L${lace[i + 1][0] + 2} ${lace[i + 1][1] - 6}" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>`;
  });
  const solePart = run
    ? `<path d="${soleD}" fill="${sole}" stroke="${dk(sole, 0.12)}" stroke-width="1"/>
<path d="M30 186 C70 176 110 192 150 182 S206 176 222 182" fill="none" stroke="${dk(sole, 0.16)}" stroke-width="1.4"/>
${Array.from({ length: 13 }, (_, i) => `<rect x="${30 + i * 14.5}" y="${soleBot - 4}" width="9" height="5" rx="1.5" fill="${dk(sole, 0.5)}"/>`).join('')}`
    : `<path d="${soleD}" fill="${sole}" stroke="${dk(sole, 0.14)}" stroke-width="1"/>
<rect x="20" y="${soleBot - 7}" width="206" height="7" rx="3.5" fill="${v === 'court' ? dk(sole, 0.12) : dk(sole, 0.08)}"/>
${stitch(`M28 ${soleTop + 6} H218`, dk(sole, 0.32), 1)}
${hi ? `<path d="M22 ${soleTop + 13} H224" stroke="${c.accent}" stroke-width="1.6"/>` : ''}`;
  const inner = `
<g transform="translate(0 34) rotate(-3 120 160)">
<path d="${tongue}" fill="${dk(base, 0.1)}" stroke="${line}" stroke-width="1"/>
<path d="${upper}" fill="${base}"/>
${over}
${shadeLayer(g)}
<path d="${collar}" fill="none" stroke="${dk(base, 0.42)}" stroke-width="4.5" stroke-linecap="round"/>
${laces}
${solePart}
</g>`;
  return frame(inner, defs, upper, g);
}

function bag(c: Colourway, v: 'tote' | 'sling' | 'rolltop') {
  const g = `b${++uid}`;
  const base = c.base;
  const line = dk(base, 0.32);
  if (v === 'tote') {
    const body = 'M50 108 L190 108 L200 246 L40 246 Z';
    const inner = `
<path d="M86 112 Q84 46 120 46 Q156 46 154 112" fill="none" stroke="${dk(c.accent, 0.15)}" stroke-width="11"/>
<path d="M86 112 Q84 46 120 46 Q156 46 154 112" fill="none" stroke="${lt(c.accent, 0.15)}" stroke-width="2" stroke-dasharray="3 2.5"/>
<path d="${body}" fill="${base}"/>
<rect x="50" y="108" width="140" height="16" fill="${dk(base, 0.08)}"/>
${stitch('M51 121 H189', line)}
<path d="M86 108 V180 M154 108 V180" stroke="${c.accent}" stroke-width="11"/>
${stitch('M82 112 V176', lt(c.accent, 0.4), 1)}${stitch('M158 112 V176', lt(c.accent, 0.4), 1)}
<rect x="104" y="196" width="32" height="14" fill="${c.accent}"/><path d="M110 203 H130" stroke="${lt(c.accent, 0.6)}" stroke-width="1.4"/>
${shadeLayer(g)}
<path d="M42 236 Q120 230 198 236" fill="none" stroke="${dk(base, 0.1)}" stroke-width="5" opacity=".5"/>`;
    return frame(inner, '', body, g);
  }
  if (v === 'sling') {
    const body = 'M36 182 Q36 112 120 108 Q204 112 204 182 Q204 214 172 216 L68 216 Q36 214 36 182 Z';
    const inner = `
<path d="M44 160 C30 40 210 40 196 160" fill="none" stroke="${c.accent}" stroke-width="10"/>
<path d="M44 160 C30 40 210 40 196 160" fill="none" stroke="${lt(c.accent, 0.3)}" stroke-width="1.2" stroke-dasharray="3 2.5"/>
<path d="${body}" fill="${base}"/>
<path d="M48 150 Q120 112 192 150" fill="none" stroke="${dk(base, 0.4)}" stroke-width="3"/>
<path d="M48 150 Q120 112 192 150" fill="none" stroke="#d8d2c4" stroke-width="1.2" stroke-dasharray="2 2"/>
<rect x="146" y="124" width="8" height="18" rx="2" fill="#c9c2b2" transform="rotate(20 150 133)"/>
<path d="M60 168 Q120 150 180 168 L176 204 L64 204 Z" fill="${dk(base, 0.06)}" stroke="${line}" stroke-width="1"/>
${stitch('M66 174 Q120 158 174 174', line)}
<rect x="108" y="184" width="24" height="10" fill="${c.accent}"/>
${shadeLayer(g)}`;
    return frame(inner, '', body, g);
  }
  const body = 'M66 94 Q66 82 80 82 L160 82 Q174 82 174 94 L178 232 Q178 246 164 246 L76 246 Q62 246 62 232 Z';
  const inner = `
<path d="M74 54 Q74 44 84 44 L156 44 Q166 44 166 54 L168 88 L72 88 Z" fill="${dk(base, 0.08)}"/>
<path d="M76 58 H164 M76 68 H164 M76 78 H164" stroke="${dk(base, 0.3)}" stroke-width="1.2"/>
<path d="${body}" fill="${base}"/>
<rect x="84" y="150" width="72" height="80" rx="8" fill="${dk(base, 0.07)}" stroke="${line}" stroke-width="1"/>
${stitch('M88 158 H152', line)}
<path d="M92 40 V170 M148 40 V170" stroke="${c.accent}" stroke-width="7"/>
<rect x="86" y="160" width="12" height="16" rx="2" fill="#bdb6a6"/><rect x="142" y="160" width="12" height="16" rx="2" fill="#bdb6a6"/>
<path d="M100 26 Q120 14 140 26" fill="none" stroke="${c.accent}" stroke-width="6" stroke-linecap="round"/>
${shadeLayer(g)}`;
  return frame(inner, '', body, g);
}

export function art(kind: Kind, c: Colourway) {
  switch (kind) {
    case 'tee': return tee(c, 'plain');
    case 'tee-stripe': return tee(c, 'stripe');
    case 'tee-pocket': return tee(c, 'pocket');
    case 'chore': return jacket(c, 'chore');
    case 'quilted': return jacket(c, 'quilted');
    case 'trucker': return jacket(c, 'trucker');
    case 'court': return sneaker(c, 'court');
    case 'runner': return sneaker(c, 'runner');
    case 'hitop': return sneaker(c, 'hitop');
    case 'tote': return bag(c, 'tote');
    case 'sling': return bag(c, 'sling');
    default: return bag(c, 'rolltop');
  }
}
