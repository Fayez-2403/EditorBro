// Brewpoint art: a deterministic QR-style code, rubber-ink stamps and the reward illustrations, all SVG strings.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function fnv(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const INK = '#c2362a';

// ---------------------------------------------------------------- QR-style matrix (pattern only, seeded by the code)
export function qrMatrix(text: string, n = 25) {
  const m: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(-1));
  const set = (x: number, y: number, v: number) => { if (x >= 0 && y >= 0 && x < n && y < n) m[y][x] = v; };
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
      set(ox + x, oy + y, inside && (edge || core) ? 1 : 0);
    }
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  for (let i = 8; i < n - 8; i++) { set(i, 6, i % 2 === 0 ? 1 : 0); set(6, i, i % 2 === 0 ? 1 : 0); }
  const a = n - 7;
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) set(a + x, a + y, Math.max(Math.abs(x), Math.abs(y)) !== 1 ? 1 : 0);
  const r = mulberry32(fnv(text));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x] === -1) m[y][x] = r() < 0.48 ? 1 : 0;
  return m;
}

/** QR card. `id` must be unique on the page; the reveal mask's stops are driven from JS (setQrReveal). */
export function qrSVG(text: string, id: string, fg = '#2a1c15') {
  const m = qrMatrix(text);
  const n = m.length;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x] === 1) d += `M${x} ${y}h1v1h-1z`;
  return `<svg class="qr" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" aria-label="Redemption code ${text}" role="img">
<defs>
  <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
    <stop class="qa" offset="0" stop-color="#fff"/><stop class="qb" offset="0" stop-color="#000"/>
  </linearGradient>
  <mask id="${id}m" maskUnits="userSpaceOnUse" x="-2" y="-2" width="${n + 4}" height="${n + 4}"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="url(#${id}g)"/></mask>
</defs>
<rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fffaf2"/>
<path d="${d}" fill="${fg}" mask="url(#${id}m)"/>
<rect class="qr-scan" x="-2" y="-2" width="${n + 4}" height="0.5" fill="${INK}" opacity="0"/>
</svg>`;
}
export function setQrReveal(svg: SVGSVGElement | null, k: number) {
  if (!svg) return;
  const a = svg.querySelector('.qa'), b = svg.querySelector('.qb');
  const off = -0.1 + k * 1.2;
  a?.setAttribute('offset', String(Math.max(0, Math.min(1, off))));
  b?.setAttribute('offset', String(Math.max(0, Math.min(1, off + 0.1))));
  const scan = svg.querySelector('.qr-scan');
  if (scan) {
    const n = 25;
    scan.setAttribute('y', String(-2 + (n + 4) * Math.min(1, k)));
    scan.setAttribute('opacity', String(k > 0 && k < 1 ? 0.75 : 0));
  }
}

// ---------------------------------------------------------------- ink stamps
export const inkDefs = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3.2 2.75" result="holes"/>
  <feComposite in="SourceGraphic" in2="holes" operator="in" result="pitted"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="4" result="w"/>
  <feDisplacementMap in="pitted" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="inkSoft" x="-10%" y="-10%" width="120%" height="120%">
  <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="5" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.2" result="holes"/>
  <feComposite in="SourceGraphic" in2="holes" operator="in"/>
</filter>
</svg>`;

const bean = (cx: number, cy: number, s: number, c: string, rot = -30) =>
  `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})"><ellipse rx="10" ry="14" fill="${c}"/><path d="M-1.5 -12 C 5 -5, -6 4, 1.5 12" fill="none" stroke="#fffaf2" stroke-width="2.4" stroke-linecap="round"/></g>`;

export function beanStamp(i: number) {
  const r = mulberry32(100 + i);
  const rot = -18 + r() * 36;
  return `<svg class="bean-stamp" viewBox="0 0 60 60" style="transform:rotate(${rot.toFixed(1)}deg)" aria-hidden="true"><g filter="url(#inkSoft)">
<circle cx="30" cy="30" r="26" fill="none" stroke="${INK}" stroke-width="3"/>
<circle cx="30" cy="30" r="21" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="2 2.6"/>
${bean(30, 30, 0.95, INK, -28 + r() * 20)}
</g></svg>`;
}

export function bigStamp() {
  return `<svg class="big-stamp" viewBox="0 0 200 200" aria-hidden="true">
<defs><path id="stampArc" d="M100 100 m-71 0 a71 71 0 1 1 142 0 a71 71 0 1 1 -142 0"/></defs>
<g filter="url(#ink)">
  <circle cx="100" cy="100" r="93" fill="none" stroke="${INK}" stroke-width="6"/>
  <circle cx="100" cy="100" r="82" fill="none" stroke="${INK}" stroke-width="2"/>
  <circle cx="100" cy="100" r="58" fill="none" stroke="${INK}" stroke-width="2"/>
  <text font-family="DM Mono, monospace" font-size="12.5" font-weight="500" letter-spacing="3.2" fill="${INK}"><textPath href="#stampArc">BREWPOINT ✦ REWARDS ✦ BREWPOINT ✦ REWARDS ✦</textPath></text>
  <rect x="6" y="80" width="188" height="40" fill="${INK}"/>
  <text x="100" y="108" text-anchor="middle" font-family="Young Serif, serif" font-size="25" letter-spacing="2" fill="#fffaf2">REDEEMED</text>
  ${bean(100, 58, 0.62, INK, -20)}
  ${bean(100, 142, 0.62, INK, 160)}
</g>
</svg>`;
}

// ---------------------------------------------------------------- reward illustrations (80x80)
export const ILLO: Record<string, string> = {
  cappuccino: `<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="62" rx="30" ry="7" fill="#e3cfb4"/><ellipse cx="40" cy="60" rx="26" ry="5" fill="#f3e6d3"/>
<path d="M58 36 q12 0 11 9 q-1 8 -13 8" fill="none" stroke="#f7efe3" stroke-width="5"/><path d="M58 36 q12 0 11 9 q-1 8 -13 8" fill="none" stroke="#d9c3a4" stroke-width="1.2"/>
<path d="M18 32 h44 l-4 22 q-2 7 -9 7 h-18 q-7 0 -9 -7 z" fill="#fbf5ec"/><path d="M18 32 h44 l-1 6 h-42 z" fill="#efe1cd"/>
<ellipse cx="40" cy="32" rx="22" ry="5.5" fill="#8a5a3a"/><ellipse cx="40" cy="32" rx="18" ry="4" fill="#c99a6e"/>
<path d="M40 35 c-4 -3 -7 -1 -6 1 c1 2 6 3 6 3 c0 0 5 -1 6 -3 c1 -2 -2 -4 -6 -1z" fill="#fbf1e2"/>
<path d="M33 22 q-3 -5 1 -9 M41 22 q-3 -6 1 -11 M49 22 q-3 -5 1 -9" fill="none" stroke="#c9b49a" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  croissant: `<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="60" rx="30" ry="6" fill="#e3cfb4"/>
<path d="M10 48 q4 -24 30 -24 q26 0 30 24 q-6 4 -12 1 q-6 -12 -18 -12 q-12 0 -18 12 q-6 3 -12 -1z" fill="#d38b3c"/>
<path d="M22 49 q2 -16 18 -18 q16 2 18 18 q-8 4 -18 4 q-10 0 -18 -4z" fill="#e3a14f"/>
<path d="M30 33 q4 8 2 18 M40 31 v21 M50 33 q-4 8 -2 18" fill="none" stroke="#b56d27" stroke-width="1.6" stroke-linecap="round"/>
<path d="M16 44 q4 -3 8 2 M64 44 q-4 -3 -8 2" fill="none" stroke="#b56d27" stroke-width="1.4"/><path d="M28 30 q12 -6 24 0" fill="none" stroke="#f2c27f" stroke-width="2" stroke-linecap="round"/></svg>`,
  coldbrew: `<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="70" rx="18" ry="4" fill="#e3cfb4"/>
<rect x="33" y="8" width="14" height="8" rx="2" fill="#2a1c15"/><path d="M33 16 h14 v6 q8 4 8 14 v30 q0 4 -4 4 h-22 q-4 0 -4 -4 v-30 q0 -10 8 -14z" fill="#3b2418"/>
<rect x="25" y="38" width="30" height="22" rx="2" fill="#f6ede0"/><text x="40" y="47" text-anchor="middle" font-family="Young Serif, serif" font-size="7" fill="#2a1c15">cold</text><text x="40" y="55" text-anchor="middle" font-family="Young Serif, serif" font-size="7" fill="#c2362a">brew</text>
<path d="M30 24 q-2 6 0 12" stroke="#7a4b31" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  cake: `<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="64" rx="30" ry="6" fill="#e3cfb4"/>
<path d="M14 44 l44 -16 l10 10 v20 l-54 4z" fill="#f4d9c6"/><path d="M14 44 l54 -6 v20 l-54 4z" fill="#fbeee3"/>
<path d="M14 50 l54 -5 M14 56 l54 -5" stroke="#b5654a" stroke-width="3"/><path d="M14 44 l44 -16 l10 10 l-54 6z" fill="#fff7ee"/>
<circle cx="56" cy="30" r="5" fill="#c2362a"/><path d="M56 25 q2 -6 6 -7" stroke="#5f7a3a" stroke-width="1.6" fill="none"/>
<path d="M20 43 q5 3 10 0 q5 3 10 0 q5 3 10 0 q5 3 10 0" fill="none" stroke="#f0d0bb" stroke-width="2"/></svg>`,
  beans: `<svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="40" cy="68" rx="24" ry="5" fill="#e3cfb4"/>
<path d="M22 20 h36 l4 46 h-44z" fill="#b98a5c"/><path d="M22 20 l4 -8 h28 l4 8z" fill="#a37549"/><path d="M26 12 h28" stroke="#8a6038" stroke-width="2"/>
<rect x="27" y="32" width="26" height="22" rx="2" fill="#f6ede0"/>${bean(40, 43, 0.42, '#2a1c15', -20)}</svg>`,
};
