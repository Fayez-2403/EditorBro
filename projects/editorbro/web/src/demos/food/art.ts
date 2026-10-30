// Tiffinly illustrations: every dish is drawn here in SVG, flat-lay, on a 200x200 board.
// Seeded randomness only, so a dish looks the same on every load and in every reel frame.
import type { ArtKey } from './data';

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

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
const lift = (c: string, t: number) => mix(c, '#ffffff', t);
const sink = (c: string, t: number) => mix(c, '#000000', t);

let seq = 0;
class Pic {
  id = `tf${++seq}`;
  private defs: string[] = [];
  private g: string[] = [];
  private k = 0;
  rnd: () => number;
  constructor(seed: number) { this.rnd = mulberry32(seed); }
  rad(stops: Array<[number, string, number?]>, fx = 0.5, fy = 0.5, r = 0.5) {
    const gid = `${this.id}g${++this.k}`;
    this.defs.push(`<radialGradient id="${gid}" cx="0.5" cy="0.5" r="${r}" fx="${fx}" fy="${fy}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`);
    return `url(#${gid})`;
  }
  lin(stops: Array<[number, string, number?]>, x2 = 0, y2 = 1) {
    const gid = `${this.id}g${++this.k}`;
    this.defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`);
    return `url(#${gid})`;
  }
  add(...s: string[]) { this.g.push(...s); return this; }
  r(a: number, b: number) { return a + (b - a) * this.rnd(); }
  svg(vb = '0 0 200 200', cls = 'dish') {
    return `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false"><defs>${this.defs.join('')}</defs>${this.g.join('')}</svg>`;
  }
}

// ---------- building blocks ----------
function shadow(p: Pic, cx: number, cy: number, rx: number, ry = rx, a = 0.22) {
  p.add(`<ellipse cx="${f(cx + rx * 0.05)}" cy="${f(cy + ry * 0.08)}" rx="${f(rx * 1.04)}" ry="${f(ry * 1.04)}" fill="${p.rad([[0.78, '#3b2412', a], [1, '#3b2412', 0]])}"/>`);
}

function plate(p: Pic, cx: number, cy: number, r: number) {
  shadow(p, cx, cy, r);
  p.add(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.rad([[0, '#ffffff'], [0.62, '#eef0ef'], [0.86, '#c6cbca'], [0.93, '#eceeed'], [1, '#aab0af']], 0.4, 0.34)}"/>`);
  p.add(`<circle cx="${cx}" cy="${cy}" r="${f(r * 0.84)}" fill="none" stroke="#d2d6d5" stroke-width="1.2"/>`);
  p.add(`<path d="M${f(cx - r * 0.7)} ${f(cy - r * 0.45)} A${f(r * 0.84)} ${f(r * 0.84)} 0 0 1 ${f(cx - r * 0.1)} ${f(cy - r * 0.83)}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>`);
}

interface Bits { c: string; n: number; s: number; kind?: 'dot' | 'cube' | 'leaf' | 'sliver' | 'chilli' }
function speck(p: Pic, cx: number, cy: number, rr: number, b: Bits) {
  for (let i = 0; i < b.n; i++) {
    const a = p.r(0, Math.PI * 2), d = Math.sqrt(p.rnd()) * rr;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, rot = p.r(0, 180), s = b.s * p.r(0.7, 1.2);
    if (b.kind === 'cube') p.add(`<rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s)}" rx="${f(s * 0.22)}" fill="${b.c}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/><rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${f(s)}" height="${f(s * 0.35)}" rx="${f(s * 0.15)}" fill="#fff" opacity=".35" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`);
    else if (b.kind === 'leaf') leaf(p, x, y, s * 2.2, rot, b.c);
    else if (b.kind === 'sliver') p.add(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s)}" ry="${f(s * 0.32)}" fill="${b.c}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})"/>`);
    else if (b.kind === 'chilli') chilli(p, x, y, s * 4, rot);
    else p.add(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(s / 2)}" fill="${b.c}"/>`);
  }
}

function leaf(p: Pic, x: number, y: number, len: number, rot: number, c = '#3f8f3a') {
  const w = len * 0.42;
  p.add(`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><path d="M0 0 Q${f(len / 2)} ${f(-w)} ${f(len)} 0 Q${f(len / 2)} ${f(w)} 0 0Z" fill="${c}"/><path d="M${f(len * 0.1)} 0 L${f(len * 0.85)} 0" stroke="${lift(c, 0.35)}" stroke-width=".6"/></g>`);
}

function chilli(p: Pic, x: number, y: number, len: number, rot: number) {
  p.add(`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})"><path d="M0 0 C${f(len * 0.3)} ${f(-len * 0.16)} ${f(len * 0.75)} ${f(-len * 0.1)} ${f(len)} ${f(len * 0.05)} C${f(len * 0.7)} ${f(len * 0.06)} ${f(len * 0.3)} ${f(len * 0.12)} 0 ${f(len * 0.1)}Z" fill="#3c8a2e"/><path d="M${f(len * 0.2)} ${f(-len * 0.02)} C${f(len * 0.45)} ${f(-len * 0.09)} ${f(len * 0.7)} ${f(-len * 0.06)} ${f(len * 0.85)} 0" stroke="#7cc35d" stroke-width="${f(len * 0.03)}" fill="none" stroke-linecap="round"/><path d="M0 ${f(len * 0.05)} l${f(-len * 0.12)} ${f(-len * 0.06)}" stroke="#2f5e22" stroke-width="${f(len * 0.05)}" stroke-linecap="round"/></g>`);
}

interface Katori { c: string; bits?: Bits[]; cream?: boolean; sheen?: boolean }
function katori(p: Pic, cx: number, cy: number, r: number, k: Katori) {
  shadow(p, cx, cy, r, r, 0.26);
  p.add(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${p.rad([[0, '#ffffff'], [0.7, '#dfe3e2'], [0.9, '#b5bbba'], [1, '#e9ecec']], 0.35, 0.3)}"/>`);
  const ir = r * 0.8;
  p.add(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ir)}" fill="${p.rad([[0, lift(k.c, 0.22)], [0.72, k.c], [1, sink(k.c, 0.28)]], 0.42, 0.38)}"/>`);
  if (k.cream) p.add(`<path d="M${f(cx - ir * 0.45)} ${f(cy + ir * 0.05)} C${f(cx - ir * 0.2)} ${f(cy - ir * 0.45)} ${f(cx + ir * 0.4)} ${f(cy - ir * 0.3)} ${f(cx + ir * 0.25)} ${f(cy + ir * 0.12)} C${f(cx + ir * 0.12)} ${f(cy + ir * 0.4)} ${f(cx - ir * 0.25)} ${f(cy + ir * 0.3)} ${f(cx - ir * 0.05)} ${f(cy + ir * 0.02)}" fill="none" stroke="#fffaf0" stroke-width="${f(ir * 0.12)}" stroke-linecap="round" opacity=".88"/>`);
  for (const b of k.bits ?? []) speck(p, cx, cy, ir * 0.72, b);
  if (k.sheen !== false) p.add(`<ellipse cx="${f(cx - ir * 0.38)}" cy="${f(cy - ir * 0.42)}" rx="${f(ir * 0.28)}" ry="${f(ir * 0.12)}" fill="#fff" opacity=".35" transform="rotate(-35 ${f(cx - ir * 0.38)} ${f(cy - ir * 0.42)})"/>`);
}

function rice(p: Pic, cx: number, cy: number, rx: number, ry: number, n: number, palette: string[], base = '#f7efdc') {
  p.add(`<ellipse cx="${f(cx)}" cy="${f(cy + 1.5)}" rx="${f(rx)}" ry="${f(ry)}" fill="#3b2412" opacity=".12"/>`);
  p.add(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${p.rad([[0, '#fffdf6'], [1, base]], 0.4, 0.35)}"/>`);
  for (let i = 0; i < n; i++) {
    const a = p.r(0, Math.PI * 2), d = Math.sqrt(p.rnd()) * 0.94;
    const x = cx + Math.cos(a) * d * rx, y = cy + Math.sin(a) * d * ry;
    const c = palette[Math.floor(p.rnd() * palette.length)];
    p.add(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.7" ry="1" fill="${c}" transform="rotate(${f(p.r(0, 180))} ${f(x)} ${f(y)})"/>`);
  }
}

function roti(p: Pic, cx: number, cy: number, r: number) {
  shadow(p, cx, cy, r, r, 0.18);
  p.add(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${p.rad([[0, '#f4d79e'], [0.75, '#e8bf78'], [1, '#c99147']], 0.45, 0.4)}"/>`);
  for (let i = 0; i < 9; i++) {
    const a = p.r(0, 6.28), d = Math.sqrt(p.rnd()) * r * 0.8, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
    p.add(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(p.r(1.5, 3.6))}" ry="${f(p.r(1, 2.2))}" fill="#9a5f24" opacity="${f(p.r(0.35, 0.7))}" transform="rotate(${f(p.r(0, 180))} ${f(x)} ${f(y)})"/>`);
  }
}

function lemon(p: Pic, x: number, y: number, s: number, rot: number) {
  p.add(`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})"><path d="M-10 0 A10 10 0 0 1 10 0Z" fill="#f2d641"/><path d="M-8 -.5 A8 8 0 0 1 8 -.5Z" fill="#fbef9a"/><path d="M0 -.5 L-5 -6 M0 -.5 L0 -7.5 M0 -.5 L5 -6" stroke="#f2d641" stroke-width="1"/></g>`);
}

function onionRing(p: Pic, x: number, y: number, r: number) {
  p.add(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="#e6a7c0" stroke-width="2.4"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.62)}" fill="none" stroke="#f3cddb" stroke-width="1.6"/>`);
}

// ---------- dishes ----------
const CURRY = {
  dal: { c: '#e7ae33', bits: [{ c: '#2f7a2c', n: 7, s: 2, kind: 'leaf' as const }, { c: '#7a3a14', n: 10, s: 1.4 }] },
  paneer: { c: '#d8642a', cream: true, bits: [{ c: '#fbf3e1', n: 5, s: 6, kind: 'cube' as const }, { c: '#2f7a2c', n: 4, s: 2, kind: 'leaf' as const }] },
  sabzi: { c: '#7f9f37', bits: [{ c: '#e98a2e', n: 7, s: 4, kind: 'cube' as const }, { c: '#f4e3a6', n: 6, s: 3.4, kind: 'cube' as const }] },
  raita: { c: '#f1ecdc', bits: [{ c: '#3d8b36', n: 8, s: 1.6, kind: 'leaf' as const }, { c: '#8b5a2b', n: 10, s: 1.1 }] },
  kheer: { c: '#f2e2bf', bits: [{ c: '#79a83a', n: 6, s: 2.6, kind: 'sliver' as const }, { c: '#e9cfa4', n: 5, s: 3, kind: 'sliver' as const }] },
  kadhi: { c: '#f0cf55', bits: [{ c: '#d68a2a', n: 5, s: 5, kind: 'cube' as const }, { c: '#2f7a2c', n: 5, s: 1.8, kind: 'leaf' as const }] },
};

function thali(seed: number, mini = false) {
  const p = new Pic(seed);
  plate(p, 100, 100, 92);
  const set: Katori[] = mini ? [CURRY.dal, CURRY.sabzi, CURRY.kheer] : [CURRY.dal, CURRY.paneer, CURRY.kadhi, CURRY.raita];
  const angs = mini ? [-150, -95, -40] : [-160, -118, -76, -34];
  set.forEach((k, i) => {
    const a = (angs[i] * Math.PI) / 180;
    katori(p, 100 + Math.cos(a) * 56, 100 + Math.sin(a) * 56, mini ? 21 : 19, k);
  });
  rice(p, 68, 131, 28, 22, 110, ['#fffdf7', '#fff9ec', '#f3ead4', '#a0702f']);
  leaf(p, 60, 120, 9, -30, '#2f7a2c');
  roti(p, 136, 136, 25);
  roti(p, 124, 124, 25);
  if (!mini) {
    katori(p, 100 + Math.cos(0.18) * 70, 100 + Math.sin(0.18) * 70, 10, { c: '#b63a1d', bits: [{ c: '#f2d36b', n: 4, s: 1.8 }] });
    chilli(p, 92, 165, 22, -12);
    onionRing(p, 116, 168, 7);
  } else {
    lemon(p, 102, 170, 0.9, 10);
  }
  return p.svg();
}

function handi(p: Pic) {
  shadow(p, 100, 100, 92);
  p.add(`<rect x="2" y="88" width="22" height="24" rx="10" fill="#8f4a20"/><rect x="176" y="88" width="22" height="24" rx="10" fill="#8f4a20"/>`);
  p.add(`<circle cx="100" cy="100" r="89" fill="${p.rad([[0, '#f0b27a'], [0.55, '#cf7f43'], [0.85, '#9b4c20'], [1, '#6e3112']], 0.32, 0.28)}"/>`);
  p.add(`<circle cx="100" cy="100" r="80" fill="#5a2610"/>`);
  p.add(`<path d="M30 70 A76 76 0 0 1 98 22" stroke="#ffd9b0" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>`);
}

function biryani(seed: number, veg = false) {
  const p = new Pic(seed);
  handi(p);
  rice(p, 100, 100, 75, 75, 300, ['#fffdf7', '#fff8e8', '#fff3d6', '#f7c35a', '#f1a53a', '#e7832b', '#fff8e8'], '#f3e1b5');
  if (veg) {
    speck(p, 100, 100, 52, { c: '#f8efd9', n: 7, s: 9, kind: 'cube' });
    speck(p, 100, 100, 58, { c: '#6aa53b', n: 14, s: 4.2 });
    speck(p, 100, 100, 58, { c: '#ec7d2c', n: 9, s: 4.2, kind: 'cube' });
  } else {
    const pcs: Array<[number, number, number]> = [[72, 78, 20], [128, 82, -25], [118, 130, 60], [70, 126, 10]];
    for (const [x, y, rot] of pcs) {
      p.add(`<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-14 -6 C-12 -14 6 -15 13 -8 C18 -2 14 9 4 11 C-8 13 -17 5 -14 -6Z" fill="${p.rad([[0, '#d9864b'], [0.7, '#a8521f'], [1, '#7d3714']], 0.4, 0.35)}"/><path d="M-8 -6 C-3 -10 4 -9 8 -6" stroke="#f0a96a" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></g>`);
    }
    p.add(`<ellipse cx="104" cy="104" rx="14" ry="11" fill="#fffdf6" stroke="#ece3cf" stroke-width="1"/><circle cx="105" cy="104" r="6.5" fill="${p.rad([[0, '#ffd257'], [1, '#f2a516']])}"/>`);
  }
  for (let i = 0; i < 9; i++) leaf(p, p.r(45, 150), p.r(45, 150), p.r(8, 11), p.r(0, 360), i % 2 ? '#2f8a3a' : '#3f9c45');
  for (let i = 0; i < 14; i++) {
    const x = p.r(40, 160), y = p.r(40, 160);
    if ((x - 100) ** 2 + (y - 100) ** 2 > 68 ** 2) continue;
    p.add(`<path d="M${f(x)} ${f(y)} q4 -4 8 0 q4 4 8 0" stroke="#7b3d14" stroke-width="2" fill="none" stroke-linecap="round" transform="rotate(${f(p.r(0, 180))} ${f(x + 8)} ${f(y)})"/>`);
  }
  lemon(p, 150, 150, 1.1, -40);
  return p.svg();
}

function bananaLeaf(p: Pic) {
  p.add(`<g transform="rotate(-38 100 100)"><path d="M-6 100 C10 40 190 40 206 100 C190 160 10 160 -6 100Z" fill="${p.lin([[0, '#4f9d45'], [0.5, '#3a8a37'], [1, '#2a6c2b']])}"/>`);
  p.add(`<path d="M-2 100 L204 100" stroke="#8fca6d" stroke-width="2"/>`);
  for (let i = 0; i < 13; i++) {
    const x = 12 + i * 15;
    p.add(`<path d="M${x} 100 Q${x + 8} 78 ${x + 18} 62 M${x} 100 Q${x + 8} 122 ${x + 18} 138" stroke="#6fb85a" stroke-width=".8" fill="none" opacity=".5"/>`);
  }
  p.add(`</g>`);
}

function dosaRoll(p: Pic, x: number, y: number, rot: number, len: number, rava = false) {
  const L = len / 2;
  p.add(`<g transform="translate(${x} ${y}) rotate(${rot})">`);
  p.add(`<path d="M${-L} 5 C${-L * 0.25} 16 ${L * 0.5} 26 ${L} 25 L${L} -15 C${L * 0.5} -18 ${-L * 0.25} -10 ${-L} -1Z" fill="#3b2412" opacity=".22" transform="translate(3 6)"/>`);
  p.add(`<path d="M${-L} -2 C${-L * 0.25} -11 ${L * 0.5} -20 ${L} -21 A8 21 0 0 1 ${L} 21 C${L * 0.5} 20 ${-L * 0.25} 11 ${-L} 2Z" fill="${p.lin([[0, '#f6cd73'], [0.35, '#e9a943'], [0.75, '#cf8528'], [1, '#a8611a']])}"/>`);
  for (let i = 0; i < 9; i++) {
    const t = i / 9, xx = -L * 0.9 + t * L * 1.75, w = 2 + t * 17;
    p.add(`<path d="M${f(xx)} ${f(-w)} q3 ${f(w)} 0 ${f(w * 2)}" stroke="#b86d1f" stroke-width=".8" fill="none" opacity=".45"/>`);
  }
  if (rava) for (let i = 0; i < 40; i++) {
    const t = p.rnd(), xx = -L * 0.8 + t * L * 1.7, w = 2 + t * 16;
    p.add(`<circle cx="${f(xx)}" cy="${f(p.r(-w, w))}" r="${f(p.r(0.8, 1.8))}" fill="#9b5a17" opacity=".5"/>`);
  }
  p.add(`<path d="M${-L * 0.6} -5 C${-L * 0.1} -11 ${L * 0.4} -16 ${L * 0.9} -17" stroke="#fde2a0" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>`);
  p.add(`<ellipse cx="${L}" cy="0" rx="7.5" ry="20" fill="#7d4a14"/><ellipse cx="${L + 1}" cy="2" rx="5" ry="13" fill="#eab93b"/><circle cx="${L + 1}" cy="-2" r="2" fill="#4c8a2e"/><circle cx="${L + 2}" cy="6" r="1.6" fill="#c56b1c"/>`);
  p.add(`</g>`);
}

function dosa(seed: number, rava = false) {
  const p = new Pic(seed);
  bananaLeaf(p);
  dosaRoll(p, 98, 100, -38, 168, rava);
  katori(p, 150, 150, 24, { c: '#c4622a', bits: [{ c: '#f0c56a', n: 5, s: 4, kind: 'cube' }, { c: '#5e8f2c', n: 5, s: 2, kind: 'leaf' }, { c: '#e9e0c8', n: 4, s: 3 }] });
  katori(p, 52, 60, 19, { c: '#f2efe2', bits: [{ c: '#2a2118', n: 9, s: 1.5 }, { c: '#3c7f2b', n: 2, s: 3.4, kind: 'leaf' }] });
  katori(p, 86, 36, 14, { c: '#c4402a', bits: [{ c: '#2a2118', n: 5, s: 1.3 }] });
  return p.svg();
}

function idli(seed: number) {
  const p = new Pic(seed);
  plate(p, 100, 100, 92);
  const idl = (x: number, y: number) => {
    shadow(p, x, y, 25, 25, 0.2);
    p.add(`<circle cx="${x}" cy="${y}" r="25" fill="${p.rad([[0, '#ffffff'], [0.7, '#f6f2e7'], [1, '#e0d8c3']], 0.42, 0.38)}"/>`);
    for (let i = 0; i < 10; i++) p.add(`<circle cx="${f(x + p.r(-16, 16))}" cy="${f(y + p.r(-16, 16))}" r=".9" fill="#d8ceb4"/>`);
  };
  idl(72, 74); idl(118, 66); idl(84, 120);
  shadow(p, 132, 122, 24);
  p.add(`<circle cx="132" cy="122" r="24" fill="${p.rad([[0, '#e2a04c'], [0.7, '#bf7429'], [1, '#8c4c17']], 0.4, 0.35)}"/><circle cx="132" cy="122" r="7" fill="#eef0ef"/><path d="M116 112 a19 19 0 0 1 22 -9" stroke="#f3c47c" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`);
  katori(p, 150, 165, 15, { c: '#f2efe2', bits: [{ c: '#2a2118', n: 6, s: 1.4 }] });
  katori(p, 52, 150, 21, { c: '#c4622a', bits: [{ c: '#f0c56a', n: 4, s: 3.4, kind: 'cube' }, { c: '#5e8f2c', n: 4, s: 2, kind: 'leaf' }] });
  return p.svg();
}

function paper(p: Pic) {
  p.add(`<g transform="rotate(8 100 100)"><rect x="18" y="18" width="164" height="164" rx="6" fill="#3b2412" opacity=".14" transform="translate(3 5)"/><rect x="18" y="18" width="164" height="164" rx="6" fill="#fbf4e4"/>`);
  for (let i = 0; i < 6; i++) p.add(`<circle cx="${f(p.r(40, 160))}" cy="${f(p.r(40, 160))}" r="${f(p.r(6, 14))}" fill="#e9cf9f" opacity=".35"/>`);
  p.add(`<path d="M18 40 H182 M18 160 H182" stroke="#d2422a" stroke-width="3" opacity=".75"/></g>`);
}

function roll(p: Pic, x: number, y: number, rot: number, fill: string[]) {
  p.add(`<g transform="translate(${x} ${y}) rotate(${rot})">`);
  p.add(`<rect x="-72" y="-15" width="148" height="34" rx="17" fill="#3b2412" opacity=".2" transform="translate(2 5)"/>`);
  p.add(`<rect x="-74" y="-17" width="148" height="34" rx="17" fill="${p.lin([[0, '#f6d9a0'], [0.45, '#eac17b'], [1, '#c48b44']])}"/>`);
  for (let i = 0; i < 12; i++) p.add(`<ellipse cx="${f(p.r(-60, 20))}" cy="${f(p.r(-12, 12))}" rx="${f(p.r(2, 4.5))}" ry="${f(p.r(1.2, 2.4))}" fill="#9b5d22" opacity="${f(p.r(0.3, 0.6))}"/>`);
  p.add(`<path d="M18 -17 L74 -17 A17 17 0 0 1 74 17 L12 17Z" fill="#fffaf0"/><path d="M30 -17 L24 17 M44 -17 L38 17 M58 -17 L52 17" stroke="#d2422a" stroke-width="2.4" opacity=".85"/>`);
  p.add(`<ellipse cx="-74" cy="0" rx="9" ry="17" fill="#d9a35b"/><ellipse cx="-74" cy="0" rx="6.5" ry="13" fill="${fill[0]}"/>`);
  p.add(`<circle cx="-75" cy="-5" r="3" fill="${fill[1]}"/><circle cx="-73" cy="4" r="3.2" fill="${fill[2]}"/><path d="M-77 -1 q3 -3 5 1" stroke="#e7a3c0" stroke-width="1.4" fill="none"/>`);
  p.add(`<path d="M-56 -10 C-30 -14 0 -14 14 -12" stroke="#fff3d6" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></g>`);
}

function rolls(seed: number, kind: 'chicken' | 'paneer' | 'egg' = 'chicken') {
  const p = new Pic(seed);
  paper(p);
  const fill = kind === 'chicken' ? ['#5f9c38', '#b8582a', '#9a4318'] : kind === 'paneer' ? ['#5f9c38', '#fbf0d8', '#e07a35'] : ['#f6e9c8', '#f6b81e', '#5f9c38'];
  roll(p, 108, 76, -22, fill);
  roll(p, 96, 124, -22, fill);
  katori(p, 44, 162, 16, { c: '#5f9c38', bits: [{ c: '#cfe7b4', n: 4, s: 2 }] });
  onionRing(p, 166, 160, 9);
  onionRing(p, 152, 172, 7);
  lemon(p, 30, 44, 1, 40);
  return p.svg();
}

function kulhad(p: Pic, x: number, y: number, r: number, liquid = '#c98b56') {
  shadow(p, x, y, r, r, 0.26);
  p.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${p.rad([[0, '#e08a5d'], [0.75, '#bb5d34'], [1, '#8e3d1d']], 0.35, 0.3)}"/>`);
  p.add(`<circle cx="${x}" cy="${y}" r="${f(r * 0.8)}" fill="${p.rad([[0, lift(liquid, 0.25)], [0.8, liquid], [1, sink(liquid, 0.3)]], 0.45, 0.4)}"/>`);
  p.add(`<path d="M${f(x - r * 0.45)} ${f(y + r * 0.1)} C${f(x - r * 0.2)} ${f(y - r * 0.4)} ${f(x + r * 0.35)} ${f(y - r * 0.35)} ${f(x + r * 0.3)} ${f(y + r * 0.1)}" stroke="${lift(liquid, 0.45)}" stroke-width="${f(r * 0.1)}" fill="none" stroke-linecap="round" opacity=".8"/>`);
  p.add(`<path d="M${f(x - r * 0.75)} ${f(y - r * 0.35)} A${f(r * 0.9)} ${f(r * 0.9)} 0 0 1 ${f(x - r * 0.1)} ${f(y - r * 0.88)}" stroke="#f3b089" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>`);
}

function steam(p: Pic, x: number, y: number, s = 1) {
  p.add(`<g class="steam" transform="translate(${x} ${y}) scale(${s})" opacity=".85">`);
  for (let i = 0; i < 3; i++) p.add(`<path class="w${i}" d="M${i * 9 - 9} 0 c-6 -8 6 -14 0 -22 c-6 -8 6 -14 0 -22" stroke="#ffffff" stroke-width="3.2" fill="none" stroke-linecap="round" opacity="${0.75 - i * 0.12}"/>`);
  p.add(`</g>`);
}

function chai(seed: number, coffee = false) {
  const p = new Pic(seed);
  if (coffee) {
    plate(p, 92, 108, 74);
    p.add(`<circle cx="92" cy="108" r="46" fill="${p.rad([[0, '#ffffff'], [0.8, '#d9dddc'], [1, '#9fa6a5']], 0.35, 0.3)}"/>`);
    p.add(`<circle cx="92" cy="108" r="38" fill="${p.rad([[0, '#ead2ad'], [0.6, '#c99b68'], [1, '#8d5a2e']], 0.45, 0.4)}"/>`);
    for (let i = 0; i < 26; i++) p.add(`<circle cx="${f(92 + p.r(-24, 24))}" cy="${f(108 + p.r(-24, 24))}" r="${f(p.r(0.8, 2.4))}" fill="#f5e6cc" opacity=".8"/>`);
    p.add(`<path d="M66 96 a30 30 0 0 1 30 -22" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>`);
    for (let i = 0; i < 3; i++) p.add(`<g transform="translate(${158} ${50 + i * 14}) rotate(-20)"><rect x="-16" y="-5" width="32" height="10" rx="5" fill="${p.lin([[0, '#5a3a1e'], [1, '#2e1b0c']])}"/></g>`);
    steam(p, 98, 62, 1);
    return p.svg();
  }
  p.add(`<g transform="rotate(-14 150 150)"><rect x="104" y="112" width="86" height="70" rx="12" fill="#3b2412" opacity=".14" transform="translate(3 5)"/><rect x="104" y="112" width="86" height="70" rx="12" fill="#eef0ef"/>`);
  for (let i = 0; i < 3; i++) p.add(`<rect x="${112 + i * 2}" y="${120 + i * 19}" width="68" height="14" rx="6" fill="${p.lin([[0, '#f0c27a'], [1, '#c98a3e']])}"/><path d="M${118 + i * 2} ${127 + i * 19} h56" stroke="#a96a26" stroke-width="1" stroke-dasharray="2 4" opacity=".6"/>`);
  p.add(`</g>`);
  kulhad(p, 74, 78, 40);
  kulhad(p, 140, 64, 30);
  p.add(`<ellipse cx="44" cy="150" rx="5" ry="3.2" fill="#6f8f3a" transform="rotate(30 44 150)"/><ellipse cx="54" cy="160" rx="5" ry="3.2" fill="#7a9b44" transform="rotate(-20 54 160)"/>`);
  steam(p, 76, 52, 1.1);
  return p.svg();
}

function samosa(seed: number) {
  const p = new Pic(seed);
  plate(p, 100, 100, 92);
  const tri = (x: number, y: number, rot: number) => {
    p.add(`<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 -40 C10 -40 44 18 40 26 C36 32 -36 32 -40 26 C-44 18 -10 -40 0 -40Z" fill="#3b2412" opacity=".2" transform="translate(3 5)"/><path d="M0 -40 C10 -40 44 18 40 26 C36 32 -36 32 -40 26 C-44 18 -10 -40 0 -40Z" fill="${p.rad([[0, '#f3c46a'], [0.7, '#d99a3e'], [1, '#b06d24']], 0.45, 0.35)}"/><path d="M-30 22 C-10 18 10 18 30 22" stroke="#b06d24" stroke-width="1.4" fill="none" stroke-dasharray="3 3"/>`);
    for (let i = 0; i < 10; i++) p.add(`<circle cx="${f(p.r(-22, 22))}" cy="${f(p.r(-14, 18))}" r="${f(p.r(0.8, 1.8))}" fill="#9f5d1d" opacity=".55"/>`);
    p.add(`<path d="M-6 -30 C-16 -12 -24 4 -28 18" stroke="#fde3a3" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/></g>`);
  };
  tri(78, 92, -14); tri(126, 112, 22);
  katori(p, 60, 152, 16, { c: '#5f9c38', bits: [{ c: '#d4ecb8', n: 4, s: 1.8 }] });
  katori(p, 142, 52, 15, { c: '#7a2c16', bits: [{ c: '#d9a35a', n: 4, s: 1.6 }] });
  chilli(p, 120, 160, 30, -30);
  return p.svg();
}

function bunMaska(seed: number) {
  const p = new Pic(seed);
  plate(p, 100, 104, 88);
  const bun = (x: number, y: number, r: number, butter: boolean) => {
    shadow(p, x, y, r, r, 0.22);
    p.add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${p.rad([[0, '#f1c27e'], [0.6, '#d7934a'], [1, '#a8602a']], 0.4, 0.35)}"/><circle cx="${x}" cy="${y}" r="${f(r * 0.78)}" fill="${p.rad([[0, '#fff3dc'], [1, '#f2dbb0']], 0.45, 0.4)}"/>`);
    for (let i = 0; i < 14; i++) p.add(`<circle cx="${f(x + p.r(-r * 0.6, r * 0.6))}" cy="${f(y + p.r(-r * 0.6, r * 0.6))}" r="1" fill="#dcc08e"/>`);
    if (butter) p.add(`<rect x="${x - 15}" y="${y - 11}" width="30" height="22" rx="5" fill="#ffe592" transform="rotate(-12 ${x} ${y})"/><rect x="${x - 15}" y="${y - 11}" width="30" height="7" rx="4" fill="#fff4c4" transform="rotate(-12 ${x} ${y})"/>`);
  };
  bun(72, 88, 38, true); bun(132, 120, 38, false);
  kulhad(p, 150, 52, 22);
  return p.svg();
}

function bowlDish(seed: number, k: Katori, extra?: (p: Pic) => void) {
  const p = new Pic(seed);
  plate(p, 100, 100, 92);
  katori(p, 100, 100, 66, k);
  extra?.(p);
  return p.svg();
}

function jamun(seed: number) {
  return bowlDish(seed, { c: '#e9b65a', sheen: false, bits: [] }, (p) => {
    for (const [x, y] of [[80, 86], [118, 92], [98, 122]] as const) {
      p.add(`<circle cx="${x + 2}" cy="${y + 4}" r="21" fill="#5a2a10" opacity=".35"/><circle cx="${x}" cy="${y}" r="21" fill="${p.rad([[0, '#a1502a'], [0.6, '#6a2711'], [1, '#43170a']], 0.35, 0.3)}"/><ellipse cx="${x - 7}" cy="${y - 8}" rx="6" ry="3.5" fill="#fff" opacity=".45" transform="rotate(-35 ${x - 7} ${y - 8})"/>`);
    }
    speck(p, 100, 100, 40, { c: '#8db64a', n: 8, s: 3, kind: 'sliver' });
  });
}

function meetha(seed: number) {
  const p = new Pic(seed);
  plate(p, 100, 100, 92);
  const cells: Array<[number, number, number]> = [[64, 66, -8], [112, 60, 6], [60, 116, 4], [108, 110, -6], [148, 92, 10], [96, 152, 12]];
  for (const [x, y, rot] of cells) {
    p.add(`<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-22" y="-20" width="44" height="40" rx="7" fill="#3b2412" opacity=".18" transform="translate(2 4)"/><rect x="-22" y="-20" width="44" height="40" rx="7" fill="${p.rad([[0, '#f2b862'], [0.7, '#d98c2f'], [1, '#a65a17']], 0.4, 0.35)}"/>`);
    for (let i = 0; i < 6; i++) p.add(`<circle cx="${f(p.r(-15, 15))}" cy="${f(p.r(-13, 13))}" r="${f(p.r(0.8, 1.6))}" fill="#a85e1c" opacity=".5"/>`);
    p.add(`</g>`);
  }
  p.add(`<path d="M50 90 C80 70 120 130 156 100" stroke="#fff4dc" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85"/>`);
  speck(p, 100, 100, 60, { c: '#f5e6c8', n: 14, s: 4, kind: 'sliver' });
  speck(p, 100, 100, 60, { c: '#e2501c', n: 10, s: 3, kind: 'sliver' });
  return p.svg();
}

function mysorePak(seed: number) {
  const p = new Pic(seed);
  plate(p, 100, 100, 92);
  for (const [x, y, rot] of [[78, 80, -10], [124, 86, 8], [96, 128, 2]] as const) {
    p.add(`<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-27" y="-21" width="54" height="42" rx="6" fill="#3b2412" opacity=".18" transform="translate(2 5)"/><rect x="-27" y="-21" width="54" height="42" rx="6" fill="${p.lin([[0, '#f6cf6a'], [1, '#d9962f']])}"/>`);
    for (let i = 0; i < 18; i++) p.add(`<circle cx="${f(p.r(-22, 22))}" cy="${f(p.r(-16, 16))}" r="${f(p.r(0.8, 2.2))}" fill="#b9741f" opacity=".45"/>`);
    p.add(`<rect x="-27" y="-21" width="54" height="8" rx="4" fill="#fde7a8" opacity=".6"/></g>`);
  }
  return p.svg();
}

function glass(seed: number, liquid: string, bits: Bits[]) {
  const p = new Pic(seed);
  plate(p, 100, 104, 80);
  shadow(p, 100, 100, 56, 56, 0.25);
  p.add(`<circle cx="100" cy="100" r="56" fill="${p.rad([[0, '#ffffff', 0.9], [0.85, '#e6efef', 0.9], [1, '#b9c6c6']], 0.35, 0.3)}"/>`);
  p.add(`<circle cx="100" cy="100" r="48" fill="${p.rad([[0, lift(liquid, 0.3)], [0.8, liquid], [1, sink(liquid, 0.18)]], 0.45, 0.4)}"/>`);
  for (const b of bits) speck(p, 100, 100, 36, b);
  leaf(p, 112, 84, 22, -40, '#2f8a3a'); leaf(p, 114, 86, 18, 20, '#3f9c45');
  p.add(`<path d="M60 84 a46 46 0 0 1 34 -32" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75"/>`);
  return p.svg();
}

const SEEDS: Record<ArtKey, number> = {
  thali: 11, miniThali: 12, biryani: 21, vegBiryani: 22, dosa: 31, ravaDosa: 32, idli: 33, rolls: 41, paneerRoll: 42,
  eggRoll: 43, chai: 51, coffee: 52, samosa: 53, bunMaska: 54, dal: 61, paneer: 62, salan: 63, jamun: 71, meetha: 72,
  mysorePak: 73, chaas: 81, lassi: 82,
};

export function dish(key: ArtKey): string {
  const s = SEEDS[key];
  switch (key) {
    case 'thali': return thali(s);
    case 'miniThali': return thali(s, true);
    case 'biryani': return biryani(s);
    case 'vegBiryani': return biryani(s, true);
    case 'dosa': return dosa(s);
    case 'ravaDosa': return dosa(s, true);
    case 'idli': return idli(s);
    case 'rolls': return rolls(s, 'chicken');
    case 'paneerRoll': return rolls(s, 'paneer');
    case 'eggRoll': return rolls(s, 'egg');
    case 'chai': return chai(s);
    case 'coffee': return chai(s, true);
    case 'samosa': return samosa(s);
    case 'bunMaska': return bunMaska(s);
    case 'dal': return bowlDish(s, { c: '#6e2a17', cream: true, bits: [{ c: '#3d8b36', n: 6, s: 2, kind: 'leaf' }] });
    case 'paneer': return bowlDish(s, { c: '#dc6a2c', cream: true, bits: [{ c: '#fbf3e1', n: 9, s: 11, kind: 'cube' }, { c: '#3d8b36', n: 5, s: 2.4, kind: 'leaf' }] });
    case 'salan': return bowlDish(s, { c: '#8b5420', bits: [{ c: '#3c8a2e', n: 5, s: 7, kind: 'chilli' }, { c: '#f2e3c4', n: 18, s: 1.6 }] });
    case 'jamun': return jamun(s);
    case 'meetha': return meetha(s);
    case 'mysorePak': return mysorePak(s);
    case 'chaas': return glass(s, '#eef0e2', [{ c: '#3d8b36', n: 12, s: 1.6, kind: 'leaf' }, { c: '#8b5a2b', n: 14, s: 1.2 }]);
    case 'lassi': return glass(s, '#f5b440', [{ c: '#fff4d6', n: 6, s: 6 }, { c: '#8db64a', n: 6, s: 2.6, kind: 'sliver' }]);
  }
}

const cache = new Map<ArtKey, string>();
let u = 0;
// Each copy of a dish gets its own gradient ids (one suffix per copy), so hidden copies never break visible ones.
export const art = (k: ArtKey) => {
  if (!cache.has(k)) cache.set(k, dish(k));
  const suf = (++u).toString(36);
  return cache.get(k)!.replace(/tf(\d+)g/g, `tf$1_${suf}g`);
};

// ---------- brand + icons ----------
export const logoMark = (size = 34) => `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#1f6b45"/><path d="M14.5 11.5v-1.2a5.5 5.5 0 0 1 11 0v1.2" fill="none" stroke="#fbf5ea" stroke-width="2.4" stroke-linecap="round"/><rect x="9.5" y="12" width="21" height="6.4" rx="2.4" fill="#fbf5ea"/><rect x="9.5" y="19.6" width="21" height="6.4" rx="2.4" fill="#f2b21b"/><rect x="9.5" y="27.2" width="21" height="6.4" rx="2.4" fill="#fbf5ea"/></svg>`;

const ic = (d: string, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const I = {
  pin: ic('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  down: ic('<path d="m6 9 6 6 6-6"/>'),
  right: ic('<path d="m9 6 6 6-6 6"/>'),
  back: ic('<path d="M15 6 9 12l6 6"/>'),
  search: ic('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  star: `<svg class="ic star" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2 14.6 8.6l5.9.8-4.3 4.1 1 5.8L12 16.6l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>`,
  clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  bag: ic('<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
  close: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
  heart: ic('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>'),
  tag: ic('<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-6.6 6.6a1.4 1.4 0 0 1-2 0z"/><circle cx="8.2" cy="8.2" r="1.4"/>'),
  home: ic('<path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1z"/>'),
  card: ic('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>'),
  phone: ic('<path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>'),
  check: ic('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  note: ic('<path d="M5 4.5h14v15H5z"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/>'),
  pot: ic('<path d="M4 11h16v1.5A6.5 6.5 0 0 1 13.5 19h-3A6.5 6.5 0 0 1 4 12.5z"/><path d="M2 11h20M9.5 7.5c0-1.4 1-1.9 1-3.3M14 7.5c0-1.4 1-1.9 1-3.3"/>'),
  bike: ic('<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h6l3-7h3M9 10h4M15 10l3 7"/>'),
  user: ic('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
};

export const vegMark = (veg: boolean) => veg
  ? `<span class="vm veg" role="img" aria-label="Vegetarian"><svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="3.6" fill="currentColor"/></svg></span>`
  : `<span class="vm nonveg" role="img" aria-label="Non-vegetarian"><svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.2 11.8 11H4.2z" fill="currentColor"/></svg></span>`;

// ---------- order-status scene (400x230) ----------
export function statusScene(): string {
  const p = new Pic(901);
  const sky = p.lin([[0, '#1f6b45'], [1, '#16573a']]);
  p.add(`<rect width="400" height="230" fill="${sky}"/>`);
  // skyline
  const b = mulberry32(77);
  let x = -10;
  let city = '';
  while (x < 420) {
    const w = 18 + b() * 30, h = 30 + b() * 70;
    city += `<rect x="${f(x)}" y="${f(170 - h)}" width="${f(w)}" height="${f(h + 10)}" rx="2" fill="#2a7d55" opacity="${f(0.45 + b() * 0.35)}"/>`;
    for (let wy = 170 - h + 8; wy < 160; wy += 12) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (b() > 0.55) city += `<rect x="${f(wx)}" y="${f(wy)}" width="3" height="4" fill="#f2b21b" opacity=".55"/>`;
    x += w + 4;
  }
  p.add(`<g id="sc-city" opacity="0">${city}</g>`);
  p.add(`<circle cx="320" cy="58" r="22" fill="#f2b21b" opacity=".9" id="sc-sun"/>`);
  p.add(`<rect y="172" width="400" height="58" fill="#144a30"/><path id="sc-road" d="M-40 196 H440" stroke="#fbf5ea" stroke-width="3" stroke-dasharray="18 16" opacity=".55"/>`);
  // confirmed seal
  p.add(`<g id="sc-seal" transform="translate(200 104)"><circle r="54" fill="#fbf5ea" opacity=".08"/><circle r="40" fill="#fbf5ea"/><path id="sc-check" d="M-17 1 -5 13 18 -12" stroke="#1f6b45" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/>`);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.add(`<path d="M${f(Math.cos(a) * 56)} ${f(Math.sin(a) * 56)} L${f(Math.cos(a) * 66)} ${f(Math.sin(a) * 66)}" stroke="#f2b21b" stroke-width="3.5" stroke-linecap="round" class="ray"/>`); }
  const sr = mulberry32(5);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + sr() * 0.4, d = 84 + sr() * 46, x = Math.cos(a) * d * 1.35, y = Math.sin(a) * d * 0.62;
    const c = i % 3 === 0 ? '#fbf5ea' : i % 3 === 1 ? '#f2b21b' : '#7fc49b';
    p.add(sr() > 0.5
      ? `<circle class="spark" data-x="${f(x)}" data-y="${f(y)}" r="${f(2.5 + sr() * 3)}" fill="${c}" transform="scale(0)"/>`
      : `<rect class="spark" data-x="${f(x)}" data-y="${f(y)}" x="-3" y="-6" width="6" height="12" rx="2" fill="${c}" transform="scale(0)"/>`);
  }
  p.add(`</g>`);
  // kadhai on flame
  p.add(`<g id="sc-pot" transform="translate(200 120)" opacity="0">`);
  p.add(`<g id="sc-flame"><path d="M-34 52 C-38 38 -26 30 -24 18 C-16 30 -10 40 -14 52Z" fill="#f2b21b"/><path d="M-6 52 C-12 34 2 24 2 10 C12 26 16 40 8 52Z" fill="#ff8a1f"/><path d="M20 52 C16 40 26 32 28 22 C36 34 38 44 32 52Z" fill="#f2b21b"/></g>`);
  p.add(`<rect x="-62" y="50" width="124" height="8" rx="4" fill="#0f3a26"/>`);
  p.add(`<path d="M-70 -6 H70 C66 34 40 48 0 48 C-40 48 -66 34 -70 -6Z" fill="${p.lin([[0, '#3a3f44'], [1, '#1f2327']])}"/><path d="M-86 -2 h16 M70 -2 h16" stroke="#2b3035" stroke-width="7" stroke-linecap="round"/>`);
  p.add(`<ellipse cx="0" cy="-6" rx="70" ry="13" fill="#2b3035"/><ellipse cx="0" cy="-6" rx="62" ry="10" fill="${p.rad([[0, '#f39a45'], [1, '#c4561e']], 0.5, 0.4)}"/>`);
  p.add(`<circle cx="-22" cy="-8" r="5" fill="#fbf3e1"/><circle cx="12" cy="-4" r="5" fill="#fbf3e1"/><circle cx="30" cy="-9" r="4" fill="#fbf3e1"/><path d="M-40 -6 l6 -3 M-6 -10 l5 2 M40 -4 l5 -3" stroke="#2f8a3a" stroke-width="3" stroke-linecap="round"/>`);
  p.add(`<g id="sc-steam">`);
  for (let i = 0; i < 3; i++) p.add(`<path class="sw" d="M${-30 + i * 30} -26 c-10 -12 10 -20 0 -32 c-10 -12 10 -20 0 -32" stroke="#fbf5ea" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`);
  p.add(`</g></g>`);
  // scooter + rider
  p.add(`<g id="sc-ride" transform="translate(200 0)" opacity="0"><g id="sc-bob">`);
  p.add(`<rect x="-78" y="104" width="40" height="38" rx="6" fill="#f2b21b"/><rect x="-78" y="104" width="40" height="9" rx="4" fill="#ffd66b"/><path d="M-66 120 h16 M-66 127 h16" stroke="#1f6b45" stroke-width="3.4" stroke-linecap="round"/>`);
  p.add(`<path d="M-60 166 C-62 150 -48 142 -30 144 L10 146 C20 130 30 120 40 118 L48 120 L36 150 C48 152 58 160 60 168 Z" fill="#fbf5ea"/><path d="M-46 146 h40" stroke="#e8dcc6" stroke-width="5" stroke-linecap="round"/>`);
  p.add(`<path d="M40 118 L30 96 M24 94 h14" stroke="#fbf5ea" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="128" r="5" fill="#f2b21b"/>`);
  p.add(`<path d="M-30 142 L-22 112 C-20 100 -6 96 2 104 L14 120 L30 106" stroke="#e15a2d" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  p.add(`<path d="M-26 140 L-4 140 L4 160" stroke="#1d2a22" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  p.add(`<circle cx="-12" cy="88" r="15" fill="#1f6b45"/><path d="M-12 74 a15 15 0 0 1 15 14 h-9z" fill="#0f3a26"/><path d="M0 84 h6" stroke="#bfe3cf" stroke-width="4" stroke-linecap="round"/>`);
  p.add(`<g id="sc-w1"><circle cx="-44" cy="170" r="16" fill="#1d2a22"/><circle cx="-44" cy="170" r="7" fill="#c9cfcc"/><path d="M-44 158 V182 M-56 170 H-32" stroke="#1d2a22" stroke-width="2"/></g>`);
  p.add(`<g id="sc-w2"><circle cx="46" cy="170" r="16" fill="#1d2a22"/><circle cx="46" cy="170" r="7" fill="#c9cfcc"/><path d="M46 158 V182 M34 170 H58" stroke="#1d2a22" stroke-width="2"/></g>`);
  p.add(`<path class="speed" d="M-110 120 h-30 M-104 136 h-44 M-112 152 h-24" stroke="#fbf5ea" stroke-width="3" stroke-linecap="round" opacity=".5"/>`);
  p.add(`</g></g>`);
  return p.svg('0 0 400 230', 'scene').replace('<svg ', '<svg preserveAspectRatio="xMidYMax slice" ');
}
