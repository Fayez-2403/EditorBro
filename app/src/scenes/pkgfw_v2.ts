// v2 (light Fluent look, 55.082 s), kept for comparison; variant pkgfw_v2 serves data/pkgfw_v2 + audio/pkgfw_v2.
// GitHub package firewall reel v2 (user, 2026-10-21): light mode on Microsoft Fluent 2 (surfaces, ambient + key shadows,
// 4/8/12 px radii, Fluent easing curves, fade-through scene changes), GitHub look-alike UI (Primer light colours, GitHub's
// own Mona Sans and Monaspace fonts), the official GitHub mark and npm logo, and real screenshots of GitHub's changelog
// and docs (labelled). No neon, no glow, no shake. v1 (the dark neon cut) is pkgfw_v1.ts.
// Every frame is a pure function of t: chapters and events come from the voice's own word times (analysis/pkgfw_cues.py).
// Claims: projects/github-package-firewall/FACTS.md.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { COL, FXW, FXH, sat, span, lerp2, rrect } from './_vo';

// ---------------------------------------------------------------- design tokens
/** Fluent 2 light theme (@fluentui/tokens webLightTheme) */
const FL = {
  bg1: '#FFFFFF', bg2: '#FAFAFA', bg3: '#F5F5F5', bg4: '#F0F0F0', mica: '#F3F3F3', stroke1: '#D1D1D1', stroke2: '#E0E0E0',
  fg1: '#242424', fg2: '#424242', fg3: '#616161', fg4: '#707070', brand: '#0F6CBD', brandBg2: '#EBF3FC',
  warnBg: '#FFF9F5', warnFg: '#BC4B09', warnStroke: '#FDCFB4',
};
/** GitHub Primer light (for the GitHub look-alike UI) */
const GH = {
  canvas: '#FFFFFF', subtle: '#F6F8FA', border: '#D1D9E0', fg: '#1F2328', muted: '#59636E', accent: '#0969DA',
  success: '#1A7F37', successBg: '#DAFBE1', danger: '#D1242F', dangerBg: '#FFEBE9', attention: '#9A6700', attentionBg: '#FFF8C5',
  done: '#8250DF',
};
const NPM_RED = '#CB3837';
const CX = FXW / 2;
const SOURCE = 'Source: GitHub Changelog • Oct 20, 2026';
const UI = (w: number, s: number) => `${w} ${s}px "Mona Sans", "Segoe UI", sans-serif`;
const MONO = (w: number, s: number) => `${w} ${s}px "Monaspace Neon", Consolas, monospace`;
// the official marks, from their published SVGs (24 x 24 viewBox): Primer Octicons mark-github, Simple Icons npm
const GITHUB_MARK = new Path2D('M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z');
const NPM_LOGO = new Path2D('M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z');
const EMPH = new Set(['npm', 'install,', 'packages.', 'kharab', 'attacks', 'install', 'credentials', 'GitHub', 'package', 'firewall,', 'preview',
  'runners', 'agents,', 'registry', 'request', 'download', 'ek', 'din', 'malware', 'block;', 'attestation', 'block.', 'override',
  'link', 'on', 'setup', 'sirf', 'Cloud.', 'CI', 'FIREWALL!']);

interface Cues { duration: number; chapters: [number, number, string][]; events: Record<string, number> }
interface Word { w: string; start: number; end: number }
interface Line { i: number; text: string; start: number; end: number; words: Word[] }

// ---------------------------------------------------------------- motion (Fluent curves)
/** cubic-bezier(x1, y1, x2, y2) evaluated at progress x (Newton on the x curve). */
function bez(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (x: number) => {
    x = sat(x); let u = x;
    for (let i = 0; i < 8; i++) { const fx = ((ax * u + bx) * u + cx) * u - x, d = (3 * ax * u + 2 * bx) * u + cx; if (Math.abs(d) < 1e-6) break; u -= fx / d; }
    u = sat(u); return ((ay * u + by) * u + cy) * u;
  };
}
const decel = bez(0.1, 0.9, 0.2, 1);       // curveDecelerateMax: entrances
const decelMid = bez(0, 0, 0, 1);          // curveDecelerateMid: the top-level fade
const easy = bez(0.33, 0, 0.67, 1);        // curveEasyEase: moves, toggles
const easyMax = bez(0.8, 0, 0.2, 1);       // curveEasyEaseMax: container transforms, scrolls
/** Enter: 0 -> 1 over d s from t0 (Fluent durations: 0.2 normal, 0.3 slow, 0.4 slower, 0.5 ultra-slow). */
const enter = (t: number, t0: number, d = 0.3) => decel(span(t, t0, t0 + d));

// ---------------------------------------------------------------- drawing helpers
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, f: string, col: string, align: CanvasTextAlign = 'left') {
  c.font = f; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic'; (c as any).letterSpacing = '0px'; c.fillText(s, x, y);
}
function fill(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, col: string | CanvasGradient) { rrect(c, x, y, w, h, r); c.fillStyle = col; c.fill(); }
function stroke(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, col: string, lw = 1) { rrect(c, x, y, w, h, r); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
/** A Fluent surface with its elevation: an ambient shadow plus a key (directional) shadow, then the fill and a hairline. */
function surface(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, lvl: 4 | 8 | 16 | 28 | 64, col = FL.bg1, line: string | null = FL.stroke2) {
  const S = { 4: [2, 2, 4], 8: [2, 4, 8], 16: [2, 8, 16], 28: [8, 14, 28], 64: [8, 32, 64] }[lvl]!;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.12)'; c.shadowBlur = S[0]!; c.shadowOffsetY = 0; fill(c, x, y, w, h, r, col);
  c.shadowColor = 'rgba(0,0,0,0.14)'; c.shadowBlur = S[2]!; c.shadowOffsetY = S[1]!; fill(c, x, y, w, h, r, col);
  c.restore();
  if (line) stroke(c, x + 0.5, y + 0.5, w - 1, h - 1, r, line);
}
function mark(c: CanvasRenderingContext2D, p: Path2D, x: number, y: number, s: number, col: string) {
  c.save(); c.translate(x, y); c.scale(s / 24, s / 24); c.fillStyle = col; c.fill(p); c.restore();
}
/** A Fluent toggle switch (40 x 20 at scale 1), on = 0..1. */
function toggle(c: CanvasRenderingContext2D, x: number, y: number, on: number, s = 1) {
  const w = 40 * s, h = 20 * s, k = sat(on);
  if (k > 0.5) fill(c, x, y, w, h, h / 2, FL.brand); else { fill(c, x, y, w, h, h / 2, FL.bg1); stroke(c, x, y, w, h, h / 2, FL.fg3, 1); }
  c.beginPath(); c.arc(lerp2(x + h / 2, x + w - h / 2, k), y + h / 2, (k > 0.5 ? 7 : 6.5) * s, 0, Math.PI * 2); c.fillStyle = k > 0.5 ? FL.bg1 : FL.fg3; c.fill();
}
/** A Fluent label chip. */
function chip(c: CanvasRenderingContext2D, s: string, x: number, y: number, fg: string, bg: string, align: 'left' | 'center' | 'right' = 'left', size = 12) {
  c.font = UI(600, size); const w = c.measureText(s).width + 20, h = size + 12;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  fill(c, x0, y - h / 2, w, h, 4, bg); text(c, s, x0 + 10, y + size * 0.36, UI(600, size), fg); return w;
}
/** A window in Windows 11 / Fluent style: a Mica title bar with its caption buttons, a white body. Returns the body box. */
function windowFrame(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, icon?: (c: CanvasRenderingContext2D, x: number, y: number) => void) {
  surface(c, x, y, w, h, 8, 28, FL.bg1, FL.stroke1);
  c.save(); rrect(c, x, y, w, h, 8); c.clip();
  c.fillStyle = FL.mica; c.fillRect(x, y, w, 34); c.fillStyle = FL.stroke2; c.fillRect(x, y + 34, w, 1);
  let tx = x + 14; if (icon) { icon(c, x + 12, y + 9); tx = x + 38; }
  text(c, title, tx, y + 22, UI(500, 12), FL.fg2);
  const bx = x + w - 3 * 40;   // minimize, maximize, close
  c.strokeStyle = FL.fg2; c.lineWidth = 1;
  c.beginPath(); c.moveTo(bx + 15, y + 17.5); c.lineTo(bx + 25, y + 17.5); c.stroke();
  c.strokeRect(bx + 55.5, y + 12.5, 9, 9);
  c.beginPath(); c.moveTo(bx + 95, y + 12); c.lineTo(bx + 105, y + 22); c.moveTo(bx + 105, y + 12); c.lineTo(bx + 95, y + 22); c.stroke();
  c.restore();
  return { x, y: y + 35, w, h: h - 35 };
}
/** A browser window (Edge-like Fluent chrome): a tab, the address bar, the page. Returns the page box. */
function browser(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tab: string, url: string) {
  surface(c, x, y, w, h, 8, 28, FL.bg1, FL.stroke1);
  c.save(); rrect(c, x, y, w, h, 8); c.clip();
  c.fillStyle = FL.mica; c.fillRect(x, y, w, 70);
  fill(c, x + 8, y + 6, 240, 28, 6, FL.bg1); mark(c, GITHUB_MARK, x + 16, y + 12, 16, GH.fg);
  c.save(); c.beginPath(); c.rect(x + 38, y + 6, 200, 28); c.clip(); text(c, tab, x + 40, y + 25, UI(500, 12), FL.fg1); c.restore();
  fill(c, x + 8, y + 40, w - 16, 24, 12, FL.bg1); stroke(c, x + 8.5, y + 40.5, w - 17, 23, 12, FL.stroke2);
  c.strokeStyle = FL.fg3; c.lineWidth = 1.4; c.strokeRect(x + 21, y + 51, 7, 6); c.beginPath(); c.arc(x + 24.5, y + 51, 2.6, Math.PI, 0); c.stroke();
  c.save(); c.beginPath(); c.rect(x + 34, y + 40, w - 50, 24); c.clip(); text(c, url, x + 36, y + 56, UI(400, 12), FL.fg2); c.restore();
  c.fillStyle = FL.stroke2; c.fillRect(x, y + 70, w, 1);
  c.restore();
  return { x, y: y + 71, w, h: h - 71 };
}
/** Word-wrap s into lines no wider than maxW in font f. */
function wrap(c: CanvasRenderingContext2D, s: string, maxW: number, f: string) {
  c.font = f; const out: string[] = []; let cur = '';
  for (const word of s.split(' ')) { const t = cur ? cur + ' ' + word : word; if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = word; } else cur = t; }
  if (cur) out.push(cur); return out;
}

export default class Pkgfw extends Scene {
  private layer = new Layer2D();
  private cues!: Cues;
  private lines: Line[] = [];
  private img: Record<string, HTMLImageElement> = {};
  private logo: HTMLImageElement | null = null;

  override async init() {
    this.cues = await (await fetch('/data/pkgfw_v2/cues.json')).json();
    try { this.lines = (await (await fetch('/data/lyrics.json')).json()).lines; } catch { /* captions optional */ }
    const fonts: [string, string, string][] = [
      ...['400', '500', '600', '700', '800'].map((w): [string, string, string] => ['Mona Sans', w, `pkgfw/fonts/mona-sans-${w}.woff2`]),
      ...['400', '600', '700'].map((w): [string, string, string] => ['Monaspace Neon', w, `pkgfw/fonts/monaspace-neon-${w}.woff2`]),
    ];
    for (const [fam, w, url] of fonts) { const f = new FontFace(fam, `url(${url})`, { weight: w }); await f.load(); document.fonts.add(f); }
    for (const k of ['cl_title', 'cl_intro', 'cl_avail', 'dc_title', 'dc_policies', 'dc_notice']) {
      const im = new Image(); im.src = `pkgfw/screens/${k}.png`; await im.decode(); this.img[k] = im;
    }
    try { const im = new Image(); im.src = 'brand/techpe-trek.jpg'; await im.decode(); this.logo = im; } catch { this.logo = null; }
  }
  private ev(n: string) { const v = this.cues.events[n]; if (typeof v !== 'number') throw new Error(`pkgfw cue missing: ${n}`); return v; }

  /** The chapter headline (Fluent Title 1, semibold-bold) with an optional label chip under it. */
  private head(c: CanvasRenderingContext2D, t: number, t0: number, s: string, label?: string, col = FL.fg1) {
    const k = enter(t, t0, 0.4);
    c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 12);
    text(c, s, 32, 172, UI(700, 38), col);
    if (label) chip(c, label, 32, 204, FL.fg3, FL.bg4, 'left', 12);
    c.restore();
  }

  // =================================================================================== 0. HOOK
  // A light terminal: "npm install" types (frame 0 already shows the prompt and npm's logo), packages pour out, one turns red.
  private hook(c: CanvasRenderingContext2D, t: number) {
    const enterT = this.ev('hook.enter'), flood = this.ev('hook.flood'), bad = this.ev('hook.bad'), zoomT = this.ev('hook.zoom');
    // headline: One command. -> + Many packages. -> One bad package?
    const hA = 1 - span(t, bad, bad + 0.2), hB = enter(t, flood, 0.3) * hA, hC = enter(t, bad, 0.3);
    c.save();
    if (hA > 0) { c.globalAlpha = hA; text(c, 'One command.', 32, 172, UI(700, 44), FL.fg1); }
    if (hB > 0) { c.globalAlpha = hB; text(c, 'Many packages.', 32, 224, UI(700, 44), FL.fg3); }
    if (hC > 0) { c.globalAlpha = hC; text(c, 'One bad package?', 32, 172, UI(700, 44), GH.danger); }
    c.restore();
    // the terminal
    // a container transform: large and centred until Enter, then up to the top as the packages pour out
    const up = easyMax(span(t, enterT + 0.1, enterT + 0.7)), z = lerp2(1.04, 1, up) * (1 + 0.03 * easyMax(span(t, zoomT, zoomT + 0.6)));   // (never wider than the frame)
    c.save(); c.translate(CX, lerp2(500, 391, up)); c.scale(z, z); c.translate(-CX, -391);
    const B = windowFrame(c, 24, 252, FXW - 48, 278, 'Terminal — my-app', (c, x, y) => mark(c, NPM_LOGO, x, y, 16, NPM_RED));
    c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip();
    const typed = 'install'.slice(0, Math.max(0, Math.min(7, Math.floor((t - 0.05) / 0.075) + 1)));
    const ly = B.y + 44;
    text(c, '~/my-app $', B.x + 18, ly, MONO(600, 24), GH.success); text(c, `npm ${typed}`, B.x + 178, ly, MONO(600, 24), FL.fg1);
    if (t < enterT && Math.floor(t * 4) % 2 === 0) { c.font = MONO(600, 24); c.fillStyle = FL.fg1; c.fillRect(B.x + 182 + c.measureText(`npm ${typed}`).width, ly - 22, 12, 26); }
    if (t >= enterT) {
      const names = ['dateo-utils', 'colr-kit', 'left-ui', 'jsonish-fast', 'path-kit', 'globlet-tiny', 'ms-lite', 'date-fmt', 'uikit-lite', 'debugx-lite', 'chalkly', 'urlish-parse'];
      const n = Math.floor(sat((t - enterT) / 2.2) * 40);
      for (let i = Math.max(0, n - 6); i < n; i++) {
        const y = ly + 38 + (i - Math.max(0, n - 6)) * 30;
        text(c, `+ ${names[i % names.length]}@${1 + (i * 7) % 9}.${(i * 3) % 10}.${(i * 5) % 10}`, B.x + 18, y, MONO(400, 18), FL.fg2);
      }
    }
    c.restore();
    // the packages pour out below as chips; one turns red
    const pour = enterT + 0.45;   // the packages start pouring out right after Enter
    if (t >= pour) {
      const n = Math.min(15, Math.floor((t - pour) / 0.1) + 1);
      for (let i = 0; i < n; i++) {
        const k = enter(t, pour + i * 0.1, 0.3), r = Math.floor(i / 3), cc = i % 3;
        const x = 24 + cc * 188, y = 560 + r * 52 + (1 - k) * 18, isBad = i === 10, red = isBad && t >= bad;
        c.save(); c.globalAlpha *= k * (t >= bad && !isBad ? lerp2(1, 0.35, enter(t, bad, 0.3)) : 1);
        if (red) surface(c, x, y, 176, 44, 6, 8, GH.dangerBg, GH.danger); else surface(c, x, y, 176, 44, 6, 4, GH.canvas, GH.border);
        mark(c, NPM_LOGO, x + 10, y + 12, 20, red ? GH.danger : NPM_RED);
        text(c, red ? 'unknown-pkg' : ['uikit-lite', 'date-fmt', 'globlet-tiny', 'path-kit', 'jsonish-fast', 'urlish-parse'][i % 6]!, x + 38, y + 28, MONO(600, 15), red ? GH.danger : FL.fg1);
        if (red) text(c, '!', x + 160, y + 29, UI(800, 18), GH.danger);
        c.restore();
      }
    }
    c.restore();
    if (t >= pour) { c.save(); c.globalAlpha = enter(t, pour, 0.3); chip(c, 'ILLUSTRATION · package names are fictional', FXW - 24, 836, FL.fg3, FL.bg4, 'right', 12); c.restore(); }
  }

  // =================================================================================== 1. PROBLEM
  // A GitHub Actions run (look-alike): the npm ci step expands to a postinstall line; on "credentials" the CI secrets light up;
  // GitHub's own words close it: "without even running the package's code".
  private problem(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('prob.in'), step = this.ev('prob.step'), creds = this.ev('prob.creds'), nocode = this.ev('prob.nocode');
    this.head(c, t, t0, 'The risk: install time', 'ILLUSTRATION · GitHub Actions look-alike');
    const k = enter(t, t0, 0.4);
    c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 16);
    const x = 24, y = 232, w = FXW - 48, h = 340;
    surface(c, x, y, w, h, 6, 8, GH.canvas, GH.border);
    c.save(); rrect(c, x, y, w, h, 6); c.clip(); c.fillStyle = GH.subtle; c.fillRect(x, y, w, 46); c.restore(); c.fillStyle = GH.border; c.fillRect(x, y + 46, w, 1);
    mark(c, GITHUB_MARK, x + 16, y + 12, 22, GH.fg);
    text(c, 'build', x + 48, y + 30, UI(600, 18), GH.fg); text(c, 'CI · main', x + 104, y + 30, UI(400, 15), GH.muted);
    const steps: [string, boolean][] = [['Set up job', true], ['Checkout', true], ['Set up Node.js', true], ['Run npm ci', false]];
    steps.forEach(([s, done], i) => {
      const sy = y + 80 + i * 40;
      if (done) { c.beginPath(); c.arc(x + 26, sy - 5, 9, 0, Math.PI * 2); c.fillStyle = GH.success; c.fill();
        c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 21.5, sy - 5); c.lineTo(x + 25, sy - 1.5); c.lineTo(x + 31, sy - 8.5); c.stroke(); }
      else { c.strokeStyle = GH.attention; c.lineWidth = 2.5; c.beginPath(); c.arc(x + 26, sy - 5, 8, t * 6, t * 6 + Math.PI * 1.4); c.stroke(); }
      text(c, s, x + 46, sy, UI(i === 3 ? 600 : 400, 17), GH.fg);
    });
    const lg = enter(t, step, 0.4);   // the step's log, once "install" is said
    if (lg > 0) {
      const ly0 = y + 228; c.save(); c.globalAlpha *= lg;
      fill(c, x + 16, ly0, w - 32, 96, 6, GH.subtle);
      const log: [string, string][] = [['> npm ci', GH.fg], ['installing dependencies…', GH.muted], ['> some-pkg@2.4.1 postinstall', GH.attention], ['> node scripts/setup.js', GH.attention]];
      if (t >= step + 0.6) { c.fillStyle = 'rgba(154,103,0,0.10)'; c.fillRect(x + 20, ly0 + 52, w - 40, 44); }
      log.forEach(([s, col], i) => text(c, s, x + 28, ly0 + 24 + i * 22, MONO(i >= 2 ? 600 : 400, 15), col));
      c.restore();
    }
    c.restore();
    const ck = enter(t, creds, 0.4);   // the secrets exposed on the runner (and on a developer's laptop)
    if (ck > 0) {
      c.save(); c.globalAlpha *= ck; c.translate(0, (1 - ck) * 14);
      const sy = 596;
      surface(c, 24, sy, FXW - 48, 112, 8, 16, FL.bg1, GH.danger);
      text(c, 'Secrets on CI hosts and developer machines', 42, sy + 30, UI(600, 17), GH.danger);
      ['NPM_TOKEN', 'CLOUD_KEY', 'GITHUB_TOKEN'].forEach((s, i) => {
        const kx = 42 + i * 178, kk = enter(t, creds + 0.1 + i * 0.12, 0.3);
        c.save(); c.globalAlpha *= kk; fill(c, kx, sy + 50, 164, 40, 6, GH.dangerBg); stroke(c, kx + 0.5, sy + 50.5, 163, 39, 6, '#FFCECB');
        c.strokeStyle = GH.danger; c.lineWidth = 2.2; c.beginPath(); c.arc(kx + 18, sy + 70, 6, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(kx + 24, sy + 70); c.lineTo(kx + 38, sy + 70); c.moveTo(kx + 34, sy + 70); c.lineTo(kx + 34, sy + 75); c.stroke();
        text(c, s, kx + 44, sy + 75, MONO(600, 13.5), GH.danger); c.restore();
      });
      c.restore();
    }
    const nk = enter(t, nocode, 0.4);   // GitHub's own words
    if (nk > 0) {
      c.save(); c.globalAlpha *= nk;
      fill(c, 24, 726, FXW - 48, 66, 8, FL.brandBg2); c.fillStyle = FL.brand; c.fillRect(24, 726, 4, 66);
      text(c, '“…without even running the package’s code.”', 42, 754, UI(600, 18), FL.fg1);
      text(c, 'GitHub Changelog, Oct 20, 2026', 42, 779, UI(400, 13), FL.fg3);
      c.restore();
    }
  }

  // =================================================================================== 2. NEWS
  // The real changelog post (github.blog renders it dark) in a light Edge-like browser; the title and "public preview" light up.
  private news(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('news.in'), ti = this.ev('news.title'), pv = this.ev('news.preview');
    const k = enter(t, t0, 0.45);
    c.save(); c.globalAlpha *= k; c.translate(CX, 460); c.scale(lerp2(0.96, 1, k), lerp2(0.96, 1, k)); c.translate(-CX, -460);
    const B = browser(c, 24, 228, FXW - 48, 560, 'GitHub package firewall in public pr…', 'github.blog/changelog/2026-10-20-github-package-firewall-in-public-preview/');
    const im = this.img.cl_title!, s = B.w / im.width, im2 = this.img.cl_intro!;
    const scroll = easyMax(span(t, pv + 0.4, pv + 1.0)) * 210;
    c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip();
    c.drawImage(im, B.x, B.y - scroll, B.w, im.height * s);
    c.drawImage(im2, B.x, B.y + im.height * s - scroll, B.w, im2.height * s);
    // highlight the title (screenshot y 700-905 at 2.5x) on "package firewall"
    const hk = enter(t, ti, 0.3);
    if (hk > 0) { c.save(); c.globalAlpha *= hk; c.strokeStyle = FL.brand; c.lineWidth = 3; rrect(c, B.x + 8, B.y + 690 * s - scroll, B.w - 16, 230 * s, 6); c.stroke(); c.restore(); }
    c.restore();
    c.restore();
    this.head(c, t, t0, 'GitHub’s answer');
    const pk = enter(t, pv, 0.3);
    if (pk > 0) { c.save(); c.globalAlpha *= pk; const w1 = chip(c, 'PUBLIC PREVIEW', 32, 816, '#FFFFFF', FL.brand, 'left', 14); chip(c, 'GitHub Enterprise Cloud', 32 + w1 + 8, 816, FL.fg1, FL.bg4, 'left', 14); c.restore(); }
    c.save(); c.globalAlpha *= k; chip(c, 'REAL SCREENSHOT · github.blog', 32, 202, FL.fg3, FL.bg4, 'left', 11); c.restore();
  }

  // =================================================================================== 3. HOW
  // Where it sits: runners and coding agents above, the npm registry below, the package firewall between; requests go
  // down and downloads come up through it; a check on "check".
  private how(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('how.in'), rn = this.ev('how.runner'), ag = this.ev('how.agent'), rg = this.ev('how.registry'), chk = this.ev('how.check');
    this.head(c, t, t0, 'Where it sits', 'ILLUSTRATION');
    const card = (x: number, y: number, w: number, h: number, t1: number, title: string, sub: string, icon: (x: number, y: number) => void, lvl: 8 | 16 = 8, line: string = FL.stroke2) => {
      const k = enter(t, t1, 0.35); if (k <= 0) return;
      c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 14);
      surface(c, x, y, w, h, 8, lvl, FL.bg1, line); icon(x + 16, y + (h - 32) / 2);
      text(c, title, x + 60, y + h / 2 - 2, UI(600, 19), FL.fg1); text(c, sub, x + 60, y + h / 2 + 20, UI(400, 14), FL.fg3);
      c.restore();
    };
    const fwY = 448, regY = 676;
    const lk = enter(t, ag + 0.3, 0.5);   // the connectors first (under the cards)
    c.save(); c.globalAlpha *= lk; c.strokeStyle = FL.stroke1; c.lineWidth = 2;
    for (const x0 of [164, 450]) { c.beginPath(); c.moveTo(x0, 336); c.lineTo(x0, 384); c.lineTo(CX, 384); c.lineTo(CX, fwY); c.stroke(); }
    c.globalAlpha = lk * enter(t, rg, 0.4); c.beginPath(); c.moveTo(CX, fwY + 104); c.lineTo(CX, regY); c.stroke();
    c.restore();
    if (t > rg + 0.4) {   // requests go down, downloads come up, both through the firewall
      for (let i = 0; i < 6; i++) {
        const u = ((t - rg) * 0.5 + i / 6) % 1, down = i % 2 === 0;
        const yy = down ? lerp2(392, regY - 16, u) : lerp2(regY - 16, 392, u);
        c.save(); c.globalAlpha *= Math.sin(Math.PI * u) * 0.95;
        const cxp = CX + (down ? -62 : 62);
        fill(c, cxp - 52, yy - 13, 104, 26, 13, down ? FL.brandBg2 : GH.successBg);
        text(c, down ? 'request' : 'download', cxp, yy + 5, UI(600, 14), down ? FL.brand : GH.success, 'center');
        c.restore();
      }
    }
    card(24, 236, 280, 100, rn, 'Actions runner', 'CI/CD host', (x, y) => mark(c, GITHUB_MARK, x, y, 32, GH.fg));
    card(316, 236, 268, 100, ag, 'Coding agent', 'AI agent session', (x, y) => {
      fill(c, x, y, 32, 32, 7, GH.done); c.fillStyle = '#FFFFFF'; c.fillRect(x + 9, y + 11, 5, 7); c.fillRect(x + 18, y + 11, 5, 7); c.fillRect(x + 9, y + 22, 14, 3);
    });
    card(40, fwY, FXW - 80, 104, ag + 0.3, 'GitHub package firewall', 'checks every request and download', (x, y) => mark(c, GITHUB_MARK, x, y, 32, GH.fg), 16, FL.brand);
    const ck = enter(t, chk, 0.3);
    if (ck > 0) {
      c.save(); c.globalAlpha *= ck; c.beginPath(); c.arc(FXW - 82, fwY + 52, 18 * lerp2(0.6, 1, ck), 0, Math.PI * 2); c.fillStyle = GH.success; c.fill();
      c.strokeStyle = '#FFFFFF'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(FXW - 91, fwY + 52); c.lineTo(FXW - 84, fwY + 59); c.lineTo(FXW - 72, fwY + 45); c.stroke(); c.restore();
    }
    card(104, regY, FXW - 208, 100, rg, 'npm registry', 'upstream packages', (x, y) => mark(c, NPM_LOGO, x, y, 32, NPM_RED));
  }

  // =================================================================================== 4. POLICY
  // First the real GitHub Docs page, then it becomes a GitHub-style settings page; each control lights up as it is said.
  private policy(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('pol.in'), age = this.ev('pol.age'), mw = this.ev('pol.malware'), at = this.ev('pol.attest');
    const swap = t0 + 2.3, sw = easyMax(span(t, swap, swap + 0.5));
    if (sw < 1) {   // the real docs page, fading through to the settings page
      const k = enter(t, t0, 0.45);
      c.save(); c.globalAlpha *= k * (1 - sw);
      this.head(c, t, t0, 'Policies admins set', 'REAL SCREENSHOT · GitHub Docs');
      const B = browser(c, 24, 228, FXW - 48, 580, 'Protecting endpoints with GitHub…', 'docs.github.com/…/protecting-endpoints-with-package-firewall');
      c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip();
      const a = this.img.dc_title!, b = this.img.dc_policies!, s = B.w / a.width;
      c.drawImage(a, B.x, B.y, B.w, a.height * s); c.drawImage(b, B.x, B.y + a.height * s, B.w, b.height * s);
      c.restore();
      c.restore();
    }
    if (sw <= 0) return;
    c.save(); c.globalAlpha *= sw;
    this.head(c, t, -1, 'Policies admins set', 'ILLUSTRATION · controls as listed in GitHub Docs');
    const x = 24, y = 228, w = FXW - 48;
    surface(c, x, y, w, 52, 6, 4, GH.subtle, GH.border); mark(c, GITHUB_MARK, x + 14, y + 14, 24, GH.fg);
    text(c, 'Enterprise  /  Policies  /  Package firewall', x + 50, y + 33, UI(500, 15), GH.muted);
    const rows: [string, string, string, number][] = [
      ['Minimum package age', 'Blocks versions newer than the minimum · default 1 day', 'age', age],
      ['Block known malware', 'Checks the GitHub Advisory Database', 'on', mw],
      ['Block vulnerability advisories', 'Minimum severity: Critical only', 'select', -1],
      ['Block attestation downgrades', 'Earlier versions had SLSA attestations, this one does not', 'on', at],
      ['Block newly-introduced install scripts', 'New preinstall / postinstall scripts', 'on', -1],
    ];
    const ry0 = y + 66, rh = 98;
    surface(c, x, ry0, w, rh * rows.length, 6, 4, GH.canvas, GH.border);
    rows.forEach(([title, sub, kind, t1], i) => {
      const ry = ry0 + i * rh, hot = t1 > 0 && t >= t1, hk = t1 > 0 ? enter(t, t1, 0.3) : 0;
      if (i) { c.fillStyle = GH.border; c.fillRect(x, ry, w, 1); }
      if (hk > 0) { c.save(); c.globalAlpha *= hk; c.fillStyle = GH.attentionBg; c.fillRect(x + 1, ry + 1, w - 2, rh - 1); c.fillStyle = GH.attention; c.fillRect(x + 1, ry + 1, 4, rh - 1); c.restore(); }
      text(c, title, x + 20, ry + 36, UI(600, 18), GH.fg);
      wrap(c, sub, w - 160, UI(400, 14)).slice(0, 2).forEach((l, j) => text(c, l, x + 20, ry + 60 + j * 18, UI(400, 14), hot ? GH.fg : GH.muted));
      const cx = x + w - 20;
      if (kind === 'on') toggle(c, cx - 56, ry + 36, 1, 1.4);
      if (kind === 'select') { fill(c, cx - 124, ry + 30, 124, 34, 6, GH.subtle); stroke(c, cx - 123.5, ry + 30.5, 123, 33, 6, GH.border); text(c, 'Critical only', cx - 112, ry + 53, UI(500, 14), GH.fg); }
      if (kind === 'age') { fill(c, cx - 124, ry + 30, 124, 34, 6, GH.canvas); stroke(c, cx - 123.5, ry + 30.5, 123, 33, 6, hot ? GH.accent : GH.border, hot ? 2 : 1); text(c, '1 day', cx - 110, ry + 53, UI(600, 16), GH.fg); }
    });
    c.restore();
  }

  // =================================================================================== 5. BLOCKED
  // The npm output from GitHub Docs' own example (a cooldown block with its override link), then the override request form.
  private blocked(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('blk.in'), nt = this.ev('blk.notice'), lk = this.ev('blk.link'), fm = this.ev('blk.form');
    this.head(c, t, t0, 'Blocked by mistake?', 'EXAMPLE OUTPUT FROM GITHUB DOCS');
    const B = windowFrame(c, 24, 228, FXW - 48, 330, 'Terminal — my-app', (c, x, y) => mark(c, NPM_LOGO, x, y, 16, NPM_RED));
    c.save(); c.beginPath(); c.rect(B.x, B.y, B.w, B.h); c.clip();
    const cmd = 'testcontainers'.slice(0, Math.max(0, Math.floor((t - t0 - 0.1) / 0.05)));
    text(c, '~/my-app $', B.x + 16, B.y + 36, MONO(600, 17), GH.success); text(c, `npm install ${cmd}`, B.x + 132, B.y + 36, MONO(600, 17), FL.fg1);
    if (t >= nt) {
      const k = enter(t, nt, 0.25); c.save(); c.globalAlpha *= k;
      const lines = wrap(c, 'npm notice testcontainers: 1 version blocked by package-firewall due to security policies (version cooldown). Request an override:', B.w - 36, MONO(400, 15));
      lines.forEach((l, i) => text(c, l, B.x + 16, B.y + 74 + i * 24, MONO(400, 15), GH.attention));
      const url = wrap(c, 'https://github.com/enterprises/octocats/security/bypass-requests/package-firewall/new?ecosystem=npm&package=testcontainers'.replace(/\//g, '/ ').replace(/\?/, ' ?').replace(/&/, ' &'), B.w - 36, MONO(400, 15)).map((l) => l.replace(/\/ /g, '/').replace(/ \?/, '?').replace(/ &/, '&'));
      const uy = B.y + 74 + lines.length * 24;
      if (t >= lk) { const hk = enter(t, lk, 0.25); c.save(); c.globalAlpha *= hk * 0.12; c.fillStyle = GH.accent; c.fillRect(B.x + 10, uy - 18, B.w - 20, url.length * 24 + 6); c.restore(); }
      url.forEach((l, i) => { text(c, l, B.x + 16, uy + i * 24, MONO(400, 15), GH.accent); if (t >= lk) { c.font = MONO(400, 15); c.fillStyle = GH.accent; c.fillRect(B.x + 16, uy + i * 24 + 3, c.measureText(l).width, 1.5); } });
      c.restore();
      chip(c, 'reason: version cooldown', B.x + 16, B.y + B.h - 22, GH.attention, GH.attentionBg, 'left', 14);
    }
    c.restore();
    const dk = enter(t, fm, 0.4);   // the override request (a Fluent dialog, shadow 64), fields as the docs list them
    if (dk > 0) {
      c.save(); c.globalAlpha *= dk; c.translate(CX, 690); c.scale(lerp2(0.94, 1, dk), lerp2(0.94, 1, dk)); c.translate(-CX, -690);
      const x = 40, y = 586, w = FXW - 80, h = 214;
      surface(c, x, y, w, h, 12, 64, FL.bg1, FL.stroke2);
      text(c, 'Request an override', x + 24, y + 38, UI(600, 22), FL.fg1);
      ([['Ecosystem', 'npm'], ['Package name', 'testcontainers'], ['Reason', 'Needed for our test suite']] as [string, string][]).forEach(([l, v], i) => {
        const fy = y + 60 + i * 40;
        text(c, l, x + 24, fy + 21, UI(500, 14), FL.fg2); fill(c, x + 150, fy + 2, w - 174, 28, 4, FL.bg1); stroke(c, x + 150.5, fy + 2.5, w - 175, 27, 4, FL.stroke1);
        c.fillStyle = FL.fg3; c.fillRect(x + 150.5, fy + 29, w - 175, 1.5); text(c, v, x + 160, fy + 22, UI(400, 14), FL.fg1);
      });
      fill(c, x + w - 150, y + h - 46, 126, 32, 4, FL.brand); text(c, 'Submit request', x + w - 87, y + h - 25, UI(600, 14), '#FFFFFF', 'center');
      c.restore();
    }
  }

  // =================================================================================== 6. LIMITS
  // Fluent message bars as each limit is said: not automatic (the .npmrc line from the docs), npm only, Enterprise Cloud;
  // then the real "Availability and limitations" paragraph as the receipt.
  private limits(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('lim.in'), su = this.ev('lim.setup'), np = this.ev('lim.npm'), cl = this.ev('lim.cloud');
    this.head(c, t, t0, 'Good to know');
    const bar = (y: number, h: number, t1: number, kind: 'warn' | 'info', title: string, body: (x: number, y: number) => void) => {
      const k = enter(t, t1, 0.35); if (k <= 0) return;
      c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 14);
      const bg = kind === 'warn' ? FL.warnBg : FL.bg1, ln = kind === 'warn' ? FL.warnStroke : FL.stroke2, fg = kind === 'warn' ? FL.warnFg : FL.brand;
      surface(c, 24, y, FXW - 48, h, 8, 8, bg, ln);
      c.beginPath(); c.arc(50, y + 30, 10, 0, Math.PI * 2); c.fillStyle = fg; c.fill(); text(c, kind === 'warn' ? '!' : 'i', 50, y + 35, UI(800, 14), '#FFFFFF', 'center');
      text(c, title, 72, y + 37, UI(600, 20), FL.fg1); body(72, y + 62);
      c.restore();
    };
    bar(222, 166, Math.min(t0 + 0.2, su), 'warn', 'Not automatic: route your endpoints', (x, y) => {
      text(c, 'Point npm at your enterprise’s firewall URL (.npmrc):', x, y + 4, UI(400, 14), FL.fg2);
      const k = enter(t, su, 0.3); c.save(); c.globalAlpha *= k;
      fill(c, x, y + 16, FXW - 120, 60, 4, FL.bg3);
      text(c, 'registry=https://package-firewall.', x + 10, y + 40, MONO(400, 14), FL.fg1);
      text(c, 'githubapp.com/npm/enterprises/ENTERPRISE', x + 10, y + 63, MONO(400, 14), FL.fg1); c.restore();
    });
    bar(404, 104, np, 'info', 'npm only, for now', (x, y) => {
      mark(c, NPM_LOGO, FXW - 82, y - 48, 34, NPM_RED); text(c, 'Other ecosystems aren’t supported yet.', x, y + 8, UI(400, 14), FL.fg2);
    });
    bar(524, 128, cl, 'info', 'Enterprise Cloud · public preview', (x, y) => {
      mark(c, GITHUB_MARK, FXW - 82, y - 48, 32, GH.fg);
      text(c, 'Includes data residency. Free in the preview;', x, y + 8, UI(400, 14), FL.fg2);
      text(c, 'metered usage at GA, like Actions billing.', x, y + 30, UI(400, 14), FL.fg2);
    });
    const rk = enter(t, cl + 0.6, 0.4);   // the receipt: the real "Availability and limitations" paragraph
    if (rk > 0) {
      const im = this.img.cl_avail!, w = 300, s = w / im.width;
      c.save(); c.globalAlpha *= rk;
      surface(c, 24, 670, w, 150, 6, 8, '#0D1117', null);
      c.save(); rrect(c, 24, 670, w, 150, 6); c.clip(); c.drawImage(im, 24, 666, w, im.height * s); c.restore();
      chip(c, 'REAL SCREENSHOT', 340, 694, FL.fg3, FL.bg4, 'left', 12); chip(c, 'github.blog', 340, 726, FL.fg3, FL.bg4, 'left', 12);
      c.restore();
    }
  }

  // =================================================================================== 7. CTA
  private cta(c: CanvasRenderingContext2D, t: number) {
    const t0 = this.ev('cta.in'), tg = this.ev('cta.toggle'), cm = this.ev('cta.comment'), br = this.ev('cta.brand');
    const k = enter(t, t0, 0.4), on = easy(span(t, tg, tg + 0.2));
    c.save(); c.globalAlpha *= k; c.translate(0, 50 + (1 - k) * 12);
    text(c, 'Would you turn it on', 32, 196, UI(700, 40), FL.fg1);
    text(c, 'in your CI?', 32, 244, UI(700, 40), FL.brand);
    surface(c, 24, 290, FXW - 48, 108, 8, 16, FL.bg1, FL.stroke2);   // a GitHub-style setting card with a Fluent toggle
    mark(c, GITHUB_MARK, 46, 329, 30, GH.fg);
    text(c, 'Package firewall', 92, 338, UI(600, 21), FL.fg1);
    text(c, on > 0.5 ? 'On · npm traffic goes through policy' : 'Off', 92, 366, UI(400, 14), FL.fg3);
    toggle(c, FXW - 124, 328, on, 1.6);
    c.restore();
    const ck = enter(t, cm, 0.35);
    if (ck > 0) {
      c.save(); c.globalAlpha *= ck; c.translate(CX, 530); c.scale(lerp2(0.94, 1, ck), lerp2(0.94, 1, ck)); c.translate(-CX, -530);
      c.font = UI(600, 24); const w1 = c.measureText('Comment').width; c.font = UI(800, 26); const w2 = c.measureText('FIREWALL').width;
      const tw = 34 + 14 + w1 + 12 + w2, x0 = CX - tw / 2;
      surface(c, CX - tw / 2 - 32, 494, tw + 64, 72, 8, 16, FL.brand, null);
      fill(c, x0, 517, 34, 24, 5, '#FFFFFF'); c.beginPath(); c.moveTo(x0 + 7, 541); c.lineTo(x0 + 15, 541); c.lineTo(x0 + 4, 550); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill();
      text(c, 'Comment', x0 + 48, 539, UI(600, 24), '#FFFFFF'); text(c, 'FIREWALL', x0 + 48 + w1 + 12, 540, UI(800, 26), '#FFFFFF');
      c.restore();
    }
    const bk = enter(t, br, 0.4);
    if (bk > 0 && this.logo) {
      c.save(); c.globalAlpha *= bk;
      surface(c, CX - 170, 610, 340, 104, 12, 8, FL.bg1, FL.stroke2);
      c.save(); rrect(c, CX - 156, 622, 80, 80, 10); c.clip(); c.drawImage(this.logo, CX - 156, 622, 80, 80); c.restore();
      text(c, 'Tech pe Trek', CX - 62, 656, UI(700, 22), FL.fg1); text(c, 'AI aur dev tools, Hinglish mein', CX - 62, 682, UI(400, 13), FL.fg3);
      c.restore();
    }
  }

  // =================================================================================== captions + frame
  /** Captions on a white Fluent card (shadow 8): words come up as they are said; the key words in Fluent blue. */
  private captions(c: CanvasRenderingContext2D, t: number) {
    const line = this.lines.find((l) => t >= l.start - 0.05 && t <= l.end + 0.3); if (!line) return;
    const chunks: Word[][] = []; let cur: Word[] = [], len = 0;
    for (const w of line.words) { if (cur.length && len + w.w.length > 26) { chunks.push(cur); cur = []; len = 0; } cur.push(w); len += w.w.length + 1; }
    if (cur.length) chunks.push(cur);
    let ci = chunks.findIndex((ch) => t < ch[ch.length - 1]!.end + 0.05); if (ci < 0) ci = chunks.length - 1;
    const words = chunks[ci]!, y = 880, f = UI(700, 29);
    c.save(); c.font = f; (c as any).letterSpacing = '0px';
    const sp = c.measureText(' ').width, widths = words.map((w) => c.measureText(w.w).width), total = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
    const fit = Math.min(1, (FXW - 80) / total), W = total * fit + 44;
    surface(c, CX - W / 2, y - 30, W, 56, 12, 8, FL.bg1, FL.stroke2);
    let x = CX - (total * fit) / 2;
    words.forEach((w, j) => {
      const on = t >= w.start - 0.03, k = enter(t, w.start - 0.03, 0.15);
      c.save(); c.globalAlpha *= on ? lerp2(0.25, 1, k) : 0.25; c.translate(x, y + 9); c.scale(fit, fit);
      text(c, w.w, 0, 0, f, EMPH.has(w.w) ? FL.brand : FL.fg1); c.restore();
      x += (widths[j]! + sp) * fit;
    });
    c.restore();
  }

  /** The frame at reel time t, in the 608 x 1080 column. */
  private draw(c: CanvasRenderingContext2D, t: number) {
    // a Fluent backdrop: a soft light gradient with two faint colour washes (Mica-like)
    const g = c.createLinearGradient(0, 0, 0, FXH); g.addColorStop(0, '#F4F7FB'); g.addColorStop(1, '#FBFBFC');
    c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
    const wash = (x: number, y: number, r: number, col: string) => { const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rg; c.fillRect(0, 0, FXW, FXH); };
    wash(80 + 30 * Math.sin(t * 0.2), 260, 360, 'rgba(15,108,189,0.07)'); wash(540, 760 + 30 * Math.cos(t * 0.17), 380, 'rgba(130,80,223,0.06)');
    const chs = this.cues.chapters;
    let i = chs.findIndex(([a, b]) => t >= a && t < b); if (i < 0) i = chs.length - 1;
    const [a, , name] = chs[i]!;
    const draw = (n: string, tt: number) => {
      if (n === 'hook') this.hook(c, tt); else if (n === 'problem') this.problem(c, tt); else if (n === 'news') this.news(c, tt);
      else if (n === 'how') this.how(c, tt); else if (n === 'policy') this.policy(c, tt); else if (n === 'blocked') this.blocked(c, tt);
      else if (n === 'limits') this.limits(c, tt); else this.cta(c, tt);
    };
    // Fluent top-level change: the previous chapter fades out (0.25 s) while the new one enters
    const fadeOut = 1 - span(t, a, a + 0.25);
    if (i > 0 && fadeOut > 0) { c.save(); c.globalAlpha = fadeOut; draw(chs[i - 1]![2], t); c.restore(); }
    c.save(); c.globalAlpha = i === 0 ? 1 : decelMid(span(t, a, a + 0.25)); draw(name, t); c.restore();
    this.captions(c, t);
    text(c, SOURCE, CX, 950, UI(500, 13), FL.fg3, 'center');
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const c = this.layer.ctx;
    this.layer.clear('#FBFBFC');
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    this.draw(c, f.t);
    c.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    // clean: no bloom, glow, grain, aberration, vignette or shake (Fluent, light mode)
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0, ca: 0, vignette: 0, flash: 0, zoom: 1, shake: [0, 0] };
  }
  override dispose() { this.layer.texture.dispose(); }
}
