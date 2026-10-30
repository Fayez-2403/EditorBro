// v1 (2026-10-21, the 94 s cut with three WHATs and the numbered inserts), kept as variant reveals_v1. v2 is reveals.ts.
// WHATTT?! 5 Claude project reveals (projects/claude-reveals): 94 s, 9:16, 60 fps. The six projects in @claudeai's
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
interface Cues { duration: number; chapters: [number, number, string][]; events: Record<string, number>; cards: number[] }
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

export default class RevealsV1 extends Scene {
  private layer = new Layer2D();
  private cues!: Cues;
  private lines: Line[] = [];
  private seq!: SeqCache;
  private info: Record<string, SeqInfo> = {};
  private screens: Record<string, HTMLImageElement> = {};
  private logo: HTMLImageElement | null = null;
  /** Set during prepare()'s dry run: every frame the draw at t asks for. */
  private dry: [string, number][] | null = null;
  private dryCtx = new OffscreenCanvas(4, 4).getContext('2d') as unknown as CanvasRenderingContext2D;
  private mon = document.createElement('canvas');   // the monitor's picture, mapped onto the keyed screen
  private tiny = document.createElement('canvas');  // a tiny copy of the actor frame: the soft background
  private numPath = new Map<string, Path2D>();

  override async init() {
    this.cues = await (await fetch('/data/reveals_v1/cues.json')).json();
    this.lines = (await (await fetch('/data/lyrics.json')).json()).lines;
    const media = await (await fetch('/data/reveals_v1/media.json')).json();
    const { screens, ...seqs } = media;
    this.info = seqs; this.seq = new SeqCache(seqs as Record<string, SeqInfo>);
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

  // ================================================================ 0-7 s: THE TRIPLE WHAT
  private hook(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.night(c); this.collage(c, t, 0.3);
    c.fillStyle = 'rgba(6,6,11,0.35)'; c.fillRect(0, 0, FXW, FXH);
    const [sx, sy] = shakeAt(t, [[E('hit1') + 0.25, 6], [E('hit2'), 10], [E('hit3'), 16], [E('drop'), 18], [E('land'), 9]]);
    c.save(); c.translate(sx, sy);
    if (t < E('zoom2')) {
      // A: at his monitor, the six projects playing on it; slow push-in. "WHAT?!"
      const z = 1 + 0.05 * (t / 1.75);
      this.monitorShot(c, 1.6 + t, { x: 0, y: 330, w: FXW, h: 342 }, z, [700, 340], (m) => this.monitorCollage(m, t));
      this.slam(c, 'WHAT?!', t, E('hit1') + 0.25, CX, 230, 96);
    } else if (t < E('hush')) {
      // crash zoom into B: his hand over his mouth. "WHATTT?!" multiplies and shakes
      const k = outExpo(span(t, E('zoom2'), E('zoom2') + 0.22));
      const b = { x: lerp2(0, 24, k), y: lerp2(330, 150, k), w: lerp2(FXW, FXW - 48, k), h: lerp2(342, 700, k) };
      if (k < 0.5) this.monitorShot(c, 1.6 + t, b, 1.05 + 1.6 * k, [760, 330], (m) => this.monitorCollage(m, t));
      else this.actor(c, 'act_mouth', 4.5 + (t - E('zoom2')), b, 640, 330, lerp2(1100, 560, k), 18, true);
      this.slam(c, 'WHATTT?!', t, E('hit2'), CX, 900, 72, { copies: 4 });
    } else if (t < E('drop')) {
      // C: the hush, then he looks at us. "WHAAAAAATTTTT?!" stretches edge to edge
      const p = hitP(t, E('hit3'), 0.12), b = { x: 24, y: 150, w: FXW - 48, h: 700 };
      c.save(); c.translate(CX, 500); c.scale(1 + 0.06 * p + 0.02 * span(t, 3.5, 5), 1 + 0.06 * p + 0.02 * span(t, 3.5, 5)); c.translate(-CX, -500);
      this.actor(c, 'act_mouth', 0.5 + (t - E('hush')), b, 640, 320, 560, 18, true);
      c.restore();
      if (t >= E('hit3')) {   // the word stretches out until it spans the frame edge to edge (and no further)
        c.font = ax(64, 125, 900); const fit = (FXW - 20) / c.measureText('WHAAAAAATTTTT?!').width;
        const st = fit * lerp2(0.45, 1, outP(span(t, E('hit3'), E('hit3') + 0.5), 3));
        this.slam(c, 'WHAAAAAATTTTT?!', t, E('hit3'), CX, 540, 64, { stretch: st, copies: 2 });
      }
    } else if (t < E('land') + 0.25) {
      // D: the drop. He flings his arms out; at the boing the frame freezes and LAUNCHES (comic freeze-frame), confetti flies
      const freeze = t >= E('boing'), lt = freeze ? 1.4 : 0.9 + (t - E('drop'));
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
      // dive: back at his monitor, the post on it; we fly into the screen
      const k = inP(span(t, E('dive') + 0.25, 7.0), 3);
      this.monitorShot(c, 3.2 + (t - E('dive')), { x: 0, y: 0, w: FXW, h: FXH }, lerp2(1.75, 9, k), [lerp2(560, 400, k), lerp2(330, 320, k)], (m) => this.monitorPost(m));
    }
    c.restore();
    // a white flash on each hit
    const fl = Math.max(hitP(t, E('hit1') + 0.25, 0.04), hitP(t, E('hit2'), 0.04), hitP(t, E('hit3'), 0.05), hitP(t, E('drop'), 0.06));
    if (fl > 0.02) { c.fillStyle = `rgba(255,255,255,${0.35 * fl})`; c.fillRect(0, 0, FXW, FXH); }
  }
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

  // ================================================================ 7-17 s: CLAUDE JUST POSTED THIS
  private posted(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.night(c); this.collage(c, t, 0.22); c.fillStyle = 'rgba(6,6,11,0.5)'; c.fillRect(0, 0, FXW, FXH);
    const collapse = inOutP(span(t, E('post.collapse'), E('post.launch')), 3);
    // the thread: t1 in full, then t2..t7 flying past (masked below the text beats once it has settled)
    c.save();
    if (t > 7.7) { c.beginPath(); c.rect(0, 292, FXW, FXH - 292); c.clip(); }
    c.translate(CX, 620); c.scale(1 - collapse, 1 - collapse); c.rotate(collapse * 1.4); c.translate(-CX, -620);
    const settle = outP(span(t, 7.0, 7.7), 3), tilt = lerp2(0.0, 0.32, settle) * (1 - span(t, 9.5, 10.5)), sc = lerp2(1.9, 1, settle);
    const W = 520 * sc, x0 = CX - W / 2;
    // scroll: hold on the header, glide to the post's text and video, then speed through the replies
    const im1 = this.screens.t1_dark!, k1 = W / im1.width;
    const slow = 260 * inOutP(span(t, 8.6, 10.6), 3) + 200 * span(t, 10.6, 11.6);
    const fast = 2600 * inP(span(t, 11.6, 15.5), 2.2);
    const yTop = lerp2(150, 318, settle) - slow - fast;
    const stack = ['t1_dark', 't2_dark', 't3_dark', 't4_dark', 't5_dark', 't6_dark', 't7_dark'];
    const ghosts = t > 11.8 && t < 15.5 ? 3 : 1;
    for (let gI = 0; gI < ghosts; gI++) {
      const off = gI * 26 * span(t, 11.8, 13) * (1 - span(t, 15.0, 15.5));
      c.save(); c.globalAlpha *= gI ? 0.22 : 1;
      let y = yTop - off;
      for (const k of stack) {
        const im = this.screens[k]!, h = im.height * k1;
        if (y < FXH + 40 && y + h > -40 && !this.dry) this.tiltCard(c, im, x0, y, W, h, tilt, 320);
        y += h + 28;
      }
      c.restore();
    }
    // highlights on the header: the account name, then the post's first line
    if (!this.dry && t < 11.6) {
      const hl = (bx: number, by: number, bw: number, bh: number, a: number) => {
        if (a <= 0) return;
        c.save(); c.globalAlpha *= a; c.lineWidth = 3; c.strokeStyle = P.lime;
        shadowed(c, 18, P.lime, () => { rrect(c, x0 + bx * k1, yTop + by * k1, bw * k1, bh * k1, 10); c.stroke(); });
        c.restore();
      };
      hl(140, 22, 300, 100, outP(span(t, 7.55, 7.8)) * (1 - span(t, 8.6, 8.8)));
      hl(24, 150, 1020, 330, outP(span(t, 8.75, 9.0)) * (1 - span(t, 10.8, 11.1)));
    }
    c.restore();
    // the receipt's source line
    c.save(); c.globalAlpha *= settle * (1 - collapse);
    txt(c, 'SOURCE: @claudeai ON X · OCT 16, 2026 · X EMBED', CX, 300, mono(12, 600), P.dim, 0.6, 'center');
    c.restore();
    // three text beats
    const b1 = E('post.t1'), b2 = E('post.t2'), b3 = E('post.t3');
    if (t < b2 + 0.1) {
      const p = span(t, b1 + 0.05, b1 + 0.4), q = 1 - span(t, b2 - 0.05, b2 + 0.1);
      c.save(); c.globalAlpha *= q;
      maskUp(c, 'CLAUDE JUST', CX, 170, 48, p, ax(48, 125, 900), P.white, 'center');
      maskUp(c, 'SHOWED THE WORLD…', CX, 226, 40, span(t, b1 + 0.2, b1 + 0.6), ax(40, 125, 900), P.white, 'center');
      c.restore();
    } else if (t < b3) {
      const p = spring(t - b2, 0.35, 0.6);
      c.save(); c.translate(CX, 205); c.scale(lerp2(1.6, 1, p), lerp2(1.6, 1, p));
      shadowed(c, 30, alpha(P.lime, 0.5), () => txt(c, 'SIX REAL BUILDS', 0, 0, ax(44, 125, 900), P.lime, 0, 'center'));
      c.restore();
      maskUp(c, 'FEATURED BY @claudeai', CX, 250, 18, span(t, b2 + 0.3, b2 + 0.6), mono(18, 600), P.white, 'center', 1);
    } else {
      c.save(); c.globalAlpha *= 1 - span(t, E('post.launch'), E('post.launch') + 0.15);
      maskUp(c, 'AND WAIT FOR', CX, 175, 46, span(t, b3, b3 + 0.3), ax(46, 125, 900), P.white, 'center');
      maskUp(c, 'THE LAST TWO.', CX, 232, 46, span(t, b3 + 0.12, b3 + 0.42), ax(46, 125, 900), P.fire, 'center');
      c.restore();
    }
    // "01" launches toward the camera
    if (t >= E('post.launch')) {
      const k = span(t, E('post.launch'), 17.0), s = lerp2(0.3, 5, inP(k, 2.2));
      c.save(); c.globalAlpha *= 1 - span(t, 16.85, 17.0); c.translate(CX, 560); c.scale(s, s);
      const g = c.createLinearGradient(0, -80, 0, 40); g.addColorStop(0, P.ember); g.addColorStop(1, P.fire);
      bigNum(c, '01', 0, 50, 140, g, '#5A1A05', 8, 'center'); c.restore();
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

  // ================================================================ 17-30 s: 01 WILDFIRE
  private r1(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    this.night(c, '#3A1408', 0.9 + 0.1 * Math.sin(t * 2.3));
    const b: Box = { x: 14, y: 372, w: 580, h: this.hOf('A', 580) };
    this.sparks(c, t, b);
    const lt = t - E('r1.clip');
    const col = inOutP(span(t, E('r1.collapse'), E('r1.collapse') + 0.5), 3);
    if (t < E('r1.clip')) {
      // the ember flies in on a curve, a trail behind it
      const p = outP(span(t, E('r1.ember'), E('r1.clip')), 2.4);
      for (let k = 12; k >= 0; k--) {
        const q = outP(span(t - k * 0.025, E('r1.ember'), E('r1.clip')), 2.4), u = 1 - q;
        const x = u * u * 40 + 2 * u * q * 90 + q * q * (b.x + b.w / 2), y = u * u * 1040 + 2 * u * q * 640 + q * q * (b.y + b.h / 2);
        disc(c, x, y, (k ? 6 - k * 0.4 : 9) * (0.6 + 0.4 * p), k ? alpha(P.ember, 0.5 - k * 0.035) : P.white);
        if (!k) shadowed(c, 30, P.fire, () => disc(c, x, y, 7, P.ember));
      }
    } else if (col < 1) {
      // the clip, revealed from the ember (circle), then collapsing into a glowing square
      const rev = outExpo(span(t, E('r1.clip'), E('r1.clip') + 0.45));
      const s = 1 - col * 0.9;
      c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(s, s * (1 - col * 0.3)); c.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
      this.clip(c, 'A', lt, b, { glow: alpha(P.fire, 0.55), reveal: rev });
      c.restore();
    }
    if (t >= E('r1.collapse') + 0.5) this.chessMorph(c, t);
    // type, outside the footage
    const out = 1 - span(t, E('r1.collapse'), E('r1.collapse') + 0.3);
    c.save(); c.globalAlpha *= out;
    const nk = spring(t - E('r1.num'), 0.4, 0.6);
    if (t >= E('r1.num')) {
      const g = c.createLinearGradient(0, 180, 0, 330); g.addColorStop(0, P.gold); g.addColorStop(1, P.fire);
      c.save(); c.translate(26, 330); c.scale(nk, nk); bigNum(c, '01', 0, 0, 150, g, '#5A1A05', 9); c.restore();
    }
    maskUp(c, 'WILDFIRE', 590, 268, 52, span(t, E('r1.title'), E('r1.title') + 0.35), ax(52, 62, 900), P.white, 'right');
    maskUp(c, 'ANALYSIS', 590, 322, 52, span(t, E('r1.title') + 0.12, E('r1.title') + 0.47), ax(52, 62, 900), P.ember, 'right');
    credit(c, 'A', 16, b.y + b.h + 30, span(t, E('r1.clip') + 0.6, E('r1.clip') + 1.0), P.ember);
    if (t >= E('r1.title') + 0.6) chip(c, 'BUILT WITH OPUS 5.5', 16, b.y + b.h + 74, 19, P.night, P.fire);
    if (t >= E('r1.label')) {
      c.save(); c.globalAlpha *= span(t, E('r1.label'), E('r1.label') + 0.3);
      txt(c, 'PROTOTYPE · not a verified emergency-response system', 16, b.y + b.h + 116, mono(13.5, 600), alpha(P.ember, 0.9), 0.2);
      c.restore();
    }
    c.restore();
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
  /** 29.5-30: the glowing square turns into a doodled chessboard (pencil lines), into the notebook. */
  private chessMorph(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    const k = outP(span(t, E('r1.collapse') + 0.5, E('r2.paper')), 3), s = lerp2(60, 230, k);
    c.save(); c.translate(CX, 540); c.rotate((1 - k) * 0.8);
    shadowed(c, 30 * (1 - k), P.ember, () => fillRR(c, -s / 2, -s / 2, s, s, 4, alpha(P.paper, 0.15 + 0.85 * k)));
    c.strokeStyle = P.graphite; c.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const d = -s / 2 + (s * i) / 4, j = (hash(i, 9) - 0.5) * 3;
      c.beginPath(); c.moveTo(-s / 2, d + j); c.lineTo(-s / 2 + s * k, d - j); c.stroke();
      c.beginPath(); c.moveTo(d - j, -s / 2); c.lineTo(d + j, -s / 2 + s * k); c.stroke();
    }
    for (let i = 0; i < 16; i++) if ((i + Math.floor(i / 4)) % 2 === 0 && k > 0.6) {
      const x = -s / 2 + (i % 4) * (s / 4), y = -s / 2 + Math.floor(i / 4) * (s / 4);
      c.fillStyle = alpha('#7FA06A', 0.35 * span(k, 0.6, 1)); c.fillRect(x + 3, y + 3, s / 4 - 6, s / 4 - 6);
    }
    c.restore();
  }

  // ================================================================ 30-41 s: 02 NOTEBOOK CHESS
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
  private r2(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    const fall = outP(span(t, E('r2.paper'), E('r2.paper') + 0.4), 3);
    if (fall < 1) { this.night(c); this.chessMorph(c, t); }
    const flip = inP(span(t, 40.65, 41.0), 2);   // the page flips away at the end
    c.save();
    c.translate(0, (1 - fall) * -1150); c.translate(CX, 540); c.rotate((1 - fall) * 0.18 - flip * 0.25); c.scale(1 - flip * 0.9, 1);
    c.translate(-CX - flip * 300, -540);
    this.notebook(c);
    const b: Box = { x: 14, y: 372, w: 580, h: this.hOf('B', 580) };
    const hit = hitP(t, E('r2.strike'), 0.08), jolt = hit * 12 * Math.sin((t - E('r2.strike')) * 60);
    // "02", scribbled in ballpoint: the outline drawn on, then hatched
    if (t >= E('r2.num')) {
      const p = span(t, E('r2.num'), E('r2.num') + 0.55), path = this.numOutline('02', 28, 318, 160);
      c.save(); c.lineJoin = 'round'; c.strokeStyle = P.inkBlue; c.lineWidth = 3.2;
      c.setLineDash([2600 * p, 2600]); c.stroke(path);
      c.translate(1.5, 1); c.globalAlpha *= 0.5; c.stroke(path); c.restore();
      if (p > 0.7) {
        c.save(); c.clip(path); c.strokeStyle = alpha(P.inkBlue, 0.55 * span(p, 0.7, 1)); c.lineWidth = 2;
        for (let i = -20; i < 40; i++) { c.beginPath(); c.moveTo(20 + i * 9, 330); c.lineTo(20 + i * 9 + 120, 160); c.stroke(); }
        c.restore();
      }
    }
    c.save(); c.translate(0, 0); c.rotate(-0.025);
    maskUp(c, 'NOTEBOOK', 598, 270, 50, span(t, E('r2.title'), E('r2.title') + 0.35), ax(50, 62, 900), P.inkBlue, 'right');
    maskUp(c, 'CHESS', 598, 326, 50, span(t, E('r2.title') + 0.12, E('r2.title') + 0.47), ax(50, 62, 900), P.graphite, 'right');
    c.restore();
    // the clip, flipped up onto the page, taped at the corners
    if (t >= E('r2.clip')) {
      const k = outP(span(t, E('r2.clip'), E('r2.clip') + 0.35), 3);
      c.save(); c.translate(jolt, 0); c.translate(0, b.y + b.h / 2); c.scale(1, k); c.translate(0, -(b.y + b.h / 2));
      this.clip(c, 'B', t - E('r2.clip'), b, { line: alpha(P.graphite, 0.4), r: 6 });
      for (const [tx, ty, rot] of [[b.x - 14, b.y - 10, -0.5], [b.x + b.w - 50, b.y - 12, 0.45]] as const) {
        c.save(); c.translate(tx + 32, ty + 10); c.rotate(rot); fillRR(c, -34, -11, 68, 22, 2, 'rgba(236,220,170,0.75)'); c.restore();
      }
      c.restore();
      credit(c, 'B', 16, b.y + b.h + 30, span(t, E('r2.clip') + 0.6, E('r2.clip') + 1.0), P.inkBlue);
    }
    if (t >= E('r2.model')) {
      const w = chip(c, 'SONNET 5.5', 16, b.y + b.h + 74, 19, P.paper, P.inkBlue);
      const p = span(t, E('r2.model') + 0.1, E('r2.model') + 0.5);
      c.save(); c.strokeStyle = P.stamp; c.lineWidth = 2.4; c.beginPath();
      c.ellipse(16 + w / 2, b.y + b.h + 66, w / 2 + 14, 24, -0.04, -1.2, -1.2 + Math.PI * 2.1 * p); c.stroke(); c.restore();
    }
    // the actor peeks in through a torn hole: "Wait... ye playable hai?!"
    const pk = E('r2.peek');
    if (t >= pk - 0.1 && t < 40.75) {
      const k = outP(span(t, pk - 0.1, pk + 0.25), 3) * (1 - inP(span(t, 40.4, 40.7), 2));
      const wb: Box = { x: 312 + (1 - k) * 320, y: 790, w: 280, h: 196 };
      const pts: number[][] = [];
      for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, j = 0.92 + 0.08 * hash(i, 11); pts.push([wb.x + wb.w / 2 + Math.cos(a) * wb.w * 0.52 * j, wb.y + wb.h / 2 + Math.sin(a) * wb.h * 0.54 * j]); }
      c.save(); shadowed(c, 16, 'rgba(0,0,0,0.35)', () => { poly(c, pts); c.fillStyle = '#FFFFFF'; c.fill(); });
      poly(c, pts); c.clip(); this.actor(c, 'act_headset', 4.5 + (t - pk), wb, 640, 0, 600, 0); c.restore();
      if (k > 0.5) {
        c.save(); c.globalAlpha *= span(k, 0.5, 1);
        fillRR(c, 26, 818, 262, 100, 18, '#FFFFFF'); rrect(c, 26, 818, 262, 100, 18); c.strokeStyle = P.graphite; c.lineWidth = 2.5; c.stroke();
        poly(c, [[262, 858], [312, 876], [262, 888]]); c.fillStyle = '#FFFFFF'; c.fill();
        txt(c, 'Wait…', 46, 858, ax(28, 100, 900), P.graphite); txt(c, 'ye playable hai?!', 46, 898, ax(26, 100, 900), P.inkBlue);
        c.restore();
      }
    }
    // a doodled pawn flies in and strikes the clip's edge
    if (t > E('r2.strike') - 0.35 && t < 41) {
      const a = span(t, E('r2.strike') - 0.35, E('r2.strike')), bk = sat((t - E('r2.strike')) / 0.4);
      const x = lerp2(-70, b.x + 4, outP(a, 2)) - bk * 120, y = b.y + b.h * 0.5 - Math.sin(Math.PI * a) * 60 + bk * bk * 300, rot = -a * 4 + bk * 6;
      c.save(); c.translate(x, y); c.rotate(rot); c.scale(1.9, 1.9); c.fillStyle = P.graphite; c.strokeStyle = P.graphite; c.lineWidth = 2;
      disc(c, 0, -26, 11, P.graphite); poly(c, [[-9, -16], [9, -16], [14, 14], [-14, 14]]); c.fill(); fillRR(c, -19, 12, 38, 9, 3, P.graphite); c.restore();
    }
    c.restore();
  }

  // ================================================================ 41-59 s: 03 HANDWRITING + HAIKU
  private r3(c: CanvasRenderingContext2D, t: number, part = 0) {
    const E = (n: string) => this.ev(n);
    c.fillStyle = P.cream; c.fillRect(0, 0, FXW, FXH);
    c.save(); c.font = ax(420, 62, 900); c.fillStyle = alpha(P.brown, 0.05); c.textAlign = 'center';
    c.fillText('Ag', CX + Math.sin(t * 0.3) * 20, 700); c.font = ax(260, 125, 900); c.fillText('&', 470, 1020); c.restore();
    // hundreds of pages swirling through the workshop
    if (t < 43.4) {
      const k = span(t, E('r3.swirl'), 43.4);
      for (let i = 0; i < 70; i++) {
        const th = hash(i, 1) * 6.28 + (t - 41) * (1.8 + hash(i, 2)), r = (60 + hash(i, 3) * 380) * (0.35 + 0.65 * Math.sin(Math.PI * sat(k * 1.1))) + inP(span(t, 42.6, 43.4), 2) * 600;
        const x = CX + Math.cos(th) * r, y = 560 + Math.sin(th) * r * 1.2;
        c.save(); c.translate(x, y); c.rotate(th * 1.3); fillRR(c, -15, -20, 30, 40, 2, '#FFFDF7');
        c.strokeStyle = alpha(P.inkBlue, 0.5); c.lineWidth = 1;
        for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(-10, -10 + j * 9); c.lineTo(10 - hash(i, j) * 8, -10 + j * 9); c.stroke(); }
        c.restore();
      }
    }
    const b: Box = { x: 14, y: 372, w: 580, h: this.hOf('C1', 580) };
    // "03", stamped
    if (t >= E('r3.num')) {
      const k = spring(t - E('r3.num'), 0.22, 0.5), s = lerp2(1.7, 1, k);
      c.save(); c.translate(130, 262); c.rotate(-0.09); c.scale(s, s);
      rrect(c, -110, -84, 220, 146, 12); c.strokeStyle = P.stamp; c.lineWidth = 6; c.stroke();
      txt(c, '03', 0, 48, ax(132, 125, 900), P.stamp, 0, 'center');
      for (let i = 0; i < 60; i++) disc(c, (hash(i, 21) - 0.5) * 210, (hash(i, 22) - 0.5) * 130, 1 + hash(i, 23) * 2.6, alpha(P.cream, 0.7));
      c.restore();
    }
    const inF = t >= E('r3.bird') + 0.15;
    if (!inF) {
      c.save(); c.globalAlpha *= 1 - span(t, E('r3.bird') - 0.45, E('r3.bird') - 0.25);   // clears the way for the JS badge
      maskUp(c, '120 HANDWRITTEN', 594, 252, 34, span(t, E('r3.pages'), E('r3.pages') + 0.35), ax(34, 100, 900), P.inkBlue, 'right');
      maskUp(c, 'PAGES', 594, 292, 34, span(t, E('r3.pages') + 0.1, E('r3.pages') + 0.45), ax(34, 100, 900), P.inkBlue, 'right');
      c.restore();
      // the clip: the pages, then (a page turn) the finished font
      if (t >= E('r3.clipC1')) {
        const shrink = inP(span(t, E('r3.bird'), E('r3.bird') + 0.15), 2);
        const turn = Math.abs(Math.cos(Math.PI * span(t, E('r3.clipC2') - 0.12, E('r3.clipC2') + 0.12)));
        const k = outP(span(t, E('r3.clipC1'), E('r3.clipC1') + 0.4), 3) * (1 - shrink);
        const key = t < E('r3.clipC2') ? 'C1' : 'C2', lt = t < E('r3.clipC2') ? t - E('r3.clipC1') : t - E('r3.clipC2');
        c.save(); c.translate(b.x + b.w / 2, b.y + b.h / 2); c.scale(turn * k, k); c.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
        this.clip(c, key, lt, b, { line: alpha(P.brown, 0.4), r: 8 });
        c.restore();
        credit(c, 'C', 16, b.y + b.h + 30, span(t, E('r3.clipC1') + 0.6, E('r3.clipC1') + 1.0) * (1 - shrink), P.brown);
      }
      if (t >= E('r3.font')) {
        c.save(); c.globalAlpha *= 1 - span(t, E('r3.bird'), E('r3.bird') + 0.15);
        maskUp(c, '= ONE WORKING FONT', 16, b.y + b.h + 84, 40, span(t, E('r3.font'), E('r3.font') + 0.35), ax(40, 100, 900), P.stamp);
        if (t >= E('r3.model')) chip(c, 'OPUS 5.5', 16, b.y + b.h + 132, 18, P.cream, P.brown);
        c.restore();
      }
    }
    // a letter folds into a paper bird, flies, hits a glowing JS badge
    const bd = E('r3.bird'), js: Pt = [470, 250];
    if (t >= bd - 0.3 && t < E('r3.clipF') + 0.2) {
      const g = span(t, bd - 0.3, bd), gl = 1 + 0.15 * Math.sin(t * 12);
      c.save(); c.globalAlpha *= g * (1 - span(t, E('r3.clipF'), E('r3.clipF') + 0.2));
      shadowed(c, 30 * gl, P.gold, () => fillRR(c, js[0] - 34, js[1] - 34, 68, 68, 12, P.gold));
      txt(c, 'JS', js[0], js[1] + 14, ax(34, 100, 900), '#1A1A1A', 0, 'center');
      c.restore();
    }
    if (t >= bd && t < E('r3.clipF')) {
      const k = span(t, bd + 0.15, E('r3.clipF') - 0.15), u = 1 - k;
      if (t < bd + 0.15) txt(c, 'a', CX, 600, ax(120, 100, 900, true), P.inkBlue, 0, 'center');
      else {
        const x = u * u * 120 + 2 * u * k * 260 + k * k * js[0], y = u * u * 640 + 2 * u * k * 360 + k * k * js[1], fl = Math.sin(t * 40) * 0.6;
        c.save(); c.translate(x, y); c.rotate(-0.5); c.scale(2.2, 2.2); c.fillStyle = '#FFFFFF'; c.strokeStyle = P.inkBlue; c.lineWidth = 1.2;
        poly(c, [[-26, 0], [24, 0], [0, -22 * fl]]); c.fill(); c.stroke(); poly(c, [[-26, 0], [24, 0], [6, 14]]); c.fill(); c.stroke(); c.restore();
      }
    }
    if (t >= E('r3.clipF') - 0.2 && t < E('r3.clipF') + 0.1) { c.fillStyle = `rgba(255,230,120,${0.6 * hitP(t, E('r3.clipF') - 0.2, 0.08)})`; c.fillRect(0, 0, FXW, FXH); }
    // the haiku
    if (inF && t >= E('r3.clipF')) {
      const fb: Box = { x: 84, y: 340, w: 440, h: 440 }, k = outP(span(t, E('r3.clipF'), E('r3.clipF') + 0.3), 3);
      c.save(); c.translate(js[0] + (fb.x + fb.w / 2 - js[0]) * k, js[1] + (fb.y + fb.h / 2 - js[1]) * k); c.scale(k, k); c.translate(-(fb.x + fb.w / 2), -(fb.y + fb.h / 2));
      this.clip(c, 'F', t - E('r3.clipF'), fb, { line: alpha(P.brown, 0.4), r: 8 });
      c.restore();
      if (t >= E('r3.haiku')) chip(c, 'HAIKU 5.5', 594, 304, 18, P.cream, P.brown, 'right');
      maskUp(c, '20 HAIKU', 594, 270, 46, span(t, E('r3.twenty'), E('r3.twenty') + 0.35), ax(46, 125, 900), P.stamp, 'right');
      credit(c, 'F', fb.x, fb.y + fb.h + 28, span(t, E('r3.clipF') + 0.6, E('r3.clipF') + 1.0), P.brown);
      maskUp(c, 'ANIMATION DRAWN IN JAVASCRIPT', CX, fb.y + fb.h + 72, 22, span(t, E('r3.js'), E('r3.js') + 0.35), ax(22, 100, 900), P.inkBlue, 'center');
    }
  }
  /** 58.75-59: the page rips down the middle; the halves fall apart onto black. */
  private rip(c: CanvasRenderingContext2D, t: number) {
    const k = inP(span(t, this.ev('r3.rip'), 59.0), 2);
    c.fillStyle = '#000'; c.fillRect(0, 0, FXW, FXH);
    const edge: number[][] = []; for (let i = 0; i <= 30; i++) edge.push([CX + (hash(i, 31) - 0.5) * 40, (i / 30) * FXH]);
    for (const side of [-1, 1]) {
      c.save(); c.translate(side * k * 340, k * 80); c.rotate(side * k * 0.12);
      const pts = side < 0 ? [[-10, 0], ...edge, [-10, FXH]] : [[FXW + 10, 0], ...edge, [FXW + 10, FXH]];
      poly(c, pts); c.clip(); this.r3(c, t, 1); c.restore();   // the haiku keeps playing in the halves
    }
  }

  // ================================================================ 59-73 s: 04 ELECTROMAGNETIC FIELD
  private fieldLines(c: CanvasRenderingContext2D, t: number, a: number, cx: number, cy: number, n = 14) {
    if (a <= 0) return;
    const grow = span(t, this.ev('r4.web'), this.ev('r4.num'));
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
  private r4(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    c.fillStyle = '#020308'; c.fillRect(0, 0, FXW, FXH);
    const pull = inP(span(t, E('r4.pull'), 72.95), 3);
    c.save(); c.translate(CX, 540); c.scale(1 - pull, 1 - pull); c.translate(-CX, -540);
    // darkness: one faint blue spark pulsing (59-59.5), then one electric line, then the web of field lines
    if (t < E('r4.line')) {
      const hz = c.createRadialGradient(CX, 540, 0, CX, 540, 560);   // a faint electric haze: dark, but never a dead frame
      hz.addColorStop(0, 'rgba(24,70,160,0.32)'); hz.addColorStop(1, 'rgba(24,70,160,0)'); c.fillStyle = hz; c.fillRect(0, 0, FXW, FXH);
      const k = 0.6 + 0.4 * Math.sin((t - 59) * 20), g = c.createRadialGradient(CX, 540, 0, CX, 540, 90);
      g.addColorStop(0, alpha(P.cyan, 0.55 * k)); g.addColorStop(0.15, alpha(P.blue, 0.22 * k)); g.addColorStop(1, alpha(P.blue, 0));
      c.fillStyle = g; c.fillRect(CX - 90, 450, 180, 180); disc(c, CX, 540, 3 + 2 * k, P.white);
    }
    if (t >= E('r4.line') && t < E('r4.clip') + 0.5) {
      const k = outP(span(t, E('r4.line'), E('r4.web')), 3), fade = 1 - span(t, E('r4.clip'), E('r4.clip') + 0.5);
      c.save(); c.globalAlpha *= fade; shadowed(c, 22, P.cyan, () => { c.strokeStyle = P.cyan; c.lineWidth = 3; c.beginPath(); c.moveTo(CX - 300 * k, 540); c.lineTo(CX + 300 * k, 540); c.stroke(); }); c.restore();
      this.fieldLines(c, t, fade * span(t, E('r4.web'), E('r4.web') + 0.4), CX, 540);
    }
    const b: Box = { x: 9, y: 362, w: 590, h: this.hOf('D', 590) };
    if (t >= E('r4.clip')) {
      this.fieldLines(c, t, 0.18, CX, b.y + b.h / 2, 12);
      const k = outP(span(t, E('r4.clip'), E('r4.clip') + 0.35), 3);
      c.save(); c.globalAlpha *= k; c.translate(CX, b.y + b.h / 2); c.scale(lerp2(0.9, 1, k), lerp2(0.9, 1, k)); c.translate(-CX, -(b.y + b.h / 2));
      this.clip(c, 'D', t - E('r4.clip'), b, { glow: alpha(P.blue, 0.55) });
      c.restore();
      credit(c, 'D', 16, b.y + b.h + 30, span(t, E('r4.clip') + 0.6, E('r4.clip') + 1.0), P.cyan);
    }
    // "04", a luminous electric numeral (flickers on)
    if (t >= E('r4.num')) {
      const on = t > E('r4.num') + 0.22 || frameRand(t, 44) > 0.45;
      if (on) {
        c.save(); c.translate(26, 330); c.font = ax(150, 125, 900);
        shadowed(c, 34, P.blue, () => { c.lineWidth = 3; c.strokeStyle = P.cyan; c.strokeText('04', 0, 0); });
        c.fillStyle = alpha(P.cyan, 0.18); c.fillText('04', 0, 0);
        c.restore();
      }
    }
    maskUp(c, 'INTERACTIVE', 594, 238, 30, span(t, E('r4.title'), E('r4.title') + 0.3), ax(30, 100, 900), P.cyan, 'right');
    maskUp(c, 'ELECTROMAGNETIC', 594, 274, 30, span(t, E('r4.title') + 0.1, E('r4.title') + 0.4), ax(30, 100, 900), P.white, 'right');
    maskUp(c, 'FIELD', 594, 310, 30, span(t, E('r4.title') + 0.2, E('r4.title') + 0.5), ax(30, 100, 900), P.white, 'right');
    if (t >= E('r4.push')) {
      c.save(); c.globalAlpha *= span(t, E('r4.push'), E('r4.push') + 0.3);
      txt(c, 'SEE IT · PUSH IT AROUND', 16, b.y + b.h + 66, mono(15, 600), P.cyan, 1); c.restore();
    }
    if (t >= E('r4.model')) chip(c, 'OPUS 5.5', 16, b.y + b.h + 110, 19, P.night, P.cyan);
    // the actor, small, in a side window: "No. Way."
    const nw = E('r4.noway');
    if (t >= nw - 0.15) {
      const k = outP(span(t, nw - 0.15, nw + 0.15), 3);
      const wb: Box = { x: 392, y: 768, w: 190, h: 176 };
      c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 40);
      shadowed(c, 24, alpha(P.blue, 0.7), () => fillRR(c, wb.x - 3, wb.y - 3, wb.w + 6, wb.h + 6, 16, P.blue));
      this.actor(c, 'act_mouth', 6.0 + (t - nw), wb, 640, 300, 500, 14);
      txt(c, 'No. Way.', wb.x - 16, wb.y + 106, ax(34, 100, 900, true), P.white, 0, 'right');
      c.restore();
    }
    c.restore();
    // the magnetic pull: streaks converging on the centre
    if (pull > 0) {
      c.save(); c.globalAlpha *= Math.sin(Math.PI * pull); c.strokeStyle = P.cyan; c.lineWidth = 2;
      for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.28, r0 = 700 * (1 - pull), r1 = r0 * 0.6; c.beginPath(); c.moveTo(CX + Math.cos(a) * r0, 540 + Math.sin(a) * r0); c.lineTo(CX + Math.cos(a) * r1, 540 + Math.sin(a) * r1); c.stroke(); }
      c.restore();
    }
    if (t > 72.8) shadowed(c, 20, P.red, () => { c.fillStyle = P.red; c.fillRect(CX - 300 * span(t, 72.8, 73), 539, 600 * span(t, 72.8, 73), 2); });
  }

  // ================================================================ 73-88 s: 05 THE MEDICAL SIMULATOR
  private r5(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    c.fillStyle = '#030204'; c.fillRect(0, 0, FXW, FXH);
    const beats = [E('r5.beat1'), E('r5.beat2'), 74.75];
    if (t < E('r5.clip')) {
      // the heartbeat line in the dark, a heart behind it
      const g = span(t, E('r5.beat2'), E('r5.num')), pulse = Math.max(...beats.map((b) => hitP(t, b, 0.12)));
      if (g > 0) {
        c.save(); c.globalAlpha *= g * (1 - span(t, E('r5.num'), E('r5.num') + 0.2));
        c.translate(CX, 420); c.scale(1 + 0.08 * pulse, 1 + 0.08 * pulse);
        shadowed(c, 50, P.red, () => { heart(c, 0, 0, 190); c.fillStyle = alpha(P.redD, 0.85); c.fill(); });
        c.restore();
      }
      const head = FXW * span(t, 73.0, 75.0);
      c.save(); c.globalAlpha *= 1 - span(t, E('r5.num'), E('r5.num') + 0.15); c.lineWidth = 3; c.strokeStyle = P.red; c.lineJoin = 'round';
      shadowed(c, 16, P.red, () => {
        c.beginPath();
        for (let x = 0; x <= head; x += 2) { const tx = 73 + (2 * x) / FXW; const y = 560 - beats.reduce((s, b) => s + ecg(tx - b), 0); if (x) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke();
      });
      if (head > 0) disc(c, head, 560 - beats.reduce((s, b) => s + ecg(73 + (2 * head) / FXW - b), 0), 5, P.white);
      c.restore();
    }
    // "05": an enormous impact, then it moves up to its place
    const nm = E('r5.num');
    if (t >= nm) {
      const k = spring(t - nm, 0.36, 0.45), mv = inOutP(span(t, E('r5.clip'), E('r5.clip') + 0.4), 3);
      const s = lerp2(2.6, 1, k) * lerp2(1, 150 / 250, mv), x = lerp2(CX, 26, mv), y = lerp2(640, 330, mv);
      const ring = span(t, nm, nm + 0.6);
      if (ring < 1) { c.save(); c.globalAlpha *= 1 - ring; c.strokeStyle = P.red; c.lineWidth = 10 * (1 - ring); c.beginPath(); c.arc(CX, 560, 40 + 700 * outP(ring, 2), 0, 6.283); c.stroke(); c.restore(); }
      c.save(); c.translate(x, y); c.scale(s, s);
      bigNum(c, '05', 0, 0, 250, P.white, P.redD, 12, mv > 0.5 ? 'left' : 'center');
      c.restore();
    }
    const b: Box = { x: 9, y: 352, w: 590, h: this.hOf('E', 590) };
    if (t >= E('r5.clip')) {
      const col = inOutP(span(t, E('fin.impact'), E('fin.impact') + 0.4), 3);
      c.save(); c.translate(CX, b.y + b.h / 2); c.scale(1 - col, 1 - col); c.translate(-CX, -(b.y + b.h / 2));
      this.clip(c, 'E', t - E('r5.clip'), b, { glow: alpha(P.red, 0.45) });
      c.restore();
      credit(c, 'E', 16, b.y + b.h + 30, span(t, E('r5.clip') + 0.6, E('r5.clip') + 1.0), '#FF8FA3', ' · AngioView');
    }
    maskUp(c, '3D CARDIOLOGY', 594, 268, 34, span(t, E('r5.title'), E('r5.title') + 0.3), ax(34, 100, 900), P.white, 'right');
    maskUp(c, 'TRAINING', 594, 310, 34, span(t, E('r5.title') + 0.1, E('r5.title') + 0.4), ax(34, 100, 900), P.red, 'right');
    const lab = 1 - span(t, E('r5.range1') - 0.25, E('r5.range1'));   // the chip and the label give way to the range line
    c.save(); c.globalAlpha *= lab;
    if (t >= E('r5.fellow')) chip(c, 'BUILT BY A CARDIOLOGY FELLOW', 16, b.y + b.h + 72, 17, P.white, P.redD);
    if (t >= E('r5.label')) {
      c.save(); c.globalAlpha *= span(t, E('r5.label'), E('r5.label') + 0.3);
      txt(c, 'EDUCATIONAL TOOL · not a clinically validated diagnostic system', 16, b.y + b.h + 112, mono(12.5, 600), '#FF8FA3', 0.1);
      c.restore();
    }
    c.restore();
    // "From notebook games... to medical education. That's the range."
    const y0 = b.y + b.h + 74;
    maskUp(c, 'FROM NOTEBOOK GAMES…', 16, y0, 28, span(t, E('r5.range1'), E('r5.range1') + 0.3), ax(28, 100, 900), '#9DB8FF');
    maskUp(c, '…TO MEDICAL EDUCATION.', 16, y0 + 38, 28, span(t, E('r5.range2'), E('r5.range2') + 0.3), ax(28, 100, 900), '#FF8FA3');
    if (t >= E('r5.range3')) {
      const p = spring(t - E('r5.range3'), 0.3, 0.55);
      c.save(); c.translate(16, y0 + 92); c.scale(lerp2(1.4, 1, p), lerp2(1.4, 1, p));
      shadowed(c, 24, alpha(P.lime, 0.5), () => txt(c, "THAT'S THE RANGE.", 0, 0, ax(40, 125, 900), P.lime));
      c.restore();
    }
    if (t >= E('r5.num') && t < E('r5.clip')) { c.fillStyle = `rgba(255,255,255,${0.7 * hitP(t, E('r5.num'), 0.05)})`; c.fillRect(0, 0, FXW, FXH); }
    if (t >= E('r5.clip') && t < E('r5.clip') + 0.2) { c.fillStyle = `rgba(255,255,255,${0.5 * hitP(t, E('r5.clip'), 0.04)})`; c.fillRect(0, 0, FXW, FXH); }
  }

  // ================================================================ 88-94 s: THE FINAL REACTION
  private final(c: CanvasRenderingContext2D, t: number) {
    const E = (n: string) => this.ev(n);
    const big = span(t, E('fin.smile'), E('fin.smile') + 0.45), bk = inOutP(big, 3);
    const win: Box = { x: lerp2(104, 174, bk), y: lerp2(200, 132, bk), w: lerp2(400, 260, bk), h: lerp2(500, 325, bk) };
    // the actor: frozen stare; three match cuts of the earlier WHATs; then the smile
    const cuts = [E('fin.cuts'), E('fin.cuts') + 0.25, E('fin.cuts') + 0.5];
    const ci = t >= cuts[0]! && t < E('fin.smile') ? Math.min(2, Math.floor((t - cuts[0]!) / 0.25)) : -1;
    let img: ImageBitmap | null = null;
    if (ci === 0) this.monitorShot(c, 2.4, { x: 0, y: 0, w: FXW, h: FXH }, 1.7, [700, 340], (m) => this.monitorCollage(m, t));
    else {
      const k = t < E('fin.smile') ? (ci === 1 ? 'act_mouth' : ci === 2 ? 'act_mouth' : 'act_stare') : 'act_smile';
      const lt = ci === 1 ? 4.9 : ci === 2 ? 1.0 : t < E('fin.smile') ? 0.5 + (t - E('fin.impact')) : 0.6 + (t - E('fin.smile'));
      img = this.frame(k, lt); this.softBg(c, img, 0.7);
      c.fillStyle = 'rgba(6,6,11,0.25)'; c.fillRect(0, 0, FXW, FXH);
      shadowed(c, 40, alpha(P.lime, 0.4), () => fillRR(c, win.x - 4, win.y - 4, win.w + 8, win.h + 8, 22, alpha(P.lime, 0.9)));
      this.actor(c, k, lt, win, k === 'act_smile' ? 600 : 620, 320, 520, 18);
    }
    if (ci >= 0) {
      const s = ['WHAT?!', 'WHATTT?!', 'WHAAAAAATTTTT?!'][ci]!, size = ci === 2 ? 64 : 76;
      c.font = ax(size, 125, 900); const fit = Math.min(1, (FXW - 24) / c.measureText(s).width);
      this.slam(c, s, t, cuts[ci]!, CX, 860, size, { copies: ci, stretch: fit, from: 1.25 });
    }
    // the five cards orbit him
    if (ci < 0) {
      const keys = ['A', 'B', 'C2', 'D', 'E'], ccx = win.x + win.w / 2, ccy = win.y + win.h / 2;
      const fly = outP(span(t, E('fin.impact'), E('fin.impact') + 0.5), 3);
      const order = keys.map((k, i) => ({ k, i, a: (i / 5) * 6.283 + (t - 88) * 0.5 })).sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
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
    // the question, the CTA, the credits
    if (t >= E('fin.title')) {
      const y0 = 562;
      maskUp(c, 'WHAT WOULD YOU', CX, y0, 52, span(t, E('fin.title'), E('fin.title') + 0.3), ax(52, 100, 900), P.white, 'center');
      maskUp(c, 'BUILD WITH', CX, y0 + 60, 52, span(t, E('fin.title') + 0.1, E('fin.title') + 0.4), ax(52, 100, 900), P.white, 'center');
      c.save(); const p = spring(t - E('fin.title') - 0.25, 0.35, 0.55); c.translate(CX, y0 + 128); c.scale(lerp2(1.5, 1, p), lerp2(1.5, 1, p));
      if (t >= E('fin.title') + 0.25) shadowed(c, 30, alpha(P.lime, 0.6), () => txt(c, 'CLAUDE?', 0, 0, ax(70, 125, 900), P.lime, 0, 'center'));
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
    else if (ch === 'posted') this.posted(c, t);
    else if (ch === 'r1') this.r1(c, t);
    else if (ch === 'r2') this.r2(c, t);
    else if (ch === 'r3') { if (t >= this.ev('r3.rip')) this.rip(c, t); else this.r3(c, t); }
    else if (ch === 'r4') this.r4(c, t);
    else if (ch === 'r5') this.r5(c, t);
    else this.final(c, t);
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
