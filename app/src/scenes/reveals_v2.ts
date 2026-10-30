// v2 (2026-10-21, 76 s: two WHATs with the freeze-frame jump), kept as variant reveals_v2. v3 is reveals.ts.
// v2 (user, 2026-10-21): two WHATs, the post and the five reveals as one strip of panels that slide straight into each other
// (no numbered inserts, no intros before 04 and 05), the thread scrolled one post at a time with no ghosts, "ye playable" cut.
// v1 (the 94 s cut) is reveals_v1.ts.
// WHATTT?! 5 Claude project reveals (projects/claude-reveals): 76 s, 9:16, 60 fps. The six projects in @claudeai's
// 2026-10-16 thread, shown as the creators' ORIGINAL videos (frame sequences cut by analysis/reveals_media.py, played at
// 1.0x, fitted whole, never covered by type), a real stock actor for the reactions (Mixkit Stock Video Free License, one
// actor: the 516xx series), X's own embed of the thread as the receipt, and kinetic type around it all.
// Every frame is a pure function of t: the chapters, the fixed marks and the word events come from data/reveals/cues.json;
// randomness is hash()-based. Claims: projects/claude-reveals/FACTS.md.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { hash } from '../engine/util';
import { F, ot } from '../engine/type';
import {
  COL, FXW, FXH, sat, span, lerp2, rrect, fillRR, disc, alpha, spring, hitP, outP, inP, inOutP, outExpo,
  ax, mono, txt, maskUp, poly, frameRand, SeqCache, type SeqInfo,
} from './_vo';

// ---------------------------------------------------------------- design
const P = {
  night: '#06060B', ink: '#0D0E16', panel: '#151726', line: '#2A2D3D', white: '#F7F5FF', dim: '#A3A1BA', faint: '#5E5C73',
  lime: '#C8F31D', fire: '#FF6A2B', ember: '#FFB347', blue: '#3DA9FF', cyan: '#8BEFFF', red: '#FF3355', redD: '#9E1030',
  paper: '#F4EEDD', rule: '#9DB8E0', margin: '#E07A7A', inkBlue: '#25469C', graphite: '#3A3A40', stamp: '#C8352B',
  cream: '#ECE3CF', brown: '#5B4632', gold: '#FFD34D',
};
const CX = FXW / 2;
const CAP_Y = 932;               // the caption line (narration), inside the 200 px safe zone
interface Cues { duration: number; chapters: [number, number, string][]; events: Record<string, number>; cards: number[]; pans: [number, number][]; scroll: number[] }
interface Word { w: string; start: number; end: number }
interface Line { key: string; chapter: string; who: string; text: string; start: number; end: number; words: Word[] }
type Box = { x: number; y: number; w: number; h: number };
type Pt = [number, number];
const CREDIT: Record<string, [string, string]> = {
  A: ['Dilum Sanjaya', '@DilumSanjaya'], B: ['Kevin Ngo', '@kevin_t_ngo'], C: ['Harshpreet Singh', '@harshpreet931'],
  D: ['The Bugged Dev', '@thebuggeddev'], E: ['Annas Rahman, MD', '@AnnasRahmanMD'], F: ['Kevin Ngo', '@kevin_t_ngo'],
};

// ---------------------------------------------------------------- small drawing helpers
function shadowed(c: CanvasRenderingContext2D, blur: number, col: string, fn: () => void) {
  c.save(); c.shadowColor = col; c.shadowBlur = blur; fn(); c.restore();
}
/** A rounded pill with text; returns its width. */
function chip(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fg: string, bg: string, align: 'left' | 'center' | 'right' = 'left') {
  c.font = ax(size, 100, 900); const w = c.measureText(s).width + size * 1.2, h = size * 1.6;
  const x0 = align === 'left' ? x : align === 'center' ? x - w / 2 : x - w;
  fillRR(c, x0, y - h * 0.72, w, h, h / 2, bg);
  txt(c, s, x0 + size * 0.6, y + size * 0.08, ax(size, 100, 900), fg);
  return w;
}
/** "ORIGINAL BY Name · @handle" under a clip. */
function credit(c: CanvasRenderingContext2D, k: string, x: number, y: number, a: number, col = P.dim, extra = '') {
  if (a <= 0) return;
  const [n, h] = CREDIT[k]!;
  c.save(); c.globalAlpha *= a;
  const w = txt(c, 'ORIGINAL VIDEO BY ', x, y, mono(14, 600), P.faint, 0.4);
  txt(c, `${n} · ${h}${extra}`, x + w, y, mono(14, 600), col, 0.1);
  c.restore();
}
/** A big numeral with an extruded side (depth layers), the face on top. */
function bigNum(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, face: string | CanvasGradient, side: string, depth = 10, align: CanvasTextAlign = 'left') {
  c.save(); c.font = ax(size, 125, 900); c.textAlign = align; c.textBaseline = 'alphabetic';
  for (let i = depth; i > 0; i--) { c.fillStyle = side; c.fillText(s, x + i * 0.9, y + i * 0.9); }
  c.fillStyle = face; c.fillText(s, x, y); c.restore();
}
/** Screen shake from a list of hits [t0, amplitude px]: a fast decaying jitter (hash per frame, deterministic). */
function shakeAt(t: number, hits: [number, number][]): Pt {
  let a = 0; for (const [t0, amp] of hits) a += amp * hitP(t, t0, 0.07);
  return [(frameRand(t, 1) - 0.5) * 2 * a, (frameRand(t, 2) - 0.5) * 2 * a];
}
/** Draw img into the triangle d (source points s), via the affine map s -> d (clipped to the triangle). */
function affineTri(c: CanvasRenderingContext2D, img: CanvasImageSource, s: Pt[], d: Pt[]) {
  const [[x0, y0], [x1, y1], [x2, y2]] = s as [Pt, Pt, Pt], [[u0, v0], [u1, v1], [u2, v2]] = d as [Pt, Pt, Pt];
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  const a = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / den, b = ((v1 - v0) * (y2 - y0) - (v2 - v0) * (y1 - y0)) / den;
  const cc = ((u2 - u0) * (x1 - x0) - (u1 - u0) * (x2 - x0)) / den, dd = ((v2 - v0) * (x1 - x0) - (v1 - v0) * (x2 - x0)) / den;
  const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3, g = 1.012;   // grow the clip a hair: no seam between the triangles
  c.save(); poly(c, d.map(([u, v]) => [cx + (u - cx) * g, cy + (v - cy) * g])); c.clip();
  c.transform(a, b, cc, dd, u0 - a * x0 - cc * y0, v0 - b * x0 - dd * y0); c.drawImage(img, 0, 0); c.restore();
}
/** A canvas (w x h) mapped onto a quad TL, TR, BR, BL. */
function quad(c: CanvasRenderingContext2D, img: CanvasImageSource, w: number, h: number, q: Pt[]) {
  affineTri(c, img, [[0, 0], [w, 0], [0, h]], [q[0]!, q[1]!, q[3]!]);
  affineTri(c, img, [[w, h], [0, h], [w, 0]], [q[2]!, q[3]!, q[1]!]);
}
/** A heart path centred at (x, y), about `s` wide. */
function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const k = s / 2; c.beginPath(); c.moveTo(x, y + k * 0.9);
  c.bezierCurveTo(x - k * 1.4, y + k * 0.1, x - k * 0.9, y - k * 1.05, x, y - k * 0.35);
  c.bezierCurveTo(x + k * 0.9, y - k * 1.05, x + k * 1.4, y + k * 0.1, x, y + k * 0.9); c.closePath();
}
/** One ECG beat at offset d (s) from its R peak: P bump, Q dip, R spike, S dip, T bump (px, up is negative). */
function ecg(d: number) {
  const g = (m: number, w: number, a: number) => a * Math.exp(-((d - m) * (d - m)) / (2 * w * w));
  return g(-0.17, 0.03, 10) + g(-0.035, 0.008, -12) + g(0, 0.012, 95) + g(0.035, 0.01, -30) + g(0.22, 0.05, 16);
}

export default class RevealsV2 extends Scene {
  private layer = new Layer2D();
  private cues!: Cues;
  private lines: Line[] = [];
  private seq!: SeqCache;
  private info: Record<string, SeqInfo> = {};
  private screens: Record<string, HTMLImageElement> = {};
  private screenInfo: Record<string, { src: string; w: number; h: number; reply: number }> = {};
  private logo: HTMLImageElement | null = null;
  /** Set during prepare()'s dry run: every frame the draw at t asks for. */
  private dry: [string, number][] | null = null;
  private dryCtx = new OffscreenCanvas(4, 4).getContext('2d') as unknown as CanvasRenderingContext2D;
  private mon = document.createElement('canvas');   // the monitor's picture, mapped onto the keyed screen
  private tiny = document.createElement('canvas');  // a tiny copy of the actor frame: the soft background
  private numPath = new Map<string, Path2D>();

  override async init() {
    this.cues = await (await fetch('/data/reveals_v2/cues.json')).json();
    this.lines = (await (await fetch('/data/lyrics.json')).json()).lines;
    const media = await (await fetch('/data/reveals_v2/media.json')).json();
    const { screens, ...seqs } = media;
    this.info = seqs; this.seq = new SeqCache(seqs as Record<string, SeqInfo>);
    this.screenInfo = screens;
    for (const [k, s] of Object.entries(screens as Record<string, { src: string }>)) {
      const im = new Image(); im.src = s.src; await im.decode(); this.screens[k] = im;
    }
    try { const im = new Image(); im.src = 'brand/techpe-trek.jpg'; await im.decode(); this.logo = im; } catch { this.logo = null; }
    this.mon.width = 640; this.mon.height = 360; this.tiny.width = 40; this.tiny.height = 24;
    (window as any).__pdoomPrepare = (t: number) => this.prepare(t);
    (window as any).__revealsMisses = () => this.seq.misses;
    await this.prepare(0);
  }
  /** Decode every frame the draw at t uses (a dry run of the draw lists them), then prefetch the next few. */
  private async prepare(t: number) {
    this.dry = [];
    this.draw(this.dryCtx, t);
    const need = this.dry; this.dry = null;
    await Promise.all(need.map(([k, i]) => this.seq.load(k, i)));
    for (const [k, i] of need) for (let d = 1; d <= 6; d++) void this.seq.load(k, i + d);
  }
  private ev(n: string) { const v = this.cues.events[n]; if (typeof v !== 'number') throw new Error(`reveals cue missing: ${n}`); return v; }
  /** Frame of clip k at clip time lt (null in the dry run, which only records it). */
  private frame(k: string, lt: number): ImageBitmap | null {
    if (this.dry) { this.dry.push([k, this.seq.index(k, lt)]); return null; }
    return this.seq.get(k, lt);
  }
  /** Height of clip k fitted to width w (its own aspect: never stretched). */
  private hOf(k: string, w: number) { const m = this.info[k]!; return (w * m.h) / m.w; }

  // ================================================================ shared pieces
  private night(c: CanvasRenderingContext2D, glow = P.panel, a = 1) {
    c.fillStyle = P.night; c.fillRect(0, 0, FXW, FXH);
    const g = c.createRadialGradient(CX, 520, 40, CX, 520, 720);
    g.addColorStop(0, alpha(glow, 0.9 * a)); g.addColorStop(1, alpha(P.night, 0));
    c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
  }
  /** The six projects as small loops in two drifting columns (the hook's and the post's background). Fitted, not cropped. */
  private collage(c: CanvasRenderingContext2D, t: number, a: number) {
    if (a <= 0) return;
    const cols: string[][] = [['loop_A', 'loop_C', 'loop_E'], ['loop_B', 'loop_D', 'loop_F']];
    c.save(); c.globalAlpha *= a;
    cols.forEach((keys, ci) => {
      const w = 290, x = 8 + ci * 302, gap = 12;
      const hs = keys.map((k) => this.hOf(k, w)), tot = hs.reduce((p, q) => p + q + gap, 0);
      const drift = ((t * (ci ? 16 : 11)) % tot) * (ci ? 1 : -1);
      for (let rep = -1; rep <= 1; rep++) {
        let y = -60 + drift + rep * tot;
        keys.forEach((k, j) => {
          const h = hs[j]!;
          if (y < FXH && y + h > 0) {
            const img = this.frame(k, (t + j * 1.7 + ci * 0.9) % 6);
            if (img) { c.save(); rrect(c, x, y, w, h, 10); c.clip(); c.drawImage(img, x, y, w, h); c.restore(); }
          }
          y += h + gap;
        });
      }
    });
    c.restore();
  }
  /** The six loops in a 3 x 2 grid on the monitor's picture (640 x 360). */
  private monitorCollage(m: CanvasRenderingContext2D, t: number) {
    m.fillStyle = '#0B0C12'; m.fillRect(0, 0, 640, 360);
    ['loop_A', 'loop_B', 'loop_C', 'loop_D', 'loop_E', 'loop_F'].forEach((k, j) => {
      const cw = 206, chh = 168, x0 = 8 + (j % 3) * 210, y0 = 8 + Math.floor(j / 3) * 174;
      const iw = this.info[k]!.w, ih = this.info[k]!.h, s = Math.min(cw / iw, chh / ih), w = iw * s, h = ih * s;
      const img = this.frame(k, (t + j * 1.3) % 6);
      if (img) m.drawImage(img, x0 + (cw - w) / 2, y0 + (chh - h) / 2, w, h);
    });
  }
  /** A soft, dark version of an actor frame filling the column (cheap blur: 40 x 24 px, scaled up). */
  private softBg(c: CanvasRenderingContext2D, img: CanvasImageSource | null, a = 0.6) {
    if (!img || this.dry) return;
    const m = this.tiny.getContext('2d')!; m.imageSmoothingEnabled = true; m.drawImage(img, 0, 0, 40, 24);
    c.save(); c.globalAlpha *= a; c.imageSmoothingEnabled = true;
    c.drawImage(this.tiny, 4, 2, 32, 20, -FXW * 0.45, 0, FXW * 1.9, FXH); c.restore();
    c.fillStyle = 'rgba(6,6,11,0.55)'; c.fillRect(0, 0, FXW, FXH);
  }
  /** An actor shot in a window: source crop (cx, cy, width sw; the height follows the window) drawn into box. */
  private actor(c: CanvasRenderingContext2D, k: string, lt: number, b: Box, cx: number, cy: number, sw: number, r = 18, bg = false) {
    const img = this.frame(k, lt); if (bg) this.softBg(c, img);
    if (!img) return;
    const sh = (sw * b.h) / b.w, m = this.info[k]!;
    const sx = Math.max(0, Math.min(m.w - sw, cx - sw / 2)), sy = Math.max(0, Math.min(m.h - sh, cy - sh / 2));
    c.save(); rrect(c, b.x, b.y, b.w, b.h, r); c.clip(); c.drawImage(img, sx, sy, sw, sh, b.x, b.y, b.w, b.h); c.restore();
  }
  /** The keyed monitor shot: the picture (content) mapped onto the green screen's quad, the actor frame on top. */
  private monitorShot(c: CanvasRenderingContext2D, lt: number, b: Box, zoom: number, zc: Pt, content: (m: CanvasRenderingContext2D) => void) {
    const m = this.info.act_monitor!, img = this.frame('act_monitor', lt), q = m.corners?.[this.seq.index('act_monitor', lt)];
    const s = (b.w / m.w) * zoom, ox = b.x + b.w / 2 - zc[0] * s, oy = b.y + b.h / 2 - zc[1] * s;
    content(this.dry ? this.dryCtx : this.mon.getContext('2d')!);
    if (this.dry || !img) return;
    c.save(); c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.clip();
    c.fillStyle = P.night; c.fillRect(b.x, b.y, b.w, b.h);
    if (q) quad(c, this.mon, 640, 360, q.map(([x, y]) => [ox + x * s, oy + y * s] as Pt));
    c.drawImage(img, ox, oy, m.w * s, m.h * s);
    c.restore();
  }
  /** A clip in its frame: shadow, the picture (whole, its own aspect), a hairline. Optional circular reveal and glow. */
  private clip(c: CanvasRenderingContext2D, k: string, lt: number, b: Box, o: { glow?: string; reveal?: number; r?: number; line?: string } = {}) {
    const img = this.frame(k, lt), r = o.r ?? 14;
    if (o.glow) shadowed(c, 60, o.glow, () => fillRR(c, b.x, b.y, b.w, b.h, r, P.ink));
    else shadowed(c, 30, 'rgba(0,0,0,0.7)', () => fillRR(c, b.x, b.y, b.w, b.h, r, P.ink));
    c.save(); rrect(c, b.x, b.y, b.w, b.h, r); c.clip();
    if (o.reveal !== undefined && o.reveal < 1) {
      c.beginPath(); c.arc(b.x + b.w / 2, b.y + b.h / 2, Math.hypot(b.w, b.h) * 0.5 * o.reveal, 0, Math.PI * 2); c.clip();
    }
    if (img) c.drawImage(img, b.x, b.y, b.w, b.h);
    c.restore();
    rrect(c, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, r); c.strokeStyle = o.line ?? 'rgba(255,255,255,0.18)'; c.lineWidth = 1; c.stroke();
  }
  /** The big WHAT word: slams in from 2.3x on a spring, with a hard shadow; `copies` stacks echoes behind it. */
  private slam(c: CanvasRenderingContext2D, s: string, t: number, t0: number, x: number, y: number, size: number, o: { copies?: number; stretch?: number; col?: string; from?: number } = {}) {
    if (t < t0) return;
    const k = spring(t - t0, 0.32, 0.55), sc = lerp2(o.from ?? 2.3, 1, k);
    c.save(); c.translate(x, y); c.scale(sc * (o.stretch ?? 1), sc);
    c.font = ax(size, 125, 900); c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = o.copies ?? 0; i > 0; i--) {
      const j = (frameRand(t, i, 7) - 0.5) * 14;
      c.fillStyle = i % 2 ? alpha(P.lime, 0.55) : alpha(P.white, 0.25); c.fillText(s, i * 10 + j, i * 12 - j);
    }
    c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillText(s, 6, 8);
    c.lineWidth = size * 0.06; c.strokeStyle = P.night; c.strokeText(s, 0, 0);
    c.fillStyle = o.col ?? P.white; c.fillText(s, 0, 0);
    c.restore();
  }
  /** Narration captions (Roman Hinglish, the voice's own word times): one short line, the spoken word in lime. */
  private captions(c: CanvasRenderingContext2D, t: number) {
    const l = this.lines.find((x) => x.who === 'narrator' && t >= x.start - 0.15 && t <= x.end + 0.35);
    if (!l) return;
    const chunks: Word[][] = []; let cur: Word[] = [], n = 0;
    for (const w of l.words) { if (cur.length && n + w.w.length > 24) { chunks.push(cur); cur = []; n = 0; } cur.push(w); n += w.w.length + 1; }
    if (cur.length) chunks.push(cur);
    const ch = chunks.find((q, i) => t < (chunks[i + 1]?.[0]!.start ?? Infinity) - 0.02) ?? chunks[chunks.length - 1]!;
    c.font = ax(27, 100, 800); const sp = c.measureText(' ').width;
    const ws = ch.map((w) => c.measureText(w.w).width), tot = ws.reduce((p, q) => p + q, 0) + sp * (ch.length - 1);
    const a = Math.min(sat((t - l.start + 0.15) / 0.12), sat((l.end + 0.35 - t) / 0.15));
    c.save(); c.globalAlpha *= a;
    fillRR(c, CX - tot / 2 - 16, CAP_Y - 30, tot + 32, 44, 12, 'rgba(6,6,11,0.72)');
    let x = CX - tot / 2;
    ch.forEach((w, i) => {
      const on = t >= w.start - 0.04;
      txt(c, w.w, x, CAP_Y, ax(27, 100, 800), on && t < (ch[i + 1]?.start ?? l.end + 0.2) ? P.lime : on ? P.white : alpha(P.white, 0.5));
      x += ws[i]! + sp;
    });
    c.restore();
  }

  // ================================================================ helpers kept from v1
  /** The post's header on the monitor (for the dive). */
  private monitorPost(m: CanvasRenderingContext2D) {
    if (this.dry) return;
    m.fillStyle = '#15202B'; m.fillRect(0, 0, 640, 360);
    const im = this.screens.t1_dark!; const s = 600 / im.width;
    m.drawImage(im, 0, 0, im.width, 360 / s, 20, 0, 600, 360);
  }

  /** Text arced around the launched frame. */
  private arcText(c: CanvasRenderingContext2D, s: string, cx: number, cy: number, r: number, lt: number) {
    const k = outP(sat(lt / 0.3), 3);
    c.save(); c.font = ax(44, 125, 900); c.textAlign = 'center'; c.textBaseline = 'middle';
    const span_ = Math.PI * 0.95 * k, n = s.length;   // along the bottom of the frame, like a grin
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + span_ / 2 - (span_ * (i + 0.5)) / n;
      c.save(); c.translate(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 1.12); c.rotate(a - Math.PI / 2);
      c.fillStyle = P.night; c.fillText(s[i]!, 3, 4); c.fillStyle = i % 2 ? P.lime : P.white; c.fillText(s[i]!, 0, 0); c.restore();
    }
    c.restore();
  }

  /** Confetti erupting from the bottom (the computer), deterministic per piece. */
  private confetti(c: CanvasRenderingContext2D, t: number, t0: number) {
    const lt = t - t0; if (lt <= 0) return;
    const cols = [P.lime, P.fire, P.blue, P.red, P.gold, P.white];
    for (let i = 0; i < 90; i++) {
      const d = lt - hash(i, 3) * 0.35; if (d <= 0) continue;
      const vx = (hash(i, 1) - 0.5) * 520, vy = -(620 + hash(i, 2) * 620), g = 900;
      const x = CX + (hash(i, 4) - 0.5) * 300 + vx * d, y = 1100 + vy * d + 0.5 * g * d * d;
      if (y > 1120) continue;
      const rot = d * (4 + hash(i, 5) * 8), w = 7 + hash(i, 6) * 7;
      c.save(); c.translate(x, y); c.rotate(rot); c.scale(1, Math.abs(Math.cos(rot * 1.7)) * 0.9 + 0.1);
      c.fillStyle = cols[i % cols.length]!; c.fillRect(-w / 2, -w * 0.3, w, w * 0.6); c.restore();
    }
  }

  /** The post card tilted back (rotateX) by drawing it in horizontal strips with a perspective scale. */
  private tiltCard(c: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number, tilt: number, horizon: number) {
    if (tilt < 0.002) { c.save(); rrect(c, x, y, w, h, 16); c.clip(); c.drawImage(im, x, y, w, h); c.restore(); return; }
    const N = 28, f = 1400, cx = x + w / 2;
    for (let i = 0; i < N; i++) {
      const v0 = i / N, v1 = (i + 1) / N;
      const pr = (v: number) => { const yy = y + v * h - horizon, z = yy * Math.sin(tilt); return { y: horizon + (yy * Math.cos(tilt) * f) / (f + z), s: f / (f + z) }; };
      const a = pr(v0), b = pr(v1), s = (a.s + b.s) / 2;
      c.drawImage(im, 0, v0 * im.height, im.width, (v1 - v0) * im.height + 1, cx - (w * s) / 2, a.y, w * s, b.y - a.y + 0.6);
    }
  }

  /** Floating sparks around (never over) the wildfire clip. */
  private sparks(c: CanvasRenderingContext2D, t: number, b: Box) {
    for (let i = 0; i < 46; i++) {
      const sp = 40 + hash(i, 1) * 90, x = hash(i, 2) * FXW + Math.sin(t * (0.8 + hash(i, 3)) + i) * 14;
      const y = FXH + 40 - ((t * sp + hash(i, 4) * 1200) % 1200);
      if (x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4) continue;
      const fl = 0.4 + 0.6 * hash(i, Math.floor(t * 12));
      disc(c, x, y, 1.2 + hash(i, 5) * 2.2, alpha(i % 3 ? P.ember : P.fire, 0.75 * fl));
    }
  }

  private notebook(c: CanvasRenderingContext2D) {
    c.fillStyle = P.paper; c.fillRect(0, 0, FXW, FXH);
    c.strokeStyle = alpha(P.rule, 0.7); c.lineWidth = 1.2;
    for (let y = 120; y < FXH; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(FXW, y); c.stroke(); }
    c.strokeStyle = alpha(P.margin, 0.75); c.lineWidth = 1.6; c.beginPath(); c.moveTo(62, 0); c.lineTo(62, FXH); c.stroke();
  }

  /** A numeral's outline (Archivo wide black) as a path, cached. */
  private numOutline(s: string, x: number, y: number, size: number) {
    const key = `${s}|${x}|${y}|${size}`; let p = this.numPath.get(key);
    if (!p) {   // glyph by glyph: opentype.js cannot apply this font's contextual substitutions
      const fo = ot(F.archivo(125, 900)); p = new Path2D(); let xx = x;
      for (const ch of s) { const g = fo.charToGlyph(ch); p.addPath(new Path2D(g.getPath(xx, y, size).toPathData(2))); xx += ((g.advanceWidth ?? 0) * size) / fo.unitsPerEm; }
      this.numPath.set(key, p);
    }
    return p;
  }

  private fieldLines(c: CanvasRenderingContext2D, t: number, a: number, cx: number, cy: number, n = 14, grow = 1) {
    if (a <= 0) return;
    c.save(); c.lineWidth = 1.6; c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const kk = 50 + i * 34, fl = 0.55 + 0.45 * frameRand(t, i, 41);
      c.strokeStyle = alpha(i % 3 ? P.blue : P.cyan, a * fl * 0.8);
      for (const sgn of [-1, 1]) {
        c.beginPath();
        const th1 = 0.05 + (Math.PI - 0.1) * Math.min(1, grow * 1.3 + 0.05);
        for (let s = 0; s <= 60; s++) {
          const th = 0.05 + ((th1 - 0.05) * s) / 60, r = kk * Math.sin(th) ** 2, x = cx + r * Math.cos(th) * 1.25, y = cy + sgn * r * Math.sin(th);
          if (s) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
      }
    }
    c.restore();
  }

  // ================================================================ 0-4 s: WHAT?! ... WHAAAAAATTTTT?! (v2: two WHATs)
  private hook(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.night(c); this.collage(c, t, 0.3);
    c.fillStyle = 'rgba(6,6,11,0.35)'; c.fillRect(0, 0, FXW, FXH);
    const [sx, sy] = shakeAt(t, [[E('hit1'), 6], [E('hit3'), 16], [E('drop'), 18], [E('land'), 9]]);
    c.save(); c.translate(sx, sy);
    if (t < E('zoom2')) {
      // at his monitor, the six projects playing on it, a slow push-in; "WHAT?!" is there from the first frame
      const z = 1 + 0.06 * (t / E('zoom2'));
      this.monitorShot(c, 1.6 + t, { x: 0, y: 330, w: FXW, h: 342 }, z, [700, 340], (m) => this.monitorCollage(m, t));
      this.slam(c, 'WHAT?!', t, E('hit1'), CX, 230, 96, { from: 1.12 });
    } else if (t < E('drop')) {
      // crash zoom into his face (hand over his mouth): "WHAAAAAATTTTT?!" stretches until it spans the frame
      const k = outExpo(span(t, E('zoom2'), E('zoom2') + 0.22)), p = hitP(t, E('hit3'), 0.12);
      const b = { x: lerp2(0, 24, k), y: lerp2(330, 150, k), w: lerp2(FXW, FXW - 48, k), h: lerp2(342, 700, k) };
      c.save(); c.translate(CX, 500); c.scale(1 + 0.06 * p, 1 + 0.06 * p); c.translate(-CX, -500);
      if (k < 0.5) this.monitorShot(c, 1.6 + t, b, 1.06 + 1.6 * k, [760, 330], (m) => this.monitorCollage(m, t));
      else this.actor(c, 'act_mouth', 4.5 + (t - E('zoom2')), b, 640, 330, lerp2(1100, 560, k), 18, true);
      c.restore();
      if (t >= E('hit3')) {
        c.font = ax(64, 125, 900); const fit = (FXW - 20) / c.measureText('WHAAAAAATTTTT?!').width;
        const st = fit * lerp2(0.45, 1, outP(span(t, E('hit3'), E('hit3') + 0.45), 3));
        this.slam(c, 'WHAAAAAATTTTT?!', t, E('hit3'), CX, 540, 64, { stretch: st, copies: 2 });
      }
    } else if (t < E('land') + 0.25) {
      // the drop: he flings his arms out; on the boing the frame freezes and LAUNCHES (comic freeze-frame), confetti flies
      const freeze = t >= E('boing'), lt = freeze ? 1.4 : 1.15 + (t - E('drop'));
      const up = freeze ? Math.sin(Math.PI * sat((t - E('boing')) / (E('land') - E('boing')))) : 0;
      const land = hitP(t, E('land'), 0.06);
      const wob = freeze ? 1 + 0.07 * Math.sin((t - E('boing')) * 34) * Math.exp(-(t - E('boing')) * 5) : 1;
      const b = { x: 44, y: 230, w: FXW - 88, h: 640 };
      c.save(); c.translate(CX, 550 - 150 * up); c.rotate(-0.06 * up); c.scale(wob * (1 + 0.04 * land), wob * (1 - 0.06 * land)); c.translate(-CX, -550);
      if (freeze) shadowed(c, 50, alpha(P.lime, 0.6), () => fillRR(c, b.x - 8, b.y - 8, b.w + 16, b.h + 16, 26, P.lime));
      this.actor(c, 'act_celebrate', lt, b, 780, 330, 600, 18, !freeze);
      c.restore();
      if (freeze) this.arcText(c, 'WHAAAAAATTTTT?!', CX, 520 - 150 * up, 330, t - E('boing'));
      this.confetti(c, t, E('drop'));
    } else {
      // the dive: back at his monitor, the post on it; we fly into the screen
      const k = inP(span(t, E('dive') + 0.25, E('post.in')), 3);
      this.monitorShot(c, 3.2 + (t - E('dive')), { x: 0, y: 0, w: FXW, h: FXH }, lerp2(1.75, 9, k), [lerp2(560, 400, k), lerp2(330, 320, k)], (m) => this.monitorPost(m));
    }
    c.restore();
    // a white flash on the later hits (frame 0 stays crisp)
    const fl = Math.max(hitP(t, E('hit3'), 0.05), hitP(t, E('drop'), 0.06));
    if (fl > 0.02) { c.fillStyle = `rgba(255,255,255,${0.35 * fl})`; c.fillRect(0, 0, FXW, FXH); }
  }

  // ================================================================ 4-14 s: CLAUDE JUST POSTED THIS (panel 0)
  // v2: the card lies flat and sharp once it settles; the thread moves one post at a time (a 0.45 s glide, then a hold),
  // each reply shown once (from its own avatar down), and no motion ghosts.
  private postedPanel(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.night(c); this.collage(c, t, 0.22); c.fillStyle = 'rgba(6,6,11,0.5)'; c.fillRect(0, 0, FXW, FXH);
    const settle = outP(span(t, E('post.in'), E('post.in') + 0.6), 3), sc = lerp2(1.9, 1, settle), tilt = 0.3 * (1 - settle);
    const W = 520 * sc, x0 = CX - W / 2, k1 = W / 1075;
    const parts = ['t1_dark', 't2_dark', 't3_dark', 't4_dark', 't5_dark', 't6_dark', 't7_dark'].map((k) => {
      const s = this.screenInfo[k]!; return { im: this.screens[k]!, y0: s.reply, ih: s.h - s.reply, h: (s.h - s.reply) * k1 };
    });
    const tops: number[] = []; let acc = 0; for (const p of parts) { tops.push(acc); acc += p.h + 26; }
    let off = 0;
    this.cues.scroll.forEach((s0, k) => { off += (tops[k + 1]! - tops[k]!) * inOutP(span(t, s0, s0 + 0.45), 3); });
    const yTop = lerp2(150, 318, settle) - off;
    c.save();
    if (settle >= 1) { c.beginPath(); c.rect(0, 292, FXW, FXH - 292); c.clip(); }
    parts.forEach((p, i) => {
      const y = yTop + tops[i]!;
      if (this.dry || y > FXH + 20 || y + p.h < 260) return;
      if (i === 0 && tilt > 0.002) this.tiltCard(c, p.im, x0, y, W, p.h, tilt, 320);
      else { c.save(); rrect(c, x0, y, W, p.h, 16); c.clip(); c.drawImage(p.im, 0, p.y0, p.im.width, p.ih, x0, y, W, p.h); c.restore(); }
    });
    // highlights on the first post: the account name, then its first line
    if (!this.dry && off < 1) {
      const hl = (bx: number, by: number, bw: number, bh: number, a: number) => {
        if (a <= 0) return;
        c.save(); c.globalAlpha *= a; c.lineWidth = 3; c.strokeStyle = P.lime;
        shadowed(c, 18, P.lime, () => { rrect(c, x0 + bx * k1, yTop + by * k1, bw * k1, bh * k1, 10); c.stroke(); });
        c.restore();
      };
      hl(140, 22, 300, 100, outP(span(t, 4.55, 4.8)) * (1 - span(t, 5.5, 5.7)));
      hl(24, 150, 1020, 330, outP(span(t, 5.65, 5.9)) * (1 - span(t, 8.3, 8.6)));
    }
    c.restore();
    c.save(); c.globalAlpha *= settle;
    txt(c, 'SOURCE: @claudeai ON X · OCT 16, 2026 · X EMBED', CX, 300, mono(12, 600), P.dim, 0.6, 'center');
    c.restore();
    // three text beats
    const b1 = E('post.t1'), b2 = E('post.t2'), b3 = E('post.t3');
    if (t < b2 + 0.1) {
      const q = 1 - span(t, b2 - 0.05, b2 + 0.1);
      c.save(); c.globalAlpha *= q;
      maskUp(c, 'CLAUDE JUST', CX, 170, 48, span(t, b1 + 0.05, b1 + 0.4), ax(48, 125, 900), P.white, 'center');
      maskUp(c, 'SHOWED THE WORLD…', CX, 226, 40, span(t, b1 + 0.2, b1 + 0.6), ax(40, 125, 900), P.white, 'center');
      c.restore();
    } else if (t < b3) {
      const p = spring(t - b2, 0.35, 0.6);
      c.save(); c.translate(CX, 205); c.scale(lerp2(1.6, 1, p), lerp2(1.6, 1, p));
      shadowed(c, 30, alpha(P.lime, 0.5), () => txt(c, 'SIX REAL BUILDS', 0, 0, ax(44, 125, 900), P.lime, 0, 'center'));
      c.restore();
      maskUp(c, 'FEATURED BY @claudeai', CX, 250, 18, span(t, b2 + 0.3, b2 + 0.6), mono(18, 600), P.white, 'center', 1);
    } else {
      maskUp(c, 'AND WAIT FOR', CX, 175, 46, span(t, b3, b3 + 0.3), ax(46, 125, 900), P.white, 'center');
      maskUp(c, 'THE LAST TWO.', CX, 232, 46, span(t, b3 + 0.12, b3 + 0.42), ax(46, 125, 900), P.fire, 'center');
    }
  }

  // ================================================================ the five reveals (panels 1-6), one slide between each
  /** A panel's number in its own header (it arrives with the clip: never a frame of its own). */
  private header(c: CanvasRenderingContext2D, s: string, face: string | CanvasGradient, side: string) { bigNum(c, s, 26, 318, 128, face, side, 8); }

  private panelR1(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.night(c, '#3A1408', 0.9 + 0.1 * Math.sin(t * 2.3));
    const b: Box = { x: 14, y: 372, w: 580, h: this.hOf('A2', 580) };
    this.sparks(c, t, b);
    this.clip(c, 'A2', t - E('pan.r1'), b, { glow: alpha(P.fire, 0.55) });
    const g = c.createLinearGradient(0, 200, 0, 318); g.addColorStop(0, P.gold); g.addColorStop(1, P.fire);
    this.header(c, '01', g, '#5A1A05');
    maskUp(c, 'WILDFIRE', 590, 262, 52, span(t, E('r1.title'), E('r1.title') + 0.35), ax(52, 62, 900), P.white, 'right');
    maskUp(c, 'ANALYSIS', 590, 316, 52, span(t, E('r1.title') + 0.12, E('r1.title') + 0.47), ax(52, 62, 900), P.ember, 'right');
    credit(c, 'A', 16, b.y + b.h + 30, 1, P.ember);
    if (t >= E('r1.title') + 0.6) chip(c, 'BUILT WITH OPUS 5.5', 16, b.y + b.h + 74, 19, P.night, P.fire);
    if (t >= E('r1.label')) {
      c.save(); c.globalAlpha *= span(t, E('r1.label'), E('r1.label') + 0.3);
      txt(c, 'PROTOTYPE · not a verified emergency-response system', 16, b.y + b.h + 116, mono(13.5, 600), alpha(P.ember, 0.9), 0.2);
      c.restore();
    }
  }
  private panelR2(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.notebook(c);
    const b: Box = { x: 14, y: 372, w: 580, h: this.hOf('B', 580) };
    // "02" in ballpoint: the outline drawn on as the page lands, then hatched
    const p = span(t, E('pan.r2') + 0.2, E('pan.r2') + 0.75), path = this.numOutline('02', 28, 318, 150);
    c.save(); c.lineJoin = 'round'; c.strokeStyle = P.inkBlue; c.lineWidth = 3.2;
    c.setLineDash([2600 * p, 2600]); c.stroke(path); c.translate(1.5, 1); c.globalAlpha *= 0.5; c.stroke(path); c.restore();
    if (p > 0.7) {
      c.save(); c.clip(path); c.strokeStyle = alpha(P.inkBlue, 0.55 * span(p, 0.7, 1)); c.lineWidth = 2;
      for (let i = -20; i < 40; i++) { c.beginPath(); c.moveTo(20 + i * 9, 330); c.lineTo(20 + i * 9 + 120, 160); c.stroke(); }
      c.restore();
    }
    c.save(); c.rotate(-0.025);
    maskUp(c, 'NOTEBOOK', 598, 270, 50, span(t, E('r2.title'), E('r2.title') + 0.35), ax(50, 62, 900), P.inkBlue, 'right');
    maskUp(c, 'CHESS', 598, 326, 50, span(t, E('r2.title') + 0.12, E('r2.title') + 0.47), ax(50, 62, 900), P.graphite, 'right');
    c.restore();
    this.clip(c, 'B', t - E('pan.r2'), b, { line: alpha(P.graphite, 0.4), r: 6 });
    for (const [tx, ty, rot] of [[b.x - 14, b.y - 10, -0.5], [b.x + b.w - 50, b.y - 12, 0.45]] as const) {
      c.save(); c.translate(tx + 32, ty + 10); c.rotate(rot); fillRR(c, -34, -11, 68, 22, 2, 'rgba(236,220,170,0.75)'); c.restore();
    }
    credit(c, 'B', 16, b.y + b.h + 30, 1, P.inkBlue);
    if (t >= E('r2.model')) {
      const w = chip(c, 'SONNET 5.5', 16, b.y + b.h + 74, 19, P.paper, P.inkBlue);
      const q = span(t, E('r2.model') + 0.1, E('r2.model') + 0.5);
      c.save(); c.strokeStyle = P.stamp; c.lineWidth = 2.4; c.beginPath();
      c.ellipse(16 + w / 2, b.y + b.h + 66, w / 2 + 14, 24, -0.04, -1.2, -1.2 + Math.PI * 2.1 * q); c.stroke(); c.restore();
    }
  }
  /** The workshop page of reveal 03 (both halves): cream, faint letterpress glyphs, the "03" stamp. */
  private workshop(c: CanvasRenderingContext2D, t: number, stampAt: number) {
    c.fillStyle = P.cream; c.fillRect(0, 0, FXW, FXH);
    c.save(); c.font = ax(420, 62, 900); c.fillStyle = alpha(P.brown, 0.05); c.textAlign = 'center';
    c.fillText('Ag', CX + Math.sin(t * 0.3) * 20, 700); c.font = ax(260, 125, 900); c.fillText('&', 470, 1020); c.restore();
    const k = spring(t - stampAt, 0.22, 0.5), s = lerp2(1.7, 1, k);
    c.save(); c.translate(118, 262); c.rotate(-0.09); c.scale(s * 0.9, s * 0.9);
    rrect(c, -110, -84, 220, 146, 12); c.strokeStyle = P.stamp; c.lineWidth = 6; c.stroke();
    txt(c, '03', 0, 48, ax(132, 125, 900), P.stamp, 0, 'center');
    for (let i = 0; i < 60; i++) disc(c, (hash(i, 21) - 0.5) * 210, (hash(i, 22) - 0.5) * 130, 1 + hash(i, 23) * 2.6, alpha(P.cream, 0.7));
    c.restore();
  }
  private panelR3a(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.workshop(c, t, E('pan.r3') + 0.35);
    const b: Box = { x: 14, y: 372, w: 580, h: this.hOf('C1', 580) };
    maskUp(c, '120 HANDWRITTEN', 594, 252, 34, span(t, E('r3.pages'), E('r3.pages') + 0.35), ax(34, 100, 900), P.inkBlue, 'right');
    maskUp(c, 'PAGES', 594, 292, 34, span(t, E('r3.pages') + 0.1, E('r3.pages') + 0.45), ax(34, 100, 900), P.inkBlue, 'right');
    // the pages, then (a page turn) the finished font
    const tu = E('r3.turn'), turn = Math.abs(Math.cos(Math.PI * span(t, tu - 0.12, tu + 0.12)));
    const key = t < tu ? 'C1' : 'C2', lt = t < tu ? t - E('pan.r3') : t - tu;
    c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(turn, 1); c.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
    this.clip(c, key, lt, b, { line: alpha(P.brown, 0.4), r: 8 });
    c.restore();
    credit(c, 'C', 16, b.y + b.h + 30, 1, P.brown);
    if (t >= E('r3.font')) {
      maskUp(c, '= ONE WORKING FONT', 16, b.y + b.h + 84, 40, span(t, E('r3.font'), E('r3.font') + 0.35), ax(40, 100, 900), P.stamp);
      if (t >= E('r3.model')) chip(c, 'OPUS 5.5', 16, b.y + b.h + 132, 18, P.cream, P.brown);
    }
  }
  private panelR3b(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.workshop(c, t, -1);
    const fb: Box = { x: 84, y: 340, w: 440, h: 440 };
    this.clip(c, 'F', t - E('pan.r3b'), fb, { line: alpha(P.brown, 0.4), r: 8 });
    if (t >= E('r3.haiku')) chip(c, 'HAIKU 5.5', 594, 304, 18, P.cream, P.brown, 'right');
    maskUp(c, '20 HAIKU', 594, 270, 46, span(t, E('r3.twenty'), E('r3.twenty') + 0.35), ax(46, 125, 900), P.stamp, 'right');
    credit(c, 'F', fb.x, fb.y + fb.h + 28, 1, P.brown);
    maskUp(c, 'ANIMATION DRAWN IN JAVASCRIPT', CX, fb.y + fb.h + 72, 22, span(t, E('r3.js'), E('r3.js') + 0.35), ax(22, 100, 900), P.inkBlue, 'center');
  }
  private panelR4(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    c.fillStyle = '#020308'; c.fillRect(0, 0, FXW, FXH);
    const b: Box = { x: 9, y: 362, w: 590, h: this.hOf('D', 590) };
    this.fieldLines(c, t, 0.2, CX, b.y + b.h / 2, 12, 1);
    this.clip(c, 'D', t - E('pan.r4'), b, { glow: alpha(P.blue, 0.55) });
    c.save(); c.translate(26, 318); c.font = ax(128, 125, 900);
    shadowed(c, 30, P.blue, () => { c.lineWidth = 3; c.strokeStyle = P.cyan; c.strokeText('04', 0, 0); });
    c.fillStyle = alpha(P.cyan, 0.18); c.fillText('04', 0, 0); c.restore();
    maskUp(c, 'INTERACTIVE', 594, 238, 30, span(t, E('r4.title'), E('r4.title') + 0.3), ax(30, 100, 900), P.cyan, 'right');
    maskUp(c, 'ELECTROMAGNETIC', 594, 274, 30, span(t, E('r4.title') + 0.1, E('r4.title') + 0.4), ax(30, 100, 900), P.white, 'right');
    maskUp(c, 'FIELD', 594, 310, 30, span(t, E('r4.title') + 0.2, E('r4.title') + 0.5), ax(30, 100, 900), P.white, 'right');
    credit(c, 'D', 16, b.y + b.h + 30, 1, P.cyan);
    if (t >= E('r4.push')) {
      c.save(); c.globalAlpha *= span(t, E('r4.push'), E('r4.push') + 0.3);
      txt(c, 'SEE IT · PUSH IT AROUND', 16, b.y + b.h + 66, mono(15, 600), P.cyan, 1); c.restore();
    }
    if (t >= E('r4.model')) chip(c, 'OPUS 5.5', 16, b.y + b.h + 110, 19, P.night, P.cyan);
    // the actor, small, in a side window: "No. Way."
    const nw = E('r4.noway');
    if (t >= nw - 0.15) {
      const k = outP(span(t, nw - 0.15, nw + 0.15), 3), wb: Box = { x: 392, y: 768, w: 190, h: 176 };
      c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 40);
      shadowed(c, 24, alpha(P.blue, 0.7), () => fillRR(c, wb.x - 3, wb.y - 3, wb.w + 6, wb.h + 6, 16, P.blue));
      this.actor(c, 'act_mouth', 6.0 + (t - nw), wb, 640, 300, 500, 14);
      txt(c, 'No. Way.', wb.x - 16, wb.y + 106, ax(34, 100, 900, true), P.white, 0, 'right');
      c.restore();
    }
  }
  private panelR5(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    c.fillStyle = '#030204'; c.fillRect(0, 0, FXW, FXH);
    const gl = c.createRadialGradient(CX, 540, 40, CX, 540, 700); gl.addColorStop(0, alpha(P.redD, 0.35)); gl.addColorStop(1, alpha(P.night, 0));
    c.fillStyle = gl; c.fillRect(0, 0, FXW, FXH);
    const b: Box = { x: 9, y: 352, w: 590, h: this.hOf('E', 590) };
    this.clip(c, 'E', t - E('pan.r5'), b, { glow: alpha(P.red, 0.45) });
    this.header(c, '05', P.white, P.redD);
    maskUp(c, '3D CARDIOLOGY', 594, 268, 34, span(t, E('r5.title'), E('r5.title') + 0.3), ax(34, 100, 900), P.white, 'right');
    maskUp(c, 'TRAINING', 594, 310, 34, span(t, E('r5.title') + 0.1, E('r5.title') + 0.4), ax(34, 100, 900), P.red, 'right');
    credit(c, 'E', 16, b.y + b.h + 30, 1, '#FF8FA3', ' · AngioView');
    const lab = 1 - span(t, E('r5.range1') - 0.25, E('r5.range1'));   // the chip and the label give way to the range line
    c.save(); c.globalAlpha *= lab;
    if (t >= E('r5.fellow')) chip(c, 'BUILT BY A CARDIOLOGY FELLOW', 16, b.y + b.h + 72, 17, P.white, P.redD);
    if (t >= E('r5.label')) {
      c.save(); c.globalAlpha *= span(t, E('r5.label'), E('r5.label') + 0.3);
      txt(c, 'EDUCATIONAL TOOL · not a clinically validated diagnostic system', 16, b.y + b.h + 112, mono(12.5, 600), '#FF8FA3', 0.1);
      c.restore();
    }
    c.restore();
    const y0 = b.y + b.h + 74;
    maskUp(c, 'FROM NOTEBOOK GAMES…', 16, y0, 28, span(t, E('r5.range1'), E('r5.range1') + 0.3), ax(28, 100, 900), '#9DB8FF');
    maskUp(c, '…TO MEDICAL EDUCATION.', 16, y0 + 38, 28, span(t, E('r5.range2'), E('r5.range2') + 0.3), ax(28, 100, 900), '#FF8FA3');
    if (t >= E('r5.range3')) {
      const p = spring(t - E('r5.range3'), 0.3, 0.55);
      c.save(); c.translate(16, y0 + 92); c.scale(lerp2(1.4, 1, p), lerp2(1.4, 1, p));
      shadowed(c, 24, alpha(P.lime, 0.5), () => txt(c, "THAT'S THE RANGE.", 0, 0, ax(40, 125, 900), P.lime));
      c.restore();
    }
  }
  private panel(c: CanvasRenderingContext2D, i: number, t: number) {
    [this.postedPanel, this.panelR1, this.panelR2, this.panelR3a, this.panelR3b, this.panelR4, this.panelR5][i]!.call(this, c, t);
  }
  /**
   * 4-69 s: the post and the five reveals as one strip of panels. Each slide (cues.pans, 0.5 s, ease in-out) starts the moment
   * a line ends: the outgoing panel moves off to the left as the next one comes in, edge to edge, a soft shadow on the seam.
   */
  private reveals(c: CanvasRenderingContext2D, t: number) {
    let pos = 0; for (const [a, b] of this.cues.pans) pos += inOutP(span(t, a, b), 3);
    const i0 = Math.floor(pos + 1e-6), f = pos - i0;
    for (const i of [i0, i0 + 1]) {
      if (i > 6 || (i === i0 + 1 && f < 1e-6)) continue;
      c.save(); c.translate((i - pos) * FXW, 0);   // edge to edge: no gap between the panels
      c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
      this.panel(c, i, t);
      c.restore();
    }
    if (f > 1e-6) {   // the seam: a soft shadow on the incoming edge
      const x = (i0 + 1 - pos) * FXW, g = c.createLinearGradient(x - 40, 0, x, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); c.fillStyle = g; c.fillRect(x - 40, 0, 40, FXH);
    }
  }

  // ================================================================ 69-76 s: THE FINAL REACTION
  private final(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    const big = span(t, E('fin.smile'), E('fin.smile') + 0.45), bk = inOutP(big, 3);
    const win: Box = { x: lerp2(104, 174, bk), y: lerp2(200, 132, bk), w: lerp2(400, 260, bk), h: lerp2(500, 325, bk) };
    const cuts = [E('fin.cuts'), E('fin.cuts') + 0.25];
    const ci = t >= cuts[0]! && t < E('fin.smile') ? Math.min(1, Math.floor((t - cuts[0]!) / 0.25)) : -1;
    if (ci === 0) this.monitorShot(c, 2.4, { x: 0, y: 0, w: FXW, h: FXH }, 1.7, [700, 340], (m) => this.monitorCollage(m, t));
    else {
      const k = ci === 1 ? 'act_mouth' : t < E('fin.smile') ? 'act_stare' : 'act_smile';
      const lt = ci === 1 ? 4.9 : t < E('fin.smile') ? 0.5 + (t - E('fin.impact')) : t - E('fin.smile');   // the smile: its 5 s to the end
      const img = this.frame(k, lt); this.softBg(c, img, 0.7);
      c.fillStyle = 'rgba(6,6,11,0.25)'; c.fillRect(0, 0, FXW, FXH);
      shadowed(c, 40, alpha(P.lime, 0.4), () => fillRR(c, win.x - 4, win.y - 4, win.w + 8, win.h + 8, 22, alpha(P.lime, 0.9)));
      this.actor(c, k, lt, win, k === 'act_smile' ? 600 : 620, 320, 520, 18);
    }
    if (ci >= 0) {
      const s = ['WHAT?!', 'WHAAAAAATTTTT?!'][ci]!, size = ci === 1 ? 64 : 76;
      c.font = ax(size, 125, 900); const fit = Math.min(1, (FXW - 24) / c.measureText(s).width);
      this.slam(c, s, t, cuts[ci]!, CX, 860, size, { copies: ci, stretch: fit, from: 1.25 });
    }
    // the five cards orbit him
    if (ci < 0) {
      const keys = ['A2', 'B', 'C2', 'D', 'E'], ccx = win.x + win.w / 2, ccy = win.y + win.h / 2;
      const fly = outP(span(t, E('fin.impact') + 0.1, E('fin.impact') + 0.6), 3);
      const order = keys.map((k, i) => ({ k, i, a: (i / 5) * 6.283 + (t - E('fin.impact')) * 0.5 })).sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
      for (const { k, i, a } of order) {
        const rx = lerp2(0, 250 - 40 * bk, fly), ry = lerp2(0, 300 - 80 * bk, fly), z = Math.sin(a);
        const x = ccx + Math.cos(a) * rx, y = ccy + z * ry * 0.35 + Math.cos(a * 2) * 10 + Math.sin(a) * ry * 0.5;
        const w = (104 + 26 * z) * (1 - 0.2 * bk), h = this.hOf(k, w), im = this.frame(k, this.info[k]!.n / this.info[k]!.fps - 0.05);
        c.save(); c.globalAlpha *= fly * (0.75 + 0.25 * z);
        shadowed(c, 14, 'rgba(0,0,0,0.6)', () => fillRR(c, x - w / 2, y - h / 2, w, h, 8, P.ink));
        if (im) { c.save(); rrect(c, x - w / 2, y - h / 2, w, h, 8); c.clip(); c.drawImage(im, x - w / 2, y - h / 2, w, h); c.restore(); }
        chip(c, `0${i + 1}`, x - w / 2 - 6, y - h / 2 + 2, 12, P.night, P.lime);
        c.restore();
      }
    }
    // the pencil drops
    const pd = E('fin.impact') + 0.3;
    if (t >= pd && t < E('fin.cuts')) {
      const k = sat((t - pd) / 0.45), y = lerp2(win.y + 80, win.y + win.h + 30, k * k), rot = 0.4 + k * 3;
      c.save(); c.translate(win.x + win.w * 0.78, y); c.rotate(rot);
      fillRR(c, -5, -46, 10, 80, 2, P.gold); poly(c, [[-5, 34], [5, 34], [0, 48]]); c.fillStyle = '#E8C9A0'; c.fill(); fillRR(c, -5, -52, 10, 8, 2, '#E36F8A');
      c.restore();
    }
    // the 05 panel gives way: it shrinks into the cards' centre and fades
    const col = inOutP(span(t, E('fin.impact'), E('fin.impact') + 0.45), 3);
    if (col < 1) {
      c.save(); c.globalAlpha *= 1 - col; c.translate(CX, 540); c.scale(1 - 0.5 * col, 1 - 0.5 * col); c.translate(-CX, -540);
      this.panelR5(c, t); c.restore();
    }
    // the question, the CTA, the credits
    const tq = E('fin.q');
    if (t >= tq) {
      const y0 = 562;
      maskUp(c, 'WHAT WOULD YOU', CX, y0, 52, span(t, tq, tq + 0.3), ax(52, 100, 900), P.white, 'center');
      maskUp(c, 'BUILD WITH', CX, y0 + 60, 52, span(t, tq + 0.1, tq + 0.4), ax(52, 100, 900), P.white, 'center');
      c.save(); const p = spring(t - tq - 0.25, 0.35, 0.55); c.translate(CX, y0 + 128); c.scale(lerp2(1.5, 1, p), lerp2(1.5, 1, p));
      if (t >= tq + 0.25) shadowed(c, 30, alpha(P.lime, 0.6), () => txt(c, 'CLAUDE?', 0, 0, ax(70, 125, 900), P.lime, 0, 'center'));
      c.restore();
    }
    if (t >= E('fin.cta')) {
      const k = outP(span(t, E('fin.cta'), E('fin.cta') + 0.3), 3);
      c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 20);
      chip(c, 'COMMENT YOUR IDEA ↓', CX, 778, 24, P.night, P.lime, 'center');
      const hit = hitP(t, E('fin.hit'), 0.1), ls = 40 * (1 + 0.25 * hit);
      c.font = ax(26, 100, 900); const fw = c.measureText('FOLLOW @TECHPETREK').width, lx = CX - (fw + ls + 12) / 2;
      if (this.logo) { c.save(); rrect(c, lx, 838 - ls / 2 - 9, ls, ls, 8); c.clip(); c.drawImage(this.logo, lx, 838 - ls / 2 - 9, ls, ls); c.restore(); }
      txt(c, 'FOLLOW @TECHPETREK', lx + ls + 12, 838, ax(26, 100, 900), P.white);
      txt(c, 'Projects featured by @claudeai. Original creators credited.', CX, 896, mono(12.5, 600), P.dim, 0, 'center');
      txt(c, 'Actor: stock footage (Mixkit)', CX, 918, mono(11.5, 500), P.faint, 0, 'center');
      c.restore();
    }
    const fl = Math.max(hitP(t, E('fin.impact'), 0.06), hitP(t, E('fin.hit'), 0.06) * 0.6);
    if (fl > 0.02) { c.fillStyle = `rgba(255,255,255,${0.4 * fl})`; c.fillRect(0, 0, FXW, FXH); }
  }

  // ================================================================ dispatch
  private draw(c: CanvasRenderingContext2D, t: number) {
    const ch = this.cues.chapters.find(([a, b]) => t >= a && t < b)?.[2] ?? 'final';
    c.save();
    if (ch === 'hook') this.hook(c, t);
    else if (ch === 'final') this.final(c, t);
    else this.reveals(c, t);
    c.restore();
    if (ch !== 'final' && !this.dry) this.captions(c, t);
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const c = this.layer.ctx;
    this.layer.clear('#000');
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    this.draw(c, f.t);
    c.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    // no post-processing: the creators' footage must keep its own colours
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0, ca: 0, vignette: 0, flash: 0, zoom: 1, shake: [0, 0] };
  }
  override dispose() { this.layer.texture.dispose(); (window as any).__pdoomPrepare = undefined; }
}
