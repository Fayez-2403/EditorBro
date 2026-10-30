// Claude Duet reel (projects/claude-duet, brief TPT-20261022-0900-R01): a 50 s Hinglish news reel on Anthropic's Claude Duet
// research preview (claude.com, 21 Oct 2026). Dark navy, electric teal, amber, red only for risk; original vector characters
// (a developer, an AI orb that is not the Claude or Claude Duet icon, a phone, a finger); kinetic type; the claude.com receipts
// as labelled real screenshots; a globe with no coastlines or borders (pins only).
// Every frame is a pure function of t: chapters and events are the voice's own words snapped to the 124 BPM grid
// (analysis/duet_cues.py), poses are closed-form springs and eases of absolute time, particles are hashed. No clocks, no
// Math.random, nothing carried between frames, so any seek order gives the same frame. Claims: projects/claude-duet/FACTS.md.
// params.cover = 'text' | 'clean' draws the separate 1080x1920 cover instead (variants duet_cover, duet_cover_clean).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { hash } from '../engine/util';
import { FXW, FXH, COL, sat, span, lerp2, rrect, ax, mono, txt, alpha, mixHex, spring, hitP } from './_vo';

// ---------------------------------------------------------------- tokens
const K = {
  bg0: '#060A15', bg1: '#0A1226', bg2: '#0E1A35', panel: '#111C38', panel2: '#17254A', line: '#2A3B66',
  fg: '#EEF3FF', fg2: '#BAC5E0', fg3: '#8392B5', teal: '#22E5C3', tealD: '#0E9E8B', amber: '#FFB43F', red: '#FF5D62',
  violet: '#8C7BFF', green: '#3DDC97', skin: '#B97E58', skinL: '#D9A47C', skinD: '#87573B', hair: '#14141B', paper: '#FAF9F5',
};
const SAFE = { x0: 68, x1: 540, y0: 113, y1: 900 };
const SW = SAFE.x1 - SAFE.x0, CX = FXW / 2;
const SOURCE = 'Source: claude.com · 21 Oct 2026';
const EMPH = new Set(['AI', 'khud', 'urgent', 'Claude', 'Duet', '21', 'October', 'Opus', '5.5-powered', 'proactive', 'agent', 'morning', 'brief',
  'tasks', 'updates', 'approval', 'continuously', 'ghanton', 'interval', 'research', 'preview', 'US', 'Pro', 'Max', 'waitlist',
  'India', 'useful', 'notification?', 'DUET,', 'save']);
const RISK = new Set(['twist:', 'email', 'payment', 'delete', 'nahi,', 'nahi']);
const D = (s: number, wd = 100, wt = 900) => ax(s, wd, wt);   // display: Archivo
const B = (s: number, wt = 500) => ax(s, 100, wt);              // body: Archivo
const M = (s: number, wt = 500) => mono(s, wt);                 // IBM Plex Mono

// ---------------------------------------------------------------- time: the grid, springs, eases (all closed form)
const BPM = 124;
/** The beat grid at `bpm` from `offset`: index of the beat at t, its time, the phase inside it. */
function beatGrid(bpm: number, offset = 0) {
  const beat = 60 / bpm;
  return { beat, bar: 4 * beat, index: (t: number) => Math.floor((t - offset) / beat + 1e-9), at: (i: number) => offset + i * beat,
    phase: (t: number) => ((((t - offset) / beat) % 1) + 1) % 1 };
}
const GRID = beatGrid(BPM, 0);
const beatIndex = (t: number) => GRID.index(t);
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

// ---------------------------------------------------------------- drawing helpers
function fillRR(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, f: string | CanvasGradient) { rrect(c, x, y, w, h, r); c.fillStyle = f; c.fill(); }
function strokeRR(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, s: string, lw = 1.5) { rrect(c, x, y, w, h, r); c.strokeStyle = s; c.lineWidth = lw; c.stroke(); }
function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
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

/** Simple line icons, centred at (x, y), s across. */
function icon(c: CanvasRenderingContext2D, k: string, x: number, y: number, s: number, col: string, lw = Math.max(1.6, s * 0.085)) {
  const h = s / 2;
  c.save(); c.translate(x, y); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  switch (k) {
    case 'mail': rrect(c, -h, -h * 0.68, s, s * 0.68, s * 0.1); c.stroke(); c.beginPath(); c.moveTo(-h + lw, -h * 0.6); c.lineTo(0, h * 0.05); c.lineTo(h - lw, -h * 0.6); c.stroke(); break;
    case 'cal': rrect(c, -h, -h * 0.72, s, s * 0.86, s * 0.12); c.stroke(); c.beginPath(); c.moveTo(-h, -h * 0.3); c.lineTo(h, -h * 0.3);
      c.moveTo(-h * 0.45, -h * 0.95); c.lineTo(-h * 0.45, -h * 0.55); c.moveTo(h * 0.45, -h * 0.95); c.lineTo(h * 0.45, -h * 0.55); c.stroke();
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { c.beginPath(); c.arc(-h * 0.5 + i * h * 0.5, h * 0.08 + j * h * 0.38, lw * 0.6, 0, 7); c.fill(); } break;
    case 'chat': rrect(c, -h, -h * 0.7, s, s * 0.62, s * 0.16); c.stroke(); c.beginPath(); c.moveTo(-h * 0.45, h * 0.52); c.lineTo(-h * 0.5, h * 0.95); c.lineTo(-h * 0.05, h * 0.55); c.stroke();
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(i * h * 0.42, -h * 0.08, lw * 0.75, 0, 7); c.fill(); } break;
    case 'doc': c.moveTo(-h * 0.7, -h); c.lineTo(h * 0.3, -h); c.lineTo(h * 0.7, -h * 0.6); c.lineTo(h * 0.7, h); c.lineTo(-h * 0.7, h); c.closePath(); c.stroke();
      c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(-h * 0.38, -h * 0.2 + i * h * 0.38); c.lineTo(h * 0.38, -h * 0.2 + i * h * 0.38); } c.stroke(); break;
    case 'card': rrect(c, -h, -h * 0.64, s, s * 0.64 * 2 * 0.95, s * 0.1); c.stroke(); c.beginPath(); c.moveTo(-h, -h * 0.2); c.lineTo(h, -h * 0.2); c.stroke();
      c.beginPath(); c.moveTo(-h * 0.6, h * 0.35); c.lineTo(-h * 0.15, h * 0.35); c.stroke(); break;
    case 'trash': c.moveTo(-h * 0.75, -h * 0.55); c.lineTo(h * 0.75, -h * 0.55); c.moveTo(-h * 0.25, -h * 0.55); c.lineTo(-h * 0.2, -h * 0.85); c.lineTo(h * 0.2, -h * 0.85); c.lineTo(h * 0.25, -h * 0.55); c.stroke();
      c.beginPath(); c.moveTo(-h * 0.6, -h * 0.4); c.lineTo(-h * 0.45, h * 0.9); c.lineTo(h * 0.45, h * 0.9); c.lineTo(h * 0.6, -h * 0.4); c.stroke();
      c.beginPath(); c.moveTo(-h * 0.17, -h * 0.15); c.lineTo(-h * 0.14, h * 0.6); c.moveTo(h * 0.17, -h * 0.15); c.lineTo(h * 0.14, h * 0.6); c.stroke(); break;
    case 'lock': case 'unlock': {
      const o = k === 'unlock' ? h * 0.55 : 0;
      c.moveTo(-h * 0.42 + o, -h * 0.05); c.lineTo(-h * 0.42 + o, -h * 0.42); c.arc(o, -h * 0.42, h * 0.42, Math.PI, 0); c.lineTo(h * 0.42 + o, -h * 0.05 - (k === 'unlock' ? h * 0.25 : 0)); c.stroke();
      fillRR(c, -h * 0.68, -h * 0.08, s * 0.68, s * 0.55, s * 0.1, col); c.fillStyle = alpha(K.bg0, 0.85); disc(c, 0, h * 0.42, lw * 0.9, alpha(K.bg0, 0.85)); break;
    }
    case 'bell': c.moveTo(-h * 0.7, h * 0.45); c.quadraticCurveTo(-h * 0.55, h * 0.2, -h * 0.55, -h * 0.15); c.quadraticCurveTo(-h * 0.5, -h * 0.8, 0, -h * 0.82);
      c.quadraticCurveTo(h * 0.5, -h * 0.8, h * 0.55, -h * 0.15); c.quadraticCurveTo(h * 0.55, h * 0.2, h * 0.7, h * 0.45); c.closePath(); c.stroke();
      c.beginPath(); c.arc(0, h * 0.62, h * 0.16, 0, Math.PI); c.stroke(); break;
    case 'clock': c.arc(0, 0, h * 0.9, 0, 7); c.stroke(); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -h * 0.55); c.moveTo(0, 0); c.lineTo(h * 0.4, h * 0.18); c.stroke(); break;
    case 'check': c.moveTo(-h * 0.6, 0); c.lineTo(-h * 0.15, h * 0.45); c.lineTo(h * 0.65, -h * 0.45); c.stroke(); break;
    case 'x': c.moveTo(-h * 0.5, -h * 0.5); c.lineTo(h * 0.5, h * 0.5); c.moveTo(h * 0.5, -h * 0.5); c.lineTo(-h * 0.5, h * 0.5); c.stroke(); break;
    case 'bookmark': c.moveTo(-h * 0.55, -h * 0.85); c.lineTo(h * 0.55, -h * 0.85); c.lineTo(h * 0.55, h * 0.9); c.lineTo(0, h * 0.45); c.lineTo(-h * 0.55, h * 0.9); c.closePath(); c.fill(); break;
    case 'sun': c.arc(0, 0, h * 0.42, 0, 7); c.fill(); c.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; c.moveTo(Math.cos(a) * h * 0.62, Math.sin(a) * h * 0.62); c.lineTo(Math.cos(a) * h * 0.92, Math.sin(a) * h * 0.92); } c.stroke(); break;
    case 'send': c.moveTo(-h * 0.85, -h * 0.1); c.lineTo(h * 0.85, -h * 0.7); c.lineTo(h * 0.25, h * 0.85); c.lineTo(-h * 0.05, h * 0.15); c.closePath(); c.stroke(); break;
    case 'pin': c.moveTo(0, h); c.bezierCurveTo(-h * 0.2, h * 0.4, -h * 0.75, 0, -h * 0.75, -h * 0.3); c.arc(0, -h * 0.3, h * 0.75, Math.PI, 0); c.bezierCurveTo(h * 0.75, 0, h * 0.2, h * 0.4, 0, h); c.fill();
      disc(c, 0, -h * 0.3, h * 0.3, alpha(K.bg0, 0.9)); break;
  }
  c.restore();
}
/** Fill an arrow from (x0, y) to (x1, y). */
function arrow(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, col: string, lw = 3) {
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y);
  const d = Math.sign(x1 - x0) * 7; c.moveTo(x1 - d, y - 6); c.lineTo(x1, y); c.lineTo(x1 - d, y + 6); c.stroke(); c.restore();
}

// ---------------------------------------------------------------- characters (original vector drawings)
/** The AI orb (an original character, not a product icon). open: eyes 0..1; look: pupil offset; t drives the blink and the ring. */
function drawOrb(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, o: { open?: number; look?: [number, number]; smile?: number; face?: number; ring?: number; grey?: number; glowA?: number } = {}) {
  if (r <= 0.5) return;
  const open = o.open ?? 1, face = o.face ?? 1, grey = o.grey ?? 0;
  c.save();
  glow(c, x, y, r * 2.1, alpha(mixHex(K.teal, '#8892AA', grey), 0.28 * (o.glowA ?? 1)));
  // the ring behind
  const ring = o.ring ?? 1, tilt = -0.32, ra = t * 1.7;
  const ringPart = (front: boolean) => {
    if (ring <= 0) return;
    c.save(); c.translate(x, y + r * 0.5); c.rotate(tilt * 0.6); c.strokeStyle = alpha(mixHex(K.teal, '#9AA3BA', grey), 0.55 * ring); c.lineWidth = Math.max(1.2, r * 0.045);
    c.beginPath(); c.ellipse(0, 0, r * 1.42, r * 0.26, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); c.stroke();
    const mx = Math.cos(ra) * r * 1.42, my = Math.sin(ra) * r * 0.26;
    if ((Math.sin(ra) > 0) === front) disc(c, mx, my, r * 0.09, mixHex(K.amber, '#AAB2C6', grey));
    c.restore();
  };
  ringPart(false);
  // the body: a lit sphere (key light top-left, violet rim)
  const g = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.05, x, y, r);
  g.addColorStop(0, mixHex('#EAFFFA', '#F0F2F7', grey)); g.addColorStop(0.28, mixHex('#6CF3DC', '#C3C9D6', grey));
  g.addColorStop(0.68, mixHex('#16BFA5', '#7F889E', grey)); g.addColorStop(1, mixHex('#3B3BA6', '#4A5068', grey));
  disc(c, x, y, r, g);
  // inner swirl (fresnel arcs)
  c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.clip();
  c.strokeStyle = alpha('#FFFFFF', 0.16); c.lineWidth = r * 0.06;
  for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(x, y + r * 0.1, r * (0.95 - i * 0.22), r * (0.38 - i * 0.08), 0.35 + t * 0.4 + i, 0.2, 2.4); c.stroke(); }
  c.restore();
  disc(c, x - r * 0.36, y - r * 0.46, r * 0.17, alpha('#FFFFFF', 0.75));
  // the face
  if (face > 0) {
    c.save(); c.globalAlpha *= face;
    const blinkAt = [0.8, 3.7, 6.1, 9.4, 12.2, 15.8, 18.9, 23.5, 27.3, 31.1, 35.6, 41.9, 45.2, 48.6];
    let bl = 1; for (const b of blinkAt) { const d = Math.abs(t - b); if (d < 0.09) bl = Math.min(bl, d / 0.09); }
    const [lx, ly] = o.look ?? [0, 0], eh = r * 0.3 * Math.max(0.12, open * bl), ew = r * 0.15;
    for (const s of [-1, 1]) fillRR(c, x + s * r * 0.27 - ew / 2 + lx * r * 0.08, y - r * 0.08 - eh / 2 + ly * r * 0.08, ew, eh, ew / 2, '#0B1430');
    disc(c, x - r * 0.48, y + r * 0.2, r * 0.11, alpha(K.amber, 0.3)); disc(c, x + r * 0.48, y + r * 0.2, r * 0.11, alpha(K.amber, 0.3));
    const sm = o.smile ?? 1;
    c.strokeStyle = '#0B1430'; c.lineWidth = Math.max(1.4, r * 0.06); c.lineCap = 'round';
    c.beginPath(); c.arc(x + lx * r * 0.06, y + r * 0.16, r * 0.17, 0.2 * Math.PI, 0.8 * Math.PI, false); if (sm > 0) c.stroke();
    c.restore();
  }
  ringPart(true);
  c.restore();
}

/** The developer (an original character): (x, y) is the base of the neck. sur: surprise 0..1, typing: 0..1. */
function drawDev(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, sur: number, typing: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const bob = typing * Math.sin(t * 38) * 1.6;
  // the hoodie
  c.save(); c.translate(0, bob * 0.5);
  const hg = c.createLinearGradient(0, -10, 0, 220); hg.addColorStop(0, '#26375F'); hg.addColorStop(1, '#0F172E');
  c.beginPath(); c.moveTo(-158, 240); c.bezierCurveTo(-156, 96, -124, 42, -60, 22); c.quadraticCurveTo(0, 4, 60, 22); c.bezierCurveTo(124, 42, 156, 96, 158, 240); c.closePath();
  c.fillStyle = hg; c.fill();
  c.strokeStyle = alpha(K.teal, 0.45); c.lineWidth = 3; c.beginPath(); c.moveTo(-154, 170); c.bezierCurveTo(-152, 96, -122, 46, -60, 25); c.stroke();
  c.strokeStyle = alpha(K.violet, 0.35); c.beginPath(); c.moveTo(154, 170); c.bezierCurveTo(152, 96, 122, 46, 60, 25); c.stroke();
  c.beginPath(); c.moveTo(-64, 26); c.quadraticCurveTo(0, 78, 64, 26); c.quadraticCurveTo(0, 44, -64, 26); c.fillStyle = '#0A1122'; c.fill();
  c.strokeStyle = '#C9D3EA'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(-22, 50); c.lineTo(-25, 104); c.moveTo(22, 50); c.lineTo(25, 100); c.stroke();
  c.restore();
  // neck
  const ng = c.createLinearGradient(-18, 0, 18, 0); ng.addColorStop(0, K.skinD); ng.addColorStop(0.5, K.skin); ng.addColorStop(1, K.skinD);
  fillRR(c, -18, -40, 36, 66, 12, ng);
  // the head (a jolt back and up when surprised)
  c.save(); c.translate(0, -7 * sur); c.rotate(-0.035 * sur);
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 45, -76, 9, 15, 0, 0, 7); c.fillStyle = K.skin; c.fill(); }
  const fg = c.createRadialGradient(-14, -98, 6, 0, -78, 64); fg.addColorStop(0, K.skinL); fg.addColorStop(0.55, K.skin); fg.addColorStop(1, K.skinD);
  c.beginPath(); c.ellipse(0, -78, 46, 55, 0, 0, Math.PI * 2); c.fillStyle = fg; c.fill();
  c.save(); c.beginPath(); c.ellipse(0, -78, 46, 55, 0, 0, 7); c.clip();             // stubble along the jaw, screen glow from below
  c.beginPath(); c.ellipse(0, -40, 44, 24, 0, 0, Math.PI); c.fillStyle = 'rgba(40,26,20,0.22)'; c.fill();
  glow(c, 0, 0, 80, alpha(K.teal, 0.16));
  c.restore();
  // hair
  c.beginPath(); c.moveTo(-47, -80); c.bezierCurveTo(-54, -124, -22, -146, 6, -141); c.bezierCurveTo(32, -154, 62, -130, 51, -98);
  c.bezierCurveTo(50, -90, 49, -84, 47, -76); c.bezierCurveTo(42, -98, 28, -110, 10, -112); c.bezierCurveTo(-8, -104, -30, -106, -41, -93);
  c.bezierCurveTo(-45, -87, -46, -82, -47, -80); c.closePath(); c.fillStyle = K.hair; c.fill();
  c.strokeStyle = '#363B4F'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -128); c.bezierCurveTo(-12, -140, 14, -146, 38, -134); c.stroke();
  // brows, eyes, glasses
  const by = -96 - 9 * sur;
  c.strokeStyle = K.hair; c.lineWidth = 5; c.lineCap = 'round';
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 30, by + 3 - 3 * sur); c.quadraticCurveTo(sx * 19, by - 4 - 3 * sur, sx * 8, by + 1); c.stroke(); }
  const eh = 6 + 3.5 * sur;
  for (const sx of [-1, 1]) {
    c.beginPath(); c.ellipse(sx * 18, -76, 8.5, eh, 0, 0, 7); c.fillStyle = '#F4F1EC'; c.fill();
    disc(c, sx * 18 + 0.5, -76, 4.2 - 0.9 * sur, '#2A1A12'); disc(c, sx * 18 + 2, -78, 1.4, '#FFFFFF');
  }
  c.strokeStyle = '#0B0D14'; c.lineWidth = 3.2;
  for (const sx of [-1, 1]) { rrect(c, sx * 18 - 15, -87, 30, 22, 7); c.stroke(); rrect(c, sx * 18 - 15, -87, 30, 22, 7); c.fillStyle = alpha(K.teal, 0.1); c.fill(); }
  c.beginPath(); c.moveTo(-3, -78); c.quadraticCurveTo(0, -81, 3, -78); c.stroke();
  c.strokeStyle = alpha('#FFFFFF', 0.5); c.lineWidth = 2; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 18 - 9, -70); c.lineTo(sx * 18 - 3, -82); c.stroke(); }
  // nose, mouth
  c.strokeStyle = K.skinD; c.lineWidth = 2.6; c.beginPath(); c.moveTo(1, -70); c.quadraticCurveTo(6, -59, -1, -57); c.stroke();
  if (sur > 0.35) { c.beginPath(); c.ellipse(0, -43, 7 + 2 * sur, 5 + 7 * sur, 0, 0, 7); c.fillStyle = '#4A1E1E'; c.fill(); fillRR(c, -5, -48 - 4 * sur, 10, 3, 1.5, '#F4EFEA'); }
  else { c.strokeStyle = '#5A2E24'; c.lineWidth = 3; c.beginPath(); c.moveTo(-11, -46); c.quadraticCurveTo(0, -40, 11, -46); c.stroke(); }
  c.restore();
  c.restore();
}
/** A laptop seen from behind its lid (no logo: a "</>" sticker), lid top centred at (x, y). */
function drawLaptop(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const g = c.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, '#2A3658'); g.addColorStop(1, '#151D35');
  c.beginPath(); c.moveTo(-128, 0); c.lineTo(128, 0); c.lineTo(138, 118); c.lineTo(-138, 118); c.closePath(); c.fillStyle = g; c.fill();
  c.strokeStyle = alpha(K.teal, 0.55); c.lineWidth = 2; c.beginPath(); c.moveTo(-128, 0.5); c.lineTo(128, 0.5); c.stroke();
  fillRR(c, -152, 116, 304, 12, 6, '#0C1326');
  fillRR(c, -30, 38, 60, 34, 9, alpha(K.amber, 0.9)); txt(c, '</>', 0, 62, M(18, 700), '#1B1206', 0, 'center');
  c.restore();
}
/** A phone: centre (x, y), w x h, rotation rot; draws `screen` in its local frame (origin at the screen's top-left). */
function drawPhone(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, screen: (sw: number, sh: number) => void) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 18; fillRR(c, -w / 2, -h / 2, w, h, w * 0.14, '#05070D'); c.restore();
  const rim = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); rim.addColorStop(0, alpha(K.teal, 0.8)); rim.addColorStop(0.5, alpha('#FFFFFF', 0.15)); rim.addColorStop(1, alpha(K.violet, 0.8));
  strokeRR(c, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, w * 0.14, rim, 2.5);
  const b = w * 0.045, sw = w - 2 * b, sh = h - 2 * b;
  c.save(); rrect(c, -w / 2 + b, -h / 2 + b, sw, sh, w * 0.11); c.clip(); c.translate(-w / 2 + b, -h / 2 + b);
  const wp = c.createLinearGradient(0, 0, sw, sh); wp.addColorStop(0, '#16224A'); wp.addColorStop(0.6, '#1D1446'); wp.addColorStop(1, '#0B1226'); c.fillStyle = wp; c.fillRect(0, 0, sw, sh);
  glow(c, sw * 0.2, sh * 0.75, sw * 0.9, alpha(K.violet, 0.35)); glow(c, sw * 0.9, sh * 0.2, sw * 0.7, alpha(K.teal, 0.18));
  screen(sw, sh);
  fillRR(c, sw / 2 - sw * 0.17, 9, sw * 0.34, 20, 10, '#000000');   // the camera pill
  c.restore();
  fillRR(c, w / 2 - 1, -h * 0.22, 4, h * 0.12, 2, '#1B2340');
  c.restore();
}
/** A finger pointing up-left, its tip at (x, y); press 0..1 squashes it. */
function drawFinger(c: CanvasRenderingContext2D, x: number, y: number, s: number, press: number) {
  c.save(); c.translate(x, y); c.rotate(-0.5); c.scale(s, s * (1 - 0.06 * press));
  c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 22; c.shadowOffsetY = 10;
  // the hand: a fist with the index finger out (curled fingers as rounded bumps), the thumb across
  const g = c.createLinearGradient(-60, 0, 60, 0); g.addColorStop(0, K.skinD); g.addColorStop(0.45, K.skinL); g.addColorStop(1, K.skin);
  c.beginPath(); c.moveTo(-17, 18); c.lineTo(-17, 112); c.quadraticCurveTo(-64, 118, -66, 170); c.lineTo(-58, 250); c.lineTo(58, 250); c.lineTo(62, 150);
  c.quadraticCurveTo(60, 112, 17, 108); c.lineTo(17, 18); c.arc(0, 18, 17, 0, Math.PI, true); c.closePath(); c.fillStyle = g; c.fill();
  c.restore();
  for (const [bx, by] of [[34, 128], [44, 158], [48, 190]] as const) { c.beginPath(); c.ellipse(bx, by, 20, 15, 0.2, 0, 7); c.fillStyle = K.skin; c.fill(); c.strokeStyle = alpha(K.skinD, 0.8); c.lineWidth = 2; c.stroke(); }
  c.beginPath(); c.ellipse(-34, 168, 16, 38, 0.55, 0, 7); c.fillStyle = K.skinL; c.fill(); c.strokeStyle = alpha(K.skinD, 0.8); c.lineWidth = 2; c.stroke();
  for (const k of [52, 84]) { c.strokeStyle = alpha(K.skinD, 0.75); c.lineWidth = 2.2; c.beginPath(); c.moveTo(-9, k); c.quadraticCurveTo(0, k + 4, 9, k); c.stroke(); }
  fillRR(c, -10, 4, 20, 26, 10, alpha('#F7E6DA', 0.85));                     // the nail
  const sl = c.createLinearGradient(0, 220, 0, 320); sl.addColorStop(0, '#2A3B66'); sl.addColorStop(1, '#1A2647');
  fillRR(c, -70, 236, 140, 90, 16, sl); c.strokeStyle = alpha(K.teal, 0.5); c.lineWidth = 2; c.beginPath(); c.moveTo(-70, 240); c.lineTo(70, 240); c.stroke();   // the sleeve
  c.restore();
}

// ---------------------------------------------------------------- the globe (graticule and hashed dots only: no coastlines, no borders)
const RAD = Math.PI / 180;
const GY = 458, GR = 138;   // the globe's centre y and radius (avail + india)
function project(lat: number, lon: number, lat0: number, lon0: number, cx: number, cy: number, R: number) {
  const p = lat * RAD, l = (lon - lon0) * RAD, p0 = lat0 * RAD;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return { x: cx + R * Math.cos(p) * Math.sin(l), y: cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), z: cosc };
}
function drawGlobe(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, lat0: number, lon0: number, t: number) {
  glow(c, cx, cy, R * 1.6, alpha(K.teal, 0.12));
  const g = c.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R); g.addColorStop(0, '#17305A'); g.addColorStop(1, '#091329');
  disc(c, cx, cy, R, g);
  c.strokeStyle = alpha(K.teal, 0.5); c.lineWidth = 1.6; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  c.lineWidth = 1;
  const seg = (pts: { x: number; y: number; z: number }[]) => {
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1]!, b = pts[i]!; if (a.z <= 0 || b.z <= 0) continue;
      c.strokeStyle = alpha(K.teal, 0.08 + 0.3 * Math.min(a.z, b.z)); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
  };
  for (let lon = -180; lon < 180; lon += 20) { const pts = []; for (let lat = -90; lat <= 90; lat += 6) pts.push(project(lat, lon, lat0, lon0, cx, cy, R)); seg(pts); }
  for (let lat = -60; lat <= 60; lat += 20) { const pts = []; for (let lon = -180; lon <= 180; lon += 6) pts.push(project(lat, lon, lat0, lon0, cx, cy, R)); seg(pts); }
  for (let i = 0; i < 420; i++) {                                     // a hashed dot field (uniform on the sphere), twinkling
    const lat = Math.asin(2 * hash(i, 3) - 1) / RAD, lon = 360 * hash(i, 5) - 180, p = project(lat, lon, lat0, lon0, cx, cy, R);
    if (p.z <= 0.05) continue; const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    c.fillStyle = alpha(K.fg2, (0.12 + 0.25 * tw) * p.z); c.fillRect(p.x - 0.9, p.y - 0.9, 1.8, 1.8);
  }
}

// ---------------------------------------------------------------- data
interface Cues { duration: number; chapters: [number, number, string][]; events: Record<string, number> }
interface Word { w: string; start: number; end: number }
interface Line { i: number; chapter: string; text: string; start: number; end: number; words: Word[] }
type Pose = { x: number; y: number; r: number; a: number };
const PROMPTS = ['fix kar do', 'summary do', 'aur detail mein', 'phir se try', 'email likh do', 'plan banao', 'code check karo', 'short karo',
  'ek aur baar', 'bullet points', 'translate karo', 'reply draft', 'list banao', 'samjhao', 'better karo'];
const GHOST: Record<string, string> = { hook: 'PING', duet: 'DUET', brief: 'BRIEF', tasks: 'TASKS', twist: 'TWIST', hours: 'HOURS', avail: 'WAITLIST',
  india: 'INDIA', cta: 'DUET?', end: 'TREK' };
// chapters whose entrance is drawn by the chapter itself (a shared element carries across the cut): no crossfade
const SHARED = new Set(['hook>duet', 'brief>tasks', 'tasks>twist', 'avail>india']);

export default class Duet extends Scene {
  private layer = new Layer2D();
  private cues!: Cues;
  private lines: Line[] = [];
  private kicks: number[] = [];
  private img: Record<string, HTMLImageElement> = {};
  private logo: HTMLImageElement | null = null;

  override async init() {
    this.cues = await (await fetch('/data/duet/cues.json')).json();
    try { this.lines = (await (await fetch('/data/lyrics.json')).json()).lines; } catch { /* captions optional */ }
    try { this.kicks = (await (await fetch('/data/duet/music.json')).json()).kicks; } catch { this.kicks = []; }
    for (const k of ['a_date21b', 'a_opus', 'a_brief', 'a_approve', 'a_hours', 'a_us', 'p_who', 'p_opus', 'p_sensitive']) {
      const im = new Image(); im.src = `duet/screens/${k}.png`; await im.decode(); this.img[k] = im;
    }
    try { const im = new Image(); im.src = 'brand/techpe-trek.jpg'; await im.decode(); this.logo = im; } catch { this.logo = null; }
  }
  private ev(n: string) { const v = this.cues.events[n]; if (typeof v !== 'number') throw new Error(`duet cue missing: ${n}`); return v; }
  /** 1 on each kick of the score, decaying (the background breathes with the music). */
  private kick(t: number) {
    const K_ = this.kicks; let lo = 0, hi = K_.length - 1, best = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (K_[m]! <= t) { best = m; lo = m + 1; } else hi = m - 1; }
    return best < 0 ? 0 : Math.exp(-(t - K_[best]!) / 0.14);
  }
  private chapterAt(t: number) { const ch = this.cues.chapters; let i = ch.findIndex(([a, b]) => t >= a && t < b); if (i < 0) i = t < ch[0]![0] ? 0 : ch.length - 1; return i; }

  // ================================================================ persistent layers
  private background(c: CanvasRenderingContext2D, t: number, name: string) {
    const g = c.createLinearGradient(0, 0, 0, FXH); g.addColorStop(0, K.bg1); g.addColorStop(1, K.bg0); c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
    const kp = this.kick(t);
    glow(c, 90 + 40 * Math.sin(t * 0.23), 260 + 30 * Math.cos(t * 0.19), 430, alpha(K.teal, 0.09 + 0.05 * kp));
    glow(c, 530, 820 + 30 * Math.sin(t * 0.17), 470, alpha(K.violet, 0.11 + 0.03 * kp));
    c.fillStyle = alpha(K.fg3, 0.13);
    const off = (t * 9) % 32;
    for (let y = -32; y < FXH + 32; y += 32) for (let x = 16 + (((y + 32) / 32) % 2) * 16; x < FXW; x += 32) c.fillRect(x, y + off, 1.5, 1.5);
    const gw = GHOST[name];
    if (gw) {   // the chapter's word, huge and faint, drifting
      c.save(); const { f } = fitFont(c, gw, 260, FXW * 1.3, 125, 900); c.globalAlpha = 0.045; c.translate(CX + 18 * Math.sin(t * 0.3), 640); c.rotate(-0.08);
      txt(c, gw, 0, 0, f, K.fg, 0, 'center'); c.restore();
    }
  }
  /** A thin progress bar at the top: one segment per chapter, the current one filling. */
  private progress(c: CanvasRenderingContext2D, t: number) {
    const ch = this.cues.chapters.filter((x) => x[2] !== 'end'), gap = 4, w = (SW - gap * (ch.length - 1)) / ch.length;
    ch.forEach(([a, b], i) => {
      const x = SAFE.x0 + i * (w + gap), p = sat((t - a) / (b - a));
      fillRR(c, x, 118, w, 3, 1.5, alpha(K.fg3, 0.3)); if (p > 0) fillRR(c, x, 118, w * p, 3, 1.5, K.teal);
    });
  }
  /** Captions: the voice's words as they are said, at most two rows, on a dark pill; key words in teal, risk words in amber. */
  private captions(c: CanvasRenderingContext2D, t: number) {
    const line = this.lines.find((l) => t >= l.start - 0.06 && t <= l.end + 0.4); if (!line) return;
    const size = 30, f = D(size, 87.5, 900), maxW = SW - 36;
    c.font = f; (c as any).letterSpacing = '0px'; const sp = c.measureText(' ').width;
    // rows of words that fit maxW, then chunks of two rows
    const rows: Word[][] = []; let cur: Word[] = [], wsum = 0;
    for (const w of line.words) { const ww = c.measureText(w.w).width; if (cur.length && wsum + sp + ww > maxW) { rows.push(cur); cur = []; wsum = 0; } wsum += (cur.length ? sp : 0) + ww; cur.push(w); }
    if (cur.length) rows.push(cur);
    const chunks: Word[][][] = []; for (let i = 0; i < rows.length; i += 2) chunks.push(rows.slice(i, i + 2));
    let ci = chunks.findIndex((ch) => t < ch[ch.length - 1]!.at(-1)!.end + 0.06); if (ci < 0) ci = chunks.length - 1;
    const chunk = chunks[ci]!, rowH = 40, y0 = 808 - (chunk.length - 1) * rowH / 2;
    const widths = chunk.map((r) => r.reduce((s, w, j) => s + c.measureText(w.w).width + (j ? sp : 0), 0));
    const W = Math.max(...widths) + 40, Ht = chunk.length * rowH + 22;
    const k = enter(t, chunk[0]![0]!.start - 0.06, 0.16);
    c.save(); c.globalAlpha *= k;
    fillRR(c, CX - W / 2, y0 - rowH / 2 - 14, W, Ht, 18, alpha(K.bg0, 0.78)); strokeRR(c, CX - W / 2 + 0.5, y0 - rowH / 2 - 13.5, W - 1, Ht - 1, 18, alpha(K.teal, 0.22), 1);
    chunk.forEach((row, ri) => {
      let x = CX - widths[ri]! / 2; const y = y0 + ri * rowH + 11;
      for (const w of row) {
        const ww = c.measureText(w.w).width;
        if (t < w.start - 0.04) txt(c, w.w, x, y, f, alpha(K.fg, 0.3));
        else {
          const p = pop(t, w.start - 0.04), sc = lerp(0.8, 1, Math.min(1.12, p)), on = t < w.end + 0.08;
          const col = RISK.has(w.w) ? K.amber : EMPH.has(w.w) ? K.teal : K.fg;
          c.save(); c.translate(x + ww / 2, y - 10); c.scale(sc, sc);
          if (on) { c.shadowColor = alpha(col, 0.6); c.shadowBlur = 14; }
          txt(c, w.w, 0, 10, f, on || col !== K.fg ? col : alpha(K.fg, 0.92), 0, 'center'); c.restore();
        }
        x += ww + sp;
      }
    });
    c.restore();
  }
  private sourceBadge(c: CanvasRenderingContext2D, t: number, a: number) {
    if (a <= 0) return;
    c.save(); c.globalAlpha *= a; c.font = B(14, 500); const w = c.measureText(SOURCE).width + 40;
    fillRR(c, CX - w / 2, 872, w, 26, 13, alpha(K.bg0, 0.7)); icon(c, 'doc', CX - w / 2 + 16, 885, 11, K.fg3, 1.4);
    txt(c, SOURCE, CX - w / 2 + 28, 890, B(14, 500), K.fg2); c.restore();
  }
  /** A real screenshot from claude.com on a paper card, labelled; crop = [sy, sh] in source pixels. */
  private receipt(c: CanvasRenderingContext2D, key: string, x: number, y: number, w: number, t: number, t0: number, crop?: [number, number]) {
    const im = this.img[key], k = enter(t, t0, 0.35); if (!im || k <= 0) return;
    const sy = crop?.[0] ?? 0, sh = crop?.[1] ?? im.height, h = (w * sh) / im.width;
    c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 12);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 18; c.shadowOffsetY = 6; fillRR(c, x - 8, y - 8, w + 16, h + 36, 10, K.paper); c.restore();
    c.drawImage(im, 0, sy, im.width, sh, x, y, w, h);
    c.fillStyle = '#D9D4C7'; c.fillRect(x, y + h + 5, w, 1);
    txt(c, 'REAL SCREENSHOT · claude.com', x, y + h + 21, B(12, 700), '#4A4637', 0.8);
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
      c.save(); c.globalAlpha *= sat(p * 3) * oa; c.translate(CX, y + i * (sz * 1.02)); const sc = lerp(1.22, 1, Math.min(1.1, p)); c.scale(sc, sc);
      txt(c, s, 0, 0, f, col, 0, 'center'); c.restore();
    });
  }

  // ================================================================ the orb's pose (one character across the chapters)
  private orbTarget(name: string, t: number): Pose {
    const e = (n: string) => this.ev(n);
    switch (name) {
      case 'hook': { const k = glide(t, e('hook.ab') + 0.3); return { x: lerp(CX, 128, k), y: lerp(330, 300, k), r: lerp(40, 36, k), a: 1 }; }
      case 'duet': return { x: CX, y: 420, r: 90, a: t >= e('duet.in') + 0.75 ? 1 : 0 };
      case 'brief': { const k = glide(t, e('brief.morning') - 0.12); return { x: lerp(CX, 122, k), y: lerp(392, 354, k), r: lerp(60, 22, k), a: 1 }; }
      case 'tasks': return { x: 122, y: 354, r: 22, a: 1 };
      case 'hours': { const th = this.handAngle(t); return { x: CX + 124 * Math.cos(th), y: 500 + 124 * Math.sin(th), r: 20, a: 1 }; }
      case 'cta': return { x: CX, y: 318, r: 24, a: t < e('cta.drop') ? 1 : 0 };
      case 'end': return { x: 452, y: 318, r: 36, a: 1 };
      default: return { x: CX, y: 300, r: 0, a: 0 };   // twist, avail, india: the orb steps aside
    }
  }
  private orbPose(t: number): Pose {
    const ch = this.cues.chapters, i = this.chapterAt(t), [c0, , name] = ch[i]!;
    const cur = this.orbTarget(name, t);
    if (i === 0 || name === 'duet') return cur;
    const prev = this.orbTarget(ch[i - 1]![2], c0 - 1e-4), k = glide(t, c0);
    if (prev.a === 0 && cur.a > 0) return { ...cur, a: sat((t - c0) / 0.25), r: cur.r * pop(t, c0) };
    if (cur.a === 0) return { ...prev, a: 1 - sat((t - c0) / 0.2), r: prev.r * (1 - sat((t - c0) / 0.2)) };
    return { x: lerp(prev.x, cur.x, k), y: lerp(prev.y, cur.y, k), r: lerp(prev.r, cur.r, k), a: lerp(prev.a, cur.a, k) };
  }
  /** The check-in dial's hand (hours chapter): sweeps the day, easing into each check-in mark. */
  private handAngle(t: number) {
    const t0 = this.ev('hr.ghanton') - 0.2, base = -Math.PI / 2;
    return base + 2 * Math.PI * 0.92 * easeInOut(span(t, t0, this.ev('hr.check') + 0.05)) + 0.15 * sat((t - this.ev('hr.check')) / 0.8);
  }

  // ================================================================ chapters
  // ---- HOOK: a hundred prompts fly up into the AI; then the flow reverses and the phone pings
  private phoneGeom(t: number) {
    const ab = this.ev('hook.ab'), k = springK(t, ab + 0.05, 150, 17), bz = hitP(t, ab + 0.05, 0.08) + hitP(t, this.ev('hook.bhai'), 0.07);
    return { x: lerp(440, 410, k) + Math.sin(t * 95) * 5 * bz, y: lerp(1220, 520, k), w: 222, h: 432, rot: lerp(0.35, 0.07, k) + Math.sin(t * 80) * 0.02 * bz };
  }
  private notifCard(c: CanvasRenderingContext2D, sw: number, t: number, a: number) {
    const bh = this.ev('hook.bhai'), ur = this.ev('hook.urgent'), k = pop(t, bh - 0.04); if (k <= 0) return;
    c.save(); c.globalAlpha *= sat(k * 2) * a; c.translate(0, (1 - Math.min(1, k)) * -60);
    const x = 10, y = 108, w = sw - 20, h = 84;
    fillRR(c, x, y, w, h, 18, alpha('#FFFFFF', 0.16)); strokeRR(c, x + 0.5, y + 0.5, w - 1, h - 1, 18, alpha('#FFFFFF', 0.22), 1);
    drawOrb(c, x + 24, y + 26, 13, t, { ring: 0, glowA: 0.4, look: [1, 0] });
    txt(c, 'AI', x + 44, y + 31, B(14, 900), K.fg); txt(c, 'abhi', x + w - 12, y + 31, B(12, 500), K.fg2, 0, 'right');
    txt(c, 'bhai, ye urgent hai!', x + 14, y + 64, B(16, 700), K.fg);
    const u = pop(t, ur); if (u > 0) { const pulse = 0.5 + 0.5 * Math.sin((t - ur) * 14); disc(c, x + w - 16, y + 60, 5 * Math.min(1.2, u), K.red); glow(c, x + w - 16, y + 60, 16, alpha(K.red, 0.5 * pulse)); }
    c.restore();
  }
  private hook(c: CanvasRenderingContext2D, t: number) {
    const ab = this.ev('hook.ab'), bh = this.ev('hook.bhai');
    // the headline is on screen from frame 0
    this.headline(c, t, -0.16, [['AI TUMHE', K.fg], ['PING KAREGA?!', K.teal]], { y: 186, size: 56 });
    const ping = hitP(t, ab, 0.12); if (ping > 0.02) { c.save(); c.globalAlpha *= ping; icon(c, 'bell', 506, 158 + Math.sin(t * 60) * 3, 30, K.amber, 3); c.restore(); }
    // the developer: centred while prompting, then steps left as the phone comes up
    const dk = glide(t, ab + 0.1), sur = pop(t, bh - 0.06);
    const dx = lerp(CX, 196, dk), dy = lerp(565, 588, dk), ds = lerp(1, 0.88, dk);
    drawDev(c, dx, dy, ds, t, sur, t < ab ? 1 : 0);
    drawLaptop(c, dx, dy + 118 * ds, ds);
    if (sur > 0.05) {   // "!!"
      c.save(); c.globalAlpha *= sat(sur * 2); txt(c, '!!', dx + 62 * ds, dy - 150 * ds - 6 * Math.sin(t * 20), D(38, 100, 900), K.amber, 0, 'center'); c.restore();
    }
    // the prompt flood: 100 bubbles, the last one arriving exactly on "Ab"
    const T = 0.55, N = 100, s0 = -0.45, step = (ab - T - s0) / (N - 1);
    for (let k = 0; k < N; k++) {
      const ts = s0 + k * step, p = (t - ts) / T; if (p <= 0 || p >= 1) continue;
      const side = k % 2 ? 1 : -1, q = p * p;
      const sx = CX + side * (124 + 30 * hash(k, 1)), sy = 690 - 30 * hash(k, 2), cx_ = CX + side * (282 + 10 * hash(k, 9)), cy_ = 470 + 60 * hash(k, 4);
      const x = (1 - q) * (1 - q) * sx + 2 * (1 - q) * q * cx_ + q * q * CX, y = (1 - q) * (1 - q) * sy + 2 * (1 - q) * q * cy_ + q * q * 330;
      const s = PROMPTS[Math.floor(hash(k, 7) * PROMPTS.length)]!, sc = lerp(1, 0.3, q);
      c.save(); c.globalAlpha *= sat(p / 0.1) * (1 - sat((p - 0.85) / 0.15)); c.translate(x, y); c.scale(sc, sc);
      c.font = B(13, 700); const w = c.measureText(s).width + 22;
      fillRR(c, -w / 2, -13, w, 26, 13, k % 3 ? K.panel2 : alpha(K.teal, 0.25)); strokeRR(c, -w / 2 + 0.5, -12.5, w - 1, 25, 13, alpha(K.teal, 0.5), 1);
      txt(c, s, 0, 5, B(13, 700), K.fg, 0, 'center'); c.restore();
    }
    // the counter: TUM -> AI #n, then on "Ab" the arrow flips: AI -> TUM
    const n = Math.max(0, Math.min(N, Math.floor((Math.min(t, ab) - s0 - T) / step + 1 + 1e-9)));
    const flip = sat((t - ab) / 0.18), ck = glide(t, ab + 0.3), y = lerp(400, 370, ck), cx = lerp(CX, 170, ck), hw = lerp(118, 92, sat(flip * 2 - 1));
    c.save(); fillRR(c, cx - hw, y - 19, 2 * hw, 38, 19, alpha(K.bg0, 0.85)); strokeRR(c, cx - hw + 0.5, y - 18.5, 2 * hw - 1, 37, 19, alpha(flip > 0.5 ? K.amber : K.teal, 0.7), 1.4);
    if (flip < 0.5) {
      c.globalAlpha *= 1 - flip * 2; txt(c, 'TUM', cx - 96, y + 6, D(16, 100, 900), K.fg); arrow(c, cx - 52, cx - 22, y, K.teal); txt(c, 'AI', cx - 14, y + 6, D(16, 100, 900), K.teal);
      txt(c, `#${String(n).padStart(3, '0')}`, cx + 98, y + 6, M(16, 700), K.fg2, 0, 'right');
    } else {
      c.globalAlpha *= (flip - 0.5) * 2; txt(c, 'AI', cx - 70, y + 6, D(17, 100, 900), K.amber); arrow(c, cx - 38, cx - 4, y, K.amber);
      txt(c, 'TUM', cx + 6, y + 6, D(17, 100, 900), K.fg); icon(c, 'bell', cx + 72, y, 16, K.amber, 2);
    }
    c.restore();
    // the reply: one bubble shoots from the orb down to the phone, which rises and buzzes
    const rp = span(t, ab, ab + 0.32);
    if (rp > 0 && rp < 1) { const x = lerp(CX, 410, rp * rp), y2 = lerp(330, 450, rp); c.save(); c.globalAlpha *= 1 - rp * 0.5; fillRR(c, x - 30, y2 - 14, 60, 28, 14, K.amber); txt(c, '!', x, y2 + 7, D(18), '#1B1206', 0, 'center'); c.restore(); }
    if (t >= ab) {
      const P = this.phoneGeom(t);
      drawPhone(c, P.x, P.y, P.w, P.h, P.rot, (sw) => {
        txt(c, '7:30', sw / 2, 84, D(46, 100, 900), alpha(K.fg, 0.92), 0, 'center');
        const pill = pop(t, ab + 0.25) * (1 - sat((t - bh + 0.1) / 0.15));
        if (pill > 0.01) { c.save(); c.globalAlpha *= sat(pill); fillRR(c, sw / 2 - 64, 116, 128, 26, 13, alpha('#FFFFFF', 0.14)); txt(c, '1 new ping', sw / 2, 134, B(12, 700), K.fg, 0, 'center'); c.restore(); }
        this.notifCard(c, sw, t, 1);
      });
      if (t >= bh) { const k = enter(t, bh + 0.25, 0.3); c.save(); c.globalAlpha *= k; illus(c, SAFE.x1, P.y - P.h / 2 - 22, 'ILLUSTRATION', 'right'); c.restore(); }
    }
  }

  // ---- DUET: the notification card becomes the orb; ANTHROPIC, 21 OCT 2026, CLAUDE DUET
  private duet(c: CanvasRenderingContext2D, t: number) {
    const d0 = this.ev('duet.in'), m = easeInOut(span(t, d0, d0 + 0.75));
    const out = sat((t - d0) / 0.45);
    if (out < 1) {   // the hook's developer and phone leave
      c.save(); c.globalAlpha *= 1 - out; const P = this.phoneGeom(d0), dy = lerp(588, 980, out * out);
      drawDev(c, 196 - 120 * out, dy, 0.88, t, 1, 0); drawLaptop(c, 196 - 120 * out, dy + 104, 0.88);
      drawPhone(c, P.x + 60 * out, P.y + 520 * out * out, P.w, P.h, P.rot + 0.3 * out, (sw) => { txt(c, '7:30', sw / 2, 84, D(46, 100, 900), alpha(K.fg, 0.92), 0, 'center'); });
      c.restore();
    }
    if (m < 1) {   // the morph: one shape, from the notification card to the orb (identity kept, no crossfade)
      const P = this.phoneGeom(d0), b = P.w * 0.045, sw = P.w - 2 * b;
      const lx = -P.w / 2 + b + 10 + (sw - 20) / 2, ly = -P.h / 2 + b + 108 + 42, cs = Math.cos(P.rot), sn = Math.sin(P.rot);
      const x0 = P.x + lx * cs - ly * sn, y0 = P.y + lx * sn + ly * cs;
      const x = lerp(x0, CX, m), y = lerp(y0, 420, m), w = lerp(sw - 20, 180, m), h = lerp(84, 180, m), rr = lerp(18, 90, m), rot = lerp(P.rot, 0, m);
      c.save(); c.translate(x, y); c.rotate(rot);
      glow(c, 0, 0, Math.max(w, h) * 1.1, alpha(K.teal, 0.25 * m));
      rrect(c, -w / 2, -h / 2, w, h, rr); c.fillStyle = mixHex('#3A4672', '#16BFA5', m); c.fill();
      const g = c.createRadialGradient(-w * 0.19, -h * 0.21, 2, 0, 0, Math.max(w, h) / 2);
      g.addColorStop(0, '#EAFFFA'); g.addColorStop(0.28, '#6CF3DC'); g.addColorStop(0.68, '#16BFA5'); g.addColorStop(1, '#3B3BA6');
      const ga0 = c.globalAlpha; c.globalAlpha = ga0 * m; rrect(c, -w / 2, -h / 2, w, h, rr); c.fillStyle = g; c.fill(); c.globalAlpha = ga0;
      if (m < 0.35) { c.globalAlpha = ga0 * (1 - m / 0.35); txt(c, 'bhai, ye urgent hai!', 0, 8, B(16, 700), K.fg, 0, 'center'); }
      c.restore();
    }
    const an = this.ev('duet.anth'), dt = this.ev('duet.date'), nm = this.ev('duet.name'), ann = this.ev('duet.ann');
    const ka = enter(t, an, 0.35);
    if (ka > 0) { c.save(); c.globalAlpha *= ka; c.translate(0, (1 - ka) * 10); txt(c, 'ANTHROPIC', CX, 178, D(22, 125, 900), K.fg2, 8, 'center');
      txt(c, 'ne announce kiya', CX, 210, B(17, 500), K.fg3, 0.5, 'center'); c.restore(); }
    const kd = pop(t, dt);   // the date stamp
    if (kd > 0) {
      c.save(); c.translate(452, 300); c.rotate(0.12); const sc = lerp(1.8, 1, Math.min(1.1, kd)); c.scale(sc, sc); c.globalAlpha *= sat(kd * 3);
      fillRR(c, -74, -30, 148, 60, 12, alpha(K.bg0, 0.85)); strokeRR(c, -73, -29, 146, 58, 12, K.amber, 2.5);
      txt(c, '21 OCT', 0, 2, D(26, 100, 900), K.amber, 1, 'center'); txt(c, '2026', 0, 22, M(14, 700), K.fg2, 2, 'center'); c.restore();
    }
    // CLAUDE DUET: the letters drop in, one by one
    const title = (s: string, y: number, col: string, t0: number) => {
      const { f, size } = fitFont(c, s, 70, SW, 112.5, 900); c.font = f; const tw = c.measureText(s).width; let x = CX - tw / 2;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i]!, cw = c.measureText(ch).width, p = pop(t, t0 + i * 0.035);
        if (p > 0 && ch !== ' ') { c.save(); c.globalAlpha *= sat(p * 3); c.translate(x + cw / 2, y - (1 - Math.min(1, p)) * 50); txt(c, ch, 0, 0, f, col, 0, 'center'); c.restore(); }
        x += cw;
      }
      return size;
    };
    if (t >= nm - 0.05) { title('CLAUDE', 626, K.fg, nm - 0.05); title('DUET', 696, K.teal, nm + 0.17); }
    const kn = enter(t, ann, 0.3);
    if (kn > 0) { c.save(); c.globalAlpha *= kn; chip(c, 'RESEARCH PREVIEW', CX - 8, 740, { fg: K.bg0, bg: K.teal, size: 13, wt: 900, align: 'right', track: 1.5 });
      chip(c, 'NEW APP', CX + 8, 740, { fg: K.amber, bg: alpha(K.bg0, 0.8), line: K.amber, size: 13, wt: 900, track: 1.5 }); c.restore(); }
  }

  // ---- BRIEF: Opus 5.5, proactive, connected apps, then the morning brief (three pops on the beat)
  private briefCards(c: CanvasRenderingContext2D, t: number, mode: 'brief' | 'tasks') {
    const e1 = this.ev('brief.c1'), e2 = this.ev('brief.c2'), e3 = this.ev('brief.c3'), ti = this.ev('tasks.in');
    const k = mode === 'tasks' ? glide(t, ti) : 0;
    const zoom = mode === 'tasks' ? 1 + 0.07 * Math.exp(-Math.max(0, t - this.ev('tasks.kaam')) / 0.25) * (t >= this.ev('tasks.kaam') ? 1 : 0) : 1;
    const pa = enter(t, e1 - 0.15, 0.3); if (pa <= 0) return;
    const X = 84, Y = 324, W = FXW - 168, rowsY = [lerp(392, 404, k), lerp(498, 510, k), lerp(604, 616, k)];
    c.save(); c.translate(CX, 540); c.scale(zoom, zoom); c.translate(-CX, -540); c.globalAlpha *= pa;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 30; c.shadowOffsetY = 10; fillRR(c, X, Y, W, 404, 22, alpha(K.panel, 0.96)); c.restore();
    strokeRR(c, X + 0.5, Y + 0.5, W - 1, 403, 22, alpha(K.teal, 0.25), 1.2);
    const head = mode === 'brief' ? 'Good morning! Aaj ke 3 kaam' : 'Background mein kaam chalu';
    txt(c, head, X + 66, Y + 37, B(17, 700), K.fg);
    if (mode === 'tasks') { const a = t * 7; c.strokeStyle = K.teal; c.lineWidth = 2.5; c.beginPath(); c.arc(X + W - 26, Y + 31, 8, a, a + 4.2); c.stroke(); }
    else icon(c, 'sun', X + W - 26, Y + 31, 20, K.amber, 2.2);
    const rows: [string, string, string, string, number][] = [
      ['mail', 'Inbox', '2 replies aaj due', 'Replies draft ho rahe hain', e1],
      ['cal', '10:30 · Client call', 'prep notes ready', 'Call notes ban rahe hain', e2],
      ['chat', 'Team chat', '1 decision pending', 'Decision summary', e3],
    ];
    const done = [this.ev('tasks.zaroori'), this.ev('tasks.update'), Infinity];
    rows.forEach(([ic, title, sub, task, te], i) => {
      const p = pop(t, te); if (p <= 0) return;
      const y = rowsY[i]!, sc = lerp(0.6, 1, Math.min(1.1, p));
      c.save(); c.globalAlpha *= sat(p * 3); c.translate(CX, y + 44); c.scale(sc, sc); c.translate(-CX, -(y + 44));
      fillRR(c, X + 16, y, W - 32, 88, 16, K.panel2);
      fillRR(c, X + 30, y + 18, 52, 52, 14, alpha(i === 0 ? K.teal : i === 1 ? K.amber : K.violet, 0.18));
      icon(c, ic, X + 56, y + 44, 26, i === 0 ? K.teal : i === 1 ? K.amber : K.violet, 2.4);
      txt(c, title, X + 98, y + 38, B(18, 700), K.fg);
      if (mode === 'brief') txt(c, sub, X + 98, y + 64, B(15, 500), K.fg2);
      else {
        const pr = sat((t - (ti + 0.15 + i * 0.12)) / Math.max(0.3, (done[i]! - ti - 0.15 - i * 0.12))), fin = t >= done[i]!;
        const prog = i === 2 ? Math.min(0.72, sat((t - ti - 0.4) / 2.6)) : pr;
        txt(c, fin ? 'Done' : task, X + 98, y + 60, B(14, 500), fin ? K.green : K.fg2);
        fillRR(c, X + 98, y + 70, W - 152, 6, 3, alpha(K.fg3, 0.25)); fillRR(c, X + 98, y + 70, (W - 152) * prog, 6, 3, fin ? K.green : K.teal);
        if (fin) { disc(c, X + W - 46, y + 40, 13, K.green); icon(c, 'check', X + W - 46, y + 40, 15, K.bg0, 2.6); }
      }
      c.restore();
    });
    c.restore();
    c.save(); c.globalAlpha *= pa; illus(c, X + W, Y - 18, 'ILLUSTRATION · SAMPLE', 'right'); c.restore();
  }
  private brief(c: CanvasRenderingContext2D, t: number) {
    const b0 = this.ev('brief.in'), op = this.ev('brief.opus'), pr = this.ev('brief.pro'), ap = this.ev('brief.apps'), mo = this.ev('brief.morning');
    this.headline(c, t, b0, [['PROACTIVE', K.fg], ['AGENT', K.teal]], { y: 182, size: 56, out: mo - 0.2 });
    if (t >= mo - 0.1) this.headline(c, t, mo - 0.1, [['MORNING', K.fg], ['BRIEF', K.amber]], { y: 182, size: 58 });
    const stage1 = 1 - span(t, mo - 0.25, mo + 0.05);
    if (stage1 > 0) {
      c.save(); c.globalAlpha *= stage1;
      const ko = pop(t, op); if (ko > 0) { c.save(); c.globalAlpha *= sat(ko * 3); c.translate(CX, 488); c.scale(lerp(0.6, 1, Math.min(1.1, ko)), lerp(0.6, 1, Math.min(1.1, ko)));
        chip(c, 'POWERED BY OPUS 5.5', 0, 0, { fg: K.teal, bg: alpha(K.bg0, 0.85), line: K.teal, size: 15, wt: 900, align: 'center', track: 1.5 }); c.restore(); }
      this.receipt(c, 'p_opus', CX - 150, 590, 300, t, op + 0.3);
      const kp = pop(t, pr); if (kp > 0) { c.save(); c.globalAlpha *= sat(kp * 3); chip(c, 'khud aage aata hai', CX, 528, { fg: K.fg2, bg: alpha(K.bg0, 0.7), size: 13, wt: 500, align: 'center', track: 0.5 }); c.restore(); }
      // connected apps: generic icons (no app logos) wired to the orb, data pulses flowing in
      const apps = ['mail', 'cal', 'chat', 'doc', 'card'];
      apps.forEach((ic, i) => {
        const p = pop(t, ap + i * 0.07); if (p <= 0) return;
        const a = (-170 + 40 * i) * RAD, x = CX + 190 * Math.cos(a), y = 392 + 105 * Math.sin(a);
        c.save(); c.globalAlpha *= sat(p * 3);
        c.strokeStyle = alpha(K.teal, 0.35); c.lineWidth = 1.5; c.setLineDash([4, 6]); c.lineDashOffset = -t * 40; c.beginPath(); c.moveTo(x, y); c.lineTo(CX, 392); c.stroke(); c.setLineDash([]);
        const f = ((t * 1.4 + i * 0.37) % 1); disc(c, lerp(x, CX, f), lerp(y, 392, f), 3, K.teal);
        disc(c, x, y, 26 * Math.min(1.1, p), K.panel2); c.strokeStyle = alpha(K.teal, 0.6); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 26 * Math.min(1.1, p), 0, 7); c.stroke();
        icon(c, ic, x, y, 22, K.fg, 2); c.restore();
      });
      const kl = enter(t, ap + 0.4, 0.3); if (kl > 0) { c.save(); c.globalAlpha *= kl; illus(c, SAFE.x1, 452, 'ILLUSTRATION', 'right'); c.restore(); }
      c.restore();
    }
    this.briefCards(c, t, 'brief');
  }
  // ---- TASKS: the same cards become background tasks; an update pops
  private tasks(c: CanvasRenderingContext2D, t: number) {
    const ti = this.ev('tasks.in'), up = this.ev('tasks.update');
    this.headline(c, t, -1, [['MORNING', K.fg], ['BRIEF', K.amber]], { y: 182, size: 58, out: ti });
    this.headline(c, t, ti + 0.05, [['TASKS IN', K.fg], ['BACKGROUND', K.teal]], { y: 182, size: 54 });
    this.briefCards(c, t, 'tasks');
    const ku = pop(t, up);
    if (ku > 0) {
      c.save(); c.globalAlpha *= sat(ku * 3); c.translate(CX - 62, 306); c.scale(lerp(0.5, 1, Math.min(1.1, ku)), lerp(0.5, 1, Math.min(1.1, ku)));
      c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 20; fillRR(c, -128, -22, 256, 44, 22, K.teal); c.restore();
      icon(c, 'bell', -104, 0, 18, K.bg0, 2.4); txt(c, 'UPDATE: 2 drafts ready', -86, 6, B(15, 900), K.bg0); c.restore();
    }
  }

  // ---- TWIST: the record scratch freezes the frame, IMPORTANT TWIST; then SEND? PAY? DELETE? each locked, a finger approves
  private twist(c: CanvasRenderingContext2D, t: number) {
    const w0 = this.ev('tw.in'), em = this.ev('tw.email'), py = this.ev('tw.pay'), dl = this.ev('tw.del'), ph = this.ev('tw.pehle'), tap = this.ev('tw.tap'), ls = this.ev('tw.lesson');
    if (t < em + 0.06) {   // the freeze (hard out on "email")
      const fa = 1 - span(t, em, em + 0.06);
      c.save(); c.globalAlpha *= fa; (c as any).filter = 'grayscale(1) brightness(0.36) blur(2.5px)';
      c.translate(CX, 540); c.rotate(-0.025 * sat((t - w0) / 0.08)); c.scale(0.97, 0.97); c.translate(-CX, -540);
      this.tasks(c, w0 - 1e-3); (c as any).filter = 'none'; c.restore();
      const kt = pop(t, w0 + 0.12), kw = pop(t, this.ev('tw.word') - 0.06);
      c.save(); c.globalAlpha *= fa;
      if (kt > 0) { c.save(); c.globalAlpha *= sat(kt * 3); c.translate(CX, 470); c.scale(lerp(1.4, 1, Math.min(1.1, kt)), lerp(1.4, 1, Math.min(1.1, kt))); txt(c, 'LEKIN…', 0, 0, D(40, 100, 900), K.fg2, 4, 'center');
        txt(c, 'IMPORTANT', 0, 62, D(58, 100, 900), K.fg, 0, 'center'); c.restore(); }
      if (kw > 0) { c.save(); c.globalAlpha *= sat(kw * 3); c.translate(CX, 600); c.rotate(-0.06 + 0.04 * Math.sin((t - w0) * 9) * Math.exp(-(t - w0) * 1.2));
        c.scale(lerp(2, 1, Math.min(1.1, kw)), lerp(2, 1, Math.min(1.1, kw))); const { f } = fitFont(c, 'TWIST', 120, SW, 125, 900);
        c.shadowColor = alpha(K.amber, 0.6); c.shadowBlur = 30; txt(c, 'TWIST', 0, 40, f, K.amber, 2, 'center'); c.restore(); }
      c.restore();
      if (t < em) return;
    }
    const ga = enter(t, em - 0.05, 0.25);
    c.save(); c.globalAlpha *= ga;
    // the headline: SEND? PAY? DELETE? as each is said, then PEHLE TUMHARI APPROVAL
    if (t < ph) {
      const words: [string, number, string][] = [['SEND?', em, K.fg], ['PAY?', py, K.fg], ['DELETE?', dl, K.red]];
      c.font = D(44, 100, 900); const gaps = 22, ws = words.map(([s]) => c.measureText(s).width), tot = ws.reduce((a, b) => a + b, 0) + gaps * 2;
      const fit = Math.min(1, SW / tot); let x = CX - (tot * fit) / 2;
      words.forEach(([s, te, col], i) => { const p = pop(t, te); if (p > 0) { c.save(); c.globalAlpha *= sat(p * 3) * (1 - span(t, ph - 0.15, ph)); c.translate(x + (ws[i]! * fit) / 2, 214); const sc = fit * lerp(1.3, 1, Math.min(1.1, p)); c.scale(sc, sc); txt(c, s, 0, 0, D(44, 100, 900), col, 0, 'center'); c.restore(); } x += (ws[i]! + gaps) * fit; });
    } else this.headline(c, t, ph, [['PEHLE TUMHARI', K.fg], ['APPROVAL', K.amber]], { y: 182, size: 56 });
    // the three locked actions
    const cards: [string, string, string, number, string][] = [
      ['send', 'SEND?', 'Email: client ko reply', em, K.teal], ['card', 'PAY?', 'Invoice payment', py, K.amber], ['trash', 'DELETE?', '30 purani files', dl, K.red]];
    const X = 76, W = FXW - 152, Hc = 112;
    const approved = pop(t, tap + 0.04);
    cards.forEach(([ic, title, sub, te, col], i) => {
      const p = pop(t, te); if (p <= 0) return;
      const y = 300 + i * (Hc + 16), ok = i === 0 && t >= tap + 0.04;
      c.save(); c.globalAlpha *= sat(p * 3); c.translate((1 - Math.min(1, p)) * 160, 0);
      c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.shadowOffsetY = 8; fillRR(c, X, y, W, Hc, 20, ok ? mixHex(K.panel, '#0F3A3A', approved) : K.panel); c.restore();
      strokeRR(c, X + 0.5, y + 0.5, W - 1, Hc - 1, 20, alpha(ok ? K.green : col, 0.55), 1.5);
      fillRR(c, X + 16, y + 18, 58, 58, 16, alpha(col, 0.16)); icon(c, ic, X + 45, y + 47, 28, col, 2.6);
      txt(c, title, X + 90, y + 44, D(28, 100, 900), K.fg); txt(c, sub, X + 90, y + 70, B(15, 500), K.fg2);
      // lock: closed and amber until approved
      const lockCol = ok ? K.green : K.amber;
      disc(c, X + W - 34, y + 34, 18, alpha(lockCol, 0.16)); icon(c, ok && approved > 0.5 ? 'unlock' : 'lock', X + W - 34, y + 36, 22, lockCol, 2.4);
      // buttons
      const bx = X + 90, by = y + 82;
      if (ok) { txt(c, 'Approved · bhej diya', bx, by + 16, B(14, 700), K.green); }
      else {
        fillRR(c, bx, by, 92, 24, 12, alpha(K.teal, i === 0 ? 0.25 + 0.5 * hitP(t, tap, 0.1) : 0.16)); txt(c, 'Approve', bx + 46, by + 17, B(13, 900), K.teal, 0, 'center');
        fillRR(c, bx + 102, by, 86, 24, 12, alpha(K.fg3, 0.18)); txt(c, 'Not now', bx + 145, by + 17, B(13, 700), K.fg2, 0, 'center');
        if (i > 0 && t >= tap) txt(c, 'waiting for you', X + W - 18, by + 17, B(12, 500), K.fg3, 0, 'right');
      }
      c.restore();
    });
    // the finger: comes in on "pehle", taps Approve on "approval"
    const bxT = X + 90 + 46, byT = 300 + 82 + 12;
    const kf = glide(t, ph - 0.1) - glide(t, tap + 0.45), press = hitP(t, tap, 0.09);
    if (kf > 0.001) {
      const fx = lerp(660, bxT, kf), fy = lerp(1120, byT, kf) + 6 * press;
      if (t >= tap) { const r = (t - tap) * 160; c.save(); c.globalAlpha *= sat(1 - (t - tap) / 0.45); c.strokeStyle = K.teal; c.lineWidth = 3; c.beginPath(); c.arc(bxT, byT, r, 0, 7); c.stroke(); c.restore(); }
      drawFinger(c, fx + 2, fy + 2, 0.72, press);
    }
    // the lesson
    const kl = pop(t, ls);
    if (kl > 0) {
      c.save(); c.globalAlpha *= sat(kl * 3); c.translate(CX, 712); c.rotate(-0.04); const sc = lerp(1.6, 1, Math.min(1.1, kl)); c.scale(sc, sc);
      fillRR(c, -214, -26, 428, 52, 12, alpha(K.bg0, 0.88)); strokeRR(c, -212, -24, 424, 48, 11, K.amber, 2.5);
      txt(c, 'PROACTIVE, PAR AUTOPILOT NAHI', 0, 8, D(21, 100, 900), K.amber, 0.5, 'center'); c.restore();
    }
    c.restore();
  }

  // ---- HOURS: "LIVE 24/7" is struck out; a day dial with check-ins every few hours
  private hours(c: CanvasRenderingContext2D, t: number) {
    const h0 = this.ev('hr.in'), co = this.ev('hr.cont'), na = this.ev('hr.nahi'), gh = this.ev('hr.ghanton'), ck = this.ev('hr.check');
    this.headline(c, t, h0, [['CHECK-IN:', K.fg], ['HAR KUCH GHANTE', K.teal]], { y: 182, size: 52 });
    // the myth pill
    const km = pop(t, co);
    if (km > 0) {
      const dead = sat((t - na) / 0.12), gl = t >= na && t < na + 0.3;
      c.save(); c.globalAlpha *= sat(km * 3) * (1 - 0.5 * dead); c.translate(CX + (gl ? (hash(Math.floor(t * 60), 3) - 0.5) * 14 : 0), 304);
      const s = lerp(1.3, 1, Math.min(1.1, km)); c.scale(s, s);
      fillRR(c, -118, -24, 236, 48, 24, alpha(K.red, 0.16)); strokeRR(c, -117, -23, 234, 46, 23, alpha(K.red, 0.8), 2);
      const pulse = 0.5 + 0.5 * Math.sin(t * 9); disc(c, -88, 0, 7, K.red); glow(c, -88, 0, 20, alpha(K.red, 0.5 * pulse * (1 - dead)));
      txt(c, 'LIVE · 24/7', 10, 9, D(24, 100, 900), K.fg, 1, 'center');
      if (dead > 0) { c.strokeStyle = K.red; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-126, 8); c.lineTo(-126 + 252 * dead, -8); c.stroke(); }
      c.restore();
      if (dead > 0) { c.save(); c.globalAlpha *= dead; chip(c, 'MYTH', CX + 150, 280, { fg: '#FFFFFF', bg: K.red, size: 13, wt: 900, align: 'center', track: 2 }); c.restore(); }
    }
    // the day dial
    const kd = enter(t, gh - 0.25, 0.45);
    if (kd > 0) {
      const cx = CX, cy = 500, R = 124;
      c.save(); c.globalAlpha *= kd; c.translate(cx, cy); c.scale(lerp(0.8, 1, kd), lerp(0.8, 1, kd)); c.translate(-cx, -cy);
      disc(c, cx, cy, R + 26, alpha(K.panel, 0.9)); c.strokeStyle = alpha(K.line, 1); c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      for (let i = 0; i < 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI * 2, l = i % 6 ? 6 : 12; c.strokeStyle = alpha(K.fg3, i % 6 ? 0.5 : 0.9); c.lineWidth = i % 6 ? 1.5 : 2.5;
        c.beginPath(); c.moveTo(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8)); c.lineTo(cx + Math.cos(a) * (R - 8 - l), cy + Math.sin(a) * (R - 8 - l)); c.stroke(); }
      const th = this.handAngle(t);
      c.strokeStyle = alpha(K.teal, 0.9); c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, th); c.stroke();
      const marks = [0.0, 0.2, 0.37, 0.56, 0.74, 0.9];   // check-ins "every few hours" (illustrative spacing, no exact interval claimed)
      marks.forEach((m, i) => {
        const a = -Math.PI / 2 + m * 2 * Math.PI * 0.92 / 0.9, hit = th >= a - 1e-3; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        disc(c, x, y, hit ? 9 : 6, hit ? K.teal : K.panel2); c.strokeStyle = alpha(K.teal, 0.8); c.lineWidth = 2; c.beginPath(); c.arc(x, y, hit ? 9 : 6, 0, 7); c.stroke();
        if (hit && i === marks.length - 1) { const r = 9 + (t - ck) * 70; if (t >= ck && t < ck + 0.5) { c.save(); c.globalAlpha *= 1 - (t - ck) / 0.5; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.restore(); } }
      });
      txt(c, 'FACT', cx, cy - 30, B(12, 900), K.teal, 3, 'center');
      txt(c, 'har kuch ghante', cx, cy + 2, D(21, 100, 900), K.fg, 0, 'center');
      txt(c, 'ek check-in', cx, cy + 28, B(15, 500), K.fg2, 0, 'center');
      const kc = pop(t, ck); if (kc > 0) { c.save(); c.globalAlpha *= sat(kc * 3); chip(c, 'CHECK', cx, cy + 62, { fg: K.bg0, bg: K.teal, size: 12, wt: 900, align: 'center', track: 2 }); c.restore(); }
      c.restore();
    }
    this.receipt(c, 'a_hours', CX - 140, 650, 280, t, gh + 0.5, [0, 232]);
  }

  // ---- AVAIL / INDIA: one globe, the US pin with PRO + MAX and the WAITLIST sticker; then it spins to India, grey
  private globeView(t: number) {
    const ii = this.ev('in.in'), spin = easeInOut(span(t, ii, ii + 0.75));
    return { lon0: lerp(-98 + 6 * Math.sin(t * 0.4), 79, spin), lat0: lerp(18, 20, spin), spin };
  }
  private pin(c: CanvasRenderingContext2D, t: number, lat: number, lon: number, t0: number, col: string, view: { lon0: number; lat0: number }) {
    const p = project(lat, lon, view.lat0, view.lon0, CX, GY, GR); if (p.z <= 0.15) return null;
    const k = pop(t, t0); if (k <= 0) return p;
    const r = ((t - t0) * 1.1) % 1;
    c.save(); c.globalAlpha *= sat(k * 3) * sat((p.z - 0.15) / 0.2);
    c.strokeStyle = alpha(col, 0.8 * (1 - r)); c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, 8 + 26 * r, (8 + 26 * r) * 0.45, 0, 0, 7); c.stroke();
    c.translate(p.x, p.y - 22 * Math.min(1.1, k)); icon(c, 'pin', 0, 0, 34, col); c.restore();
    return p;
  }
  private avail(c: CanvasRenderingContext2D, t: number) {
    const a0 = this.ev('av.in'), rs = this.ev('av.res'), us = this.ev('av.us'), pr = this.ev('av.pro'), mx = this.ev('av.max'), wt = this.ev('av.wait');
    this.headline(c, t, a0, [['US PRO/MAX', K.fg], ['WAITLIST', K.amber]], { y: 182, size: 56 });
    const kg = enter(t, a0 - 0.05, 0.4), view = this.globeView(t);
    c.save(); c.globalAlpha *= kg; drawGlobe(c, CX, GY, GR * lerp(0.85, 1, kg), view.lat0, view.lon0, t); c.restore();
    const kr = pop(t, rs); if (kr > 0) { c.save(); c.globalAlpha *= sat(kr * 3); chip(c, 'RESEARCH PREVIEW', CX, 296, { fg: K.bg0, bg: K.teal, size: 13, wt: 900, align: 'center', track: 2 }); c.restore(); }
    const p = this.pin(c, t, 39, -98, us, K.teal, view);
    if (p && t >= us) {
      const k = pop(t, us + 0.05);
      c.save(); c.globalAlpha *= sat(k * 3); const x = p.x + 30, y = p.y - 70;
      fillRR(c, x, y - 24, 168, 48, 14, alpha(K.bg0, 0.88)); strokeRR(c, x + 0.5, y - 23.5, 167, 47, 14, alpha(K.teal, 0.7), 1.5);
      txt(c, 'US', x + 14, y + 9, D(26, 100, 900), K.fg);
      if (t >= pr) { const q = pop(t, pr); c.save(); c.globalAlpha *= sat(q * 3); chip(c, 'PRO', x + 62, y, { fg: K.bg0, bg: K.teal, size: 12, wt: 900 }); c.restore(); }
      if (t >= mx) { const q = pop(t, mx); c.save(); c.globalAlpha *= sat(q * 3); chip(c, 'MAX', x + 112, y, { fg: K.bg0, bg: K.teal, size: 12, wt: 900 }); c.restore(); }
      c.restore();
    }
    const ks = pop(t, wt);   // the sticker slaps on
    if (ks > 0) {
      c.save(); c.translate(196, 566); c.rotate(-0.16); const s = lerp(1.9, 1, Math.min(1.1, ks)); c.scale(s, s); c.globalAlpha *= sat(ks * 4);
      c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 16; c.shadowOffsetY = 6; fillRR(c, -98, -30, 196, 60, 12, K.amber); c.restore();
      c.beginPath(); c.moveTo(98, 12); c.lineTo(80, 30); c.lineTo(98, 30); c.closePath(); c.fillStyle = '#C98A22'; c.fill();
      txt(c, 'WAITLIST', 0, 10, D(30, 100, 900), '#1B1206', 2, 'center'); c.restore();
    }
    this.receipt(c, 'p_who', CX - 150, 606, 300, t, us + 0.4);
  }
  private india(c: CanvasRenderingContext2D, t: number) {
    const i0 = this.ev('in.in'), ind = this.ev('in.india'), na = this.ev('in.nahi'), view = this.globeView(t);
    // the avail chapter's labels leave; the globe itself carries across the cut
    c.save(); c.globalAlpha *= 1 - span(t, i0, i0 + 0.2); this.headline(c, t, -1, [['US PRO/MAX', K.fg], ['WAITLIST', K.amber]], { y: 182, size: 56 }); c.restore();
    drawGlobe(c, CX, GY, GR, view.lat0, view.lon0, t);
    const p = this.pin(c, t, 22, 79, ind + 0.1, '#8E98B0', view);
    const glitch = t >= na && t < na + 0.32;
    const draw = () => {
      this.headline(c, t, ind, [['INDIA LAUNCH?', K.fg], ['ANNOUNCE NAHI', K.amber]], { y: 182, size: 54 });
      if (p && t >= ind + 0.15) {
        const k = pop(t, ind + 0.15), x = p.x - 84, y = p.y + 48;
        c.save(); c.globalAlpha *= sat(k * 3);
        fillRR(c, x, y, 168, 64, 14, alpha(K.bg0, 0.9)); strokeRR(c, x + 0.5, y + 0.5, 167, 63, 14, alpha(K.fg3, 0.8), 1.5);
        icon(c, 'lock', x + 24, y + 32, 20, K.fg3, 2.2); txt(c, 'INDIA', x + 44, y + 28, D(22, 100, 900), K.fg2);
        txt(c, '22 Oct 2026 tak', x + 44, y + 50, B(13, 500), K.fg3); c.restore();
      }
    };
    if (glitch) {   // glitch then calm: three slices displaced, colour ghosts
      const fi = Math.floor(t * 60);
      for (const [col, dx] of [[K.red, -6], [K.teal, 6]] as const) { c.save(); c.globalAlpha *= 0.35; c.globalCompositeOperation = 'lighter'; c.translate(dx * hash(fi, 1), 0); (c as any).filter = 'none'; draw(); c.restore(); void col; }
      for (let s = 0; s < 3; s++) { const y0 = 140 + s * 220 + hash(fi, s + 4) * 60; c.save(); c.beginPath(); c.rect(0, y0, FXW, 40 + 50 * hash(fi, s + 9)); c.clip(); c.translate((hash(fi, s + 2) - 0.5) * 40, 0); draw(); c.restore(); }
    } else draw();
    this.receipt(c, 'a_us', CX - 150, 640, 300, t, ind + 0.35, [0, 160]);
  }

  // ---- CTA: useful or noise? then COMMENT DUET on the drop, SAVE
  private cta(c: CanvasRenderingContext2D, t: number) {
    const c0 = this.ev('cta.in'), uf = this.ev('cta.useful'), nz = this.ev('cta.noise'), cm = this.ev('cta.comment'), dr = this.ev('cta.drop'), sv = this.ev('cta.save');
    this.headline(c, t, c0, [['USEFUL', K.teal], ['YA NOISE?', K.amber]], { y: 182, size: 58 });
    const dim = 1 - 0.65 * enter(t, dr - 0.1, 0.25);
    c.save(); c.globalAlpha *= dim;
    const L = { x: 72, w: 226 }, R = { x: 310, w: 226 }, Y = 346, Hh = 330;
    const ku = enter(t, c0 + 0.1, 0.35), kz = enter(t, c0 + 0.2, 0.35);
    c.save(); c.globalAlpha *= ku; fillRR(c, L.x, Y, L.w, Hh, 20, alpha(K.panel, 0.95)); strokeRR(c, L.x + 0.5, Y + 0.5, L.w - 1, Hh - 1, 20, alpha(K.teal, 0.25 + 0.5 * enter(t, uf, 0.3)), 2);
    txt(c, 'USEFUL', L.x + L.w / 2, Y + 40, D(24, 100, 900), K.teal, 2, 'center');
    const items: [string, string][] = [['sun', 'morning brief'], ['lock', 'approval: tum'], ['clock', 'baaki time quiet']];
    items.forEach(([ic, s], i) => { const p = pop(t, uf + i * BEAT_); if (p <= 0) return; c.save(); c.globalAlpha *= sat(p * 3); const y = Y + 96 + i * 72;
      fillRR(c, L.x + 14, y - 26, L.w - 28, 52, 14, K.panel2); icon(c, ic, L.x + 38, y, 20, K.teal, 2.2);
      c.font = B(15, 700); const fw = Math.min(1, (L.w - 80) / c.measureText(s).width); c.save(); c.translate(L.x + 60, y + 5); c.scale(fw, fw); txt(c, s, 0, 0, B(15, 700), K.fg); c.restore(); c.restore(); });
    c.restore();
    c.save(); c.globalAlpha *= kz; fillRR(c, R.x, Y, R.w, Hh, 20, alpha(K.panel, 0.95)); strokeRR(c, R.x + 0.5, Y + 0.5, R.w - 1, Hh - 1, 20, alpha(K.amber, 0.25 + 0.5 * enter(t, nz, 0.3)), 2);
    txt(c, 'NOISE?', R.x + R.w / 2, Y + 40, D(24, 100, 900), K.amber, 2, 'center');
    c.save(); rrect(c, R.x, Y + 56, R.w, Hh - 60, 0); c.clip();
    const n = Math.floor(2 + 10 * sat((t - (nz - 0.6)) / 0.9));
    for (let i = 0; i < n; i++) {
      const ti = nz - 0.6 + i * 0.09, p = pop(t, ti); if (p <= 0) continue;
      const jx = (hash(i, 3) - 0.5) * 18 + Math.sin(t * 30 + i) * 1.5 * sat((t - nz) * 2), y = Y + 90 + i * 22 - (1 - Math.min(1, p)) * 30;
      c.save(); c.globalAlpha *= sat(p * 3); c.translate(R.x + R.w / 2 + jx, y); c.rotate((hash(i, 5) - 0.5) * 0.1);
      fillRR(c, -96, -17, 192, 34, 12, i % 3 === 0 ? alpha(K.red, 0.3) : K.panel2); strokeRR(c, -95.5, -16.5, 191, 33, 12, alpha(K.amber, 0.4), 1);
      icon(c, 'bell', -76, 0, 14, K.amber, 1.8); fillRR(c, -60, -6, 70 + 50 * hash(i, 8), 5, 2.5, alpha(K.fg2, 0.6)); fillRR(c, -60, 4, 40 + 40 * hash(i, 9), 4, 2, alpha(K.fg3, 0.5)); c.restore();
    }
    c.restore(); c.restore();
    c.restore();
    const kb = pop(t, cm - 0.02);   // the button
    if (kb > 0) {
      const beatP = t >= dr ? Math.exp(-((t - dr) % BEAT_) / 0.12) : 0;
      c.save(); c.translate(CX, 520); const s = lerp(0.5, 1, Math.min(1.12, kb)) * (1 + 0.035 * beatP); c.scale(s, s); c.globalAlpha *= sat(kb * 3);
      for (let r = 0; r < 2; r++) { const q = (((t - dr) / (2 * BEAT_)) + r * 0.5) % 1; if (t >= dr) { c.save(); c.globalAlpha *= 0.5 * (1 - q); strokeRR(c, -190 - 30 * q, -46 - 30 * q, 380 + 60 * q, 92 + 60 * q, 46 + 30 * q, K.teal, 2); c.restore(); } }
      c.save(); c.shadowColor = alpha(K.teal, 0.7); c.shadowBlur = 40; fillRR(c, -190, -46, 380, 92, 46, K.teal); c.restore();
      c.font = D(30, 100, 900); const w1 = c.measureText('COMMENT').width; c.font = D(36, 112.5, 900); const w2 = c.measureText('DUET').width;
      const tw = 40 + 14 + w1 + 14 + w2, fs = Math.min(1, 330 / tw); c.save(); c.scale(fs, fs); let x = -tw / 2;
      icon(c, 'chat', x + 20, 0, 40, K.bg0, 3.4); x += 54; txt(c, 'COMMENT', x, 11, D(30, 100, 900), K.bg0); x += w1 + 14; txt(c, 'DUET', x, 13, D(36, 112.5, 900), K.bg0); c.restore(); c.restore();
    }
    const ks = pop(t, sv);
    if (ks > 0) {
      c.save(); c.translate(CX, 626); const s = lerp(0.5, 1, Math.min(1.12, ks)); c.scale(s, s); c.globalAlpha *= sat(ks * 3);
      fillRR(c, -118, -26, 236, 52, 26, alpha(K.bg0, 0.9)); strokeRR(c, -117, -25, 234, 50, 25, K.amber, 2);
      icon(c, 'bookmark', -86, 0, 22, K.amber); txt(c, 'SAVE KAR LO', 12, 9, D(22, 100, 900), K.amber, 1, 'center'); c.restore();
    }
  }
  // ---- END: the TECHPE TREK card, after the payoff
  private end(c: CanvasRenderingContext2D, t: number) {
    const e0 = this.ev('end.in'), k = pop(t, e0 + 0.05);
    if (k <= 0) return;
    c.save(); c.globalAlpha *= sat(k * 3);
    c.save(); c.translate(CX, 440); const s = lerp(0.7, 1, Math.min(1.1, k)); c.scale(s, s);
    glow(c, 0, 0, 230, alpha(K.violet, 0.3));
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 30; fillRR(c, -122, -122, 244, 244, 34, '#000000'); c.restore();
    if (this.logo) { c.save(); rrect(c, -122, -122, 244, 244, 34); c.clip(); c.drawImage(this.logo, -122, -122, 244, 244); c.restore(); }
    strokeRR(c, -121, -121, 242, 242, 33, alpha(K.teal, 0.6), 2);
    c.restore();
    const kt = enter(t, e0 + 0.35, 0.35);
    c.globalAlpha *= kt;
    txt(c, 'FOLLOW FOR AI NEWS', CX, 624, D(22, 112.5, 900), K.fg, 3, 'center');
    txt(c, 'Comment DUET · save for updates', CX, 660, B(17, 500), K.fg2, 0, 'center');
    c.restore();
  }

  // ================================================================ the frame
  private drawChapter(c: CanvasRenderingContext2D, name: string, t: number) {
    switch (name) {
      case 'hook': return this.hook(c, t); case 'duet': return this.duet(c, t); case 'brief': return this.brief(c, t); case 'tasks': return this.tasks(c, t);
      case 'twist': return this.twist(c, t); case 'hours': return this.hours(c, t); case 'avail': return this.avail(c, t); case 'india': return this.india(c, t);
      case 'cta': return this.cta(c, t); default: return this.end(c, t);
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
    const o = this.orbPose(t);
    if (o.a > 0.01 && o.r > 0.5) {
      const ab = this.ev('hook.ab'), awake = name !== 'hook' || t >= ab;
      const bump = name === 'hook' ? 1 + 0.25 * (pop(t, ab) - glide(t, ab + 0.35)) : 1;
      const look: [number, number] = name === 'hook' ? (t < ab ? [0, 1] : [1, 1]) : name === 'cta' ? [Math.sin(t * 2.2), 0.3] : name === 'end' ? [-1, 0.4] : [0, 0];
      const face = name === 'duet' ? sat((t - this.ev('duet.in') - 0.75) / 0.3) : 1, ringA = name === 'hours' ? 0 : name === 'duet' ? face : 1;
      c.save(); c.globalAlpha *= o.a; drawOrb(c, o.x, o.y + Math.sin(t * 2.1) * (o.r * 0.05) * face, o.r * bump, t, { open: awake ? 1 : 0.25, look, smile: awake ? 1 : 0.5, ring: ringA, face }); c.restore();
    }
    this.captions(c, t);
    const srcOn = ['duet', 'brief', 'tasks', 'twist', 'hours', 'avail', 'india', 'end'].includes(name) ? 1 : 0;
    this.sourceBadge(c, t, srcOn * (name === 'duet' ? enter(t, this.ev('duet.anth'), 0.3) : 1));
    if (name === 'end' || name === 'cta') { const fl = hitP(t, this.ev('cta.drop'), 0.06) * 0.35; if (fl > 0.01) { c.fillStyle = alpha(K.teal, fl); c.fillRect(0, 0, FXW, FXH); } }
  }

  // ================================================================ the cover (a separate 1080x1920 still)
  private drawCover(c: CanvasRenderingContext2D, clean: boolean) {
    const t = 5.9;
    const g = c.createLinearGradient(0, 0, 0, FXH); g.addColorStop(0, '#120B2E'); g.addColorStop(0.55, '#1A0F3A'); g.addColorStop(1, '#0A0716'); c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
    glow(c, 470, 520, 420, 'rgba(255,128,48,0.38)'); glow(c, 120, 300, 380, 'rgba(140,90,255,0.42)'); glow(c, 304, 900, 420, 'rgba(255,90,60,0.18)');
    c.fillStyle = alpha('#FFFFFF', 0.08); for (let y = 0; y < FXH; y += 30) for (let x = 15 + ((y / 30) % 2) * 15; x < FXW; x += 30) c.fillRect(x, y, 1.4, 1.4);
    // floating cards (email, calendar)
    const card = (x: number, y: number, rot: number, ic: string, s1: string, s2: string, col: string) => {
      c.save(); c.translate(x, y); c.rotate(rot); c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 26; c.shadowOffsetY = 10; fillRR(c, -88, -34, 176, 68, 16, '#211A4A'); c.restore();
      strokeRR(c, -87.5, -33.5, 175, 67, 16, alpha(col, 0.6), 1.5); disc(c, -56, 0, 20, alpha(col, 0.2)); icon(c, ic, -56, 0, 22, col, 2.2);
      txt(c, s1, -28, -3, B(15, 900), '#FFFFFF'); txt(c, s2, -28, 17, B(12, 500), '#CFC6F0'); c.restore();
    };
    card(140, 430, -0.14, 'mail', 'Inbox', '2 replies due', '#FF9A4D'); card(128, 530, 0.1, 'cal', '10:30 call', 'prep ready', '#B79CFF');
    // the developer, surprised, behind the phone
    drawDev(c, 190, 760, 1.05, t, 1, 0);
    fillRR(c, 190 - 158 * 1.05, 760 + 236 * 1.05, 316 * 1.05, 90, 0, '#0F172E');   // the hoodie runs off the bottom of the cover
    txt(c, '!!', 236, 612, D(44, 100, 900), '#FFB43F', 0, 'center');
    // the giant phone
    c.save(); c.translate(0, 0);
    drawPhone(c, 400, 600, 270, 520, 0.08, (sw) => {
      txt(c, '7:30', sw / 2, 96, D(54, 100, 900), alpha('#FFFFFF', 0.92), 0, 'center');
      c.save(); const x = 12, y = 130, w = sw - 24, h = 98;
      fillRR(c, x, y, w, h, 20, alpha('#FFFFFF', 0.18)); strokeRR(c, x + 0.5, y + 0.5, w - 1, h - 1, 20, alpha('#FFFFFF', 0.25), 1);
      drawOrb(c, x + 28, y + 30, 16, t, { ring: 0, glowA: 0.5, look: [1, 0] });
      txt(c, 'AI', x + 52, y + 36, B(17, 900), '#FFFFFF'); txt(c, 'abhi', x + w - 14, y + 36, B(13, 500), '#D9D2F5', 0, 'right');
      txt(c, 'bhai, ye urgent hai!', x + 16, y + 74, B(19, 700), '#FFFFFF'); disc(c, x + w - 18, y + 70, 6, K.red); c.restore();
    });
    c.restore();
    drawOrb(c, 494, 376, 54, t, { open: 1, look: [-0.7, 0.6], glowA: 1.3 });
    if (!clean) {
      const rows: [string, string][] = [['AI TUMHE', '#FFFFFF'], ['PING KAREGA?!', '#FFB43F']];
      rows.forEach(([s, col], i) => { const { f, size } = fitFont(c, s, 70, SW + 20, 100, 900); c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 18; txt(c, s, CX, 200 + i * size * 1.04, f, col, 0, 'center'); c.restore(); });
      chip(c, 'CLAUDE DUET • US WAITLIST', CX, 905 - 70, { fg: '#120B2E', bg: '#FFFFFF', size: 15, wt: 900, align: 'center', track: 1.5 });
      c.font = B(13, 500); const sw2 = c.measureText('Source: claude.com · 21 Oct 2026 · illustration').width + 28;
      fillRR(c, CX - sw2 / 2, 905 - 52, sw2, 26, 13, alpha('#0A0716', 0.85));
      txt(c, 'Source: claude.com · 21 Oct 2026 · illustration', CX, 905 - 34, B(13, 500), '#D9D2F5', 0, 'center');
    }
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const c = this.layer.ctx, t = f.t, cover = this.ctx.params?.cover as string | undefined;
    this.layer.clear(K.bg0);
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    if (cover) this.drawCover(c, cover === 'clean'); else this.draw(c, t);
    c.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    if (cover) return { hud: 0, frame: 0, pdoom: 0, bloom: 0.25, bloomThreshold: 0.75, halation: 0, grain: 0.015, ca: 0, vignette: 0.15, flash: 0, zoom: 1, shake: [0, 0] };
    // punches on the measured events (cuts on the beat): a zoom, a chromatic split, a shake
    const e = (n: string) => this.ev(n);
    const hits: [number, number][] = [[e('hook.ab'), 1], [e('duet.name'), 0.7], [e('tw.in'), 1.2], [e('tw.tap'), 0.5], [e('hr.nahi'), 0.6], [e('av.wait'), 0.6],
      [e('in.nahi'), 0.9], [e('cta.drop'), 1.2], [e('brief.c1'), 0.35], [e('brief.c2'), 0.35], [e('brief.c3'), 0.35], [e('duet.date'), 0.5]];
    for (const [a] of this.cues.chapters.slice(1)) hits.push([a, 0.4]);
    let z = 0, ca = 0, sh = 0;
    for (const [ht, s] of hits) { const h = hitP(t, ht, 0.09) * s; z = Math.max(z, h); ca = Math.max(ca, h); sh = Math.max(sh, ht === e('tw.in') || ht === e('cta.drop') || ht === e('in.nahi') ? h : 0); }
    const fi = Math.round(t * 60);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0.3, bloomThreshold: 0.72, bloomKnee: 0.4, bloomRadius: 0.5, halation: 0, grain: 0.018,
      ca: 0.25 + 2.2 * ca, vignette: 0.2, flash: 0, zoom: 1 + 0.035 * z, shake: [(hash(fi, 1) - 0.5) * 14 * sh, (hash(fi, 2) - 0.5) * 14 * sh] };
  }
  override dispose() { this.layer.texture.dispose(); }
}
const BEAT_ = 60 / BPM;
void beatIndex;
