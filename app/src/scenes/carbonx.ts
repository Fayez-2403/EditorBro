// Carbon-X reel (projects/carbon-x, TechpeTrek brief "CARBON-X", 2026-10-23): a 50 s Hinglish AI + science news reel on
// Carbon-X, a 14.8B open-weights DNA + English model (Hugging Face with partners). Navy lab, a luminous teal double helix,
// amber particles; original vector art only (the helix, a phone, an original research-chat panel, a clipboard, a server, a
// laptop, a GPU card, a scientist silhouette on the cover); the model card's passages as labelled real screenshots; every demo
// labelled hypothetical or illustrative. No Hugging Face logo, no faked Hugging Face UI. Claims: projects/carbon-x/FACTS.md.
// Every frame is a pure function of t: chapters and events are the voice's own words snapped to the 112 BPM grid
// (analysis/carbonx_cues.py), poses are closed-form springs and eases of absolute time, particles are hashed. No clocks, no
// Math.random, nothing carried between frames, so any seek order gives the same frame.
// params.cover = 'text' | 'clean' draws the separate 1080x1920 cover instead (variants carbonx_cover, carbonx_cover_clean).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { hash } from '../engine/util';
import { FXW, FXH, COL, sat, span, lerp2, rrect, ax, mono, txt, alpha, mixHex, hitP } from './_vo';

// ---------------------------------------------------------------- tokens
const K = {
  bg0: '#040A17', bg1: '#08142E', panel: '#0F1C3A', panel2: '#16264D', line: '#2A4070',
  fg: '#EEF4FF', fg2: '#B9C7E3', fg3: '#7F90B6', teal: '#22E5C3', amber: '#FFB43F', red: '#FF5D62',
  violet: '#8C7BFF', sky: '#4FC3FF', green: '#3DDC97', paper: '#FAF9F5',
};
const BASE: Record<string, string> = { A: K.teal, C: K.violet, G: K.amber, T: K.sky };
const COMP: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
const SEQ = 'ATGCGTACCTTAGGCATCGATTCGAGCTAAGCTTGCATGGCTACGATCGGATCCAATGCG';
const SAFE = { x0: 68, x1: 540, y0: 113, y1: 900 };
const SW = SAFE.x1 - SAFE.x0, CX = FXW / 2;
const SOURCE = 'Source: Carbon-X model card · checked 23 Oct 2026';
const EMPH = new Set(['AI', 'DNA', 'Carbon-X', '14.8', 'billion', 'open', 'A,', 'C,', 'G,', 'T', 'English', 'saath', 'mutation', 'possible', 'effect',
  'research', 'prediction', 'explanation', 'five-benchmark', '66.7', 'percent', 'Open', 'weights', 'infrastructure', 'sensitive',
  'Science', 'crossover', 'crazy', 'Model', 'card', 'save', 'DNA!', 'Hugging', 'Face']);
const RISK = new Set(['twist', 'clinical', 'proof', 'medical', 'diagnosis', 'nahi', 'nahi.', 'permitting.', 'laptop', 'guarantee', 'hardware', 'report']);
const D = (s: number, wd = 100, wt = 900) => ax(s, wd, wt);   // display: Archivo
const B = (s: number, wt = 500) => ax(s, 100, wt);              // body: Archivo
const M = (s: number, wt = 500) => mono(s, wt);                 // IBM Plex Mono
const BPM = 112, BEAT = 60 / BPM, E8 = BEAT / 2;

// ---------------------------------------------------------------- time (closed form)
/** A damped spring from 0 to 1 released at t0 (stiffness k, damping d, unit mass): the analytic solution, so any t is exact. */
function springK(t: number, t0: number, k = 170, d = 14): number {
  const tau = t - t0; if (tau <= 0) return 0;
  const w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * tau) * (Math.cos(wd * tau) + ((z * w0) / wd) * Math.sin(wd * tau)); }
  return 1 - Math.exp(-w0 * tau) * (1 + w0 * tau);
}
const pop = (t: number, t0: number) => springK(t, t0, 260, 17);      // tactile pops (about 12% overshoot)
const glide = (t: number, t0: number) => springK(t, t0, 110, 21);    // moves (critically damped)
const easeInOut = (x: number) => { x = sat(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const outCubic = (x: number) => 1 - Math.pow(1 - sat(x), 3);
const enter = (t: number, t0: number, d = 0.3) => outCubic(span(t, t0, t0 + d));
const lerp = lerp2;
const popA = (p: number) => sat(p * 3);
const popS = (p: number, from = 0.6) => lerp(from, 1, Math.min(1.1, p));

// ---------------------------------------------------------------- drawing helpers
function fillRR(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, f: string | CanvasGradient) { rrect(c, x, y, w, h, r); c.fillStyle = f; c.fill(); }
function strokeRR(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, s: string, lw = 1.5) { rrect(c, x, y, w, h, r); c.strokeStyle = s; c.lineWidth = lw; c.stroke(); }
function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  if (r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
function disc(c: CanvasRenderingContext2D, x: number, y: number, r: number, f: string | CanvasGradient) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fillStyle = f; c.fill(); }
/** Font string at the largest size <= max that fits maxW. */
function fitFont(c: CanvasRenderingContext2D, s: string, max: number, maxW: number, wd = 100, wt = 900) {
  c.font = D(100, wd, wt); const size = Math.min(max, (100 * maxW) / Math.max(1, c.measureText(s).width)); return { f: D(size, wd, wt), size };
}
/** A label chip; returns its width. align: the anchor of x. */
function chip(c: CanvasRenderingContext2D, s: string, x: number, y: number, o: { fg?: string; bg?: string; line?: string; size?: number; wt?: number; align?: 'left' | 'center' | 'right'; pad?: number; track?: number } = {}) {
  const size = o.size ?? 13, pad = o.pad ?? 10, f = B(size, o.wt ?? 700);
  c.font = f; (c as any).letterSpacing = `${o.track ?? 1}px`; const w = c.measureText(s).width + 2 * pad; (c as any).letterSpacing = '0px';
  const h = size + 12, x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  fillRR(c, x0, y - h / 2, w, h, h / 2, o.bg ?? alpha(K.panel2, 0.9));
  if (o.line) strokeRR(c, x0 + 0.5, y - h / 2 + 0.5, w - 1, h - 1, h / 2, o.line, 1.2);
  txt(c, s, x0 + pad, y + size * 0.36, f, o.fg ?? K.fg, o.track ?? 1);
  return w;
}
const illus = (c: CanvasRenderingContext2D, x: number, y: number, s = 'ILLUSTRATION', align: 'left' | 'center' | 'right' = 'left') =>
  chip(c, s, x, y, { fg: K.fg2, bg: alpha(K.bg0, 0.75), line: alpha(K.fg3, 0.6), size: 11, wt: 700, align, track: 1.5 });
/** Word-wrap s in font f to maxW. */
function wrap(c: CanvasRenderingContext2D, s: string, f: string, maxW: number): string[] {
  c.font = f; const out: string[] = []; let cur = '';
  for (const w of s.split(' ')) { const nx = cur ? `${cur} ${w}` : w; if (cur && c.measureText(nx).width > maxW) { out.push(cur); cur = w; } else cur = nx; }
  if (cur) out.push(cur); return out;
}

/** Simple line icons, centred at (x, y), s across. */
function icon(c: CanvasRenderingContext2D, k: string, x: number, y: number, s: number, col: string, lw = Math.max(1.6, s * 0.085)) {
  const h = s / 2;
  c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  switch (k) {
    case 'doc': c.moveTo(-h * 0.7, -h); c.lineTo(h * 0.3, -h); c.lineTo(h * 0.7, -h * 0.6); c.lineTo(h * 0.7, h); c.lineTo(-h * 0.7, h); c.closePath(); c.stroke();
      c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(-h * 0.38, -h * 0.2 + i * h * 0.38); c.lineTo(h * 0.38, -h * 0.2 + i * h * 0.38); } c.stroke(); break;
    case 'lock': c.moveTo(-h * 0.42, -h * 0.05); c.lineTo(-h * 0.42, -h * 0.42); c.arc(0, -h * 0.42, h * 0.42, Math.PI, 0); c.lineTo(h * 0.42, -h * 0.05); c.stroke();
      fillRR(c, -h * 0.68, -h * 0.08, s * 0.68, s * 0.55, s * 0.1, col); disc(c, 0, h * 0.42, lw * 0.9, alpha(K.bg0, 0.85)); break;
    case 'check': c.moveTo(-h * 0.6, 0); c.lineTo(-h * 0.15, h * 0.45); c.lineTo(h * 0.65, -h * 0.45); c.stroke(); break;
    case 'x': c.moveTo(-h * 0.5, -h * 0.5); c.lineTo(h * 0.5, h * 0.5); c.moveTo(h * 0.5, -h * 0.5); c.lineTo(-h * 0.5, h * 0.5); c.stroke(); break;
    case 'bookmark': c.moveTo(-h * 0.55, -h * 0.85); c.lineTo(h * 0.55, -h * 0.85); c.lineTo(h * 0.55, h * 0.9); c.lineTo(0, h * 0.45); c.lineTo(-h * 0.55, h * 0.9); c.closePath(); c.fill(); break;
    case 'chat': rrect(c, -h, -h * 0.7, s, s * 0.62, s * 0.16); c.stroke(); c.beginPath(); c.moveTo(-h * 0.45, h * 0.52); c.lineTo(-h * 0.5, h * 0.95); c.lineTo(-h * 0.05, h * 0.55); c.stroke();
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * h * 0.42, -h * 0.08, lw * 0.75, 0, 7); c.fill(); } break;
    case 'send': c.moveTo(-h * 0.85, -h * 0.1); c.lineTo(h * 0.85, -h * 0.7); c.lineTo(h * 0.25, h * 0.85); c.lineTo(-h * 0.05, h * 0.15); c.closePath(); c.stroke(); break;
    case 'down': c.moveTo(0, -h); c.lineTo(0, h * 0.5); c.moveTo(-h * 0.5, 0); c.lineTo(0, h * 0.55); c.lineTo(h * 0.5, 0); c.stroke(); c.beginPath(); c.moveTo(-h * 0.8, h * 0.9); c.lineTo(h * 0.8, h * 0.9); c.stroke(); break;
    case 'cloud': c.moveTo(-h * 0.7, h * 0.4); c.arc(-h * 0.45, h * 0.05, h * 0.38, Math.PI * 0.55, Math.PI * 1.5); c.arc(h * 0.05, -h * 0.2, h * 0.5, Math.PI * 1.1, Math.PI * 1.9);
      c.arc(h * 0.55, h * 0.12, h * 0.32, Math.PI * 1.5, Math.PI * 0.45); c.closePath(); c.stroke(); break;
  }
  c.restore();
}

// ---------------------------------------------------------------- the double helix along a path
type PathFn = (f: number) => { x: number; y: number; nx: number; ny: number };
/** A vertical path, f = 0 at the bottom (y1) to 1 at the top (y0), swaying `bend` px sideways. */
const vpath = (cx: number, y0: number, y1: number, bend = 0, bph = 0): PathFn => (f) => {
  const x = cx + bend * Math.sin(f * Math.PI * 1.2 + bph), y = y1 + (y0 - y1) * f;
  const dx = bend * Math.PI * 1.2 * Math.cos(f * Math.PI * 1.2 + bph), dy = y0 - y1, L = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / L, ny: dx / L };
};
/** A horizontal path from x0 to x1 at y. */
const hpath = (y: number, x0: number, x1: number, wave = 0, t = 0): PathFn => (f) => {
  const x = x0 + (x1 - x0) * f, yy = y + wave * Math.sin(f * 5 + t), dy = wave * 5 * Math.cos(f * 5 + t) / (x1 - x0), L = Math.hypot(1, dy);
  return { x, y: yy, nx: -dy / L, ny: 1 / L };
};
/** A cubic Bezier path. */
const bpath = (p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number]): PathFn => (f) => {
  const u = 1 - f, x = u * u * u * p0[0] + 3 * u * u * f * p1[0] + 3 * u * f * f * p2[0] + f * f * f * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * f * p1[1] + 3 * u * f * f * p2[1] + f * f * f * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * f * (p2[0] - p1[0]) + 3 * f * f * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * f * (p2[1] - p1[1]) + 3 * f * f * (p3[1] - p2[1]), L = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / L, ny: dx / L };
};
interface HelixO { r?: number; rungs?: number; turns?: number; phase?: number; grow?: number; letters?: number; hi?: number; hiBase?: string; lw?: number; glowA?: number; grey?: number; from?: number }
/** The point of strand `s` (0 or 1) at path position f: screen x, y and depth z (1 = nearest). */
function helixAt(path: PathFn, f: number, s: number, o: HelixO, t: number) {
  const r = o.r ?? 50, turns = o.turns ?? 2.2, ph = o.phase ?? t * 1.8, grow = o.grow ?? 1;
  const tip = sat((grow - f) / 0.07), p = path(f), th = ph + f * turns * 2 * Math.PI + s * Math.PI, k = Math.sin(th) * r * (0.25 + 0.75 * tip);
  return { x: p.x + p.nx * k, y: p.y + p.ny * k, z: Math.cos(th) };
}
/** A luminous double helix: both strands, base-pair rungs coloured by base, depth-sorted; grows along its path to `grow`. */
function drawHelix(c: CanvasRenderingContext2D, path: PathFn, t: number, o: HelixO = {}) {
  const n = o.rungs ?? 20, grow = sat(o.grow ?? 1), from = o.from ?? 0, lw = o.lw ?? 4.5, grey = o.grey ?? 0, ga = o.glowA ?? 1;
  if (grow <= from) return;
  const items: { z: number; d: () => void }[] = [];
  const strandCol = (z: number, s: number) => mixHex(mixHex(s ? K.sky : K.teal, '#9AA6C0', grey), '#0A2A44', 0.62 * (1 - (z + 1) / 2));
  const S = n * 6;
  for (let j = 0; j < S; j++) {
    const f0 = j / S, f1 = (j + 1) / S; if (f0 >= grow || f1 <= from) continue;
    for (const s of [0, 1]) {
      const a = helixAt(path, Math.max(from, f0), s, o, t), b = helixAt(path, Math.min(grow, f1), s, o, t), z = (a.z + b.z) / 2;
      items.push({ z, d: () => {
        const col = strandCol(z, s), near = (z + 1) / 2;
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = alpha(s ? K.sky : K.teal, (0.06 + 0.12 * near) * ga); c.lineWidth = lw * 3.2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.restore();
        c.strokeStyle = col; c.lineWidth = lw * (0.7 + 0.45 * near); c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      } });
    }
  }
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n; if (f > grow || f < from) continue;
    const a = helixAt(path, f, 0, o, t), b = helixAt(path, f, 1, o, t), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const base = (o.hi === i && o.hiBase) ? o.hiBase : SEQ[i % SEQ.length]!, comp = COMP[base]!;
    for (const [p, bs] of [[a, base], [b, comp]] as const) {
      const z = p.z / 2;
      items.push({ z, d: () => {
        const near = (z + 1) / 2, col = mixHex(mixHex(BASE[bs]!, '#9AA6C0', grey), '#0B1A33', 0.55 * (1 - near));
        c.strokeStyle = col; c.lineWidth = lw * 0.75; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(mx, my); c.stroke();
      } });
      items.push({ z: p.z + 0.01, d: () => {
        const near = (p.z + 1) / 2, col = mixHex(mixHex(BASE[bs]!, '#9AA6C0', grey), '#0B1A33', 0.5 * (1 - near));
        c.save(); c.globalCompositeOperation = 'lighter'; glow(c, p.x, p.y, lw * 3.2, alpha(BASE[bs]!, 0.25 * near * ga)); c.restore();
        disc(c, p.x, p.y, lw * (0.55 + 0.5 * near), col);
        if ((o.letters ?? 0) > 0 && p === a && near > 0.35) txt(c, bs, p.x + (p.x >= mx ? 9 : -9), p.y + 5, M(13, 700), alpha(K.fg, (o.letters ?? 0) * near), 0, p.x >= mx ? 'left' : 'right');
        if (o.hi === i && p === a) { c.strokeStyle = K.amber; c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, p.y, lw * 2.6, 0, 7); c.stroke(); }
      } });
    }
  }
  items.sort((x, y) => x.z - y.z);
  for (const it of items) it.d();
  // the growing tip sparks
  if (grow < 0.999) { const p = path(grow); c.save(); c.globalCompositeOperation = 'lighter'; glow(c, p.x, p.y, 40, alpha(K.teal, 0.5 * ga)); glow(c, p.x, p.y, 14, alpha('#FFFFFF', 0.6 * ga)); c.restore(); }
}

/** Amber dust drifting up (hashed, closed form). */
function dust(c: CanvasRenderingContext2D, t: number, n: number, seed: number, a = 1, region = { x0: 0, x1: FXW, y0: 0, y1: FXH }) {
  const H = region.y1 - region.y0;
  for (let i = 0; i < n; i++) {
    const sp = 8 + 22 * hash(i, seed + 2), x = region.x0 + (region.x1 - region.x0) * hash(i, seed) + 10 * Math.sin(t * 0.6 + i);
    const y = region.y0 + ((((hash(i, seed + 1) * H - t * sp) % H) + H) % H), tw = 0.5 + 0.5 * Math.sin(t * (1.5 + hash(i, seed + 3) * 2) + i);
    const r = 0.8 + 1.8 * hash(i, seed + 4), col = hash(i, seed + 5) < 0.75 ? K.amber : K.teal;
    c.fillStyle = alpha(col, (0.12 + 0.4 * tw) * a); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
}
/** A burst of particles from (x, y) released at t0 (hashed directions and speeds, drag, closed form). */
function burst(c: CanvasRenderingContext2D, t: number, t0: number, x: number, y: number, n: number, seed: number, o: { speed?: number; life?: number; up?: number } = {}) {
  const tau = t - t0, life = o.life ?? 1.1; if (tau <= 0 || tau > life) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * hash(i, seed) - (o.up ?? 0) * Math.PI / 2 * hash(i, seed + 7), v = (o.speed ?? 420) * (0.3 + 0.7 * hash(i, seed + 1)), k = 3.2;
    const d = v * (1 - Math.exp(-k * tau)) / k, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + 40 * tau * tau;
    const fade = 1 - tau / life, col = hash(i, seed + 2) < 0.6 ? K.amber : hash(i, seed + 2) < 0.85 ? K.teal : '#FFFFFF';
    c.fillStyle = alpha(col, 0.85 * fade); c.beginPath(); c.arc(px, py, (1 + 2.2 * hash(i, seed + 3)) * (0.6 + 0.4 * fade), 0, 7); c.fill();
  }
  c.restore();
}
/** A chat bubble with a tail; returns nothing. tail: 'bl' | 'br' | 'none'. */
function bubble(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tail: 'bl' | 'br' | 'none', fill: string, line?: string) {
  const r = Math.min(22, h / 2);
  c.beginPath(); rrect(c, x, y, w, h, r);
  if (tail === 'bl') { c.moveTo(x + 22, y + h - 1); c.lineTo(x + 6, y + h + 18); c.lineTo(x + 44, y + h - 1); }
  if (tail === 'br') { c.moveTo(x + w - 22, y + h - 1); c.lineTo(x + w - 6, y + h + 18); c.lineTo(x + w - 44, y + h - 1); }
  c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 1.5; c.stroke(); }
}
/** A phone: centre (x, y), w x h, rotation rot; draws `screen` in its local frame (origin at the screen's top-left). */
function drawPhone(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, screen: (sw: number, sh: number) => void) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 18; fillRR(c, -w / 2, -h / 2, w, h, w * 0.14, '#05070D'); c.restore();
  const rim = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); rim.addColorStop(0, alpha(K.teal, 0.8)); rim.addColorStop(0.5, alpha('#FFFFFF', 0.15)); rim.addColorStop(1, alpha(K.violet, 0.8));
  strokeRR(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, w * 0.14, rim, 2.5);
  const b = w * 0.045, sw = w - 2 * b, sh = h - 2 * b;
  c.save(); rrect(c, -w / 2 + b, -h / 2 + b, sw, sh, w * 0.11); c.clip(); c.translate(-w / 2 + b, -h / 2 + b);
  const wp = c.createLinearGradient(0, 0, sw, sh); wp.addColorStop(0, '#0E2A4A'); wp.addColorStop(0.6, '#10183E'); wp.addColorStop(1, '#070D22'); c.fillStyle = wp; c.fillRect(0, 0, sw, sh);
  glow(c, sw * 0.5, sh * 0.32, sw * 0.9, alpha(K.teal, 0.3));
  screen(sw, sh);
  fillRR(c, sw / 2 - sw * 0.17, 9, sw * 0.34, 20, 10, '#000000');
  c.restore();
  c.restore();
}
/** A scientist silhouette (original): (x, y) is the base of the neck; lit from the right (the helix: teal rim) and from the
left (an amber fill). The right arm is raised, pointing up and to the right. */
function drawScientist(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const coat = c.createLinearGradient(-150, 0, 150, 0); coat.addColorStop(0, '#0C1834'); coat.addColorStop(1, '#1B3260');
  const dark = '#0A1530', rimT = alpha(K.teal, 0.95), rimA = alpha(K.amber, 0.6);
  // the lab coat
  c.beginPath(); c.moveTo(-150, 280); c.bezierCurveTo(-150, 110, -112, 40, -48, 22); c.quadraticCurveTo(0, 10, 48, 22); c.bezierCurveTo(112, 40, 150, 110, 150, 280); c.closePath();
  c.fillStyle = coat; c.fill();
  c.beginPath(); c.moveTo(-34, 24); c.lineTo(0, 116); c.lineTo(34, 24); c.closePath(); c.fillStyle = '#070F22'; c.fill();       // the shirt in the V
  c.strokeStyle = alpha('#D5E2FF', 0.45); c.lineWidth = 3; c.beginPath(); c.moveTo(-36, 24); c.lineTo(0, 118); c.lineTo(36, 24); c.stroke();
  c.strokeStyle = rimT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(146, 220); c.bezierCurveTo(146, 110, 112, 44, 48, 24); c.stroke();
  c.strokeStyle = rimA; c.lineWidth = 3; c.beginPath(); c.moveTo(-146, 220); c.bezierCurveTo(-146, 110, -112, 44, -48, 24); c.stroke();
  fillRR(c, 60, 120, 44, 8, 4, alpha(K.teal, 0.7));                                                                               // a pen in the pocket
  // the raised arm (sleeve, cuff, a hand pointing up-right)
  const sway = 0.04 * Math.sin(t * 1.3);
  c.save(); c.translate(104, 64); c.rotate(0.62 + sway);
  c.beginPath(); c.moveTo(-30, 10); c.lineTo(-20, -150); c.lineTo(20, -150); c.lineTo(32, 10); c.closePath(); c.fillStyle = coat; c.fill();
  c.strokeStyle = rimT; c.lineWidth = 3.5; c.beginPath(); c.moveTo(32, 4); c.lineTo(20, -150); c.stroke();
  fillRR(c, -23, -164, 46, 18, 6, '#D9E4F7');                                                                                       // the cuff
  c.beginPath(); c.ellipse(0, -186, 19, 24, 0, 0, 7); c.fillStyle = dark; c.fill(); c.strokeStyle = rimT; c.lineWidth = 3; c.stroke();  // the fist
  fillRR(c, -6, -236, 13, 44, 6.5, dark); strokeRR(c, -6, -236, 13, 44, 6.5, rimT, 2.5);                                           // the pointing finger
  c.restore();
  // neck and head, tilted up toward the helix
  fillRR(c, -17, -34, 34, 62, 12, dark);
  c.save(); c.translate(0, -78); c.rotate(0.2);
  c.beginPath(); c.ellipse(-44, 6, 9, 15, 0, 0, 7); c.fillStyle = dark; c.fill();                                                    // the ear
  c.beginPath(); c.ellipse(0, 0, 46, 55, 0, 0, 7); c.fillStyle = dark; c.fill();
  c.strokeStyle = rimT; c.lineWidth = 3.5; c.beginPath(); c.ellipse(0, 0, 46, 55, 0, -1.25, 1.2); c.stroke();
  c.strokeStyle = rimA; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, 46, 55, 0, 2.1, 3.7); c.stroke();
  c.beginPath(); c.moveTo(-48, -2); c.bezierCurveTo(-56, -58, -16, -74, 10, -66); c.bezierCurveTo(42, -74, 62, -40, 48, -8); c.bezierCurveTo(30, -36, -22, -40, -48, -2); c.fillStyle = '#050A16'; c.fill();
  c.strokeStyle = alpha(K.teal, 0.5); c.lineWidth = 2; c.beginPath(); c.moveTo(14, -64); c.bezierCurveTo(36, -68, 54, -46, 48, -14); c.stroke();
  // safety goggles pushed up on the forehead: strap, two lenses catching the helix light
  c.strokeStyle = '#0E1A36'; c.lineWidth = 6; c.beginPath(); c.ellipse(0, -22, 47, 12, 0, Math.PI, 2 * Math.PI); c.stroke();
  for (const gx_ of [-18, 18]) { fillRR(c, gx_ - 17, -36, 34, 22, 9, alpha(K.teal, 0.3)); strokeRR(c, gx_ - 17, -36, 34, 22, 9, rimT, 2.4); fillRR(c, gx_ - 9, -32, 8, 5, 2.5, alpha('#FFFFFF', 0.7)); }
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- data
interface Cues { duration: number; chapters: [number, number, string][]; events: Record<string, number> }
interface Word { w: string; start: number; end: number }
interface Line { i: number; chapter: string; text: string; start: number; end: number; words: Word[] }
const GHOST: Record<string, string> = { hook: 'DNA', twist: 'TWIST', model: 'CARBON-X', both: 'ACGT', mutation: 'A→G', answer: 'RESEARCH', bench: '66.7',
  warn: 'CAUTION', open: 'OPEN', hw: 'GPU', payoff: 'CROSSOVER', cta: 'DNA', end: 'TREK' };
// chapters whose entrance is drawn by the chapter itself (a shared element carries across the cut): no crossfade
const SHARED = new Set(['hook>twist', 'mutation>answer']);
const BENCH: [string, number][] = [['BioReason Coding', 74.9], ['BioReason Non-SNV', 85.1], ['GenomeQA', 63.6], ['NextBase', 39.4], ['FrontierVEP', 70.4]];
const ROWS = ['ATG GCT TCA GGA', 'CTT GAT CCG TAC', 'GGA TTC AAG CTG'];   // the fictional sequence; the A at row 1, char 5 becomes G
const MUT: [number, number] = [1, 5];

export default class CarbonX extends Scene {
  private layer = new Layer2D();
  private cues!: Cues;
  private lines: Line[] = [];
  private bursts: Word[][] = [];
  private kicks: number[] = [];
  private img: Record<string, HTMLImageElement> = {};
  private logo: HTMLImageElement | null = null;

  override async init() {
    this.cues = await (await fetch('/data/carbonx/cues.json')).json();
    try { this.lines = (await (await fetch('/data/lyrics.json')).json()).lines; } catch { /* captions optional */ }
    try { this.kicks = (await (await fetch('/data/carbonx/music.json')).json()).kicks; } catch { this.kicks = []; }
    for (const k of ['r_params', 'r_avg', 'r_clinical', 'r_6mer']) {
      const im = new Image(); im.src = `carbonx/screens/${k}.png`; await im.decode(); this.img[k] = im;
    }
    try { const im = new Image(); im.src = 'brand/techpe-trek.jpg'; await im.decode(); this.logo = im; } catch { this.logo = null; }
    try { const im = new Image(); im.src = 'carbonx/brand/hf-logo.png'; await im.decode(); this.img.hf = im; } catch { /* the cover's reference badge falls back to text */ }   // official asset, unaltered
    // caption bursts: 2-5 words, broken after punctuation (not after the single base letters "A, C, G,")
    for (const l of this.lines) {
      let cur: Word[] = [];
      l.words.forEach((w, i) => {
        cur.push(w);
        const rem = l.words.length - 1 - i, punct = /[,.!?:;]$/.test(w.w) && w.w.replace(/[,.!?:;]+$/, '').length > 1;
        if (rem === 0 || (punct && cur.length >= 2 && rem !== 1) || (cur.length >= 4 && rem >= 2) || cur.length >= 5) { this.bursts.push(cur); cur = []; }
      });
    }
  }
  private ev(n: string) { const v = this.cues.events[n]; if (typeof v !== 'number') throw new Error(`carbonx cue missing: ${n}`); return v; }
  private kick(t: number) {
    const K_ = this.kicks; let lo = 0, hi = K_.length - 1, best = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (K_[m]! <= t) { best = m; lo = m + 1; } else hi = m - 1; }
    return best < 0 ? 0 : Math.exp(-(t - K_[best]!) / 0.14);
  }
  private chapterAt(t: number) { const ch = this.cues.chapters; let i = ch.findIndex(([a, b]) => t >= a && t < b); if (i < 0) i = t < ch[0]![0] ? 0 : ch.length - 1; return i; }

  // ================================================================ persistent layers
  private background(c: CanvasRenderingContext2D, t: number, name: string) {
    const g = c.createLinearGradient(0, 0, 0, FXH); g.addColorStop(0, K.bg1); g.addColorStop(1, K.bg0); c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
    const kp = this.kick(t), warn = name === 'warn' ? 1 : 0;
    glow(c, 110 + 40 * Math.sin(t * 0.23), 280 + 30 * Math.cos(t * 0.19), 440, alpha(warn ? K.red : K.teal, 0.08 + 0.05 * kp));
    glow(c, 520, 800 + 30 * Math.sin(t * 0.17), 470, alpha(K.violet, 0.1 + 0.03 * kp));
    // the lab: a faint hex grid
    c.strokeStyle = alpha(K.fg3, 0.07); c.lineWidth = 1;
    const r = 26, hx = r * Math.sqrt(3), off = (t * 6) % (r * 3);
    for (let row = -1; row < FXH / (r * 1.5) + 1; row++) for (let col = -1; col < FXW / hx + 1; col++) {
      const x = col * hx + (row % 2 ? hx / 2 : 0), y = row * r * 1.5 + off;
      c.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; const px = x + r * Math.cos(a), py = y + r * Math.sin(a); if (k) c.lineTo(px, py); else c.moveTo(px, py); } c.closePath(); c.stroke();
    }
    dust(c, t, 46, 11, 0.8);
    const gw = GHOST[name];
    if (gw) { c.save(); const { f } = fitFont(c, gw, 250, FXW * 1.25, 125, 900); c.globalAlpha = 0.04; c.translate(CX + 18 * Math.sin(t * 0.3), 640); c.rotate(-0.08); txt(c, gw, 0, 0, f, K.fg, 0, 'center'); c.restore(); }
  }
  private progress(c: CanvasRenderingContext2D, t: number) {
    const ch = this.cues.chapters.filter((x) => x[2] !== 'end'), gap = 4, w = (SW - gap * (ch.length - 1)) / ch.length;
    ch.forEach(([a, b], i) => { const x = SAFE.x0 + i * (w + gap), p = sat((t - a) / (b - a)); fillRR(c, x, 118, w, 3, 1.5, alpha(K.fg3, 0.3)); if (p > 0) fillRR(c, x, 118, w * p, 3, 1.5, K.teal); });
  }
  /** Captions: bursts of 2-5 words as they are said, at most two rows, on a dark pill; key words teal, caveats amber. */
  private captions(c: CanvasRenderingContext2D, t: number) {
    const bi = this.bursts.findIndex((b, i) => t >= b[0]!.start - 0.06 && t < (this.bursts[i + 1]?.[0]!.start ?? Infinity) - 0.06 && t <= b.at(-1)!.end + 0.5);
    if (bi < 0) return;
    const bw = this.bursts[bi]!, size = 34, f = D(size, 87.5, 900), maxW = SW - 40;
    c.font = f; (c as any).letterSpacing = '0px'; const sp = c.measureText(' ').width;
    const rows: Word[][] = []; let cur: Word[] = [], wsum = 0;
    for (const w of bw) { const ww = c.measureText(w.w).width; if (cur.length && wsum + sp + ww > maxW) { rows.push(cur); cur = []; wsum = 0; } wsum += (cur.length ? sp : 0) + ww; cur.push(w); }
    if (cur.length) rows.push(cur);
    const rowH = 44, y0 = 806 - (rows.length - 1) * rowH / 2;
    const widths = rows.map((r) => r.reduce((s, w, j) => s + c.measureText(w.w).width + (j ? sp : 0), 0));
    const W = Math.max(...widths) + 40, Ht = rows.length * rowH + 20;
    const k = enter(t, bw[0]!.start - 0.06, 0.14);
    c.save(); c.globalAlpha *= k;
    fillRR(c, CX - W / 2, y0 - rowH / 2 - 14, W, Ht, 18, alpha(K.bg0, 0.8)); strokeRR(c, CX - W / 2 + 0.5, y0 - rowH / 2 - 13.5, W - 1, Ht - 1, 18, alpha(K.teal, 0.22), 1);
    rows.forEach((row, ri) => {
      let x = CX - widths[ri]! / 2; const y = y0 + ri * rowH + 12;
      for (const w of row) {
        const ww = c.measureText(w.w).width;
        if (t < w.start - 0.04) txt(c, w.w, x, y, f, alpha(K.fg, 0.3));
        else {
          const p = pop(t, w.start - 0.04), sc = lerp(0.8, 1, Math.min(1.12, p)), on = t < w.end + 0.08;
          const col = RISK.has(w.w) ? K.amber : EMPH.has(w.w) ? K.teal : K.fg;
          c.save(); c.translate(x + ww / 2, y - 11); c.scale(sc, sc);
          if (on) { c.shadowColor = alpha(col, 0.6); c.shadowBlur = 14; }
          txt(c, w.w, 0, 11, f, on || col !== K.fg ? col : alpha(K.fg, 0.92), 0, 'center'); c.restore();
        }
        x += ww + sp;
      }
    });
    c.restore();
  }
  private sourceBadge(c: CanvasRenderingContext2D, a: number) {
    if (a <= 0) return;
    c.save(); c.globalAlpha *= a; c.font = B(14, 500); const w = c.measureText(SOURCE).width + 40;
    fillRR(c, CX - w / 2, 872, w, 26, 13, alpha(K.bg0, 0.7)); icon(c, 'doc', CX - w / 2 + 16, 885, 11, K.fg3, 1.4);
    txt(c, SOURCE, CX - w / 2 + 28, 890, B(14, 500), K.fg2); c.restore();
  }
  /** A real screenshot from the model card on a paper card, labelled; crop = [sy, sh] in source pixels. */
  private receipt(c: CanvasRenderingContext2D, key: string, x: number, y: number, w: number, t: number, t0: number, crop?: [number, number]) {
    const im = this.img[key], k = enter(t, t0, 0.35); if (!im || k <= 0) return;
    const sy = crop?.[0] ?? 0, sh = crop?.[1] ?? im.height, h = (w * sh) / im.width;
    c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 12);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6; fillRR(c, x - 8, y - 8, w + 16, h + 36, 10, K.paper); c.restore();
    c.drawImage(im, 0, sy, im.width, sh, x, y, w, h);
    c.fillStyle = '#D9D4C7'; c.fillRect(x, y + h + 5, w, 1);
    txt(c, 'REAL SCREENSHOT · Carbon-X model card', x, y + h + 21, B(12, 700), '#4A4637', 0.8);
    c.restore();
  }
  /** A headline: rows of [text, colour] slammed in from t0 (each row fitted to the safe width). */
  private headline(c: CanvasRenderingContext2D, t: number, t0: number, rows: [string, string][], o: { y?: number; size?: number; out?: number } = {}) {
    const y = o.y ?? 180, size = o.size ?? 54;
    if (o.out !== undefined && t > o.out + 0.2) return;
    const oa = o.out !== undefined ? 1 - span(t, o.out, o.out + 0.18) : 1;
    rows.forEach(([s, col], i) => {
      const p = pop(t, t0 + i * 0.07); if (p <= 0) return;
      const { f, size: sz } = fitFont(c, s, size, SW, 100, 900);
      c.save(); c.globalAlpha *= popA(p) * oa; c.translate(CX, y + i * (sz * 1.02)); const sc = lerp(1.22, 1, Math.min(1.1, p)); c.scale(sc, sc);
      txt(c, s, 0, 0, f, col, 0, 'center'); c.restore();
    });
  }
  /** A stamp slammed on at t0: two rows inside a rotated frame. */
  private stamp(c: CanvasRenderingContext2D, t: number, t0: number, x: number, y: number, rows: string[], col: string, o: { size?: number; rot?: number; w?: number } = {}) {
    const k = pop(t, t0); if (k <= 0) return;
    const size = o.size ?? 44, w = o.w ?? 380, h = rows.length * size * 1.05 + 30;
    c.save(); c.translate(x, y); c.rotate(o.rot ?? -0.1); const s = lerp(2, 1, Math.min(1.1, k)); c.scale(s, s); c.globalAlpha *= sat(k * 4);
    fillRR(c, -w / 2, -h / 2, w, h, 14, alpha(K.bg0, 0.88)); strokeRR(c, -w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 11, col, 4);
    rows.forEach((s_, i) => { const { f } = fitFont(c, s_, size, w - 50, 100, 900); c.shadowColor = alpha(col, 0.5); c.shadowBlur = 18; txt(c, s_, 0, -h / 2 + 15 + (i + 0.82) * size * 1.05, f, col, 1, 'center'); });
    c.restore();
  }

  // ================================================================ chapters
  // ---- HOOK: a luminous helix erupts from the phone; DNA SE CHAT?!; on "baat" the DNA talks
  private phoneY(t: number) { return lerp(820, 748, outCubic(span(t, -0.35, 0.45))); }
  private hookHelix(t: number): { path: PathFn; o: HelixO } {
    const py = this.phoneY(t), dna = this.ev('hook.dna');
    const grow = 0.34 + 0.66 * outCubic(span(t, -0.12, 0.62));
    return { path: vpath(CX, 286, py - 150, 16, t * 0.8), o: { r: 50, rungs: 18, turns: 2.1, grow, glowA: 1 + 1.4 * hitP(t, dna, 0.18), phase: t * 1.8 } };
  }
  private hook(c: CanvasRenderingContext2D, t: number) {
    const ba = this.ev('hook.baat');
    this.headline(c, t, -0.16, [['DNA SE', K.fg], ['CHAT?!', K.teal]], { y: 190, size: 74 });
    const py = this.phoneY(t);
    drawPhone(c, CX, py, 190, 372, -0.04, (sw, sh) => {
      txt(c, 'LAB CHAT', sw / 2, 62, B(12, 900), alpha(K.fg2, 0.8), 3, 'center');
      glow(c, sw / 2, 46, 70, alpha(K.teal, 0.6));
      fillRR(c, 14, sh - 62, sw - 28, 38, 19, alpha('#FFFFFF', 0.1)); txt(c, 'ACGT…', 30, sh - 37, M(14, 700), K.teal);
    });
    burst(c, t, -0.3, CX, py - 150, 70, 3, { speed: 520, life: 1.3, up: 1 });
    const H = this.hookHelix(t); drawHelix(c, H.path, t, H.o);
    // the DNA talks: a bubble from the helix's top
    const kb = pop(t, ba - 0.03);
    if (kb > 0) {
      c.save(); c.globalAlpha *= popA(kb); c.translate(452, 318); c.scale(popS(kb, 0.4), popS(kb, 0.4));
      bubble(c, -82, -36, 164, 64, 'bl', alpha(K.panel2, 0.96), alpha(K.teal, 0.8));
      const dots = Math.max(0, Math.floor((t - ba) * 6)) % 4;   // the bubble pops 30 ms before "baat": never a negative count
      txt(c, 'ACGT' + '.'.repeat(dots), -64, 6, M(22, 700), K.teal); c.restore();
    }
    illus(c, SAFE.x1, 600, 'ILLUSTRATION', 'right');
  }

  // ---- TWIST: the helix steps left; its letters peel off into a speech bubble; it spins on "twist"
  private twistHelix(t: number): { path: PathFn; o: HelixO; k: number } {
    const t0 = this.ev('tw.in'), tw = this.ev('tw.twist'), k = glide(t, t0), H = this.hookHelix(Math.min(t, t0));
    const pyH = this.phoneY(t0) - 150;
    const cx = lerp(CX, 148, k), y0 = lerp(286, 250, k), y1 = lerp(pyH, 660, k);
    const spin = 2 * Math.PI * 1.25 * easeInOut(span(t, tw - 0.05, tw + 0.7));
    return { path: vpath(cx, y0, y1, 16 * (1 - k) + 8 * k, t * 0.8), o: { ...H.o, grow: lerp(H.o.grow ?? 1, 1, k), r: lerp(50, 44, k), phase: t * 1.8 + spin, letters: k, rungs: 18, glowA: 1 + 1.2 * hitP(t, tw, 0.2) }, k };
  }
  private twist(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('tw.in'), ha = this.ev('tw.haan'), tw = this.ev('tw.twist');
    // the hook's headline and phone leave
    const out = sat((t - t0) / 0.3);
    if (out < 1) {
      c.save(); c.globalAlpha *= 1 - out; this.headline(c, t, -1, [['DNA SE', K.fg], ['CHAT?!', K.teal]], { y: 190, size: 74 });
      drawPhone(c, CX, this.phoneY(t0) + 420 * out * out, 190, 372, -0.04 + 0.3 * out, () => {}); c.restore();
    }
    if (t >= ha - 0.05) this.headline(c, t, ha - 0.05, [['HAAN, LEKIN…', K.fg2]], { y: 186, size: 50, out: tw - 0.12 });
    if (t >= tw - 0.08) this.headline(c, t, tw - 0.08, [['IMPORTANT', K.fg], ['TWIST!', K.amber]], { y: 176, size: 60 });
    const H = this.twistHelix(t); drawHelix(c, H.path, t, H.o);
    // the speech bubble the letters fly into
    const bx = 262, by = 316, bw = 270, bh = 108, kb = pop(t, ha + 0.12);
    if (kb > 0) { c.save(); c.globalAlpha *= popA(kb); c.translate(bx + bw / 2, by + bh / 2); c.scale(popS(kb, 0.5), popS(kb, 0.5)); bubble(c, -bw / 2, -bh / 2, bw, bh, 'bl', alpha(K.panel2, 0.96), alpha(K.teal, 0.7)); c.restore(); }
    const L = 8, slot = (j: number) => ({ x: bx + 26 + j * 29.5, y: by + 66 });
    for (let j = 0; j < L; j++) {
      const ri = 5 + j, ch = SEQ[ri % SEQ.length]!, s0 = ha + 0.04 + j * 0.045, p = easeInOut(span(t, s0, s0 + 0.42));
      if (p <= 0) continue;
      const f = (ri + 0.5) / 18, a = helixAt(H.path, f, 0, H.o, t), d = slot(j);
      const x = lerp(a.x, d.x, p), y = lerp(a.y, d.y, p) - Math.sin(p * Math.PI) * 60, sz = lerp(14, 28, p);
      txt(c, ch, x, y, M(sz, 700), BASE[ch]!, 0, 'left');
    }
    if (t >= ha + 0.6) { const dots = Math.floor((t - ha) * 6) % 4; txt(c, '.'.repeat(dots), bx + 26 + L * 29.5, by + 66, M(28, 700), K.fg2); }
    if (t >= tw) { c.save(); c.globalAlpha *= enter(t, tw, 0.2); txt(c, 'DNA bolega… par dhyan se', bx + bw / 2, by + bh + 40, B(15, 700), K.fg2, 0.5, 'center'); c.restore(); }
    this.stamp(c, t, tw + 0.05, 388, 560, ['RESEARCH', 'ONLY'], K.amber, { size: 34, w: 240, rot: -0.12 });
  }

  // ---- MODEL: HUGGING FACE + PARTNERS, CARBON-X, 14.8B PARAMETERS, OPEN WEIGHTS
  private model(c: CanvasRenderingContext2D, t: number) {
    const hf = this.ev('mo.hf'), nm = this.ev('mo.name'), num = this.ev('mo.num'), pr = this.ev('mo.params'), op = this.ev('mo.open');
    c.save(); c.globalAlpha *= 0.45 * enter(t, this.ev('mo.in'), 0.4);
    drawHelix(c, hpath(436, -30, FXW + 30, 6, t), t, { r: 30, rungs: 30, turns: 4.2, phase: t * 1.4, lw: 3.2, glowA: 0.6 }); c.restore();
    const kh = enter(t, hf, 0.3);
    if (kh > 0) { c.save(); c.globalAlpha *= kh; c.translate(0, (1 - kh) * 10); txt(c, 'HUGGING FACE + PARTNERS', CX, 176, D(20, 125, 900), K.fg2, 4, 'center');
      txt(c, 'Zhongguancun Academy · TIGEM / Univ. of Naples', CX, 204, B(14, 500), K.fg3, 0.3, 'center'); c.restore(); }
    // CARBON-X: the letters drop in
    if (t >= nm - 0.05) {
      const s = 'CARBON-X', { f } = fitFont(c, s, 92, SW, 112.5, 900); c.font = f; const tw = c.measureText(s).width; let x = CX - tw / 2;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]!, cw = c.measureText(ch).width, p = pop(t, nm - 0.05 + i * 0.03);
        if (p > 0) { c.save(); c.globalAlpha *= popA(p); c.translate(x + cw / 2, 300 - (1 - Math.min(1, p)) * 60); c.shadowColor = alpha(K.teal, 0.5); c.shadowBlur = 24; txt(c, ch, 0, 0, f, i >= 6 ? K.teal : K.fg, 0, 'center'); c.restore(); }
        x += cw;
      }
    }
    // 14.8B: the counter rolls up on "14.8"
    const kn = pop(t, num - 0.04);
    if (kn > 0) {
      const v = 14.8 * outCubic(span(t, num - 0.04, num + 0.5));
      c.save(); c.globalAlpha *= popA(kn); c.translate(CX, 446); c.scale(popS(kn, 0.7), popS(kn, 0.7));
      fillRR(c, -170, -66, 340, 98, 24, alpha(K.bg0, 0.85)); strokeRR(c, -169.5, -65.5, 339, 97, 24, alpha(K.amber, 0.8), 2);
      txt(c, `${v.toFixed(1)}B`, 0, 8, D(76, 100, 900), K.amber, 0, 'center');
      const kp = enter(t, pr, 0.25); c.globalAlpha *= kp; txt(c, 'PARAMETERS', 0, 26 + 14, B(15, 900), K.fg2, 4, 'center'); c.restore();
    }
    const ko = pop(t, op);
    if (ko > 0) { c.save(); c.globalAlpha *= popA(ko); chip(c, 'OPEN WEIGHTS', CX - 8, 548, { fg: K.bg0, bg: K.teal, size: 15, wt: 900, align: 'right', track: 1.5 });
      chip(c, 'DNA + ENGLISH', CX + 8, 548, { fg: K.teal, bg: alpha(K.bg0, 0.8), line: K.teal, size: 15, wt: 900, track: 1.5 }); c.restore(); }
    this.receipt(c, 'r_params', CX - 180, 610, 360, t, nm + 0.35, [0, 146]);
  }

  // ---- BOTH: A C G T tiles, a DNA strip and an English question merge into one token stream
  private both(c: CanvasRenderingContext2D, t: number) {
    const dn = this.ev('bo.dna'), en = this.ev('bo.eng'), sa = this.ev('bo.saath'), pc = this.ev('bo.process');
    const lt: [string, number][] = [['A', this.ev('bo.a')], ['C', this.ev('bo.c')], ['G', this.ev('bo.g')], ['T', this.ev('bo.t')]];
    const kd = enter(t, dn - 0.1, 0.3);
    if (kd > 0) { c.save(); c.globalAlpha *= kd; chip(c, 'DNA KE 4 LETTERS', CX, 152, { fg: K.fg2, bg: alpha(K.bg0, 0.8), line: alpha(K.fg3, 0.6), size: 13, wt: 900, align: 'center', track: 2 }); c.restore(); }
    const tile = 92, gap = 14, x0 = CX - (4 * tile + 3 * gap) / 2;
    lt.forEach(([ch, te], i) => {
      const p = pop(t, te - 0.03); if (p <= 0) return;
      const x = x0 + i * (tile + gap) + tile / 2, y = 228, col = BASE[ch]!;
      c.save(); c.globalAlpha *= popA(p); c.translate(x, y - (1 - Math.min(1, p)) * 40); c.scale(popS(p), popS(p));
      c.save(); c.shadowColor = alpha(col, 0.6); c.shadowBlur = 26; fillRR(c, -tile / 2, -tile / 2, tile, tile, 20, alpha(col, 0.16)); c.restore();
      strokeRR(c, -tile / 2 + 1, -tile / 2 + 1, tile - 2, tile - 2, 19, col, 2.5); txt(c, ch, 0, 24, D(66, 100, 900), col, 0, 'center'); c.restore();
    });
    const merge = glide(t, sa - 0.05);
    // the DNA strip (left lane) and the English question (right lane) slide together into one stream
    const kS = enter(t, dn, 0.35);
    if (kS > 0 && merge < 1) {
      c.save(); c.globalAlpha *= kS * (1 - merge); c.translate(0, lerp(0, 120, merge));
      c.save(); rrect(c, SAFE.x0, 318, SW, 44, 12); c.clip(); fillRR(c, SAFE.x0, 318, SW, 44, 12, alpha(K.bg0, 0.7));
      c.font = M(22, 700); const cw = c.measureText('A').width, off = (t * 40) % (cw * 6);
      for (let j = 0; j < 40; j++) { const ch = SEQ[j % SEQ.length]!; txt(c, ch, SAFE.x0 + 14 + j * cw - off, 348, M(22, 700), BASE[ch]!); }
      c.restore(); txt(c, 'DNA', SAFE.x0, 308, B(12, 900), K.fg3, 2);
      c.restore();
    }
    const kE = pop(t, en - 0.05);
    if (kE > 0 && merge < 1) {
      c.save(); c.globalAlpha *= popA(kE) * (1 - merge); c.translate((1 - Math.min(1, kE)) * 120, lerp(0, 40, merge));
      bubble(c, 150, 382, 386, 50, 'br', alpha(K.panel2, 0.96), alpha(K.violet, 0.7)); txt(c, 'What could this change do?', 172, 414, B(19, 700), K.fg);
      txt(c, 'ENGLISH', 536, 372, B(12, 900), K.fg3, 2, 'right'); c.restore();
    }
    if (merge > 0) {
      // one token stream: <dna> 6-mers </dna> then words, all in one row, flowing into the model
      c.save(); c.globalAlpha *= sat(merge * 1.5);
      const toks: [string, string][] = [['<dna>', K.fg3], ['ATGCGT', K.teal], ['ACCTTA', K.teal], ['GGCATC', K.teal], ['</dna>', K.fg3], ['What', K.violet], ['could', K.violet], ['this', K.violet], ['change', K.violet], ['do?', K.violet]];
      c.save(); rrect(c, SAFE.x0, 452, SW, 52, 14); c.clip(); fillRR(c, SAFE.x0, 452, SW, 52, 14, alpha(K.bg0, 0.75));
      c.font = M(15, 700); let total = 0; const ws = toks.map(([s]) => c.measureText(s).width + 20); total = ws.reduce((a, b) => a + b + 8, 0);
      const flow = (t - sa) * 70; let x = SAFE.x0 + 12 - (flow % total);
      for (let rep = 0; rep < 3; rep++) toks.forEach(([s, col], i) => { fillRR(c, x, 464, ws[i]!, 28, 8, alpha(col, 0.16)); strokeRR(c, x + 0.5, 464.5, ws[i]! - 1, 27, 8, alpha(col, 0.7), 1); txt(c, s, x + 10, 483, M(15, 700), col === K.fg3 ? K.fg2 : col); x += ws[i]! + 8; });
      c.restore();
      txt(c, 'EK HI TOKEN STREAM', SAFE.x0, 444, B(12, 900), K.teal, 2);
      c.restore();
      const k6 = pop(t, sa + 0.25);
      if (k6 > 0) { c.save(); c.globalAlpha *= popA(k6); chip(c, '6 DNA LETTERS = 1 TOKEN', CX, 532, { fg: K.amber, bg: alpha(K.bg0, 0.85), line: K.amber, size: 14, wt: 900, align: 'center', track: 1.5 }); c.restore(); }
    }
    const kp = pop(t, pc - 0.05);
    if (kp > 0) {
      c.save(); c.globalAlpha *= popA(kp); c.translate(CX, 590); c.scale(popS(kp, 0.7), popS(kp, 0.7));
      c.save(); c.shadowColor = alpha(K.teal, 0.6); c.shadowBlur = 30; fillRR(c, -150, -28, 300, 56, 16, K.panel2); c.restore(); strokeRR(c, -149.5, -27.5, 299, 55, 16, K.teal, 2);
      txt(c, 'CARBON-X', -10, 9, D(24, 112.5, 900), K.fg, 2, 'center');
      const sp = (t * 6) % (Math.PI * 2); c.strokeStyle = K.teal; c.lineWidth = 3; c.beginPath(); c.arc(112, 0, 10, sp, sp + 4.2); c.stroke(); c.restore();
      for (let i = 0; i < 3; i++) { const q = ((t - pc) * 1.8 + i / 3) % 1; disc(c, CX - 120 + i * 120, lerp(504, 562, q), 3, alpha(K.teal, 1 - q)); }
    }
    this.receipt(c, 'r_6mer', CX - 150, 648, 300, t, sa + 0.45);
  }

  // ---- MUTATION / ANSWER: an original research-chat panel (illustrative); paste, A -> G, the question, then the answer card
  private panel(c: CanvasRenderingContext2D, k: number) {
    if (k <= 0) return;
    c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 20);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 10; fillRR(c, 70, 182, 468, 560, 22, alpha(K.panel, 0.97)); c.restore();
    strokeRR(c, 70.5, 182.5, 467, 559, 22, alpha(K.teal, 0.22), 1.2);
    for (let i = 0; i < 3; i++) disc(c, 94 + i * 16, 206, 4.5, [K.red, K.amber, K.green][i]!);
    txt(c, 'Research chat · Carbon-X', 150, 211, B(14, 700), K.fg2);
    illus(c, 524, 206, 'DEMO UI · ILLUSTRATION', 'right');
    c.fillStyle = alpha(K.line, 0.8); c.fillRect(70, 228, 468, 1);
    c.restore();
  }
  /** The researcher's message: composed big (sent = 0), then sent up into the chat, smaller (sent = 1). */
  private composer(c: CanvasRenderingContext2D, t: number, sent: number) {
    const sq = this.ev('mu.seq'), pa = this.ev('mu.paste'), po = this.ev('mu.pooche'), mt = this.ev('mu.mut'), ky = this.ev('mu.kya');
    const s = lerp(1, 0.62, sent);
    c.save(); c.translate(522, lerp(258, 244, sent)); c.scale(s, s); c.translate(-436, 0);   // the box is 436 wide, anchored at its top-right
    const H = 300;
    fillRR(c, 0, 0, 436, H, 18, sent > 0.5 ? alpha(K.violet, 0.16) : alpha(K.bg0, 0.6)); strokeRR(c, 0.5, 0.5, 435, H - 1, 18, alpha(sent > 0.5 ? K.violet : K.fg3, 0.6), 1.5);
    // avatar + label
    disc(c, 26, 26, 13, alpha(K.violet, 0.3)); disc(c, 26, 22, 5, K.fg2); c.beginPath(); c.arc(26, 36, 8, Math.PI, 0); c.fillStyle = K.fg2; c.fill();
    txt(c, 'Researcher', 48, 31, B(14, 700), K.fg2);
    if (t < pa) {
      const blink = Math.floor(t * 2.2) % 2 === 0;
      txt(c, 'DNA sequence paste karo…', 24, 92, B(19, 500), alpha(K.fg3, enter(t, sq - 0.2, 0.3)));
      if (blink) { c.fillStyle = K.teal; c.fillRect(24, 74, 2, 24); }
    } else {
      const flash = 1 - sat((t - pa) / 0.25);
      c.font = M(30, 700); const cw = c.measureText('A').width;
      ROWS.forEach((row, ri) => {
        for (let j = 0; j < row.length; j++) {
          let ch = row[j]!; if (ch === ' ') continue;
          const isM = ri === MUT[0] && j === MUT[1], x = 24 + j * cw, y = 98 + ri * 42;
          if (isM && t >= mt) {
            const p = sat((t - mt) / 0.26), sy = Math.abs(Math.cos(Math.PI * p)); if (p >= 0.5) ch = 'G';
            const pulse = 0.5 + 0.5 * Math.sin((t - mt) * 10);
            c.strokeStyle = alpha(K.amber, 0.6 + 0.4 * pulse); c.lineWidth = 3; c.beginPath(); c.arc(x + cw / 2, y - 10, 24, 0, 7); c.stroke();
            c.save(); c.translate(x + cw / 2, y - 10); c.scale(1, Math.max(0.05, sy)); txt(c, ch, 0, 10, M(30, 700), BASE[ch]!, 0, 'center'); c.restore();
          } else txt(c, ch, x, y, M(30, 700), BASE[ch]!);
        }
      });
      if (flash > 0) { c.fillStyle = alpha('#FFFFFF', 0.25 * flash); c.fillRect(14, 64, 408, 132); }
      const kv = pop(t, pa); if (kv > 0 && sent < 0.5) { c.save(); c.globalAlpha *= popA(kv) * (1 - sat((t - pa - 1.2) / 0.3)); chip(c, 'Ctrl + V', 420, 31, { fg: K.bg0, bg: K.teal, size: 12, wt: 900, align: 'right' }); c.restore(); }
      const km = pop(t, mt + 0.1);
      if (km > 0) {
        c.save(); c.globalAlpha *= popA(km); c.translate(24 + ROWS[MUT[0]]!.length * cw + 72, 98 + MUT[0] * 42 - 10); c.scale(popS(km), popS(km));
        fillRR(c, -60, -18, 120, 36, 18, K.amber); txt(c, 'A → G', 0, 8, D(20, 100, 900), '#1B1206', 1, 'center'); c.restore();
      }
    }
    // the question, typed
    const q = 'What could be the possible effect of this mutation?', n = Math.floor(q.length * span(t, po + 0.05, ky - 0.02));
    if (n > 0) {
      const lines = wrap(c, q, B(19, 700), 330); let used = 0;
      lines.forEach((ln, i) => { const show = ln.slice(0, Math.max(0, n - used)); used += ln.length + 1; txt(c, show, 24, 236 + i * 26, B(19, 700), K.fg); });
    }
    // send
    const ks = hitP(t, ky, 0.18);
    disc(c, 400, 262, 22, alpha(K.teal, 0.25 + 0.6 * ks)); icon(c, 'send', 400, 262, 22, K.teal, 2.4);
    c.restore();
  }
  private mutation(c: CanvasRenderingContext2D, t: number) {
    const m0 = this.ev('mu.in'), so = this.ev('mu.socho');
    const kc = pop(t, so - 0.05); if (kc > 0) { c.save(); c.globalAlpha *= popA(kc); chip(c, 'HYPOTHETICAL EXAMPLE · FICTIONAL SEQUENCE', CX, 152, { fg: K.amber, bg: alpha(K.bg0, 0.85), line: K.amber, size: 13, wt: 900, align: 'center', track: 1.2 }); c.restore(); }
    this.panel(c, enter(t, m0, 0.3));
    if (t >= m0 + 0.08) this.composer(c, t, 0);
  }
  private answer(c: CanvasRenderingContext2D, t: number) {
    const a0 = this.ev('an.in'), am = this.ev('an.model'), pr = this.ev('an.pred'), ex = this.ev('an.expl');
    chip(c, 'HYPOTHETICAL EXAMPLE · FICTIONAL SEQUENCE', CX, 152, { fg: K.amber, bg: alpha(K.bg0, 0.85), line: K.amber, size: 13, wt: 900, align: 'center', track: 1.2 });
    this.panel(c, 1);
    this.composer(c, t, glide(t, a0 - 0.05));
    const k = enter(t, am - 0.08, 0.35); if (k <= 0) return;
    c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 40);
    const X = 86, Y = 446, W = 436, Hh = 282;
    fillRR(c, X, Y, W, Hh, 18, alpha(K.teal, 0.08)); strokeRR(c, X + 0.5, Y + 0.5, W - 1, Hh - 1, 18, alpha(K.teal, 0.55), 1.5);
    drawHelix(c, vpath(X + 26, Y + 12, Y + 42, 0), t, { r: 8, rungs: 5, turns: 1.2, lw: 2, glowA: 0.5 });
    txt(c, 'Carbon-X', X + 46, Y + 32, B(15, 900), K.fg);
    chip(c, 'ILLUSTRATIVE RECONSTRUCTION', X + W - 12, Y + 27, { fg: K.amber, bg: alpha(K.bg0, 0.8), line: alpha(K.amber, 0.8), size: 11, wt: 900, align: 'right', track: 1 });
    const block = (label: string, s: string, y: number, t0: number) => {
      const kl = enter(t, t0 - 0.1, 0.2); if (kl <= 0) return;
      c.save(); c.globalAlpha *= kl; txt(c, label, X + 18, y, B(13, 900), K.teal, 2);
      const n = Math.floor(s.length * span(t, t0, t0 + 0.8)); const lines = wrap(c, s, B(18, 500), W - 40); let used = 0;
      lines.forEach((ln, i) => { txt(c, ln.slice(0, Math.max(0, n - used)), X + 18, y + 28 + i * 25, B(18, 500), K.fg); used += ln.length + 1; });
      c.restore();
    };
    block('RESEARCH PREDICTION', 'Possible effect: it may change how the protein works (a research estimate).', Y + 76, pr);
    block('EXPLANATION', 'The A→G change sits in a coding region of this example, so one amino acid could change.', Y + 172, ex);
    c.restore();
  }

  // ---- BENCH: TEAM-REPORTED; five benchmark bars (the card's numbers); the 66.7% average gauge
  private bench(c: CanvasRenderingContext2D, t: number) {
    const tm = this.ev('be.team'), fv = this.ev('be.five'), num = this.ev('be.num'), rp = this.ev('be.report');
    const kc = pop(t, tm - 0.05); if (kc > 0) { c.save(); c.globalAlpha *= popA(kc); chip(c, 'TEAM-REPORTED · MODEL CARD', CX, 152, { fg: K.amber, bg: alpha(K.bg0, 0.85), line: K.amber, size: 14, wt: 900, align: 'center', track: 1.5 }); c.restore(); }
    // the gauge
    const kg = enter(t, this.ev('be.in') + 0.05, 0.4), gx = CX, gy = 290, R = 78;   // the empty ring from the cut; it fills on "66.7"
    if (kg > 0) {
      c.save(); c.globalAlpha *= kg; disc(c, gx, gy, R + 16, alpha(K.panel, 0.95));
      c.strokeStyle = alpha(K.fg3, 0.25); c.lineWidth = 12; c.beginPath(); c.arc(gx, gy, R, 0, 7); c.stroke();
      const q = outCubic(span(t, num - 0.35, num + 0.25)), a1 = -Math.PI / 2 + 2 * Math.PI * 0.667 * q;
      if (q > 0) { c.save(); c.shadowColor = alpha(K.teal, 0.7); c.shadowBlur = 18; c.strokeStyle = K.teal; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.arc(gx, gy, R, -Math.PI / 2, a1); c.stroke(); c.restore(); }
      txt(c, 'AVERAGE', gx, gy - 30, B(12, 900), K.fg3, 3, 'center');
      txt(c, `${(66.7 * q).toFixed(1)}%`, gx, gy + 16, D(40, 100, 900), q > 0.99 ? K.teal : K.fg, 0, 'center');
      txt(c, '5 DNA benchmarks', gx, gy + 40, B(12, 500), K.fg3, 0, 'center');
      c.restore();
      const pd = hitP(t, num + 0.25, 0.25); if (pd > 0.01) { c.save(); c.globalAlpha *= pd; c.strokeStyle = K.teal; c.lineWidth = 2; c.beginPath(); c.arc(gx, gy, R + 10 + 30 * (1 - pd), 0, 7); c.stroke(); c.restore(); }
    }
    // the bars
    const bx = 262, bw = 222, y0 = 412, rh = 32;
    BENCH.forEach(([name, v], i) => {
      const p = outCubic(span(t, fv + i * E8 / 2, fv + i * E8 / 2 + 0.35)); if (p <= 0) return;
      const y = y0 + i * rh;
      c.save(); c.globalAlpha *= sat(p * 2);
      txt(c, name, bx - 12, y + 6, B(14, 700), K.fg2, 0, 'right');
      fillRR(c, bx, y - 8, bw, 16, 8, alpha(K.fg3, 0.18)); fillRR(c, bx, y - 8, bw * (v / 100) * p, 16, 8, i === 3 ? K.amber : K.teal);
      txt(c, (v * p).toFixed(1), bx + bw + 8, y + 6, M(13, 700), K.fg, 0, 'left');
      c.restore();
    });
    const ka = enter(t, num, 0.3);
    if (ka > 0) {
      const ax_ = bx + bw * 0.667; c.save(); c.globalAlpha *= ka; c.strokeStyle = K.amber; c.lineWidth = 2; c.setLineDash([5, 5]);
      c.beginPath(); c.moveTo(ax_, y0 - 22); c.lineTo(ax_, y0 + 4 * rh + 12); c.stroke(); c.setLineDash([]);
      txt(c, '66.7 avg', ax_, y0 - 28, B(12, 900), K.amber, 0.5, 'center'); c.restore();
    }
    const kr = pop(t, rp - 0.05);
    if (kr > 0) { c.save(); c.globalAlpha *= popA(kr); chip(c, 'TEAM KE TESTS · NOT INDEPENDENT · NOT CLINICAL', CX, 592, { fg: K.bg0, bg: K.amber, size: 12, wt: 900, align: 'center', track: 1 }); c.restore(); }
    this.receipt(c, 'r_avg', CX - 140, 630, 280, t, num + 0.2, [0, 292]);
  }

  // ---- WARN: CLINICAL PROOF x, MEDICAL DIAGNOSIS x; the clipboard; NOT A DIAGNOSIS slams on "nahi"
  private warn(c: CanvasRenderingContext2D, t: number) {
    const w0 = this.ev('wa.in'), cl = this.ev('wa.clinical'), md = this.ev('wa.medical'), nh = this.ev('wa.nahi');
    this.headline(c, t, w0 + 0.02, [['LEKIN…', K.fg2]], { y: 170, size: 44 });
    const row = (s: string, y: number, t0: number) => {
      const p = pop(t, t0); if (p <= 0) return;
      c.save(); c.globalAlpha *= popA(p); c.translate((1 - Math.min(1, p)) * 80, 0);
      fillRR(c, 96, y - 24, 416, 48, 14, alpha(K.panel, 0.95)); strokeRR(c, 96.5, y - 23.5, 415, 47, 14, alpha(K.red, 0.55), 1.5);
      txt(c, s, 120, y + 8, D(22, 100, 900), K.fg);
      disc(c, 484, y, 15, alpha(K.red, 0.2)); icon(c, 'x', 484, y, 15, K.red, 3); c.restore();
    };
    row('CLINICAL PROOF', 234, cl); row('MEDICAL DIAGNOSIS', 292, md);
    // the clipboard (greyed): a report with a pulse line
    const kc = enter(t, w0, 0.35);
    if (kc > 0) {
      c.save(); c.globalAlpha *= kc * lerp(1, 0.45, enter(t, nh, 0.2));
      const X = CX - 120, Y = 342, W = 240, Hh = 250;
      fillRR(c, X, Y, W, Hh, 16, '#DDE3EE'); fillRR(c, CX - 46, Y - 12, 92, 26, 8, '#8E9BB5');
      txt(c, 'REPORT', X + 20, Y + 44, D(20, 100, 900), '#2C3A58', 2);
      c.strokeStyle = '#C0475A'; c.lineWidth = 3; c.beginPath();
      for (let i = 0; i <= 40; i++) { const x = X + 20 + i * 5, ph = (i + t * 18) % 20, y = Y + 92 + (ph > 9 && ph < 10 ? -26 : ph > 10 && ph < 11 ? 18 : 0); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
      for (let i = 0; i < 5; i++) fillRR(c, X + 20, Y + 136 + i * 20, (W - 40) * (0.5 + 0.5 * hash(i, 31)), 8, 4, '#AEB8CC');
      c.restore();
    }
    this.stamp(c, t, nh - 0.02, CX, 470, ['NOT A', 'DIAGNOSIS'], K.red, { size: 56, w: 400, rot: -0.12 });
    this.receipt(c, 'r_clinical', CX - 150, 652, 300, t, nh + 0.35);
  }

  // ---- OPEN: OPEN WEIGHTS + APACHE 2.0; your infrastructure; the sensitive data stays inside; HARDWARE PERMITTING
  private server(c: CanvasRenderingContext2D, x: number, y: number, t: number) {
    fillRR(c, x - 64, y - 104, 128, 208, 12, '#0B1530'); strokeRR(c, x - 63.5, y - 103.5, 127, 207, 12, alpha(K.teal, 0.6), 1.5);
    for (let u = 0; u < 4; u++) {
      const uy = y - 88 + u * 48; fillRR(c, x - 52, uy, 104, 38, 6, K.panel2);
      for (let l = 0; l < 3; l++) { const on = hash(Math.floor(t * 6) + u * 3 + l, 17) > 0.35; disc(c, x - 38 + l * 13, uy + 19, 3.5, on ? (l === 0 ? K.green : K.teal) : alpha(K.fg3, 0.4)); }
      for (let v = 0; v < 4; v++) c.fillRect(x + 4 + v * 10, uy + 10, 4, 18);
    }
  }
  private open(c: CanvasRenderingContext2D, t: number) {
    const o0 = this.ev('op.in'), wg = this.ev('op.weights'), rs = this.ev('op.res'), inf = this.ev('op.infra'), se = this.ev('op.sens'), an = this.ev('op.analyze'), hw = this.ev('op.hw');
    const k1 = pop(t, o0), k2 = pop(t, wg);
    if (k1 > 0) { c.save(); c.globalAlpha *= popA(k1); c.translate(CX - 8, 172); c.scale(popS(k1), popS(k1)); chip(c, 'OPEN WEIGHTS', 0, 0, { fg: K.bg0, bg: K.teal, size: 20, wt: 900, align: 'right', track: 1.5 }); c.restore(); }
    if (k2 > 0) { c.save(); c.globalAlpha *= popA(k2); c.translate(CX + 8, 172); c.scale(popS(k2), popS(k2)); chip(c, 'APACHE 2.0', 0, 0, { fg: K.teal, bg: alpha(K.bg0, 0.8), line: K.teal, size: 20, wt: 900, track: 1.5 }); c.restore(); }
    // the boundary: your own infrastructure
    const kb = enter(t, rs - 0.1, 0.35);
    if (kb > 0) {
      c.save(); c.globalAlpha *= kb;
      fillRR(c, 82, 226, 444, 300, 22, alpha(K.teal, 0.05)); c.setLineDash([9, 7]); c.lineDashOffset = -t * 20; strokeRR(c, 82.5, 226.5, 443, 299, 22, alpha(K.teal, 0.8), 2); c.setLineDash([]);
      const kl = enter(t, inf, 0.25); c.globalAlpha *= kl; txt(c, 'TUMHARA INFRASTRUCTURE', 104, 256, B(14, 900), K.teal, 2);
      c.restore();
      c.save(); c.globalAlpha *= kb; this.server(c, 186, 396, t); c.restore();
    }
    // the weights fall into the server on "weights"
    const fw = span(t, wg + 0.1, wg + 0.6);
    if (fw > 0) {
      const y = fw < 1 ? lerp(150, 278, easeInOut(fw)) : 278, a = fw < 1 ? 1 : 1 - sat((t - wg - 0.6) / 0.25);
      if (a > 0) { c.save(); c.globalAlpha *= a; fillRR(c, 146, y - 18, 80, 36, 10, K.teal); icon(c, 'down', 164, y, 18, K.bg0, 2.6); txt(c, 'weights', 178, y + 5, B(13, 900), K.bg0); c.restore(); }
      if (fw >= 1) { const g = hitP(t, wg + 0.6, 0.3); if (g > 0.01) glow(c, 186, 300, 90, alpha(K.teal, 0.5 * g)); }
    }
    // the sensitive data slides in and stays inside
    const ks = glide(t, se - 0.05);
    if (ks > 0.001) {
      const x = lerp(700, 400, ks);
      c.save(); fillRR(c, x - 82, 330, 164, 104, 16, K.panel2); strokeRR(c, x - 81.5, 330.5, 163, 103, 16, alpha(K.amber, 0.8), 1.5);
      icon(c, 'doc', x - 46, 368, 34, K.fg2, 2.2); icon(c, 'lock', x + 30, 366, 26, K.amber, 2.4);
      txt(c, 'sensitive data', x, 418, B(15, 700), K.fg, 0, 'center'); c.restore();
    }
    const ka = pop(t, an);
    if (ka > 0) { c.save(); c.globalAlpha *= popA(ka); chip(c, 'data apne system par', 400, 474, { fg: K.green, bg: alpha(K.bg0, 0.85), line: K.green, size: 13, wt: 900, align: 'center' }); c.restore(); }
    const kh = pop(t, hw);
    if (kh > 0) { c.save(); c.globalAlpha *= popA(kh); c.translate(CX, 566); c.scale(popS(kh), popS(kh)); chip(c, 'HARDWARE PERMITTING', 0, 0, { fg: K.bg0, bg: K.amber, size: 16, wt: 900, align: 'center', track: 1.5 }); c.restore(); }
    this.receipt(c, 'r_avg', CX - 150, 610, 300, t, an + 0.1, [1028, 225]);
  }

  // ---- HW: NORMAL LAPTOP (spinner, GUARANTEE NAHI) vs the model card's 1 x 80 GB GPU
  private hw(c: CanvasRenderingContext2D, t: number) {
    const h0 = this.ev('hw.in'), lp = this.ev('hw.laptop'), sm = this.ev('hw.smooth'), gu = this.ev('hw.guar'), nh = this.ev('hw.nahi');
    this.headline(c, t, h0 + 0.02, [['EK DETAIL:', K.fg2], ['HARDWARE', K.amber]], { y: 166, size: 50 });
    const panelAt = (x: number, title: string, col: string, k: number) => {
      c.save(); c.globalAlpha *= k; fillRR(c, x, 262, 226, 312, 18, alpha(K.panel, 0.95)); strokeRR(c, x + 0.5, 262.5, 225, 311, 18, alpha(col, 0.5), 1.5);
      txt(c, title, x + 113, 292, B(13, 900), col, 2, 'center'); c.restore();
    };
    const kL = enter(t, lp - 0.12, 0.3), kR = enter(t, gu - 0.12, 0.3);
    if (kL > 0) {
      panelAt(72, 'NORMAL LAPTOP', K.fg2, kL);
      c.save(); c.globalAlpha *= kL; const x = 185, y = 384;
      fillRR(c, x - 82, y - 66, 164, 104, 8, '#1A2547'); fillRR(c, x - 74, y - 58, 148, 88, 4, '#0B1226');
      c.beginPath(); c.moveTo(x - 96, y + 40); c.lineTo(x + 96, y + 40); c.lineTo(x + 108, y + 54); c.lineTo(x - 108, y + 54); c.closePath(); c.fillStyle = '#25325A'; c.fill();
      if (t >= sm) { const a = (t - sm) * 5; c.strokeStyle = K.teal; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.arc(x, y - 18, 16, a, a + 4.4); c.stroke();
        txt(c, 'loading…', x, y + 18, M(12, 700), K.fg3, 0, 'center'); }
      txt(c, 'smooth?', x, 506, D(22, 100, 900), K.fg, 0, 'center'); txt(c, 'not guaranteed', x, 532, B(14, 500), K.fg3, 0, 'center');
      c.restore();
    }
    if (kR > 0) {
      panelAt(310, 'MODEL CARD', K.teal, kR);
      c.save(); c.globalAlpha *= kR; const x = 423, y = 392;
      fillRR(c, x - 88, y - 46, 176, 92, 10, '#13213F'); strokeRR(c, x - 87.5, y - 45.5, 175, 91, 10, alpha(K.teal, 0.8), 1.5);
      for (const fx of [-44, 32]) { disc(c, x + fx, y, 30, '#0A1328'); c.strokeStyle = alpha(K.teal, 0.6); c.lineWidth = 2; c.beginPath(); c.arc(x + fx, y, 30, 0, 7); c.stroke();
        const a = t * 12; for (let b = 0; b < 5; b++) { c.beginPath(); c.moveTo(x + fx, y); c.arc(x + fx, y, 26, a + b * 1.256, a + b * 1.256 + 0.6); c.closePath(); c.fillStyle = alpha(K.teal, 0.3); c.fill(); } }
      c.fillStyle = '#E8B44A'; for (let p = 0; p < 9; p++) c.fillRect(x - 74 + p * 17, y + 46, 9, 8);
      txt(c, '1 × 80 GB GPU', x, 502, D(22, 100, 900), K.teal, 0, 'center'); txt(c, 'bf16 weights', x, 528, M(13, 700), K.fg2, 0, 'center');
      c.restore();
    }
    const kg = enter(t, gu + 0.3, 0.3);
    if (kg > 0) { c.save(); c.globalAlpha *= kg; txt(c, 'Card: llama.cpp / GGUF not supported', CX, 610, B(15, 500), K.fg3, 0, 'center'); c.restore(); }
    this.stamp(c, t, nh - 0.02, 185, 506, ['GUARANTEE', 'NAHI'], K.amber, { size: 28, w: 200, rot: -0.1 });
  }

  // ---- PAYOFF: SCIENCE (the helix) and AI (the chat bubble) fuse: CROSSOVER, CRAZY HAI!
  private payoff(c: CanvasRenderingContext2D, t: number) {
    const p0 = this.ev('pa.in'), sc = this.ev('pa.science'), ai = this.ev('pa.ai'), cr = this.ev('pa.cross'), cz = this.ev('pa.crazy');
    const k = glide(t, cr - 0.18), kS = pop(t, sc - 0.05), kA = pop(t, ai - 0.05);
    const hx = lerp(150, CX, k), bxc = lerp(452, CX, k);
    if (kA > 0) {   // the bubble (behind the helix once fused)
      c.save(); c.globalAlpha *= popA(kA); c.translate(bxc, 440); const s = popS(kA, 0.4) * lerp(1, 1.5, k); c.scale(s, s);
      bubble(c, -84, -56, 168, 104, 'bl', alpha(K.violet, 0.22), alpha(K.violet, 0.9)); txt(c, 'AI', 0, 14, D(40, 100, 900), K.fg, 0, 'center'); c.restore();
    }
    if (kS > 0) {
      c.save(); c.globalAlpha *= popA(kS);
      drawHelix(c, vpath(hx, 270, 620, 10, t), t, { r: 44, rungs: 16, turns: 2, phase: t * 2.2 + 3 * easeInOut(span(t, cr - 0.1, cr + 0.6)), grow: outCubic(span(t, sc - 0.08, sc + 0.4)), glowA: 1 + 1.5 * hitP(t, cr, 0.25) });
      c.restore();
    }
    const lab = 1 - sat((t - cr) / 0.2);
    if (lab > 0) { c.save(); c.globalAlpha *= lab; if (kS > 0) txt(c, 'SCIENCE', hx, 666, B(16, 900), K.teal, 3, 'center'); if (kA > 0) txt(c, 'AI', bxc, 666, B(16, 900), K.violet, 3, 'center'); c.restore(); }
    burst(c, t, cr, CX, 440, 90, 9, { speed: 600, life: 1.2 });
    if (t >= cr - 0.05) this.headline(c, t, cr - 0.05, [['CROSSOVER', K.teal]], { y: 186, size: 76 });
    if (t >= cz - 0.05) { const kz = pop(t, cz - 0.05); c.save(); c.globalAlpha *= popA(kz); c.translate(CX, 254); c.rotate(-0.04); c.scale(popS(kz, 1.5), popS(kz, 1.5)); txt(c, 'CRAZY HAI!', 0, 0, D(40, 100, 900), K.amber, 1, 'center'); c.restore(); }
    const kd = enter(t, cr + 0.2, 0.3); if (kd > 0) { c.save(); c.globalAlpha *= kd; chip(c, 'DNA + LANGUAGE · EK MODEL', CX, 688, { fg: K.fg, bg: alpha(K.bg0, 0.85), line: alpha(K.teal, 0.7), size: 13, wt: 900, align: 'center', track: 1.5 }); c.restore(); }
    void p0;
  }

  // ---- CTA: TRY KARNE SE PEHLE (model card, hardware, non-personal data), SAVE, COMMENT DNA on the drop
  private cta(c: CanvasRenderingContext2D, t: number) {
    const c0 = this.ev('cta.in'), mo = this.ev('cta.model'), cd = this.ev('cta.card'), sv = this.ev('cta.save'), cm = this.ev('cta.comment'), dr = this.ev('cta.drop');
    this.headline(c, t, c0, [['MODEL CARD', K.fg], ['SAVE KARO', K.teal]], { y: 176, size: 56 });
    const kc = enter(t, c0 + 0.05, 0.3);
    if (kc > 0) {
      c.save(); c.globalAlpha *= kc; fillRR(c, 84, 274, 440, 200, 20, alpha(K.panel, 0.96)); strokeRR(c, 84.5, 274.5, 439, 199, 20, alpha(K.amber, 0.4), 1.5);
      txt(c, 'TRY KARNE SE PEHLE', 108, 306, B(13, 900), K.amber, 2);
      const items: [string, number][] = [['Model card padho', mo], ['Hardware check karo (80 GB GPU)', cd], ['Sirf non-personal data use karo', sv]];
      items.forEach(([s, te], i) => { const p = pop(t, te - 0.03); if (p <= 0) return; const y = 348 + i * 44;
        c.save(); c.globalAlpha *= popA(p); c.translate((1 - Math.min(1, p)) * 40, 0);
        disc(c, 124, y - 6, 14, K.teal); icon(c, 'check', 124, y - 6, 15, K.bg0, 2.8); txt(c, s, 150, y, B(18, 700), K.fg); c.restore(); });
      c.restore();
    }
    const ks = pop(t, sv);
    if (ks > 0) { c.save(); c.translate(CX, 510); c.scale(popS(ks, 0.5), popS(ks, 0.5)); c.globalAlpha *= popA(ks);
      fillRR(c, -100, -24, 200, 48, 24, alpha(K.bg0, 0.9)); strokeRR(c, -99, -23, 198, 46, 23, K.amber, 2);
      icon(c, 'bookmark', -70, 0, 20, K.amber); txt(c, 'SAVE', 12, 8, D(22, 100, 900), K.amber, 2, 'center'); c.restore(); }
    const kb = pop(t, cm - 0.02);
    if (kb > 0) {
      const beatP = t >= dr ? Math.exp(-((t - dr) % BEAT) / 0.12) : 0;
      c.save(); c.translate(CX, 604); const s = lerp(0.5, 1, Math.min(1.12, kb)) * (1 + 0.035 * beatP); c.scale(s, s); c.globalAlpha *= popA(kb);
      for (let r = 0; r < 2; r++) { const q = (((t - dr) / (2 * BEAT)) + r * 0.5) % 1; if (t >= dr) { c.save(); c.globalAlpha *= 0.5 * (1 - q); strokeRR(c, -190 - 30 * q, -46 - 30 * q, 380 + 60 * q, 92 + 60 * q, 46 + 30 * q, K.teal, 2); c.restore(); } }
      c.save(); c.shadowColor = alpha(K.teal, 0.7); c.shadowBlur = 40; fillRR(c, -190, -46, 380, 92, 46, K.teal); c.restore();
      c.font = D(30, 100, 900); const w1 = c.measureText('COMMENT').width; c.font = D(36, 112.5, 900); const w2 = c.measureText('DNA').width;
      const tw = 40 + 14 + w1 + 14 + w2, fs = Math.min(1, 330 / tw); c.save(); c.scale(fs, fs); let x = -tw / 2;
      icon(c, 'chat', x + 20, 0, 40, K.bg0, 3.4); x += 54; txt(c, 'COMMENT', x, 11, D(30, 100, 900), K.bg0); x += w1 + 14; txt(c, 'DNA', x, 13, D(36, 112.5, 900), K.bg0); c.restore(); c.restore();
    }
  }
  // ---- END: the TECHPE TREK card, after the stinger
  private end(c: CanvasRenderingContext2D, t: number) {
    const e0 = this.ev('end.in'), k = pop(t, e0 + 0.03);
    if (k <= 0) return;
    drawHelix(c, hpath(250, -30, FXW + 30, 5, t), t, { r: 22, rungs: 26, turns: 4, phase: t * 1.4, lw: 2.6, glowA: 0.5 * sat(k) });
    c.save(); c.globalAlpha *= popA(k);
    c.save(); c.translate(CX, 440); const s = lerp(0.7, 1, Math.min(1.1, k)); c.scale(s, s);
    glow(c, 0, 0, 230, alpha(K.teal, 0.25));
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; fillRR(c, -122, -122, 244, 244, 34, '#000000'); c.restore();
    if (this.logo) { c.save(); rrect(c, -122, -122, 244, 244, 34); c.clip(); c.drawImage(this.logo, -122, -122, 244, 244); c.restore(); }
    strokeRR(c, -121, -121, 242, 242, 33, alpha(K.teal, 0.6), 2);
    c.restore();
    const kt = enter(t, e0 + 0.3, 0.35); c.globalAlpha *= kt;
    txt(c, 'FOLLOW FOR AI + SCIENCE NEWS', CX, 624, D(22, 112.5, 900), K.fg, 2, 'center');
    txt(c, 'Comment DNA · model card save karo', CX, 660, B(17, 500), K.fg2, 0, 'center');
    c.restore();
  }

  // ================================================================ the frame
  private drawChapter(c: CanvasRenderingContext2D, name: string, t: number) {
    switch (name) {
      case 'hook': return this.hook(c, t); case 'twist': return this.twist(c, t); case 'model': return this.model(c, t); case 'both': return this.both(c, t);
      case 'mutation': return this.mutation(c, t); case 'answer': return this.answer(c, t); case 'bench': return this.bench(c, t); case 'warn': return this.warn(c, t);
      case 'open': return this.open(c, t); case 'hw': return this.hw(c, t); case 'payoff': return this.payoff(c, t); case 'cta': return this.cta(c, t);
      default: return this.end(c, t);
    }
  }
  private draw(c: CanvasRenderingContext2D, t: number) {
    const ch = this.cues.chapters, i = this.chapterAt(t), [a, , name] = ch[i]!;
    this.background(c, t, name);
    this.progress(c, t);
    const prev = i > 0 ? ch[i - 1]![2] : '', shared = SHARED.has(`${prev}>${name}`);
    const fade = span(t, a, a + 0.22), gone = span(t, a, a + 0.1);   // the old chapter clears in 0.1 s; the new one enters on its own springs
    if (i > 0 && !shared && gone < 1) { c.save(); c.globalAlpha = 1 - gone; c.translate(CX, 540); c.scale(lerp(1, 0.97, gone), lerp(1, 0.97, gone)); c.translate(-CX, -540); this.drawChapter(c, prev, t); c.restore(); }
    c.save(); if (i > 0 && !shared) { const k = outCubic(fade); c.globalAlpha = k; c.translate(CX, 540); c.scale(lerp(1.05, 1, k), lerp(1.05, 1, k)); c.translate(-CX, -540); }
    this.drawChapter(c, name, t); c.restore();
    if (name === 'warn') { c.fillStyle = alpha('#200810', 0.18 * enter(t, a, 0.2)); c.fillRect(0, 0, FXW, FXH); }
    this.captions(c, t);
    const srcOn = ['model', 'both', 'bench', 'warn', 'open', 'hw'].includes(name) ? 1 : 0;
    this.sourceBadge(c, srcOn * (name === 'model' ? enter(t, this.ev('mo.hf'), 0.3) : 1));
    if (name === 'cta' || name === 'end') { const fl = hitP(t, this.ev('cta.drop'), 0.06) * 0.3 + hitP(t, this.ev('end.in'), 0.08) * 0.35; if (fl > 0.01) { c.fillStyle = alpha(K.teal, fl); c.fillRect(0, 0, FXW, FXH); } }
  }

  // ================================================================ the cover (a separate 1080x1920 still)
  private drawCover(c: CanvasRenderingContext2D, clean: boolean) {
    const t = 2.0;
    const g = c.createLinearGradient(0, 0, 0, FXH); g.addColorStop(0, '#071636'); g.addColorStop(0.6, '#06102A'); g.addColorStop(1, '#030814'); c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
    glow(c, 360, 520, 380, alpha(K.teal, 0.32)); glow(c, 470, 900, 360, alpha(K.amber, 0.16)); glow(c, 90, 360, 300, alpha(K.violet, 0.22));
    // the lab: shelves of glassware in silhouette, out of focus
    c.save(); c.globalAlpha = 0.55;
    for (const [sx, sy] of [[60, 860], [540, 780]] as const) {
      c.fillStyle = '#0A1834'; c.fillRect(sx - 90, sy, 180, 8);
      for (let i = 0; i < 4; i++) { const x = sx - 70 + i * 46, h = 50 + 30 * hash(i, sx); c.beginPath(); c.moveTo(x - 6, sy - h); c.lineTo(x + 6, sy - h); c.lineTo(x + 18, sy); c.lineTo(x - 18, sy); c.closePath();
        c.fillStyle = '#0C1D3E'; c.fill(); c.strokeStyle = alpha(K.teal, 0.35); c.lineWidth = 1.5; c.stroke(); }
    }
    c.restore();
    for (let i = 0; i < 14; i++) { const x = FXW * hash(i, 71), y = 640 + 420 * hash(i, 72); glow(c, x, y, 18 + 30 * hash(i, 73), alpha(hash(i, 74) < 0.5 ? K.amber : K.teal, 0.12)); }   // bokeh
    dust(c, t, 90, 5, 1.2);
    // the helix rises from the bottom right into the chat (the DNA is one of the people in it)
    drawHelix(c, bpath([548, 1110], [556, 960], [580, 860], [520, 740]), t, { r: 40, rungs: 18, turns: 2.6, phase: 0.6, glowA: 1.4, lw: 4.6 });
    // the reference badge: the official Hugging Face logo (unaltered, from huggingface.co/brand) + CARBON-X
    {
      const y = 166, hf = this.img.hf;
      c.font = B(17, 900); const w1 = c.measureText('Hugging Face').width; c.font = D(18, 112.5, 900); const w2 = c.measureText('CARBON-X').width;
      c.font = B(11, 900); (c as any).letterSpacing = '1px'; const w3 = c.measureText('14.8B · OPEN').width + 20; (c as any).letterSpacing = '0px';
      const W = 10 + 46 + 8 + w1 + 14 + 1 + 14 + w2 + 12 + w3 + 12, sc = Math.min(1, (SW + 24) / W), x0 = -W / 2;
      c.save(); c.translate(CX, y); c.scale(sc, sc);
      fillRR(c, x0, -27, W, 54, 27, alpha('#030814', 0.9)); strokeRR(c, x0 + 0.5, -26.5, W - 1, 53, 27, alpha('#FFD21E', 0.6), 1.5);
      if (hf) c.drawImage(hf, x0 + 8, -25, 50, 50);
      let x = x0 + 10 + 46 + 8; txt(c, 'Hugging Face', x, 6, B(17, 900), K.fg); x += w1 + 14;
      c.fillStyle = alpha(K.fg3, 0.6); c.fillRect(x, -14, 1, 28); x += 15;
      txt(c, 'CARBON-X', x, 7, D(18, 112.5, 900), K.teal); x += w2 + 12;
      chip(c, '14.8B · OPEN', x, 0, { fg: '#06102A', bg: K.amber, size: 11, wt: 900, track: 1 });
      c.restore();
    }
    // the hook
    if (!clean) {
      const rows: [string, string][] = [['AI AB DNA SE', '#FFFFFF'], ['BAAT KAREGA?!', K.teal]]; let y = 258;
      rows.forEach(([s, col]) => { const { f, size } = fitFont(c, s, 82, SW + 16, 100, 900); c.save(); c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = 22; txt(c, s, CX, y, f, col, 0, 'center'); c.restore(); y += size * 1.04; });
    }
    // the chat: you say hello, the DNA answers in its own letters, Carbon-X translates, the DNA is typing, your turn
    const X = 64, Y = 366, W = 480, H = 384;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 34; c.shadowOffsetY = 12; fillRR(c, X, Y, W, H, 24, alpha('#0B1733', 0.96)); c.restore();
    strokeRR(c, X + 0.5, Y + 0.5, W - 1, H - 1, 24, alpha(K.teal, 0.5), 1.5);
    disc(c, X + 32, Y + 30, 18, alpha(K.teal, 0.18)); drawHelix(c, vpath(X + 32, Y + 15, Y + 45, 0), t, { r: 7, rungs: 5, turns: 1.2, lw: 2, glowA: 0.6 });
    txt(c, 'DNA', X + 60, Y + 27, B(17, 900), K.fg); disc(c, X + 64, Y + 42, 4, K.green); txt(c, 'online · via Carbon-X', X + 74, Y + 46, B(12, 500), K.fg2);
    illus(c, X + W - 14, Y + 30, 'ILLUSTRATION', 'right');
    c.fillStyle = alpha(K.line, 0.8); c.fillRect(X, Y + 60, W, 1);
    const b1 = 'Hello DNA, kuch bolo!'; c.font = B(20, 700); const bw1 = c.measureText(b1).width + 36;
    bubble(c, X + W - 16 - bw1, Y + 74, bw1, 46, 'br', alpha(K.violet, 0.32), alpha(K.violet, 0.95)); txt(c, b1, X + W - 16 - bw1 + 18, Y + 104, B(20, 700), K.fg);
    bubble(c, X + 16, Y + 142, 286, 50, 'bl', alpha('#0E2A4A', 0.96), alpha(K.teal, 0.75));
    c.font = M(24, 700); const cw = c.measureText('A').width; let x = X + 34;
    for (const ch of 'ATG GCT TCA…') { if (ch === '…') txt(c, ch, x, Y + 176, M(24, 700), K.fg2); else if (ch !== ' ') txt(c, ch, x, Y + 176, M(24, 700), BASE[ch]!); x += cw; }
    const by3 = Y + 212;
    fillRR(c, X + 16, by3, 392, 82, 18, alpha(K.teal, 0.12)); strokeRR(c, X + 16.5, by3 + 0.5, 391, 81, 18, alpha(K.teal, 0.85), 1.5);
    txt(c, 'CARBON-X', X + 34, by3 + 23, B(11, 900), K.teal, 2);
    txt(c, '"ATG" = start codon,', X + 34, by3 + 49, B(18, 900), K.fg);
    txt(c, 'yahin se protein ki recipe shuru!', X + 34, by3 + 72, B(16, 500), K.fg2);
    txt(c, 'DNA is typing', X + 18, Y + 318, B(13, 500), K.fg3);
    for (let i = 0; i < 3; i++) disc(c, X + 118 + i * 12, Y + 314, 3.5, i === 1 ? K.amber : alpha(K.fg2, 0.85));
    fillRR(c, X + 14, Y + 328, W - 28, 44, 22, alpha('#FFFFFF', 0.07)); strokeRR(c, X + 14.5, Y + 328.5, W - 29, 43, 22, alpha(K.fg3, 0.5), 1);
    txt(c, 'ACGT… apna sawaal likho', X + 34, Y + 356, B(16, 500), K.fg3); c.fillStyle = K.teal; c.fillRect(X + 34 + 196, Y + 340, 2, 22);
    disc(c, X + W - 38, Y + 350, 18, K.teal); icon(c, 'send', X + W - 38, Y + 350, 18, K.bg0, 2.4);
    // the scientist points at the chat
    drawScientist(c, 92, 936, 0.7, t);
    // the labels go with the chat and the logo in both versions
    txt(c, 'illustration · research model, not a diagnosis', CX, Y + H + 22, B(12, 500), K.fg3, 0, 'center');
    { const fn = 'Hugging Face logo for reference only · TechpeTrek is not affiliated with Hugging Face'; c.font = B(11, 500); const fw = c.measureText(fn).width + 24;
      fillRR(c, CX - fw / 2, 990, fw, 22, 11, alpha('#030814', 0.88)); txt(c, fn, CX, 1005, B(11, 500), K.fg2, 0, 'center'); }
    if (!clean) {
      const bx_ = 380, by_ = 834; c.font = D(21, 100, 900); (c as any).letterSpacing = '1px'; const tw_ = c.measureText('COMMENT DNA').width; (c as any).letterSpacing = '0px';
      const tot = 28 + 12 + tw_, bw_ = tot + 48;
      c.save(); c.shadowColor = alpha(K.teal, 0.7); c.shadowBlur = 30; fillRR(c, bx_ - bw_ / 2, by_ - 29, bw_, 58, 29, K.teal); c.restore();
      icon(c, 'chat', bx_ - tot / 2 + 14, by_, 28, K.bg0, 2.8); txt(c, 'COMMENT DNA', bx_ - tot / 2 + 40, by_ + 8, D(21, 100, 900), K.bg0, 1);
    }
    // TechpeTrek footer
    const fx_ = 380;
    fillRR(c, fx_ - 104, 894, 208, 46, 23, alpha('#030814', 0.88)); strokeRR(c, fx_ - 103.5, 894.5, 207, 45, 23, alpha(K.teal, 0.4), 1);
    if (this.logo) { c.save(); rrect(c, fx_ - 94, 900, 34, 34, 8); c.clip(); c.drawImage(this.logo, fx_ - 94, 900, 34, 34); c.restore(); }
    txt(c, 'TECHPE TREK', fx_ - 50, 924, D(18, 112.5, 900), alpha(K.fg, 0.92), 3);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const c = this.layer.ctx, t = f.t, cover = this.ctx.params?.cover as string | undefined;
    this.layer.clear(K.bg0);
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    if (cover) this.drawCover(c, cover === 'clean'); else this.draw(c, t);
    c.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    if (cover) return { hud: 0, frame: 0, pdoom: 0, bloom: 0.3, bloomThreshold: 0.72, halation: 0, grain: 0.015, ca: 0, vignette: 0.18, flash: 0, zoom: 1, shake: [0, 0] };
    // punches on the measured events (cuts on the beat): a zoom, a chromatic split, a shake on the big slams
    const e = (n: string) => this.ev(n);
    const hits: [number, number][] = [[0, 1.1], [e('hook.dna'), 0.6], [e('tw.twist'), 0.9], [e('mo.name'), 0.8], [e('mo.num'), 0.6], [e('bo.saath'), 0.5],
      [e('mu.paste'), 0.5], [e('mu.mut'), 0.8], [e('an.model'), 0.4], [e('be.num'), 0.9], [e('wa.nahi'), 1.3], [e('op.in'), 0.6], [e('op.sens'), 0.4],
      [e('hw.nahi'), 0.8], [e('pa.cross'), 1.1], [e('cta.drop'), 1.2], [e('end.in'), 0.7]];
    for (const [a] of this.cues.chapters.slice(1)) hits.push([a, 0.4]);
    const shakers = new Set([0, e('wa.nahi'), e('pa.cross'), e('cta.drop')]);
    let z = 0, ca = 0, sh = 0;
    for (const [ht, s] of hits) { const h = hitP(t, ht, 0.09) * s; z = Math.max(z, h); ca = Math.max(ca, h); sh = Math.max(sh, shakers.has(ht) ? h : 0); }
    const fi = Math.round(t * 60);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0.34, bloomThreshold: 0.7, bloomKnee: 0.4, bloomRadius: 0.5, halation: 0, grain: 0.018,
      ca: 0.25 + 2.2 * ca, vignette: 0.2, flash: 0, zoom: 1 + 0.035 * z, shake: [(hash(fi, 1) - 0.5) * 14 * sh, (hash(fi, 2) - 0.5) * 14 * sh] };
  }
  override dispose() { this.layer.texture.dispose(); }
}
