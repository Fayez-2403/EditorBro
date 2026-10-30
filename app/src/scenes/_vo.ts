// Shared toolkit for the voiceover plates: find words by content, graph paper, the plotter pen,
// karaoke captions and a few eased reveals. Everything here is a pure function of time.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT, W, H } from '../engine/gl';
import { LIN, rgba } from '../engine/palette';
import { Lyrics, norm, type Line, type Word } from '../engine/lyrics';
import { F, font, measure } from '../engine/type';
import { clamp, ease, hash, mulberry32 } from '../engine/util';
import { sparkHead2D } from './_motifs';

export { W, H, F, font, measure, rgba, ease, clamp, Lyrics };

/** The spoken line containing `q` (case-insensitive). Throws while authoring if it is missing. */
export const lineOf = (ly: Lyrics, q: string, nth = 0): Line => ly.get(q, nth);

/** A word inside the line that contains `lineQ`: by its text (`'0.85'`, `'decide'`) or by index. */
export function wordOf(ly: Lyrics, lineQ: string, w: string | number, nth = 0): Word {
  const l = ly.get(lineQ, nth);
  if (typeof w === 'number') return l.words[w]!;
  const hit = l.words.find((x) => norm(x.w) === norm(w));
  if (!hit) throw new Error(`word "${w}" not in line "${l.text}"`);
  return hit;
}

/** 0..1 eased reveal that starts at t0 and lasts dur. */
export const at = (t: number, t0: number, dur = 0.45, fn: (x: number) => number = ease.outCubic) => fn(clamp((t - t0) / dur));

/** Base class: one Canvas2D layer over ink, graph paper and captions; subclasses draw the plate. */
export abstract class VoPlate extends Scene {
  layer = new Layer2D();
  /** Draw the plate. `c` is cleared to transparent; paper and captions are drawn around it. */
  abstract draw(c: CanvasRenderingContext2D, f: Frame): PostOverrides | void;
  /** Captions on by default (Hinglish read along). */
  captions = true;

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    clearRT(renderer, out, LIN.ink);
    const c = this.layer.ctx;
    this.layer.clear();
    paper(c, f.t, 1);
    c.save();
    const post = this.draw(c, f) ?? {};
    c.restore();
    if (this.captions) caption(c, this.ctx.lyrics, f.t);
    comp.draw(renderer, this.layer.upload(), out);
    return { bloom: 0.55, grain: 0.5, hud: 1, ...post };
  }
}

/** Graph paper: a 24 px minor grid and a 120 px major grid, drifting very slowly. */
export function paper(c: CanvasRenderingContext2D, t: number, a = 1) {
  const off = (t * 3) % 24;
  c.lineWidth = 1;
  for (const [step, alpha] of [[24, 0.05], [120, 0.1]] as const) {
    c.strokeStyle = rgba('graphite', alpha * a);
    c.beginPath();
    for (let x = -off % step; x < W; x += step) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); }
    for (let y = 0; y < H; y += step) { c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); }
    c.stroke();
  }
}

/** Karaoke caption of the line being spoken: sung words bone, the rest graphite. */
export function caption(c: CanvasRenderingContext2D, ly: Lyrics, t: number) {
  const l = ly.lineAt(t) ?? ly.lastLine(t);
  if (!l || t > l.end + 0.6) return;
  const fam = F.archivo(100, 500), size = 34;
  c.font = font(fam, size);
  const total = measure(l.text, fam, size);
  let x = (W - total) / 2;
  const y = 1000;
  const fade = clamp((l.end + 0.6 - t) / 0.3) * clamp((t - l.start + 0.15) / 0.15);
  c.textBaseline = 'alphabetic';
  for (const w of l.words) {
    const p = Lyrics.wordProgress(w, t);
    c.fillStyle = rgba(p > 0 ? 'bone' : 'graphite', fade * (p > 0 ? 1 : 0.9));
    c.fillText(w.w, x, y);
    x += measure(w.w + ' ', fam, size);
  }
}

/** Plotter pen: draws a polyline up to fraction p, with the spark at the tip while drawing. */
export function pen(c: CanvasRenderingContext2D, pts: [number, number][], p: number, t: number, o: { color?: string; width?: number; spark?: boolean } = {}) {
  if (p <= 0 || pts.length < 2) return;
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const target = L[L.length - 1]! * clamp(p);
  c.strokeStyle = o.color ?? rgba('bone', 0.95);
  c.lineWidth = o.width ?? 3;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
  let tip = pts[0]!;
  for (let i = 1; i < pts.length; i++) {
    if (L[i]! <= target) { c.lineTo(pts[i]![0], pts[i]![1]); tip = pts[i]!; continue; }
    const k = (target - L[i - 1]!) / Math.max(1e-6, L[i]! - L[i - 1]!);
    tip = [pts[i - 1]![0] + (pts[i]![0] - pts[i - 1]![0]) * k, pts[i - 1]![1] + (pts[i]![1] - pts[i - 1]![1]) * k];
    c.lineTo(tip[0], tip[1]);
    break;
  }
  c.stroke();
  if ((o.spark ?? true) && p < 1) sparkHead2D(c, tip[0], tip[1], t, 0.8);
}

/** Text that rises into place on its word (clip-mask reveal). */
export function riseText(c: CanvasRenderingContext2D, s: string, x: number, y: number, p: number, fam: string, size: number, color: string, align: CanvasTextAlign = 'left') {
  if (p <= 0) return;
  c.save();
  c.font = font(fam, size);
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  const w = measure(s, fam, size);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.beginPath(); c.rect(x0 - 20, y - size * 1.05, w + 40, size * 1.35); c.clip();
  c.fillStyle = color;
  c.fillText(s, x, y + (1 - p) * size * 1.1);
  c.restore();
}

// ---------------------------------------------------------------------------------------------
// 9:16 reel. The engine canvas is fixed at 1920x1080, so reel plates draw in a centred 608x1080
// column (x 0..608 after the translate in ReelPlate); render.ts crops that column and scales it to
// 1080x1920. Text is mixed Hindi (Devanagari) and English (Latin): each run gets its own font.
// ---------------------------------------------------------------------------------------------
export const COL = { x: 656, w: 608, cx: 304 };

const DEVA = 'NotoDeva';
let devaReady: Promise<void> | null = null;
/** Load Noto Sans Devanagari once (variable weight 100..900). */
export function loadDeva(): Promise<void> {
  devaReady ??= (async () => {
    const buf = await (await fetch('fonts/NotoSansDevanagari.ttf')).arrayBuffer();
    const ff = new FontFace(DEVA, buf, { weight: '100 900' });
    await ff.load();
    document.fonts.add(ff);
  })();
  return devaReady;
}

const isLatin = (ch: string) => ch >= ' ' && ch <= '~';
/** Split into runs of Latin (ASCII, spaces included) and non-Latin (Devanagari) characters. */
function runs(s: string): { s: string; latin: boolean }[] {
  const out: { s: string; latin: boolean }[] = [];
  for (const ch of s) {
    const latin = isLatin(ch), last = out[out.length - 1];
    if (last && last.latin === latin) last.s += ch; else out.push({ s: ch, latin });
  }
  return out;
}
const runFont = (latin: boolean, size: number, weight: number) =>
  latin ? font(F.archivo(100, weight), size) : `${Math.min(900, Math.max(100, weight))} ${size}px "${DEVA}", sans-serif`;

/** Width of a mixed Hindi/English string. */
export function mixedWidth(c: CanvasRenderingContext2D, s: string, size: number, weight = 500): number {
  c.save();
  let w = 0;
  for (const r of runs(s)) { c.font = runFont(r.latin, size, weight); w += c.measureText(r.s).width; }
  c.restore();
  return w;
}

/** Draw a mixed Hindi/English string at baseline y; returns its width. */
export function drawMixed(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number, color: string, align: 'left' | 'center' | 'right' = 'left'): number {
  const w = mixedWidth(c, s, size, weight);
  let px = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.save();
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = color;
  for (const r of runs(s)) { c.font = runFont(r.latin, size, weight); c.fillText(r.s, px, y); px += c.measureText(r.s).width; }
  c.restore();
  return w;
}

/** The largest size <= `size` at which `s` fits in `maxW`. */
export function fitSize(c: CanvasRenderingContext2D, s: string, size: number, weight = 500, maxW = COL.w - 64): number {
  const w = mixedWidth(c, s, size, weight);
  return w > maxW ? Math.floor(size * maxW / w) : size;
}

/** Mixed text that rises into place (clip-mask reveal), like riseText. */
export function riseMixed(c: CanvasRenderingContext2D, s: string, x: number, y: number, p: number, size: number, weight: number, color: string, align: 'left' | 'center' | 'right' = 'left') {
  if (p <= 0) return;
  const w = mixedWidth(c, s, size, weight);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.save();
  c.beginPath(); c.rect(x0 - 20, y - size * 1.2, w + 40, size * 1.75); c.clip();
  drawMixed(c, s, x, y + (1 - p) * size * 1.2, size, weight, color, align);
  c.restore();
}

/** Greedy word wrap of mixed text into rows no wider than maxW. */
export function wrapMixed(c: CanvasRenderingContext2D, words: string[], maxW: number, size: number, weight = 500): string[][] {
  const gap = size * 0.3, rows: string[][] = [[]];
  let rw = 0;
  for (const w of words) {
    const ww = mixedWidth(c, w, size, weight);
    if (rows[rows.length - 1]!.length && rw + gap + ww > maxW) { rows.push([]); rw = 0; }
    rw += (rows[rows.length - 1]!.length ? gap : 0) + ww;
    rows[rows.length - 1]!.push(w);
  }
  return rows;
}

/** A word of the line containing `lineQ`: by index, or by its text ignoring trailing punctuation (works for Devanagari). */
export function wordIn(ly: Lyrics, lineQ: string, w: string | number, nth = 0): Word {
  const l = ly.get(lineQ, nth);
  if (typeof w === 'number') return l.words[w]!;
  const strip = (x: string) => x.replace(/[,.!?;:…।]+$/, '').toLowerCase();
  const hit = l.words.find((x) => strip(x.w) === strip(w));
  if (!hit) throw new Error(`word "${w}" not in line "${l.text}"`);
  return hit;
}

/** Karaoke caption for the reel: the spoken line, wrapped inside the column, spoken words bone, the rest graphite. */
export function reelCaption(c: CanvasRenderingContext2D, ly: Lyrics, t: number) {
  const l = ly.lineAt(t) ?? ly.lastLine(t);
  if (!l || t > l.end + 0.6) return;
  const size = 46, lh = 66, y0 = 730, weight = 600;
  const rows = wrapMixed(c, l.words.map((w) => w.w), COL.w - 72, size, weight);
  const fade = clamp((l.end + 0.6 - t) / 0.3) * clamp((t - l.start + 0.15) / 0.15);
  let wi = 0;
  rows.forEach((row, r) => {
    const gap = size * 0.3;
    const total = row.reduce((a, w) => a + mixedWidth(c, w, size, weight), 0) + gap * (row.length - 1);
    let x = (COL.w - total) / 2;
    for (const w of row) {
      const p = Lyrics.wordProgress(l.words[wi++]!, t);
      x += drawMixed(c, w, x, y0 + r * lh, size, weight, rgba(p > 0 ? 'bone' : 'graphite', fade * (p > 0 ? 1 : 0.9))) + gap;
    }
  });
}

/**
 * Reels safe zone (reel-export skill): in the 1080x1920 output every word sits between y 360 and y 1420 and out of
 * the right 120 px. In column px (x 1.776) that is y 203..799 and x <= 540. Plates lay out in x 34..574, y 150..680;
 * this maps that box into the safe zone (scaled 0.88 about its centre).
 */
const SAFE = { k: 0.88, cx: 288, cy: 501, srcCx: COL.cx, srcCy: 415 };

/**
 * Base class for 9:16 plates: draws in column coordinates (0..COL.w by 0..H); the renderer crops the column.
 * The original theme (ink, graph paper, bone, signal), no captions, content inside the Reels safe zone, and a
 * crisp finish (little grain, no lens effects, bloom only on flashes).
 */
export abstract class ReelPlate extends VoPlate {
  override captions = false;
  override async init() { await loadDeva(); }
  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    clearRT(renderer, out, LIN.ink);
    const c = this.layer.ctx;
    this.layer.clear();
    c.save();
    c.beginPath(); c.rect(COL.x, 0, COL.w, H); c.clip();
    paper(c, f.t, 1);
    c.translate(COL.x, 0);
    c.translate(SAFE.cx, SAFE.cy); c.scale(SAFE.k, SAFE.k); c.translate(-SAFE.srcCx, -SAFE.srcCy);
    c.save();
    const post = this.draw(c, f) ?? {};
    c.restore();
    if (this.captions) reelCaption(c, this.ctx.lyrics, f.t);
    c.restore();
    comp.draw(renderer, this.layer.upload(), out);
    return { hud: 0, ...post, grain: 0.02, ca: 0, halation: 0.05, vignette: 0.15, bloomThreshold: 1.5 };
  }
}

/** A small mono label, typed out by fraction p. */
export function typed(c: CanvasRenderingContext2D, s: string, x: number, y: number, p: number, size = 26, color = rgba('ash'), weight = 400) {
  const n = Math.floor(clamp(p) * s.length);
  if (n <= 0) return;
  c.font = font(F.mono(weight), size);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = color;
  c.fillText(s.slice(0, n), x, y);
}

// ---------------------------------------------------------------------------------------------
// Vox template (9:16): an editorial documentary look from the vox-explainer skill. Paper with grain
// and halftone, torn-edge cards with small shadows, bold condensed type, motion stepped on twos
// (12 poses a second), no glow, no typewriter, no gradients on text. One shot per spoken line: a shot
// module reads its line and its content from ctx.params (see the decision timeline in timeline.ts).
// ---------------------------------------------------------------------------------------------
/** Default palette of the vox-explainer skill (labelled default until a brand gives its own). */
export const VOX = { red: '#B8312A', cream: '#F1E6D0', paper: '#FBF7EE', navy: '#14213D', yellow: '#F2C230' };
/** The Reels safe zone in column px (y 360..1420 and out of the right 120 px of 1080x1920). */
export const VOX_BOX = { x0: 34, x1: 536, y0: 212, y1: 792, cx: 285 };
/** Motion on twos at 24 fps: time held in steps of 1/12 s. */
export const twos = (t: number) => Math.floor(t * 12 + 1e-6) / 12;
/** Bold condensed type (Archivo at its narrowest width). */
export const condensed = (size: number, weight = 900) => font(F.archivo(62, weight), size);

let grainTex: HTMLCanvasElement | null = null;
/** A fixed paper-grain texture the size of the column (seeded, so every frame and every run match). */
function paperGrain(): HTMLCanvasElement {
  if (grainTex) return grainTex;
  const cv = document.createElement('canvas');
  cv.width = COL.w; cv.height = H;
  const g = cv.getContext('2d')!, img = g.createImageData(COL.w, H), rnd = mulberry32(1909);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd();
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v < 0.5 ? 60 : 255;
    img.data[i + 3] = Math.floor(Math.abs(v - 0.5) * 34);
  }
  g.putImageData(img, 0, 0);
  return (grainTex = cv);
}

/** Paper ground with grain and two faint folds (column coordinates). */
export function voxPaper(c: CanvasRenderingContext2D) {
  c.fillStyle = VOX.paper; c.fillRect(0, 0, COL.w, H);
  c.drawImage(paperGrain(), 0, 0);
  c.strokeStyle = 'rgba(20, 33, 61, 0.05)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, H * 0.38); c.lineTo(COL.w, H * 0.36); c.moveTo(COL.w * 0.62, 0); c.lineTo(COL.w * 0.6, H); c.stroke();
}

/** A torn-edge rectangle (deterministic edge from `seed`), with an optional small drop shadow. */
export function torn(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, fill: string, shadow = true, jag = 5) {
  const pts: [number, number][] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, side: number) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 13));
    for (let i = 0; i < n; i++) {
      const k = i / n, d = (hash(seed, side, i) - 0.5) * jag * 2;
      const nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1;
      pts.push([x0 + (x1 - x0) * k + (nx / L) * d, y0 + (y1 - y0) * k + (ny / L) * d]);
    }
  };
  edge(x, y, x + w, y, 0); edge(x + w, y, x + w, y + h, 1); edge(x + w, y + h, x, y + h, 2); edge(x, y + h, x, y, 3);
  const path = () => { c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath(); };
  if (shadow) { c.save(); c.translate(5, 7); path(); c.fillStyle = 'rgba(20, 33, 61, 0.22)'; c.fill(); c.restore(); }
  path(); c.fillStyle = fill; c.fill();
}

/** Halftone dots inside a circle, larger at the centre. */
export function halftone(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, step = 11) {
  c.fillStyle = color;
  for (let y = cy - r; y <= cy + r; y += step) for (let x = cx - r; x <= cx + r; x += step) {
    const d = Math.hypot(x - cx, y - cy) / r;
    if (d >= 1) continue;
    c.beginPath(); c.arc(x, y, (1 - d) * step * 0.42, 0, Math.PI * 2); c.fill();
  }
}

/** Condensed text, fully formed, at baseline y; returns its width. */
export function block(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 900) {
  c.save();
  c.font = condensed(size, weight); c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color;
  c.fillText(s, x, y);
  const w = c.measureText(s).width;
  c.restore();
  return w;
}

/** Width of condensed text. */
export function blockWidth(c: CanvasRenderingContext2D, s: string, size: number, weight = 900) {
  c.save(); c.font = condensed(size, weight); const w = c.measureText(s).width; c.restore();
  return w;
}

/** A small mono label (fully formed, no typing effect). */
export function voxLabel(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left') {
  c.save();
  c.font = font(F.mono(500), size); c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillStyle = color;
  c.letterSpacing = `${Math.round(size * 0.08)}px`;
  c.fillText(s, x, y);
  c.restore();
}

// ---------------------------------------------------------------------------------------------
// Night-trek template (9:16): the Techpe Trek look. Near-black ground, the logo's lime and purple, extra-wide
// heavy type, real web pages shown in a browser window through a camera (a pose ladder: smooth, continuous moves,
// hyperframes-keyframes rules), whip pans between shots, the logo as a bottom-right watermark.
// ---------------------------------------------------------------------------------------------
export const TREK = { night: '#07060B', panel: '#0D1117', bar: '#161B22', line: '#2A2533', lime: '#C8F31D', purple: '#8E44FF', white: '#F4F2FF', slate: '#8A87A0' };
/** Palettes for the night-trek shots (params.theme): 'trek' (Techpe lime/purple) or 'gh' (GitHub Trending series). */
const TREK_THEMES: Record<string, typeof TREK> = {
  trek: { ...TREK },
  gh: { night: '#0D1117', panel: '#010409', bar: '#161B22', line: '#30363D', lime: '#3FB950', purple: '#A371F7', white: '#F0F6FC', slate: '#8B949E' },
};
/** Extra-wide heavy type (Archivo at its widest). */
export const wide = (size: number, weight = 900) => font(F.archivo(125, weight), size);

const imgCache = new Map<string, Promise<ImageBitmap>>();
/** Load an image from public/ once (shared by every plate). */
export function loadImg(src: string): Promise<ImageBitmap> {
  if (!imgCache.has(src)) imgCache.set(src, fetch(src).then((r) => r.blob()).then((b) => createImageBitmap(b)));
  return imgCache.get(src)!;
}

/** A camera pose on a page: centre (page px) and zoom (1 = the page's full width fills the window). */
export type Pose = { t: number; x: number; y: number; z: number };
/** Interpolate a pose ladder: eased between neighbours, held before the first and after the last. */
export function camAt(poses: Pose[], t: number): { x: number; y: number; z: number } {
  if (t <= poses[0]!.t) return poses[0]!;
  for (let i = 1; i < poses.length; i++) {
    const a = poses[i - 1]!, b = poses[i]!;
    if (t < b.t) { const k = ease.inOutCubic(clamp((t - a.t) / Math.max(1e-3, b.t - a.t))); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k }; }
  }
  return poses[poses.length - 1]!;
}

/** Wide text fitted to a width; returns the size used. */
export function wideFit(c: CanvasRenderingContext2D, s: string, size: number, maxW: number, weight = 900) {
  c.save(); c.font = wide(size, weight); const w = c.measureText(s).width; c.restore();
  return w > maxW ? Math.floor(size * maxW / w) : size;
}

/** Text with a mask reveal rising from its baseline (p 0..1), in any font string. */
export function riseFont(c: CanvasRenderingContext2D, s: string, x: number, y: number, p: number, fontStr: string, size: number, color: string, align: CanvasTextAlign = 'left') {
  if (p <= 0) return;
  c.save();
  c.font = fontStr; c.textAlign = align; c.textBaseline = 'alphabetic';
  const w = c.measureText(s).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.beginPath(); c.rect(x0 - 10, y - size * 1.05, w + 20, size * 1.35); c.clip();
  c.fillStyle = color; c.fillText(s, x, y + (1 - ease.outCubic(p)) * size * 1.1);
  c.restore();
}

/**
 * A browser window showing `img` (a 2x capture of a page `pageW` CSS px wide) through a camera: the window's
 * content shows a page area 1/zoom of the page width, centred on (cam.x, cam.y) in page px.
 * Returns a mapper from page px to screen px, for highlights and the cursor.
 */
export function browser(c: CanvasRenderingContext2D, img: ImageBitmap | null, cam: { x: number; y: number; z: number }, x: number, y: number, w: number, h: number, url: string, pageW = 1280) {
  const barH = 34, r = 18;
  c.save();
  c.shadowColor = 'rgba(142, 68, 255, 0.35)'; c.shadowBlur = 40; c.shadowOffsetY = 12;
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = TREK.panel; c.fill();
  c.restore();
  c.save();
  c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
  c.fillStyle = TREK.bar; c.fillRect(x, y, w, barH);
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(x + 18 + i * 16, y + barH / 2, 5, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = '#0D1117'; c.beginPath(); c.roundRect(x + 72, y + 7, w - 90, barH - 14, 10); c.fill();
  c.font = font(F.mono(500), 13); c.fillStyle = TREK.slate; c.textBaseline = 'middle'; c.fillText(url, x + 86, y + barH / 2 + 1);
  const cx = x, cy = y + barH, cw = w, ch = h - barH;
  const vw = pageW / cam.z, vh = vw * ch / cw;                    // visible page area (page px)
  const pageH = img ? img.height / (img.width / pageW) : 1e9;     // never show past the page's edges
  const sx = clamp(cam.x - vw / 2, 0, Math.max(0, pageW - vw)), sy = clamp(cam.y - vh / 2, 0, Math.max(0, pageH - vh));
  if (img) {
    const d = img.width / pageW;                                  // capture density (2x, 3x ...)
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(img, sx * d, sy * d, vw * d, vh * d, cx, cy, cw, ch);
  }
  c.restore();
  c.save(); c.strokeStyle = TREK.line; c.lineWidth = 1.5; c.beginPath(); c.roundRect(x, y, w, h, r); c.stroke(); c.restore();
  const k = cw / vw;
  return (px: number, py: number) => [cx + (px - sx) * k, cy + (py - sy) * k] as [number, number];
}

/** A lime outline around a page box (already mapped to screen), drawn on by p. */
export function hilite(c: CanvasRenderingContext2D, a: [number, number], b: [number, number], p: number, label?: string) {
  if (p <= 0) return;
  const [x0, y0] = a, [x1, y1] = b, w = x1 - x0, h = y1 - y0;
  c.save();
  c.strokeStyle = TREK.lime; c.lineWidth = 3; c.setLineDash([Math.max(1, (w + h) * 2 * ease.outCubic(p)), 99999]);
  c.beginPath(); c.roundRect(x0 - 4, y0 - 4, w + 8, h + 8, 8); c.stroke();
  c.setLineDash([]);
  c.fillStyle = 'rgba(200, 243, 29, 0.10)'; c.globalAlpha = p; c.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
  if (label && p >= 1) {
    c.globalAlpha = 1; c.font = font(F.mono(600), 13);
    const tw = c.measureText(label).width + 16;
    c.fillStyle = TREK.lime; c.beginPath(); c.roundRect(x1 - tw, y0 - 26, tw, 20, 6); c.fill();
    c.fillStyle = TREK.night; c.textBaseline = 'middle'; c.fillText(label, x1 - tw + 8, y0 - 15);
  }
  c.restore();
}

/** A lime cursor at (x, y); `click` 0..1 draws the press and a ripple. */
export function cursor(c: CanvasRenderingContext2D, x: number, y: number, click = 0) {
  c.save();
  if (click > 0 && click < 1) { c.strokeStyle = `rgba(200, 243, 29, ${1 - click})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 8 + click * 34, 0, Math.PI * 2); c.stroke(); }
  c.translate(x, y); const s = click > 0 && click < 0.3 ? 0.85 : 1; c.scale(s, s);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 26); c.lineTo(7, 20); c.lineTo(12, 31); c.lineTo(17, 29); c.lineTo(12, 18); c.lineTo(21, 18); c.closePath();
  c.fillStyle = TREK.lime; c.fill(); c.strokeStyle = TREK.night; c.lineWidth = 2; c.stroke();
  c.restore();
}

/** Speed streaks for a whip pan (v -1..1: direction and strength). */
export function streaks(c: CanvasRenderingContext2D, v: number, seed: number) {
  const a = Math.abs(v); if (a < 0.05) return;
  c.save();
  for (let i = 0; i < 26; i++) {
    const y = hash(seed, i, 1) * H, len = (80 + hash(seed, i, 2) * 260) * a, x = hash(seed, i, 3) * COL.w;
    c.fillStyle = i % 5 === 0 ? `rgba(200, 243, 29, ${0.5 * a})` : `rgba(244, 242, 255, ${0.22 * a})`;
    c.fillRect(v > 0 ? x : x - len, y, len, 1.5 + hash(seed, i, 4) * 2);
  }
  c.restore();
}

/** A pill badge: "★ 159K" style, the number rolling up to `value` (in thousands) by p. */
export function starBadge(c: CanvasRenderingContext2D, x: number, y: number, value: number, p: number) {
  if (p <= 0) return;
  const v = Math.round(value * ease.outCubic(clamp(p)));
  const s = `★ ${v}K`;
  c.save();
  c.font = wide(26, 900); const tw = c.measureText(s).width + 30;
  const k = 0.6 + 0.4 * ease.outBack(clamp(p * 1.6));
  c.translate(x, y); c.scale(k, k);
  c.fillStyle = TREK.lime; c.beginPath(); c.roundRect(-tw, -22, tw, 44, 22); c.fill();
  c.fillStyle = TREK.night; c.textBaseline = 'middle'; c.textAlign = 'right'; c.fillText(s, -15, 2);
  c.restore();
}

/**
 * Base class for night-trek shots: night ground with a slow dot grid, the shot (draw) with its whip-pan entry and
 * exit, and the Techpe Trek logo as a bottom-right watermark (black drops out with 'lighten').
 */
export abstract class TrekPlate extends Scene {
  layer = new Layer2D();
  logo: ImageBitmap | null = null;
  abstract draw(c: CanvasRenderingContext2D, t: number, f: Frame): PostOverrides | void;
  override async init() { this.logo = await loadImg('brand/techpe-trek.jpg'); await this.load?.(); }
  load?(): Promise<void>;
  get line(): Line { return this.ctx.lyrics.lines[this.ctx.params.line ?? 0]!; }
  /** Start of a word of this shot's line (index, or text without trailing punctuation). */
  word(w: number | string) {
    const l = this.line;
    if (typeof w === 'number') return l.words[Math.min(w, l.words.length - 1)]!.start;
    const hit = l.words.find((x) => x.w.replace(/[,.!?;:…।—]+$/, '').toLowerCase() === w.toLowerCase());
    if (!hit) throw new Error(`word "${w}" not in line "${l.text}"`);
    return hit.start;
  }
  /** A time at fraction k of the spoken line. */
  frac(k: number) { const l = this.line; return l.start + (l.end - l.start) * k; }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp } = this.ctx;
    clearRT(renderer, out, LIN.ink);
    const c = this.layer.ctx;
    this.layer.clear();
    const t = f.t, s0 = this.ctx.start, s1 = this.ctx.end;
    c.save();
    c.beginPath(); c.rect(COL.x, 0, COL.w, H); c.clip();
    c.translate(COL.x, 0);
    const theme = this.ctx.params.theme ?? 'trek';
    Object.assign(TREK, TREK_THEMES[theme] ?? TREK_THEMES.trek);   // every shot sets its palette before drawing
    c.fillStyle = TREK.night; c.fillRect(0, 0, COL.w, H);
    if (theme === 'gh') {   // a contribution graph drifting up: GitHub-green squares, a few lit
      const step = 22, off = (t * 8) % step;
      for (let y = -off, r = 0; y < H; y += step, r++) for (let x = 6, k = 0; x < COL.w; x += step, k++) {
        const lvl = hash(k, r + Math.floor((t * 8) / step), 31);
        c.fillStyle = lvl > 0.93 ? 'rgba(63, 185, 80, 0.30)' : lvl > 0.8 ? 'rgba(63, 185, 80, 0.13)' : 'rgba(240, 246, 252, 0.035)';
        c.beginPath(); c.roundRect(x, y, step - 6, step - 6, 3); c.fill();
      }
    } else {
      const off = (t * 6) % 28;   // a slow dot grid
      c.fillStyle = 'rgba(200, 243, 29, 0.07)';
      for (let y = -off; y < H; y += 28) for (let x = 14; x < COL.w; x += 28) c.fillRect(x, y, 2, 2);
    }
    // whip pan: in from the right over 0.28 s, out to the left over the last 0.22 s
    const pin = s0 > 0 ? clamp((t - s0) / 0.28) : 1, pout = s1 < this.ctx.audio.duration - 0.05 ? clamp((t - (s1 - 0.22)) / 0.22) : 0;
    const dx = (1 - ease.outCubic(pin)) * COL.w * 1.1 - ease.inCubic(pout) * COL.w * 1.1;
    c.save(); c.translate(dx, 0);
    const post = this.draw(c, t, f) ?? {};
    c.restore();
    streaks(c, pin < 1 ? -(1 - pin) : pout > 0 ? -pout : 0, 900 + (this.ctx.params.line ?? 0));
    if (this.logo && !this.ctx.params.noLogo && !this.ctx.params.noWatermark) {   // the watermark, bottom right
      c.save(); c.globalCompositeOperation = 'lighten'; c.globalAlpha = 0.92;
      c.drawImage(this.logo, COL.w - 156, H - 168, 146, 146); c.restore();
    }
    c.restore();
    comp.draw(renderer, this.layer.upload(), out);
    return { hud: 0, bloom: 0.25, bloomThreshold: 1.2, halation: 0, ca: 0, grain: 0.03, vignette: 0.35, ...post };
  }
}

/** A rubber stamp: condensed text in a bordered box, slightly rotated, landing from 1.3x (p 0..1). */
export function stamp(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, p: number, color = VOX.red, rot = -0.06) {
  if (p <= 0) return;
  const w = blockWidth(c, s, size) + size * 0.7, h = size * 1.25;
  c.save();
  c.translate(x, y); c.rotate(rot); const k = 1.3 - 0.3 * p; c.scale(k, k);
  c.globalAlpha *= Math.min(1, p * 2);
  c.fillStyle = VOX.paper; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = color; c.lineWidth = Math.max(3, size * 0.07); c.strokeRect(-w / 2, -h / 2, w, h);
  block(c, s, 0, size * 0.36, size, color, 'center');
  c.restore();
}

/** Stepped reveal: 0 before t0, then 0..1 over dur, held on twos (ts is already stepped). */
export const pop = (ts: number, t0: number, dur = 0.25) => clamp((ts - t0) / dur);

/**
 * Base class for Vox shots. Draws paper, the shot (draw), and a torn navy band that wipes across at the cut.
 * `ctx.params.line` is the index of the spoken line this shot plays over; `beat(k, n)` spreads n reveals over
 * it, so a shot re-times itself with the voice.
 */
export abstract class VoxPlate extends Scene {
  layer = new Layer2D();
  abstract draw(c: CanvasRenderingContext2D, ts: number, f: Frame): PostOverrides | void;

  get line(): Line { return this.ctx.lyrics.lines[this.ctx.params.line ?? 0]!; }
  /** When reveal k of n starts: spread over the first 75% of the spoken line. */
  beat(k: number, n: number) { const l = this.line; return l.start + (l.end - l.start) * 0.75 * (k / Math.max(1, n)); }
  /** Start of a word of this shot's line (by index, or by its text without trailing punctuation). */
  word(w: number | string) {
    const l = this.line;
    if (typeof w === 'number') return l.words[Math.min(w, l.words.length - 1)]!.start;
    const hit = l.words.find((x) => x.w.replace(/[,.!?;:…।]+$/, '').toLowerCase() === w.toLowerCase());
    if (!hit) throw new Error(`word "${w}" not in line "${l.text}"`);
    return hit.start;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget) {
    const { renderer, comp } = this.ctx;
    clearRT(renderer, out, LIN.ink);
    const c = this.layer.ctx;
    this.layer.clear();
    const ts = twos(f.t);
    c.save();
    c.beginPath(); c.rect(COL.x, 0, COL.w, H); c.clip();
    c.translate(COL.x, 0);
    voxPaper(c);
    c.save();
    const post = this.draw(c, ts, f) ?? {};
    c.restore();
    // the cut: a torn navy band sweeps up and off (0.33 s, on twos)
    const w = (ts - this.ctx.start) / 0.33;
    if (this.ctx.start > 0 && w >= 0 && w < 1) torn(c, -20, H - w * (H + 760), COL.w + 40, 700, 77 + this.ctx.params.line, VOX.navy, false, 9);
    c.restore();
    comp.draw(renderer, this.layer.upload(), out);
    return { hud: 0, bloom: 0, halation: 0, ca: 0, grain: 0.035, vignette: 0.2, ...post };
  }
}

// ---------------------------------------------------------------------------------------------
// Motion Flex, Claude cut (scenes/flex.ts, scenes/flex_intro.ts): a music-led 9:16 showreel drawn
// in the 608x1080 column. Ink, bone and the brand lime, with a signal orange for the demos' own
// content. Springs are closed-form (no state), the 3D is a small perspective projector, and every
// choreography time comes from data/<variant>/cues.json (measured grid, see build_flex_audio.py).
// ---------------------------------------------------------------------------------------------
export const FX = {
  ink: '#121410', ink2: '#1b1e18', ink3: '#272b23', line: '#3a4034', bone: '#efeee4', bone2: '#dcdccf',
  bone3: '#c5c6b6', lime: '#d8fa79', limeD: '#adc957', limeDD: '#7d9437', orange: '#ff6a3d', orangeD: '#c94a24',
  sage: '#98a68a', moss: '#5a6a4c', deep: '#2c3727', steel: '#8f9c98', night: '#0c0e0b',
};
export const FXW = 608, FXH = 1080;
/** Text-safe box of the column (Reels UI: y 360..1420 and clear of the right 120 px of 1080x1920). */
export const FXSAFE = { x0: 36, x1: 538, y0: 204, y1: 798 };

export const sat = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp2 = (a: number, b: number, p: number) => a + (b - a) * p;
/** 0..1 progress of t through [a, b]. */
export const span = (t: number, a: number, b: number) => sat((t - a) / (b - a));
export const outP = (x: number, n = 3) => 1 - Math.pow(1 - sat(x), n);
export const inP = (x: number, n = 3) => Math.pow(sat(x), n);
export const inOutP = (x: number, n = 3) => { x = sat(x); return x < .5 ? Math.pow(2 * x, n) / 2 : 1 - Math.pow(2 - 2 * x, n) / 2; };
export const outExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * sat(x)));
export const inExpo = (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * sat(x) - 10));
export const inOutSine = (x: number) => .5 - .5 * Math.cos(Math.PI * sat(x));
/**
 * Closed-form spring step: 0 before `dt` = 0, then toward 1. `response` is the period in seconds,
 * zeta the damping ratio (1 = no overshoot, 0.8 = about 1.5%, 0.65 = about 7%).
 */
export function spring(dt: number, response = .4, zeta = 1): number {
  if (dt <= 0) return 0;
  const w = (2 * Math.PI) / response;
  if (zeta >= 1) return 1 - Math.exp(-w * dt) * (1 + w * dt);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * dt) * (Math.cos(wd * dt) + (zeta * w / wd) * Math.sin(wd * dt));
}
/** A move from a to b that starts at t0 and settles on a spring. */
export const springTo = (t: number, t0: number, a: number, b: number, response = .4, zeta = 1) =>
  a + (b - a) * spring(t - t0, response, zeta);
/** Decaying pulse after t0 (1 at t0, half-life hl). */
export const hitP = (t: number, t0: number, hl = .08) => (t < t0 ? 0 : Math.pow(.5, (t - t0) / hl));
/** Three-phase nudge (hyperframes nudge curve): ~10% / 65% / 25% of the travel in 20% / 18% / 62% of the time. */
export function nudge(x: number) {
  x = sat(x);
  if (x < .2) return .1 * Math.pow(x / .2, 3);
  if (x < .38) return .1 + .65 * ((x - .2) / .18);
  return .75 + .25 * (1 - Math.pow(1 - (x - .38) / .62, 5));
}

export function hexRGB(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Colour between two hex colours (sRGB mix; fine for the short morphs it is used in). */
export function mixHex(a: string, b: string, p: number): string {
  const x = hexRGB(a), y = hexRGB(b), q = sat(p);
  const c = x.map((v, i) => Math.round(v + (y[i]! - v) * q));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
export function alpha(h: string, a: number): string {
  const [r, g, b] = hexRGB(h);
  return `rgba(${r},${g},${b},${sat(a)})`;
}

/** Rounded-rect path (radius clamped to the shorter half side). */
export function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  c.beginPath(); c.roundRect(x, y, w, h, rr);
}
export function fillRR(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
  rrect(c, x, y, w, h, r); c.fillStyle = fill; c.fill();
}
export function disc(c: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fillStyle = fill; c.fill();
}
export function strokeLine(c: CanvasRenderingContext2D, pts: number[][], color: string, width = 1.5) {
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x!, y!) : c.moveTo(x!, y!)));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}

/** Archivo at (width %, weight); `it` picks the italic. */
export const ax = (size: number, width = 100, weight = 900, it = false) =>
  font(it ? F.archivoItalic(width, weight) : F.archivo(width, weight), size);
export const mono = (size: number, weight = 500) => font(F.mono(weight), size);
/** Largest size <= max at which `s` in this font spec fits maxW. */
export function fitAx(c: CanvasRenderingContext2D, s: string, max: number, maxW: number, width = 100, weight = 900, it = false) {
  c.font = ax(100, width, weight, it);
  return Math.min(max, (100 * maxW) / Math.max(1, c.measureText(s).width));
}
/** Text with an optional letter-spacing (px). Returns the advance. */
export function txt(c: CanvasRenderingContext2D, s: string, x: number, y: number, f: string, color: string, tracking = 0, align: CanvasTextAlign = 'left') {
  c.font = f; c.fillStyle = color; c.textBaseline = 'alphabetic';
  (c as any).letterSpacing = `${tracking}px`;
  c.textAlign = align; c.fillText(s, x, y);
  const w = c.measureText(s).width;
  (c as any).letterSpacing = '0px';
  return w;
}
/**
 * A line that rises out from behind a cut line (mask-reveal-up): p 0 -> hidden below the baseline,
 * p 1 -> in place. The clip box is the line's own band, so nothing shows outside it.
 */
export function maskUp(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, p: number, f: string, color: string, align: CanvasTextAlign = 'left', tracking = 0) {
  if (p <= 0) return;
  c.save();
  c.font = f; (c as any).letterSpacing = `${tracking}px`;
  const w = c.measureText(s).width;
  (c as any).letterSpacing = '0px';
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  c.beginPath(); c.rect(x0 - size * .1, y - size * 1.0, w + size * .2, size * 1.25); c.clip();
  txt(c, s, x, y + (1 - outP(p, 4)) * size * 1.15, f, color, tracking, align);
  c.restore();
}

// ---- small perspective projector (camera looks down -z; +y is down, like the canvas) ----
export type V3 = [number, number, number];
export function rotX(p: V3, a: number): V3 { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
export function rotY(p: V3, a: number): V3 { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
export function rotZ(p: V3, a: number): V3 { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scl3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm3 = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Unit quaternion [x, y, z, w]. */
export type Q = [number, number, number, number];
export const Q0: Q = [0, 0, 0, 1];
export const qAxis = (ax3: V3, a: number): Q => { const s = Math.sin(a / 2), n = norm3(ax3); return [n[0] * s, n[1] * s, n[2] * s, Math.cos(a / 2)]; };
export function qMul(a: Q, b: Q): Q {
  return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
}
export function qRot(q: Q, p: V3): V3 {
  const u: V3 = [q[0], q[1], q[2]], s = q[3];
  const t = scl3(cross3(u, p), 2);
  return add3(add3(p, scl3(t, s)), cross3(u, t));
}
export function qSlerp(a: Q, b: Q, p: number): Q {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) { d = -d; bb = [-b[0], -b[1], -b[2], -b[3]]; }
  if (d > .9995) {
    const r: Q = [a[0] + (bb[0] - a[0]) * p, a[1] + (bb[1] - a[1]) * p, a[2] + (bb[2] - a[2]) * p, a[3] + (bb[3] - a[3]) * p];
    const l = Math.hypot(...r); return [r[0] / l, r[1] / l, r[2] / l, r[3] / l];
  }
  const th = Math.acos(d), s0 = Math.sin((1 - p) * th) / Math.sin(th), s1 = Math.sin(p * th) / Math.sin(th);
  return [a[0] * s0 + bb[0] * s1, a[1] * s0 + bb[1] * s1, a[2] * s0 + bb[2] * s1, a[3] * s0 + bb[3] * s1];
}

export interface Cam { pos: V3; yaw: number; pitch: number; roll?: number; f: number; cx: number; cy: number }
/** World -> camera space (camera at pos, turned by yaw about y, then pitch about x). */
export function toCam(p: V3, cam: Cam): V3 {
  let q = sub3(p, cam.pos);
  q = rotY(q, -cam.yaw); q = rotX(q, -cam.pitch);
  if (cam.roll) q = rotZ(q, -cam.roll);
  return q;
}
/** Screen point [x, y, depth, scale]; depth > 0 in front of the camera. */
export function proj(p: V3, cam: Cam): [number, number, number, number] {
  const q = toCam(p, cam);
  const d = -q[2];
  const s = cam.f / Math.max(1e-3, d);
  return [cam.cx + q[0] * s, cam.cy + q[1] * s, d, s];
}
/**
 * Map a w x h local rectangle onto three projected corners (p0 = top-left, p1 = top-right, p2 = bottom-left).
 * An affine approximation of the plane's perspective: exact at those corners, close for long lenses.
 */
export function planeTransform(c: CanvasRenderingContext2D, p0: number[], p1: number[], p2: number[], w: number, h: number) {
  c.transform((p1[0]! - p0[0]!) / w, (p1[1]! - p0[1]!) / w, (p2[0]! - p0[0]!) / h, (p2[1]! - p0[1]!) / h, p0[0]!, p0[1]!);
}
export function poly(c: CanvasRenderingContext2D, pts: number[][]) {
  c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0]!, p[1]!) : c.moveTo(p[0]!, p[1]!))); c.closePath();
}

/** Per-frame random value (constant across a frame's motion-blur sub-frames). */
export const frameRand = (t: number, ...k: number[]) => hash(Math.round(t * 60), ...k);

// ---------------------------------------------------------------------------------------------
// Frame-sequence video (scenes/reveals.ts): real clips played from per-frame images written by
// analysis/reveals_media.py, so a frame stays a pure function of t (frame n of a clip shows at clip
// time n / fps, 1.0x). Images decode asynchronously: export renders wait for them through main.ts's
// window.__pdoomPrepare barrier; the live preview shows the nearest decoded frame while the exact one loads.
// ---------------------------------------------------------------------------------------------
export interface SeqInfo { dir: string; ext: string; n: number; fps: number; w: number; h: number; corners?: ([number, number][] | null)[] }
export class SeqCache {
  private bmp = new Map<string, ImageBitmap>();
  private pend = new Map<string, Promise<void>>();
  /** Frames drawn before they were decoded (only the live preview should ever count any). */
  misses = 0;
  constructor(public media: Record<string, SeqInfo>, private budget = 220) {}
  /** Frame index of clip k at clip time lt (clamped to the sequence). */
  index(k: string, lt: number) { const m = this.media[k]!; return Math.max(0, Math.min(m.n - 1, Math.floor(lt * m.fps + 1e-6))); }
  private touch(id: string) { const b = this.bmp.get(id); if (b) { this.bmp.delete(id); this.bmp.set(id, b); } return b; }
  /** Decode frame i of clip k (resolves at once if it is already decoded). Least recently used frames are closed past the budget. */
  load(k: string, i: number): Promise<void> {
    const m = this.media[k]; if (!m) return Promise.resolve();
    i = Math.max(0, Math.min(m.n - 1, i)); const id = `${k}/${i}`;
    if (this.touch(id)) return Promise.resolve();
    let p = this.pend.get(id);
    if (!p) {
      p = fetch(`${m.dir}/${String(i).padStart(5, '0')}.${m.ext}`).then((r) => r.blob()).then((b) => createImageBitmap(b)).then((im) => {
        this.bmp.set(id, im); this.pend.delete(id);
        while (this.bmp.size > this.budget) { const [old, ob] = this.bmp.entries().next().value!; this.bmp.delete(old); ob.close(); }
      }, () => { this.pend.delete(id); });
      this.pend.set(id, p);
    }
    return p;
  }
  /** The frame of clip k at clip time lt: exact when decoded, else (preview) the nearest decoded one while the exact one loads. */
  get(k: string, lt: number): ImageBitmap | null {
    if (!this.media[k]) return null;
    const i = this.index(k, lt), b = this.touch(`${k}/${i}`);
    if (b) return b;
    this.misses++; void this.load(k, i);
    for (let d = 1; d < 12; d++) { const x = this.bmp.get(`${k}/${i - d}`) ?? this.bmp.get(`${k}/${i + d}`); if (x) return x; }
    return null;
  }
}
