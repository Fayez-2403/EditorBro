// v1 (dark neon look, 38.361 s), kept for comparison; variant pkgfw_v1 serves data/pkgfw_v1 + audio/pkgfw_v1.
// GitHub package firewall reel (38.361 s, 9:16, 60 fps, 122 BPM): one 2D scene; the story is data/pkgfw/cues.json.
// Original vector illustration: no GitHub or npm artwork or UI (the names are set in our own type), the terminal is labelled
// fictional and the policy demo conceptual. Claims: projects/github-package-firewall/FACTS.md.
// Every frame is a pure function of t: chapters and events come from the voice's own word times, snapped to the score's
// beat grid (analysis/pkgfw_cues.py); captions are drawn from the same word times.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { hash } from '../engine/util';
import { COL, FXW, FXH, ax, mono, txt, alpha, fillRR, rrect, disc, strokeLine, spring, sat, span, outP, inP, inOutP, outExpo, hitP, lerp2, fitAx, hexRGB } from './_vo';

/** TechpeTrek brand: ink, white, lime and purple from the logo; red for danger, amber for warnings. */
const P = {
  ink: '#07080C', ink2: '#10131B', ink3: '#1A1F2B', line: '#2A3142', bone: '#F2F4F8', dim: 'rgba(242,244,248,0.55)',
  lime: '#C6F432', purple: '#9B3CFF', red: '#FF3D5A', amber: '#FFB547',
};
const CX = FXW / 2;
const SAFE_TOP = 116, SAFE_BOT = 964;   // the brief's 200 px top / bottom margins of the 1920 frame
const SOURCE = 'Source: GitHub Changelog • Oct 20, 2026';
const EMPH = new Set(['npm', 'install…', 'Poora', 'khatre', 'rewind!', 'risky', 'dependency,', 'build', 'GitHub', 'package', 'firewall',
  'cooldown', 'period,', 'advisory', 'checks,', 'supply-chain', 'checks.', 'fail?', 'ruk', 'automatic', 'sirf', 'CI', 'FIREWALL!']);

interface Cues { duration: number; chapters: [number, number, string][]; events: Record<string, number> }
interface Word { w: string; start: number; end: number }
interface Line { i: number; text: string; start: number; end: number; words: Word[] }

/** Spring 0 -> 1 from t0 (response = period s, zeta < 1 overshoots), clamped for drawing. */
const sp = (t: number, t0: number, r = 0.35, z = 0.55) => Math.max(-0.25, Math.min(1.3, spring(t - t0, r, z)));
const shade = (h: string, k: number) => { const [r, g, b] = hexRGB(h); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
const path = (c: CanvasRenderingContext2D, pts: number[][]) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!))); c.closePath(); };
const h1 = (n: number, k = 0) => hash(n, k);

/** An isometric cube centred on (x, y) (its silhouette's middle), edge s; `label` is set on its left face. */
function cube(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, o: { label?: string; glow?: number; alpha?: number; edge?: string } = {}) {
  const h = 0.866 * s;
  const top = [[x, y - s], [x + h, y - s / 2], [x, y], [x - h, y - s / 2]];
  const left = [[x - h, y - s / 2], [x, y], [x, y + s], [x - h, y + s / 2]];
  const right = [[x, y], [x + h, y - s / 2], [x + h, y + s / 2], [x, y + s]];
  c.save(); c.globalAlpha *= o.alpha ?? 1;
  if (o.glow) { c.shadowColor = col; c.shadowBlur = o.glow; }
  path(c, [[x - h, y - s / 2], [x, y - s], [x + h, y - s / 2], [x + h, y + s / 2], [x, y + s], [x - h, y + s / 2]]); c.fillStyle = shade(col, 0.7); c.fill();
  c.shadowBlur = 0;
  path(c, left); c.fillStyle = shade(col, 0.85); c.fill();
  path(c, right); c.fillStyle = shade(col, 0.58); c.fill();
  path(c, top); c.fillStyle = shade(col, 1.18); c.fill();
  c.strokeStyle = o.edge ?? alpha('#FFFFFF', 0.55); c.lineWidth = Math.max(1, s * 0.025); c.lineJoin = 'round';
  for (const f of [top, left, right]) { path(c, f); c.stroke(); }
  if (o.label) {
    c.save(); c.transform(h / 100, (s / 2) / 100, 0, s / 100, x - h, y - s / 2);
    c.font = ax(34, 100, 900); c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.label, 50, 52);
    c.restore();
  }
  c.restore();
}

/** A warning triangle centred on (x, y), size s. */
function warn(c: CanvasRenderingContext2D, x: number, y: number, s: number, col = P.amber, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  path(c, [[0, -s * 0.58], [s * 0.6, s * 0.46], [-s * 0.6, s * 0.46]]); c.fillStyle = col; c.fill();
  c.fillStyle = P.ink; c.fillRect(-s * 0.06, -s * 0.22, s * 0.12, s * 0.4); c.fillRect(-s * 0.06, s * 0.24, s * 0.12, s * 0.11);
  c.restore();
}

/** A pill label centred on (x, y). */
function pill(c: CanvasRenderingContext2D, s: string, x: number, y: number, f: string, fg: string, bg: string, k = 1, stroke?: string) {
  if (k <= 0) return;
  c.save(); c.font = f; (c as any).letterSpacing = '0px'; const w = c.measureText(s).width + 30, hgt = 40;
  c.translate(x, y); c.scale(lerp2(0.7, 1, sat(k)), lerp2(0.7, 1, sat(k))); c.globalAlpha *= sat(k * 2.5);
  fillRR(c, -w / 2, -hgt / 2, w, hgt, hgt / 2, bg);
  if (stroke) { rrect(c, -w / 2, -hgt / 2, w, hgt, hgt / 2); c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); }
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 1);
  c.restore();
}

/** Big kinetic type that stomps in at t0 (from 1.5x, settling on a spring). */
function stomp(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, t: number, t0: number, col: string, o: { maxW?: number; out?: number; glow?: number } = {}) {
  if (t < t0) return;
  const k = sp(t, t0, 0.32, 0.5), out = o.out ?? 0;
  if (out >= 1) return;
  const fs = Math.min(size, fitAx(c, s, size, o.maxW ?? 540, 100, 900));
  c.save(); c.globalAlpha *= sat((t - t0) / 0.06) * (1 - out);
  c.translate(x, y); const sc = lerp2(1.5, 1, sat(k)) * (k > 1 ? 1 + (k - 1) * 0.3 : 1); c.scale(sc, sc);
  if (o.glow) { c.shadowColor = col; c.shadowBlur = o.glow; }
  c.lineWidth = 8; c.strokeStyle = alpha(P.ink, 0.9); c.lineJoin = 'round'; c.font = ax(fs, 100, 900); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  (c as any).letterSpacing = '0px'; c.strokeText(s, 0, 0); c.fillStyle = col; c.fillText(s, 0, 0);
  c.restore();
}

export default class Pkgfw extends Scene {
  private layer = new Layer2D();
  private cues!: Cues;
  private lines: Line[] = [];
  private logo: HTMLImageElement | null = null;

  override async init() {
    this.cues = await (await fetch('/data/pkgfw_v1/cues.json')).json();
    try { this.lines = (await (await fetch('/data/lyrics.json')).json()).lines; } catch { /* captions optional */ }
    const img = new Image(); img.src = 'brand/techpe-trek.jpg';
    try { await img.decode(); this.logo = img; } catch { this.logo = null; }
  }
  private ev(n: string) { const v = this.cues.events[n]; if (typeof v !== 'number') throw new Error(`pkgfw cue missing: ${n}`); return v; }
  private chapter(t: number) { const ch = this.cues.chapters.find(([a, b]) => t >= a && t < b) ?? this.cues.chapters[this.cues.chapters.length - 1]!; return ch; }
  private kick(t: number, hl = 0.1) { return this.ctx.audio.hit('kick', t, hl); }

  // =================================================================================== 0. HOOK (0 - 2.951)
  // The giant neon npm cube is already falling at a small laptop on frame 0; it slams on the first downbeat (inside
  // "install"), the screen cracks and floods red, warnings burst; on beat 4 the tape rewinds it all back up.
  private hook(c: CanvasRenderingContext2D, t: number, real: number) {
    const slam = this.ev('hook.slam'), rw = this.ev('hook.rewind'), cut = this.ev('hook.cut');
    const rewinding = real >= rw;
    // the laptop
    const lx = CX, ly = 760, lw = 400, lh = 248;
    const after = t >= slam, k = sp(t, slam, 0.3, 0.45);
    const shake = after ? (h1(Math.floor(real * 30), 3) - 0.5) * 10 * hitP(t, slam, 0.18) : 0;
    c.save(); c.translate(shake, 0);
    fillRR(c, lx - lw / 2, ly - lh, lw, lh, 16, '#1B2030');
    c.save(); rrect(c, lx - lw / 2 + 12, ly - lh + 12, lw - 24, lh - 24, 8); c.clip();
    c.fillStyle = '#0B0E15'; c.fillRect(lx - lw / 2, ly - lh, lw, lh);
    const sx = lx - lw / 2 + 32, sy = ly - lh + 60;
    if (!after) {
      txt(c, '~/my-app $', sx, sy, mono(19, 600), P.lime); txt(c, 'npm install', sx + 124, sy, mono(19, 600), P.bone);
      if (Math.floor(real * 4) % 2 === 0) c.fillRect(sx + 252, sy - 18, 11, 22);
    } else {
      // the screen floods red; glitch bands; the alarm
      const red = sat((t - slam) / 0.12);
      c.fillStyle = alpha(P.red, 0.22 + 0.25 * red * (0.6 + 0.4 * Math.sin(real * 30))); c.fillRect(lx - lw / 2, ly - lh, lw, lh);
      for (let i = 0; i < 7; i++) {
        const gy = ly - lh + h1(Math.floor(real * 20), i) * lh, gh = 4 + 14 * h1(i, Math.floor(real * 20));
        c.fillStyle = alpha(i % 2 ? '#3CE6FF' : P.red, 0.35); c.fillRect(lx - lw / 2 + (h1(i, 9 + Math.floor(real * 20)) - 0.5) * 60, gy, lw, gh);
      }
      if (t > 1.4) {
        warn(c, lx - 108, ly - lh / 2 + 6, 36, P.amber);
        txt(c, 'BUILD AT RISK', lx - 78, ly - lh / 2 + 18, ax(28, 100, 900), P.bone);
      }
      // cracks from the impact point
      c.strokeStyle = alpha('#FFFFFF', 0.75); c.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        let px = lx + (h1(i, 1) - 0.5) * 60, py = ly - lh + 12; const a = Math.PI * (0.15 + 0.7 * h1(i, 2)), len = (60 + 140 * h1(i, 3)) * sat(k);
        c.beginPath(); c.moveTo(px, py);
        for (let j = 1; j <= 4; j++) { px += Math.cos(a + (h1(i, j + 4) - 0.5) * 0.8) * len / 4; py += Math.sin(a + (h1(i, j + 4) - 0.5) * 0.8) * len / 4; c.lineTo(px, py); }
        c.stroke();
      }
    }
    c.restore();
    path(c, [[lx - lw / 2 - 22, ly], [lx + lw / 2 + 22, ly], [lx + lw / 2 + 48, ly + 24], [lx - lw / 2 - 48, ly + 24]]); c.fillStyle = '#2A3142'; c.fill();
    fillRR(c, lx - 40, ly + 2, 80, 8, 4, '#3A4256');
    c.restore();
    // the cube: falls, accelerating; squashes into the screen on the slam; a shadow grows on the laptop
    const fall = inP(sat(t / slam), 2.2);
    const s = lerp2(108, 132, fall), y0 = lerp2(250, 452, fall);
    const sq = after ? 1 - 0.22 * Math.sin(Math.PI * sat((t - slam) / 0.22)) : 1;
    if (!after) {
      for (let i = 0; i < 10; i++) {   // speed lines above it
        const x = CX + (h1(i, 7) - 0.5) * 220, l = 60 + 90 * h1(i, 8);
        strokeLine(c, [[x, y0 - s - 20 - l * (0.5 + fall)], [x, y0 - s - 20]], alpha(P.bone, 0.18 + 0.3 * fall), 2);
      }
    }
    c.save(); c.translate(CX + shake, y0 + s); c.scale(1 / sq, sq); c.rotate(after ? 0.04 : lerp2(-0.22, 0.04, fall)); c.translate(-CX, -(y0 + s));
    cube(c, CX, y0, s, P.red, { label: 'npm', glow: 40 + 30 * hitP(t, slam, 0.2) });
    c.restore();
    // warnings burst outward on the slam
    if (after && t < slam + 1.6) {
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * (0.08 + 0.84 * (i / 8)), d = outExpo(sat((t - slam) / 0.9)) * (150 + 110 * h1(i, 5));
        const f = 1 - span(t, slam + 0.8, slam + 1.6);
        c.save(); c.globalAlpha = f; warn(c, CX + Math.cos(a) * d, 520 + Math.sin(a) * d * 0.9, 30 + 16 * h1(i, 6), i % 3 ? P.amber : P.red, (h1(i, 4) - 0.5) * 2 * (t - slam)); c.restore();
      }
    }
    // the type: ONE PACKAGE. on frame 0, ONE BAD INSTALL. slams in on the downbeat
    stomp(c, 'ONE PACKAGE.', CX, 192, 64, t, -1, P.bone);
    stomp(c, 'ONE BAD INSTALL.', CX, 262, 60, t, slam, P.red, { glow: 18 });
    void rewinding; void cut;
  }

  /** The VHS rewind over the hook: scanlines, a tracking band, the OSD, and the hook played backward. */
  private rewindOverlay(c: CanvasRenderingContext2D, real: number) {
    const rw = this.ev('hook.rewind'), cut = this.ev('hook.cut'), k = span(real, rw, rw + 0.08);
    c.save();
    c.fillStyle = alpha('#000000', 0.18 * k); for (let y = 0; y < FXH; y += 4) c.fillRect(0, y, FXW, 2);
    const band = ((real - rw) * 2600) % (FXH + 200) - 100;
    for (let i = 0; i < 26; i++) { c.fillStyle = alpha('#FFFFFF', 0.25 * h1(i, Math.floor(real * 60))); c.fillRect(h1(i, 2 + Math.floor(real * 60)) * FXW, band + h1(i, 3) * 60, 30 + 80 * h1(i, 4), 3); }
    c.fillStyle = alpha('#FFFFFF', 0.06 * k); c.fillRect(0, band, FXW, 60);
    txt(c, '◀◀ REWIND', 34, 812, mono(26, 700), P.bone);
    const ts = Math.max(0, 2.46 - (real - rw) * 4.49);
    txt(c, `00:00:0${Math.floor(ts)}.${String(Math.floor((ts % 1) * 100)).padStart(2, '0')}`, FXW - 34, 812, mono(20, 600), P.bone, 0, 'right');
    // WAIT. REWIND. with a VHS colour split
    const tk = sp(real, rw, 0.28, 0.5);
    c.translate(CX, 470); c.scale(lerp2(1.4, 1, sat(tk)), lerp2(1.4, 1, sat(tk)));
    fillRR(c, -270, -64, 540, 92, 12, alpha(P.ink, 0.82));
    c.font = ax(64, 100, 900); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; (c as any).letterSpacing = '0px';
    c.fillStyle = alpha('#3CE6FF', 0.8); c.fillText('WAIT. REWIND.', -4, 4);
    c.fillStyle = alpha(P.red, 0.8); c.fillText('WAIT. REWIND.', 4, 4);
    c.fillStyle = P.bone; c.fillText('WAIT. REWIND.', 0, 4);
    c.restore();
    void cut;
  }

  // =================================================================================== 1. TERMINAL (2.951 - 8.852)
  // Back before the install, in a clearly labelled fictional terminal: Enter, the output scrolls, three red cubes race down
  // the pipe into the build on "dependency", warnings pulse on the kicks, the build turns red on "build".
  private terminal(c: CanvasRenderingContext2D, t: number) {
    const c0 = this.ev('hook.cut'), enter = this.ev('term.enter'), cubes = this.ev('term.cubes'), wn = this.ev('term.warn'), bld = this.ev('term.build');
    const inK = outExpo(span(t, c0, c0 + 0.3));
    c.save(); c.translate(0, (1 - inK) * 60); c.globalAlpha = sat(inK * 1.5);
    // the window
    const X = 30, Y = 140, W = FXW - 60, H = 330;
    fillRR(c, X, Y, W, H, 18, P.ink2); rrect(c, X, Y, W, H, 18); c.strokeStyle = P.line; c.lineWidth = 2; c.stroke();
    fillRR(c, X, Y, W, 38, 18, P.ink3); c.fillStyle = P.ink3; c.fillRect(X, Y + 20, W, 18);
    [P.red, P.amber, P.lime].forEach((col, i) => disc(c, X + 24 + i * 22, Y + 19, 6, col));
    txt(c, 'FICTIONAL TERMINAL', X + W / 2, Y + 25, mono(13, 700), P.bone, 2, 'center');
    txt(c, 'illustration', X + W - 16, Y + 25, mono(11, 500), P.dim, 0, 'right');
    const lx = X + 24, ly = Y + 78, LH = 34;
    txt(c, '~/my-app $', lx, ly, mono(19, 600), P.lime); txt(c, 'npm install', lx + 124, ly, mono(19, 600), P.bone);
    if (t < enter && Math.floor(t * 4) % 2 === 0) { c.fillStyle = P.bone; c.fillRect(lx + 252, ly - 18, 11, 22); }
    const out: [string, string][] = [['resolving dependency tree…', P.dim], ['+ ui-kit@4.2.1', P.bone], ['+ date-fmt@3.0.0', P.bone],
      ['+ quick-fix@6.6.6   ⚠ unverified', P.red], ['running postinstall…', P.amber], ['build started', P.dim]];
    out.forEach(([s, col], i) => {
      const ti = enter + 0.12 + i * 0.246;
      if (t < ti) return;
      c.save(); c.globalAlpha *= sat((t - ti) / 0.08);
      txt(c, s, lx, ly + LH * (i + 1), mono(17, i === 3 ? 700 : 500), col);
      if (i === 3) { c.fillStyle = alpha(P.red, 0.12 + 0.1 * Math.sin(t * 12)); c.fillRect(lx - 8, ly + LH * 4 - 24, W - 32, 32); }
      c.restore();
    });
    // the pipe down to the build
    const px = CX, p0 = Y + H, p1 = 640;
    c.save(); c.shadowColor = P.purple; c.shadowBlur = 12; strokeLine(c, [[px, p0], [px, p1]], alpha(P.purple, 0.6), 10); c.restore();
    strokeLine(c, [[px, p0], [px, p1]], P.ink3, 4);
    // packets: calm lime ones, then the three red cubes race down on "dependency"
    for (let k = 0; k < 4; k++) {
      const u = ((t - enter) * 0.9 + k * 0.25) % 1;
      if (t > enter && t < cubes) cube(c, px, lerp2(p0 + 20, p1 - 20, u), 14, P.lime, { alpha: 0.9 });
    }
    for (let k = 0; k < 3; k++) {
      const t0 = cubes + k * 0.246, u = inP(sat((t - t0) / 0.42), 1.6);
      if (t < t0 || u >= 1) continue;
      const y = lerp2(p0 + 10, p1 - 10, u);
      for (let j = 1; j <= 4; j++) cube(c, px, y - j * 16, 16, P.red, { alpha: 0.18 * (5 - j) / 4 });
      cube(c, px, y, 18, P.red, { glow: 24 });
    }
    // warnings pulse on the kicks
    if (t >= wn) {
      const pk = this.kick(t, 0.12);
      for (const [x, y] of [[110, 560], [498, 560], [150, 470 + 150], [458, 620]] as [number, number][]) warn(c, x, y, 34 + 14 * pk, P.amber);
    }
    // the build box
    const bx = 174, by = 660, bw = 260, bh = 88, hot = t >= bld;
    const shake = hot ? (h1(Math.floor(t * 30), 1) - 0.5) * 8 * hitP(t, bld, 0.2) : 0;
    c.save(); c.translate(shake, 0);
    if (hot) { c.shadowColor = P.red; c.shadowBlur = 30 * (0.6 + 0.4 * Math.sin(t * 10)); }
    fillRR(c, bx, by, bw, bh, 16, hot ? '#3A0F18' : P.ink2); c.shadowBlur = 0;
    rrect(c, bx, by, bw, bh, 16); c.strokeStyle = hot ? P.red : P.line; c.lineWidth = 3; c.stroke();
    txt(c, 'CI BUILD', bx + bw / 2, by + 38, ax(30, 100, 900), hot ? P.red : P.bone, 2, 'center');
    txt(c, hot ? '⚠ RISK AT INSTALL TIME' : 'waiting…', bx + bw / 2, by + 68, mono(14, 700), hot ? P.amber : P.dim, 0, 'center');
    c.restore();
    c.restore();
  }

  // =================================================================================== 2. FIREWALL (8.852 - 16.721)
  // The fix, as a schematic: the npm registry, a pipe, a CI runner and a coding agent. The shield springs across the pipe
  // on the downbeat before "firewall"; packets queue at it; from bar 7 the scanner lets the clean ones through and holds
  // the red one. The title (GitHub Package Firewall, PUBLIC PREVIEW) replaces the dated kicker.
  private firewall(c: CanvasRenderingContext2D, t: number) {
    const c0 = this.cues.chapters[2]![0], gh = this.ev('fw.github'), sh = this.ev('fw.shield'), lab = this.ev('fw.label'), sc = this.ev('fw.scan');
    const inK = outExpo(span(t, c0, c0 + 0.35));
    c.save(); c.globalAlpha = sat(inK * 1.4); c.translate(0, (1 - inK) * 40);
    // kicker, then the title
    if (t < lab + 0.1) pill(c, 'GitHub  ·  Oct 20, 2026', CX, 160, mono(16, 700), P.ink, P.lime, sp(t, gh, 0.3, 0.55) * (1 - span(t, lab - 0.1, lab + 0.1)));
    if (t >= lab) {
      stomp(c, 'GitHub Package Firewall', CX, 172, 46, t, lab, P.bone, { maxW: 548 });
      pill(c, 'PUBLIC PREVIEW', CX, 214, mono(16, 700), P.ink, P.lime, sp(t, lab + 0.12, 0.3, 0.5));
    }
    // registry
    const rx = 154, ry = 248, rw = 300, rh = 74;
    fillRR(c, rx, ry, rw, rh, 16, P.ink2); rrect(c, rx, ry, rw, rh, 16); c.strokeStyle = P.line; c.lineWidth = 2; c.stroke();
    cube(c, rx + 46, ry + 30, 16, P.red, { alpha: 0.9 }); cube(c, rx + 72, ry + 42, 12, P.lime, { alpha: 0.8 });
    txt(c, 'npm registry', rx + 102, ry + 46, ax(26, 100, 900), P.bone);
    // pipe and the two endpoints
    const px = CX, p0 = ry + rh, gate = 452, p1 = 610;
    c.save(); c.shadowColor = P.purple; c.shadowBlur = 12; strokeLine(c, [[px, p0], [px, p1], [150, p1], [150, 650]], alpha(P.purple, 0.55), 10);
    strokeLine(c, [[px, p1], [458, p1], [458, 650]], alpha(P.purple, 0.55), 10); c.restore();
    for (const [x, label] of [[150, 'CI runner'], [458, 'coding agent']] as [number, string][]) {
      fillRR(c, x - 120, 650, 240, 78, 16, P.ink2); rrect(c, x - 120, 650, 240, 78, 16); c.strokeStyle = P.line; c.lineWidth = 2; c.stroke();
      txt(c, label, x, 698, ax(25, 100, 900), P.bone, 0, 'center');
    }
    // packets: flow freely before the shield; queue at the gate after it; pass one per eighth from the scan (red held)
    const shK = sp(t, sh, 0.4, 0.5);
    const RED = 2, E8 = 0.246;
    for (let k = 0; k < 7; k++) {
      const col = k === RED ? P.red : P.lime;
      let y: number;
      const free = p0 + 16 + (((t - c0) * 150 + k * 60) % (p1 - p0 - 30));
      if (t < sh) y = free;
      else {
        if (k >= 4 && t < sc + 0.25 + (k - 4) * E8) continue;   // only four fit in the queue; the rest come down later
        const qy = gate - 34 - Math.min(k, 3) * 28;   // its place in the queue (clear of the registry card)
        y = k < 4 ? lerp2(Math.min(free, qy), qy, outP(span(t, sh, sh + 0.35))) : qy;
        const go = sc + 0.25 + k * E8;               // its turn at the scanner
        if (t > go && k !== RED) y = lerp2(gate - 30, p1 + 40, outP(span(t, go, go + 0.5), 2));
        if (t > go && k === RED) y = gate - 30;
      }
      if (y > p1 + 30) continue;
      cube(c, px, y, 13, col, { glow: k === RED ? 16 : 0 });
      if (k === RED && t > sc + 0.25 + RED * E8) { c.save(); c.globalAlpha = sat((t - sc - 0.25 - RED * E8) / 0.1); strokeLine(c, [[px - 16, y - 16], [px + 16, y + 16]], P.red, 5); strokeLine(c, [[px + 16, y - 16], [px - 16, y + 16]], P.red, 5); c.restore(); }
    }
    // the shield: a glass barrier across the pipe, springing out from the middle; a shock ring
    if (t >= sh) {
      const w = 528 * Math.max(0, shK), x0 = CX - w / 2, hgt = 52;
      c.save(); c.shadowColor = P.purple; c.shadowBlur = 40;
      const g = c.createLinearGradient(0, gate - hgt / 2, 0, gate + hgt / 2); g.addColorStop(0, alpha(P.purple, 0.85)); g.addColorStop(1, alpha(P.purple, 0.35));
      fillRR(c, x0, gate - hgt / 2, w, hgt, 14, g); c.restore();
      c.save(); rrect(c, x0, gate - hgt / 2, w, hgt, 14); c.clip();
      c.strokeStyle = alpha('#FFFFFF', 0.18); c.lineWidth = 1.5;
      for (let i = -10; i < 30; i++) { const x = x0 + i * 26 + ((t * 30) % 26); c.beginPath(); c.moveTo(x, gate - hgt / 2); c.lineTo(x + 26, gate + hgt / 2); c.stroke(); }
      if (t >= sc) { const bx = x0 + ((t - sc) * 420 % (w + 80)) - 40; const bg = c.createLinearGradient(bx - 40, 0, bx + 40, 0); bg.addColorStop(0, alpha(P.lime, 0)); bg.addColorStop(0.5, alpha(P.lime, 0.75)); bg.addColorStop(1, alpha(P.lime, 0)); c.fillStyle = bg; c.fillRect(bx - 40, gate - hgt / 2, 80, hgt); }
      c.restore();
      rrect(c, x0, gate - hgt / 2, w, hgt, 14); c.strokeStyle = alpha(P.lime, 0.9); c.lineWidth = 2.5; c.stroke();
      txt(c, 'FIREWALL', CX - 200 * Math.max(0, shK), gate + 7, mono(15, 700), P.bone, 3, 'left');
      const ring = span(t, sh, sh + 0.6);
      if (ring < 1) { c.strokeStyle = alpha(P.lime, 0.8 * (1 - ring)); c.lineWidth = 3; c.beginPath(); c.ellipse(CX, gate, 60 + 300 * ring, 20 + 90 * ring, 0, 0, Math.PI * 2); c.stroke(); }
      if (t >= sc) txt(c, 'checks metadata + downloads', CX + 26, gate + 62, mono(13, 600), P.dim);
    }
    c.restore();
  }

  // =================================================================================== 3. POLICY (16.721 - 26.557)
  // A conceptual policy panel: three cards slide in on their snares and switch on; below, a red package is scanned at the
  // gate and dropped into HELD, and the clean one passes through with a tick.
  private policy(c: CanvasRenderingContext2D, t: number) {
    const c0 = this.cues.chapters[3]![0], adm = this.ev('pol.admin'), arr = this.ev('pol.arrive'), scn = this.ev('pol.scan'), held = this.ev('pol.held'), pass = this.ev('pol.pass');
    txt(c, 'CONCEPTUAL VISUALIZATION', FXW - 30, 134, mono(11, 700), P.dim, 1, 'right');
    pill(c, 'ENTERPRISE ADMIN  ·  POLICY', CX, 166, mono(15, 700), P.bone, P.ink3, sp(t, adm, 0.3, 0.55), P.purple);
    const cards: [string, string, string, string][] = [
      ['pol.card1', 'Cooldown period', 'min. package age · default 1 day', 'clock'],
      ['pol.card2', 'Advisory checks', 'GitHub Advisory Database', 'shield'],
      ['pol.card3', 'Supply-chain checks', 'e.g. attestation downgrades', 'chain'],
    ];
    // three empty slots from the chapter's start; each card fills its slot on its snare
    const slot = outP(span(t, c0, c0 + 0.4));
    for (let i = 0; i < 3; i++) {
      const fill = span(t, this.ev(cards[i]![0]), this.ev(cards[i]![0]) + 0.2);
      if (fill >= 1) continue;
      c.save(); c.globalAlpha = slot * (1 - fill); c.setLineDash([8, 8]); c.lineDashOffset = -t * 20;
      rrect(c, 34, 204 + i * 104, 540, 90, 18); c.strokeStyle = alpha(P.purple, 0.6); c.lineWidth = 2; c.stroke(); c.setLineDash([]);
      txt(c, `policy ${i + 1}`, 64, 204 + i * 104 + 52, mono(14, 600), P.dim);
      c.restore();
    }
    cards.forEach(([ev, title, sub, icon], i) => {
      const t0 = this.ev(ev); if (t < t0) return;
      const k = sp(t, t0, 0.38, 0.72), y = 204 + i * 104, x = 34 + (1 - k) * 640;
      c.save(); c.translate(x, y); c.transform(1, 0, (1 - sat(k)) * -0.25, 1, 0, 0);
      fillRR(c, 0, 0, 540, 90, 18, P.ink2); rrect(c, 0, 0, 540, 90, 18); c.strokeStyle = alpha(P.purple, 0.7); c.lineWidth = 2; c.stroke();
      disc(c, 46, 45, 28, alpha(P.purple, 0.25));
      c.strokeStyle = P.lime; c.lineWidth = 3;
      if (icon === 'clock') { c.beginPath(); c.arc(46, 45, 16, 0, Math.PI * 2); c.stroke(); strokeLine(c, [[46, 45], [46, 34], [46, 45], [55, 50]], P.lime, 3); }
      if (icon === 'shield') { path(c, [[46, 27], [62, 33], [60, 50], [46, 62], [32, 50], [30, 33]]); c.stroke(); strokeLine(c, [[39, 45], [44, 51], [54, 39]], P.lime, 3); }
      if (icon === 'chain') { c.beginPath(); c.ellipse(39, 45, 11, 7, -0.6, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(53, 45, 11, 7, -0.6, 0, Math.PI * 2); c.stroke(); }
      txt(c, title, 90, 42, ax(27, 100, 900), P.bone); txt(c, sub, 90, 70, mono(13, 500), P.dim);
      // its toggle switches on just after it lands
      const on = outP(span(t, t0 + 0.25, t0 + 0.45));
      fillRR(c, 456, 30, 62, 32, 16, on > 0.5 ? P.lime : P.ink3); disc(c, lerp2(472, 502, on), 46, 12, on > 0.5 ? P.ink : P.bone);
      c.restore();
    });
    // the conveyor and its gate
    const ty = 676, gx = CX;
    strokeLine(c, [[24, ty + 22], [FXW - 24, ty + 22]], P.line, 4);
    c.save(); c.shadowColor = P.purple; c.shadowBlur = 30; fillRR(c, gx - 10, ty - 66, 20, 112, 8, alpha(P.purple, 0.85)); c.restore();
    txt(c, 'POLICY GATE', gx, ty - 78, mono(12, 700), P.dim, 2, 'center');
    if (t >= arr) {
      const redX = Math.min(gx - 44, lerp2(-40, gx - 44, outP(span(t, arr, arr + 0.9))));
      let ry = ty, rX = redX;
      if (t >= held) { const d = outP(span(t, held + 0.15, held + 0.55)); rX = lerp2(gx - 44, 130, d); ry = lerp2(ty, ty + 92, d); }
      const jit = t >= held && t < held + 0.4 ? (h1(Math.floor(t * 40), 5) - 0.5) * 8 : 0;
      cube(c, rX + jit, ry, 22, P.red, { glow: t >= scn ? 26 : 10 });
      const limeX = t < pass ? Math.min(gx - 110, lerp2(-120, gx - 110, outP(span(t, arr + 0.25, arr + 1.2)))) : lerp2(gx - 110, FXW - 90, outP(span(t, pass, pass + 0.7)));
      cube(c, limeX, ty, 22, P.lime, { glow: 10 });
      if (t >= scn && t < held + 0.2) { const u = (t - scn) * 3 % 1; strokeLine(c, [[gx - 70, ty - 40 + u * 80], [gx - 18, ty - 40 + u * 80]], alpha(P.lime, 0.9), 3); }
      if (t >= held) {
        fillRR(c, 70, ty + 70, 130, 54, 12, alpha(P.red, 0.15)); rrect(c, 70, ty + 70, 130, 54, 12); c.strokeStyle = alpha(P.red, 0.7); c.lineWidth = 2; c.stroke();
        txt(c, 'HELD', 135, ty + 140, mono(13, 700), P.red, 2, 'center');
        stomp(c, 'BLOCKED BY POLICY', CX, ty - 120, 40, t, held, P.red, { glow: 14 });
      }
      if (t >= pass) { pill(c, '✓ allowed', Math.min(FXW - 90, limeX), ty - 48, mono(15, 700), P.ink, P.lime, sp(t, pass + 0.35, 0.3, 0.5)); }
      if (t >= pass + 0.5) txt(c, 'blocked by mistake? request an override', CX, ty + 164, mono(13, 600), P.dim, 0, 'center');
    }
    void c0;
  }

  // =================================================================================== 4. LIMITS (26.557 - 32.459)
  // "BUT…" after the 0.20 s stop, then a panel lands as each limit is said: not automatic (configure endpoints), Enterprise
  // Cloud public preview, npm only.
  private limits(c: CanvasRenderingContext2D, t: number) {
    const st = this.ev('lim.stop');
    stomp(c, 'BUT…', CX, 186, 76, t, st, P.amber, { glow: 12 });   // on the stop itself: the silence lands on the word
    const panels: [string, string, string][] = [['lim.p1', 'NOT AUTOMATIC', 'Configure endpoints'], ['lim.p2', 'AVAILABILITY', 'Enterprise Cloud preview'], ['lim.p3', 'ECOSYSTEMS', 'npm only (today)']];
    panels.forEach(([ev, kick, title], i) => {
      const t0 = this.ev(ev); if (t < t0) return;
      const k = sp(t, t0, 0.36, 0.72), dir = i % 2 ? 1 : -1, y = 222 + i * 158, x = 30 + dir * (1 - k) * 620;
      c.save(); c.translate(x, y);
      fillRR(c, 0, 0, 548, 142, 20, P.ink2); rrect(c, 0, 0, 548, 142, 20); c.strokeStyle = alpha(P.amber, 0.55); c.lineWidth = 2; c.stroke();
      txt(c, kick, 24, 36, mono(13, 700), P.amber, 2); txt(c, title, 24, 76, ax(31, 100, 900), P.bone);
      if (i === 0) {   // a CI box with a cable that must be routed through the firewall (illustrative)
        txt(c, 'registry = …/npm/enterprises/<you>', 24, 112, mono(13, 600), P.lime);
        fillRR(c, 400, 36, 120, 40, 10, P.ink3); txt(c, 'CI', 460, 63, ax(20, 100, 900), P.bone, 0, 'center');
        const pl = outP(span(t, t0 + 0.3, t0 + 0.8)); strokeLine(c, [[460, 76], [460, 76 + 30 * pl]], P.purple, 6);
        txt(c, 'illustration', 520, 132, mono(10, 500), P.dim, 0, 'right');
      }
      if (i === 1) { pill(c, 'PUBLIC PREVIEW', 120, 112, mono(14, 700), P.ink, P.lime, sp(t, t0 + 0.2, 0.3, 0.55)); txt(c, 'free during preview', 220, 117, mono(13, 600), P.dim); }
      if (i === 2) {
        cube(c, 440, 64, 26, P.red, { label: 'npm', glow: 20 });
        for (let j = 0; j < 3; j++) cube(c, 260 + j * 46, 98, 14, '#3A4256', { alpha: 0.7 });
        txt(c, 'others: not in preview', 236, 132, mono(11, 600), P.dim);
      }
      c.restore();
    });
  }

  // =================================================================================== 5. CTA (32.459 - 38.361)
  // The question stomps in line by line, the CI toggle flips on "enable", COMMENT FIREWALL lands on "Comment", the brand
  // closes on the last downbeat.
  private cta(c: CanvasRenderingContext2D, t: number) {
    const q = this.ev('cta.q'), tg = this.ev('cta.toggle'), cm = this.ev('cta.comment'), br = this.ev('cta.brand'), B = 0.2459;
    stomp(c, 'WOULD YOU', CX, 226, 70, t, q, P.bone);
    stomp(c, 'ENABLE THIS', CX, 306, 70, t, q + B, P.bone);
    stomp(c, 'IN CI?', CX, 386, 78, t, q + 2 * B, P.lime, { glow: 16 });
    // the toggle
    if (t >= tg - 0.6) {
      const a = sat((t - (tg - 0.6)) / 0.2), on = sp(t, tg, 0.3, 0.55);
      c.save(); c.globalAlpha = a;
      txt(c, 'package firewall · CI', CX, 448, mono(15, 700), P.dim, 1, 'center');
      const w = 200, h = 84, x0 = CX - w / 2, y0 = 466;
      if (on > 0.5) { c.shadowColor = P.lime; c.shadowBlur = 30; }
      fillRR(c, x0, y0, w, h, h / 2, on > 0.5 ? P.lime : P.ink3); c.shadowBlur = 0;
      disc(c, lerp2(x0 + h / 2, x0 + w - h / 2, sat(on)), y0 + h / 2, h / 2 - 9, on > 0.5 ? P.ink : P.bone);
      txt(c, on > 0.5 ? 'ON' : 'OFF', on > 0.5 ? x0 + 48 : x0 + w - 52, y0 + h / 2 + 8, ax(22, 100, 900), on > 0.5 ? P.ink : P.dim, 0, 'center');
      c.restore();
    }
    // COMMENT FIREWALL, pulsing on the kicks
    if (t >= cm) {
      const k = sp(t, cm, 0.32, 0.5), pk = this.kick(t, 0.12);
      c.save(); c.translate(CX, 640); c.scale(lerp2(0.6, 1, sat(k)) * (1 + 0.04 * pk), lerp2(0.6, 1, sat(k)) * (1 + 0.04 * pk)); c.globalAlpha = sat(k * 2);
      c.font = ax(30, 100, 900); (c as any).letterSpacing = '0px'; const w1 = c.measureText('COMMENT').width;
      c.font = ax(34, 100, 900); const w2 = c.measureText('FIREWALL').width;
      const gap = 14, icon = 40, tw = icon + gap + w1 + gap + w2, pw = tw + 64, x0 = -tw / 2;
      c.shadowColor = P.lime; c.shadowBlur = 26; fillRR(c, -pw / 2, -44, pw, 88, 44, P.lime); c.shadowBlur = 0;
      // a comment bubble
      fillRR(c, x0, -18, icon, 30, 8, P.ink); path(c, [[x0 + 8, 12], [x0 + 16, 12], [x0 + 4, 22]]); c.fillStyle = P.ink; c.fill();
      txt(c, 'COMMENT', x0 + icon + gap, 12, ax(30, 100, 900), P.ink); txt(c, 'FIREWALL', x0 + icon + gap + w1 + gap, 13, ax(34, 100, 900), P.purple);
      c.restore();
    }
    // the brand
    if (t >= br && this.logo) {
      const k = sp(t, br, 0.35, 0.55), s = 104 * lerp2(0.6, 1, sat(k)), ly = 766;
      c.save(); c.globalAlpha = sat(k * 2); c.shadowColor = P.purple; c.shadowBlur = 30;
      rrect(c, CX - s / 2, ly - s / 2, s, s, 20); c.clip(); c.drawImage(this.logo, CX - s / 2, ly - s / 2, s, s); c.restore();
    }
  }

  // =================================================================================== captions + chrome
  private captions(c: CanvasRenderingContext2D, t: number) {
    const line = this.lines.find((l) => t >= l.start - 0.05 && t <= l.end + 0.35); if (!line) return;
    const chunks: Word[][] = []; let cur: Word[] = [], len = 0;
    for (const w of line.words) { if (cur.length && len + w.w.length > 22) { chunks.push(cur); cur = []; len = 0; } cur.push(w); len += w.w.length + 1; }
    if (cur.length) chunks.push(cur);
    let ci = chunks.findIndex((ch) => t < ch[ch.length - 1]!.end + 0.05); if (ci < 0) ci = chunks.length - 1;
    const words = chunks[ci]!, y = 872;
    c.save(); c.font = ax(36, 100, 900); (c as any).letterSpacing = '0px'; c.textBaseline = 'middle';
    const sp_ = c.measureText(' ').width * 1.5, widths = words.map((w) => c.measureText(w.w).width + sp_), total = widths.reduce((a, b) => a + b, 0) - sp_;
    const fit = Math.min(1, (FXW - 48) / total); let x = CX - (total * fit) / 2;
    words.forEach((w, j) => {
      const on = t >= w.start - 0.03, k = sp(t, w.start - 0.03, 0.22, 0.5), ww = (widths[j]! - sp_) * fit;
      const s = (on ? lerp2(1.12, 1, sat(k)) : 1) * fit;
      c.save(); c.translate(x + ww / 2, y); c.scale(s, s); c.textAlign = 'center';
      c.lineWidth = 9; c.strokeStyle = alpha(P.ink, 0.92); c.lineJoin = 'round'; c.globalAlpha = on ? 1 : 0.0;
      c.strokeText(w.w, 0, 0); c.fillStyle = EMPH.has(w.w) ? P.lime : P.bone; c.fillText(w.w, 0, 0); c.restore();
      x += widths[j]! * fit;
    });
    c.restore();
  }
  private chrome(c: CanvasRenderingContext2D, t: number) {
    txt(c, SOURCE, CX, 950, mono(13, 600), alpha(P.bone, 0.62), 0, 'center');
    void SAFE_BOT; void t;
  }

  /** The frame at reel time t, in the 608 x 1080 column. */
  private draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = P.ink; c.fillRect(0, 0, FXW, FXH);
    // a faint grid and a purple glow: the ground of every chapter
    c.save(); c.strokeStyle = alpha('#FFFFFF', 0.035); c.lineWidth = 1;
    for (let x = 0; x <= FXW; x += 38) { c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, FXH); c.stroke(); }
    for (let y = 0; y <= FXH; y += 38) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(FXW, y + 0.5); c.stroke(); }
    const g = c.createRadialGradient(CX, 460, 20, CX, 460, 520); g.addColorStop(0, alpha(P.purple, 0.16)); g.addColorStop(1, alpha(P.purple, 0));
    c.fillStyle = g; c.fillRect(0, 0, FXW, FXH); c.restore();
    const [a, b, name] = this.chapter(t);
    // the camera: a slow push-in per chapter (a quicker dolly in the hook)
    const push = name === 'hook' ? 0.06 * inOutP(span(t, 0, this.ev('hook.slam'))) : 0.03 * span(t, a, b);
    c.save(); c.translate(CX, 520); c.scale(1 + push, 1 + push); c.translate(-CX, -520);
    if (name === 'hook') {
      const rw = this.ev('hook.rewind'), tt = t < rw ? t : Math.max(0.25, rw - (t - rw) * 4.49);   // the rewind plays it backward
      this.hook(c, tt, t);
    } else if (name === 'terminal') this.terminal(c, t);
    else if (name === 'firewall') this.firewall(c, t);
    else if (name === 'policy') this.policy(c, t);
    else if (name === 'limits') this.limits(c, t);
    else this.cta(c, t);
    c.restore();
    if (name === 'hook' && t >= this.ev('hook.rewind')) this.rewindOverlay(c, t);
    this.captions(c, t);
    this.chrome(c, t);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t, c = this.layer.ctx;
    this.layer.clear(P.ink);
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    this.draw(c, t);
    c.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    const slam = this.ev('hook.slam'), sh = this.ev('fw.shield'), held = this.ev('pol.held');
    const hit = hitP(t, slam, 0.12), hit2 = hitP(t, sh, 0.12), hit3 = hitP(t, held, 0.1);
    const shakeA = 14 * hit + 6 * hit2 + 5 * hit3;
    // the flash is added in linear light: even 0.03 lifts the ink ground to grey, so only the slam gets a touch; cuts stay crisp
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0.38, bloomThreshold: 0.72, bloomKnee: 0.4, bloomRadius: 0.55, halation: 0, grain: 0.02,
      ca: 0.3 + 3 * hit + 1.5 * hit2, vignette: 0.18, flash: 0.012 * hit, zoom: 1 + 0.05 * hit + 0.025 * hit2,
      shake: [Math.sin(t * 97) * shakeA, Math.cos(t * 83) * shakeA] };
  }
  override dispose() { this.layer.texture.dispose(); }
}
void [inOutP, SAFE_BOT];
