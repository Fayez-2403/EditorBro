// Motion Flex, Claude cut: the 29.1 s "What can you build?" reel (12 bars of the measured grid).
// One continuous object story: a cube unfolds into the type, the type stack becomes a browser, the
// browser reflows into a phone, the app's result card opens into a dashboard, a chart bar rises into a
// product, the product shatters into modules, the modules build a character, its world flattens into a
// city, the city turns into waves and a record, everything collapses back into the cube, and the cube
// explodes into every scene, which fill the letters of the title. Every time comes from cues.json.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { F, font, layout, textPath2D } from '../engine/type';
import { hash, noise2 } from '../engine/util';
import { drawMascot } from './_mascot';
import {
  COL, FX, FXW, FXH, sat, lerp2, span, outP, inP, inOutP, outExpo, inExpo, spring, hitP, nudge,
  mixHex, alpha, rrect, fillRR, disc, strokeLine, ax, mono, fitAx, txt, maskUp, inOutSine,
  type V3, type Q, Q0, qAxis, qMul, qRot, qSlerp, add3, scl3, dot3, norm3, sub3, rotX, rotY, type Cam, proj, planeTransform, poly, frameRand,
} from './_vo';

const TAU = Math.PI * 2;

export interface FlexCues {
  variant: string; duration: number; eighth: number; bar: number; bars: number; intro_bars: number; reel_offset: number;
  sections: { name: string; start: number; end: number }[];
  events: Record<string, number>; typing: Record<string, number[]>; breakdowns: number[][];
  copy: Record<string, string>; wave_rate: number; wave: number[];
  /** The song's labels (absent on the first song, which uses the defaults). */
  song?: { line1: string; line2: string; tempo: string; short: string; credit: string };
  /** Time of every score eighth in this edit, when the song's pulse is measured beat by beat (not a constant). */
  grid?: number[];
}
export const songOf = (c: FlexCues) => c.song ?? { line1: 'MATUSHKA', line2: 'ULTRAFUNK', tempo: '98.97 bpm', short: 'Matushka Ultrafunk', credit: 'MATUSHKA ULTRAFUNK (ultra slowed)' };
/** Position on the score grid at variant time t: unit index (eighths, fractional), section and eighth within it. */
export function gridAt(c: FlexCues, t: number) {
  let u: number;
  const g = c.grid;
  if (g && g.length > 1) {
    let lo = 0, hi = g.length - 1;
    if (t <= g[0]!) u = 0; else if (t >= g[hi]!) u = hi; else { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (g[m]! <= t) lo = m; else hi = m; } u = lo + (t - g[lo]!) / (g[hi]! - g[lo]!); }
  } else u = t / c.eighth;
  const sec = Math.floor(u / 8);
  return { u, sec, eighth: Math.floor(u - sec * 8), at: (k: number) => (g && g.length > 1 ? g[Math.max(0, Math.min(g.length - 1, k))]! : k * c.eighth) };
}
export async function loadFlexCues(): Promise<FlexCues> {
  const v = ((import.meta as any).env?.VITE_VARIANT as string) || 'flex';
  const r = await fetch(`data/${v.startsWith('flex') ? v : 'flex'}/cues.json`);
  if (!r.ok) throw new Error('Missing flex cues: run python analysis/build_flex_audio.py');
  return r.json();
}

type Rect = { x: number; y: number; w: number; h: number; r: number };
const lerpRect = (a: Rect, b: Rect, p: number): Rect =>
  ({ x: lerp2(a.x, b.x, p), y: lerp2(a.y, b.y, p), w: lerp2(a.w, b.w, p), h: lerp2(a.h, b.h, p), r: lerp2(a.r, b.r, p) });

// Hand-off shapes shared by neighbouring sections (the carrier must match on both sides of a cut).
const SLABS = [0, 1, 2, 3].map((i) => ({ x: 34, y: 236 + i * 130, w: 540, h: 118, r: 10 }));
const BROWSER: Rect = { x: 30, y: 200, w: 548, h: 636, r: 18 };
const PHONE: Rect = { x: 222, y: 196, w: 306, h: 628, r: 50 };
const SCREEN: Rect = { x: 230, y: 204, w: 290, h: 612, r: 42 };
const CUBE_AT: [number, number] = [304, 500];
/** v2: the hook cube's edge (was 150): it fills the frame from frame 0. */
const HOOK_A = 210;
/** Centre line of the text-safe width (36..536). */
const TCX = 286;
/** The result card's bars are the dashboard's first series (a shared element across the cut). */
const CARD_BARS = [.35, .5, .42, .62, .55, .78, 1, .7];
const SUN = { x: 474, y: 236, r: 52 };
/** The record in SOUND (and the ring the city's towers fly onto). */
const REC = { cx: 304, cy: 505, disc: 182, g0: 66, g1: 172, tick0: 192 };
const WORDS = ['WHAT', 'CAN', 'YOU', 'BUILD?'];
const CODE: Record<string, string> = {
  hook: 'const idea = cube(210).unfold({ on: kick })',
  websites: "browser.build(hero, cards).reflow('mobile')",
  apps: "button.press().morph('spinner').then(done)",
  data: 'chart.draw(series, { lock: bar(3).kick })',
  product: "camera.orbit(product, { light: 'rim' })",
  motion: "type.stretch('wdth', 62, 125)",
  stories: "hero.walk().look('up').catch(idea)",
  worlds: 'city.extrude(noise(x, z)).fly()',
  sound: 'groove(waveform(song)).spin()',
  idea: 'scene.collapse({ into: idea })',
  endless: 'idea.explode({ into: scenes })',
};

interface FacePose { p: V3; q: Q; w: number; h: number }
const FACE_Q: Q[] = [
  Q0, qAxis([0, 1, 0], Math.PI / 2), qAxis([0, 1, 0], Math.PI), qAxis([0, 1, 0], -Math.PI / 2), // front right back left
  qAxis([1, 0, 0], Math.PI / 2), qAxis([1, 0, 0], -Math.PI / 2), // top bottom
];
const LIGHT = norm3([-0.45, -0.75, 0.55]);

export default class Flex extends Scene {
  private layer = new Layer2D();
  cues!: FlexCues;
  private off = 0;
  private snaps = new Map<string, HTMLCanvasElement>();
  private hideCardBars = false;
  private hideDashBars = false;
  private sunSink = 0;
  private paths = new Map<string, Path2D>();
  /** Draw the last 0.25 s as a collapse back into the opening cube, so an auto-replay reads as one loop. */
  loopTail = true;

  override async init() {
    this.cues = await loadFlexCues();
    this.off = this.cues.reel_offset;
    if (this.cues.intro_bars) this.loopTail = false;
  }

  // ---- time helpers (reel-local seconds) ----
  ev(n: string) { const v = this.cues.events[n]; if (v === undefined) throw new Error(`flex cue missing: ${n}`); return v - this.off; }
  get E8() { return this.cues.eighth; }
  get BAR() { return this.cues.bar; }
  private au(kind: 'low' | 'mid' | 'high' | 'rms', t: number) { return this.ctx.audio.env(kind, t + this.off); }
  private hit(kind: string, t: number, hl = .1) { return this.ctx.audio.hit(kind, t + this.off, hl); }
  private waveAt(t: number) {
    const w = this.cues.wave, i = (t + this.off) * this.cues.wave_rate;
    const k = Math.max(0, Math.min(w.length - 2, Math.floor(i))), f = sat(i - k);
    return w[k]! * (1 - f) + w[k + 1]! * f;
  }
  private typed(key: string, text: string, t: number) {
    const ts = this.cues.typing[key] ?? [];
    let n = 0; for (const x of ts) if (t >= x - this.off) n++;
    return text.slice(0, n);
  }

  // =============================================================================================
  // The frame
  // =============================================================================================
  /** Draw the reel at reel-local time t into a context already mapped to the 608x1080 column. */
  drawFrame(c: CanvasRenderingContext2D, t: number) {
    t = Math.max(0, Math.min(this.cues.duration - this.off - 1e-4, t));
    c.save();
    // impact shake: measured hits only, decays in ~0.1 s (pdoom slam)
    const shake = 13 * hitP(t, this.ev('product.drop'), .05) + 15 * hitP(t, this.ev('endless.drop'), .05)
      + 7 * hitP(t, this.ev('flex.impact'), .05) + 5 * hitP(t, this.ev('motion.slam'), .045) + 4 * hitP(t, this.ev('idea.pulse'), .05);
    if (shake > .2) c.translate((frameRand(t, 1) - .5) * shake, (frameRand(t, 2) - .5) * shake * .7);
    const id = this.section(t);
    this.drawSection(c, id, t);
    c.restore();
    // the mascot walks the top band of the whole reel (the Dubplate cut only; earlier song cuts stay as they were)
    if ((this.cues as any).variant?.startsWith('flex_gl')) drawMascot(c, gridAt(this.cues, t + this.off).u, t);
    this.hud(c, id, t);
  }

  section(t: number): string {
    const order: [string, string][] = [['hook', 'web.land'], ['websites', 'app.land'], ['apps', 'data.land'], ['data', 'product.drop'],
      ['product', 'motion.land'], ['motion', 'stories.land'], ['stories', 'worlds.land'], ['worlds', 'sound.land'],
      ['sound', 'idea.land'], ['idea', 'endless.drop'], ['endless', 'flex.land'], ['lockup', 'end']];
    for (const [id, until] of order) if (t < this.ev(until)) return id;
    return 'lockup';
  }

  drawSection(c: CanvasRenderingContext2D, id: string, t: number) {
    switch (id) {
      case 'hook': return this.hook(c, t);
      case 'websites': return this.websites(c, t);
      case 'apps': return this.apps(c, t);
      case 'data': return this.data(c, t);
      case 'product': return this.product(c, t);
      case 'motion': return this.motion(c, t);
      case 'stories': return this.stories(c, t);
      case 'worlds': return this.worlds(c, t);
      case 'sound': return this.sound(c, t);
      case 'idea': return this.idea(c, t);
      case 'endless': return this.endless(c, t);
      default: return this.lockup(c, t);
    }
  }

  /** Bottom process line: the scene's own code, the clock and the eighth notes of the bar. */
  private hud(c: CanvasRenderingContext2D, id: string, t: number) {
    const code = CODE[id];
    if (!code) return;
    const fade = id === 'hook' ? span(t, .25, .6) : 1;
    const light = id === 'data' || id === 'sound' || id === 'motion';
    const fg = light ? FX.ink : FX.bone;
    const y = 858;
    c.save();
    c.globalAlpha = .62 * fade;
    txt(c, code, 36, y, mono(10.5, 500), fg);
    const tc = (t + this.off).toFixed(2).padStart(5, '0');
    txt(c, `t ${tc}s`, 536, y, mono(10.5, 500), fg, 0, 'right');
    // the eighth notes of the current bar, the current one lit
    const idx = gridAt(this.cues, t + this.off).eighth;
    for (let i = 0; i < 8; i++) {
      const on = i === idx;
      fillRR(c, 36 + i * 11, y + 10, 7, on ? 7 : 3, 1.5, on ? (light ? FX.ink : FX.lime) : alpha(fg, .5));
    }
    c.restore();
  }

  // =============================================================================================
  // 0. HOOK: a single luminous cube spins, pops into an exploded view on the pre-kick, then its four
  // sides unroll into the type slabs on the kick. The stack then closes into the browser window.
  // =============================================================================================
  private hookCam(): Cam { return { pos: [0, 0, 1100], yaw: 0, pitch: 0, f: 1100, cx: CUBE_AT[0], cy: CUBE_AT[1] }; }
  cubeQ(t: number, speed = 1): Q { return qMul(qAxis([1, 0, 0], -0.5), qAxis([0, 1, 0], .72 + t * 1.05 * speed)); }

  /** The six faces of a cube of edge a, orientation q, faces pushed out by `explode` px. */
  private cubeFaces(a: number, q: Q, explode = 0, at: V3 = [0, 0, 0]): FacePose[] {
    return FACE_Q.map((fq) => {
      const wq = qMul(q, fq);
      const n = qRot(wq, [0, 0, 1]);
      return { p: add3(at, scl3(n, a / 2 + explode)), q: wq, w: a, h: a };
    });
  }
  private faceCorners(f: FacePose, cam: Cam) {
    const pt = (u: number, v: number) => proj(add3(f.p, qRot(f.q, [u * f.w / 2, v * f.h / 2, 0])), cam);
    return [pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, 1)];
  }
  private shade(f: FacePose, lit: string, dark: string) {
    const n = qRot(f.q, [0, 0, 1]);
    return mixHex(dark, lit, .25 + .75 * Math.max(0, dot3(n, LIGHT)));
  }
  /** A solid lit cube (also used for the idea, the story's seed and the loop tail). */
  drawCube(c: CanvasRenderingContext2D, cx: number, cy: number, a: number, q: Q, glow = 1, explode = 0) {
    const cam: Cam = { pos: [0, 0, 1100], yaw: 0, pitch: 0, f: 1100, cx, cy };
    if (glow > 0) {
      const g = c.createRadialGradient(cx, cy, a * .2, cx, cy, a * 2.1);
      g.addColorStop(0, alpha(FX.lime, .22 * glow)); g.addColorStop(1, alpha(FX.lime, 0));
      c.fillStyle = g; c.fillRect(cx - a * 2.2, cy - a * 2.2, a * 4.4, a * 4.4);
    }
    const faces = this.cubeFaces(a, q, explode).map((f) => ({ f, d: proj(f.p, cam)[2] }));
    faces.sort((x, y) => y.d - x.d);
    for (const { f } of faces) {
      const n = qRot(f.q, [0, 0, 1]);
      if (dot3(n, norm3(sub3(cam.pos, f.p))) <= 0 && explode < 1) continue;
      const k = this.faceCorners(f, cam);
      poly(c, k); c.fillStyle = this.shade(f, FX.lime, FX.limeDD); c.fill();
      c.strokeStyle = alpha(FX.ink, .35); c.lineWidth = 1; c.stroke();
    }
  }

  /**
   * v2 hook (2026-10-20, the user: "the starting does not look good"): the question is readable from frame 0. WHAT is
   * already stamped on the first frame, CAN / YOU / BUILD? stomp in on the bar's next three eighths (the last two are the
   * measured pre-kick and kick), each at its slab's place, so when the cube unrolls each slab catches its own word.
   */
  private kinetic(c: CanvasRenderingContext2D, t: number) {
    const pop = this.ev('hook.pop'), unfold = this.ev('hook.unfold'), e1 = 2 * pop - unfold;
    const at = [-.2, e1, pop, unfold], size = this.slabSize(c);
    WORDS.forEach((w, i) => {
      const k = span(t, at[i]!, at[i]! + .12);
      const gone = span(t, unfold + .13 + i * .07, unfold + .2 + i * .07);   // its slab's own word takes over (a quick hand-off)
      if (k <= 0 || gone >= 1) return;
      const s = SLABS[i]!, sc = 1 + .55 * (1 - outP(k, 3)), x = s.x + 20, y = s.y + s.h - 22;
      c.save(); c.globalAlpha = Math.min(1, k * 3) * (1 - gone);
      c.translate(x + 120, y - 40); c.scale(sc, sc); c.translate(-(x + 120), -(y - 40));
      c.shadowColor = alpha(FX.ink, .85); c.shadowBlur = 26; c.shadowOffsetY = 6;
      txt(c, w, x, y, ax(size, 125, 900), FX.bone);
      c.restore();
    });
  }

  private hook(c: CanvasRenderingContext2D, t: number) {
    const pop = this.ev('hook.pop'), unfold = this.ev('hook.unfold'), land = this.ev('web.land');
    const mergeA = land - .42;
    c.fillStyle = FX.ink; c.fillRect(0, 0, FXW, FXH);
    const cam = this.hookCam();
    // v2: already spinning fast on frame 0, settling into its turn (never a still first frame)
    const q = this.cubeQ(t + 2.3 * (1 - Math.exp(-3 * Math.max(0, t))));
    const explode = 26 * spring(t - pop, .34, .62);

    // the construction system around the cube: vertex rays, an orbit ring, live readouts
    const sys = (1 - span(t, unfold, unfold + .22)) * span(t, 0, .12);
    if (sys > 0) {
      c.save(); c.globalAlpha = sys;
      const verts: V3[] = [];
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) verts.push(qRot(q, [sx * HOOK_A / 2, sy * HOOK_A / 2, sz * HOOK_A / 2]));
      for (const v of verts) {
        const p = proj(v, cam), dx = p[0] - CUBE_AT[0], dy = p[1] - CUBE_AT[1], l = Math.hypot(dx, dy) || 1;
        strokeLine(c, [[p[0], p[1]], [p[0] + dx / l * 700, p[1] + dy / l * 700]], alpha(FX.lime, .13), 1);
        disc(c, p[0], p[1], 2.2, alpha(FX.lime, .7));
      }
      c.strokeStyle = alpha(FX.bone, .22); c.lineWidth = 1; c.setLineDash([3, 6]); c.lineDashOffset = -t * 30;
      c.beginPath(); c.arc(CUBE_AT[0], CUBE_AT[1], 168 + explode * .6, 0, TAU); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * TAU + t * .35, r0 = 176 + explode * .6;
        strokeLine(c, [[CUBE_AT[0] + Math.cos(a) * r0, CUBE_AT[1] + Math.sin(a) * r0], [CUBE_AT[0] + Math.cos(a) * (r0 + (i % 6 ? 5 : 12)), CUBE_AT[1] + Math.sin(a) * (r0 + (i % 6 ? 5 : 12))]], alpha(FX.bone, .4), 1);
      }
      const yaw = ((.72 + t * 1.05) * 180 / Math.PI) % 360;
      txt(c, `yaw ${yaw.toFixed(1)}°`, 420, 318, mono(10.5), alpha(FX.lime, .8));
      txt(c, `pitch -28.6°`, 420, 333, mono(10.5), alpha(FX.bone, .5));
      txt(c, `explode ${explode.toFixed(1)}`, 60, 690, mono(10.5), alpha(FX.bone, .5));
      c.restore();
    }
    // kicker: the premise in the first second
    c.save(); c.globalAlpha = 1 - span(t, mergeA, mergeA + .2);
    txt(c, '// made entirely in code with Claude Opus 5.5', 36, 216, mono(16, 600), FX.lime);
    c.restore();

    if (t < unfold) { this.drawCube(c, CUBE_AT[0], CUBE_AT[1], HOOK_A, q, 1 + .6 * hitP(t, pop, .1), explode); this.kinetic(c, t); return; }

    // unroll: each side face flies (true 3D, slerped) onto its slab; top and bottom fold away
    const gl = 1 - span(t, unfold, unfold + .3);
    if (gl > 0) { const g = c.createRadialGradient(CUBE_AT[0], CUBE_AT[1], 30, CUBE_AT[0], CUBE_AT[1], 315); g.addColorStop(0, alpha(FX.lime, .22 * gl)); g.addColorStop(1, alpha(FX.lime, 0)); c.fillStyle = g; c.fillRect(0, 160, FXW, 700); }
    const faces = this.cubeFaces(HOOK_A, q, explode);
    const merge = inOutP(span(t, mergeA, land), 3);
    const items: { f: FacePose; i: number; d: number; p: number }[] = [];
    faces.forEach((f, i) => {
      const p = spring(t - (unfold + (i < 4 ? i : 1.5) * .045), .5, .82);
      if (i < 4) {
        const s = SLABS[i]!;
        const target: FacePose = { p: [s.x + s.w / 2 - CUBE_AT[0], s.y + s.h / 2 - CUBE_AT[1], 0], q: Q0, w: s.w, h: s.h };
        const fp: FacePose = { p: [lerp2(f.p[0], target.p[0], p), lerp2(f.p[1], target.p[1], p), lerp2(f.p[2], 0, p)], q: qSlerp(f.q, Q0, sat(p)), w: lerp2(HOOK_A, s.w, p), h: lerp2(HOOK_A, s.h, p) };
        items.push({ f: fp, i, d: proj(fp.p, cam)[2], p });
      } else {
        const k = 1 - outP(span(t, unfold, unfold + .3), 3);
        if (k > .01) items.push({ f: { ...f, w: HOOK_A * k, h: HOOK_A * k, p: scl3(f.p, 1 + (1 - k) * 2) }, i, d: proj(f.p, cam)[2], p: 0 });
      }
    });
    if (merge <= 0) {
      items.sort((a, b) => b.d - a.d);
      this.kinetic(c, t);   // under the slabs: each slab wipes over its word as it lands
      for (const it of items) this.slab(c, it.f, cam, it.i, t, it.p);
      return;
    }
    // the stack closes into the browser: chrome bar + page, the words exit upward through their masks
    const outR: Rect = lerpRect({ x: 34, y: SLABS[0]!.y, w: 540, h: SLABS[3]!.y + SLABS[3]!.h - SLABS[0]!.y, r: 10 }, BROWSER, merge);
    c.save();
    rrect(c, outR.x, outR.y, outR.w, outR.h, outR.r); c.clip();
    const pageTop = BROWSER.y + 40;
    for (let i = 0; i < 4; i++) {
      const s = SLABS[i]!;
      const tgt: Rect = i === 0 ? { x: BROWSER.x, y: BROWSER.y, w: BROWSER.w, h: 40, r: 0 }
        : { x: BROWSER.x, y: pageTop + (i - 1) * (BROWSER.h - 40) / 3, w: BROWSER.w, h: (BROWSER.h - 40) / 3 + 1, r: 0 };
      const r = lerpRect(s, tgt, merge);
      const col = i === 0 ? mixHex(FX.lime, FX.bone2, merge) : mixHex(i === 2 ? FX.bone : FX.lime, FX.bone, merge);
      fillRR(c, r.x, r.y, r.w, r.h, lerp2(10, 0, merge), col);
      const exitP = inP(span(t, mergeA + .1, mergeA + .3), 3);
      if (exitP < 1) {
        c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
        const size = this.slabSize(c);
        txt(c, WORDS[i]!, r.x + 20, r.y + r.h - 22 - exitP * 130, ax(size, 125, 900), FX.ink);
        c.restore();
      }
    }
    c.restore();
  }
  private slabSize(c: CanvasRenderingContext2D) { return fitAx(c, 'BUILD?', 104, 466, 125, 900); }
  private slab(c: CanvasRenderingContext2D, f: FacePose, cam: Cam, i: number, t: number, p: number) {
    const k = this.faceCorners(f, cam);
    const n = qRot(f.q, [0, 0, 1]);
    const front = dot3(n, norm3(sub3(cam.pos, f.p))) > 0;
    const base = i === 2 ? FX.bone : FX.lime;
    poly(c, k); c.fillStyle = front ? this.shade(f, base, i === 2 ? FX.bone3 : FX.limeDD) : FX.limeDD; c.fill();
    if (i >= 4 || !front) return;
    // the word rises inside its slab once the slab has landed
    const reveal = outP(span(t, this.ev('hook.unfold') + .13 + i * .07, this.ev('hook.unfold') + .45 + i * .07), 4);
    if (reveal <= 0) return;
    c.save();
    planeTransform(c, k[0]!, k[1]!, k[3]!, f.w, f.h);
    c.beginPath(); c.rect(0, 0, f.w, f.h); c.clip();
    const size = this.slabSize(c) * (f.w / 540);
    txt(c, WORDS[i]!, 20 * f.w / 540, f.h - 22 * f.h / 118 + (1 - reveal) * f.h, ax(size, 125, 900), FX.ink);
    c.restore();
    void p;
  }

  // =============================================================================================
  // 1. WEBSITES: a landing page assembles inside the browser in reading order; the cursor clicks the
  // responsive toggle, the window narrows into a phone while every element reflows to mobile, then
  // the page swipes away to the app screen underneath.
  // =============================================================================================
  private websites(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('web.land'), img = this.ev('web.image'), click = this.ev('web.click'), next = this.ev('app.land');
    c.fillStyle = FX.ink; c.fillRect(0, 0, FXW, FXH);
    const rf = inOutP(span(t, click + .05, next - .28), 3);   // reflow desktop -> mobile
    const swipe = span(t, next - .28, next);                     // page swipes up to the app
    const bend = Math.sin(rf * Math.PI) * .2;
    const R = lerpRect(BROWSER, PHONE, rf);
    // drop shadow (a real object on the stage)
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 40; c.shadowOffsetY = 24;
    fillRR(c, R.x, R.y, R.w, R.h, R.r, FX.bone); c.restore();
    c.save();
    // the "bend": a slight turn of the window about its vertical axis while it narrows
    const cx = R.x + R.w / 2;
    c.translate(cx, R.y); c.transform(Math.cos(bend), Math.sin(bend) * .18, 0, 1, 0, 0); c.translate(-cx, -R.y);
    rrect(c, R.x, R.y, R.w, R.h, R.r); c.clip();
    fillRR(c, R.x, R.y, R.w, R.h, 0, FX.bone);
    // bezel grows as it becomes a phone
    const bez = 8 * span(rf, .55, 1);
    this.page(c, t, R, rf, swipe);
    if (swipe > 0) {
      c.save(); c.translate(0, (1 - inOutP(swipe, 3)) * (R.h)); this.appScreen(c, next); c.restore();
    }
    c.restore();
    if (bez > 0) { rrect(c, R.x + bez / 2, R.y + bez / 2, R.w - bez, R.h - bez, R.r - bez / 2); c.strokeStyle = FX.ink; c.lineWidth = bez; c.stroke(); }
    // the cursor, its hover and its click
    const cur = span(t, img + .1, click);
    if (t > img + .1 && rf < .6) {
      const tx = BROWSER.x + BROWSER.w - 36, ty = BROWSER.y + 20;
      const m = nudge(cur);
      const x = lerp2(560, tx, m), y = lerp2(900, ty, m);
      this.pointer(c, x + rf * -60, y, hitP(t, click, .07));
    }
    void land;
  }

  /** The page itself (desktop at rf 0, mobile at rf 1), clipped to the window R. */
  private page(c: CanvasRenderingContext2D, t: number, R: Rect, rf: number, swipe: number) {
    const land = this.ev('web.land'), img = this.ev('web.image'), click = this.ev('web.click');
    const E = this.E8;
    const ox = R.x, oy = R.y - inOutP(swipe, 3) * R.h;
    const L = (dx: number, mx: number) => ox + lerp2(dx, mx, rf);
    const T = (dy: number, my: number) => oy + lerp2(dy, my, rf);
    // chrome bar -> status bar
    fillRR(c, ox, oy, R.w, lerp2(40, 44, rf), 0, mixHex(FX.bone2, FX.bone, rf));
    for (let i = 0; i < 3; i++) disc(c, ox + 18 + i * 14, oy + 20, 4.5 * (1 - rf), [FX.orange, FX.bone3, FX.bone3][i]!);
    c.save(); c.globalAlpha = 1 - span(rf, 0, .5);
    fillRR(c, ox + 150, oy + 10, 248, 20, 10, FX.bone3);
    txt(c, 'field.studio', ox + 274, oy + 25, mono(10.5, 500), FX.ink, 0, 'center');
    // the responsive toggle the cursor will press
    const tg = hitP(t, click, .09);
    fillRR(c, ox + R.w - 52, oy + 8, 32, 24, 7, mixHex(FX.bone3, FX.lime, Math.max(tg, span(t, click, click + .05))));
    rrect(c, ox + R.w - 41, oy + 12, 10, 16, 2.5); c.strokeStyle = FX.ink; c.lineWidth = 1.5; c.stroke();
    c.restore();
    if (rf > .4) {
      c.save(); c.globalAlpha = span(rf, .4, .9);
      txt(c, '9:41', ox + 26, oy + 30, mono(12, 600), FX.ink);
      fillRR(c, ox + R.w / 2 - 46, oy + 10, 92, 26, 13, FX.ink);
      c.restore();
    }
    const nav = outP(span(t, land - .06, land + .22), 4);
    // nav: logo, links (collapse to a menu on mobile), CTA
    c.save(); c.globalAlpha = nav;
    txt(c, 'FIELD', L(24, 20), T(76, 84), ax(19, 125, 900), FX.ink);
    txt(c, '®', L(98, 92), T(66, 74), ax(9, 100, 700), FX.ink);
    c.save(); c.globalAlpha = nav * (1 - span(rf, 0, .35));
    txt(c, 'Work', ox + 236, oy + 75, ax(12, 100, 500), FX.ink); txt(c, 'Studio', ox + 282, oy + 75, ax(12, 100, 500), FX.ink);
    txt(c, 'Journal', ox + 336, oy + 75, ax(12, 100, 500), FX.ink);
    fillRR(c, ox + 410, oy + 56, 116, 28, 14, FX.ink);
    txt(c, 'Start a project', ox + 468, oy + 75, ax(11.5, 100, 700), FX.bone, 0, 'center');
    c.restore();
    if (rf > .3) {
      c.save(); c.globalAlpha = span(rf, .3, .8);
      for (let i = 0; i < 3; i++) fillRR(c, ox + R.w - 44, oy + 70 + i * 7, 22, 2.5, 1, FX.ink);
      c.restore();
    }
    c.restore();
    // hero: kicker + headline (per-word reflow from 2 lines to 3)
    const kick = outP(span(t, land - .02, land + .28), 4);
    c.save(); c.globalAlpha = kick;
    txt(c, 'Independent motion studio', L(24, 20), T(120, 126) + (1 - kick) * 8, mono(11, 500), alpha(FX.ink, .7));
    c.restore();
    const dSize = 54, mSize = 34;
    const words = [
      { w: 'WEBSITES', line: 0, d: [24, 176], m: [20, 168] }, { w: 'THAT', line: 0, d: 0, m: [20, 204] },
      { w: 'COME', line: 1, d: [24, 232], m: [96, 204] }, { w: 'ALIVE.', line: 1, d: 0, m: [20, 240] },
    ];
    c.font = ax(dSize, 100, 900);
    const sp = c.measureText(' ').width;
    const dW = (s: string) => { c.font = ax(dSize, 100, 900); return c.measureText(s).width; };
    const dPos: number[][] = [[24, 176], [24 + dW('WEBSITES') + sp, 176], [24, 232], [24 + dW('COME') + sp, 232]];
    c.font = ax(mSize, 100, 900);
    const mPos: number[][] = [[20, 172], [20, 208], [20 + c.measureText('THAT ').width, 208], [20, 244]];
    words.forEach((wd, i) => {
      const lineT = land + wd.line * E * .75;
      const p = outP(span(t, lineT, lineT + .38), 4);
      if (p <= 0) return;
      const x = L(dPos[i]![0]!, mPos[i]![0]!), y = T(dPos[i]![1]!, mPos[i]![1]!);
      const size = lerp2(dSize, mSize, rf);
      const isAlive = wd.w === 'ALIVE.';
      const f = isAlive ? ax(size, 100, 800, true) : ax(size, 100, 900);
      c.save(); c.font = f; const w = c.measureText(wd.w).width;
      c.beginPath(); c.rect(x - 4, y - size * 1.0, w + 12, size * 1.22); c.clip();
      txt(c, wd.w, x, y + (1 - p) * size * 1.1, f, isAlive ? FX.orange : FX.ink);
      c.restore();
    });
    // hero art: generative rings on signal orange, wiped open on the kick with a lime leading edge
    const ar = { x: L(24, 16), y: T(256, 268), w: lerp2(500, 274, rf), h: lerp2(204, 150, rf) };
    const wipe = outExpo(span(t, img, img + .5));
    if (wipe > 0) {
      c.save();
      rrect(c, ar.x, ar.y, ar.w * wipe, ar.h, 14); c.clip();
      fillRR(c, ar.x, ar.y, ar.w, ar.h, 14, FX.orange);
      const acx = ar.x + ar.w * .68, acy = ar.y + ar.h * .55;
      for (let k = 0; k < 9; k++) {
        const rr = 18 + k * 17 + 6 * Math.sin(t * 2.2 - k * .6);
        c.beginPath(); c.arc(acx, acy, rr, -.4 + t * (k % 2 ? .5 : -.4), Math.PI * 1.1 + t * (k % 2 ? .5 : -.4));
        c.strokeStyle = alpha(FX.bone, k % 3 ? .55 : .95); c.lineWidth = k % 3 ? 2 : 5; c.stroke();
      }
      disc(c, acx, acy, 13 + 3 * this.hit('kick', t, .1), FX.lime);
      txt(c, 'Selected work 2026', ar.x + 16, ar.y + ar.h - 16, mono(10.5, 600), FX.bone);
      c.restore();
      if (wipe < .995) fillRR(c, ar.x + ar.w * wipe - 2, ar.y - 6, 4, ar.h + 12, 2, FX.lime);
    }
    // cards: three on a row, then stacked in one column on mobile
    for (let i = 0; i < 3; i++) {
      const ct = img + E * .5 + i * E * .5;
      const p = outP(span(t, ct, ct + .4), 4);
      if (p <= 0) continue;
      const hover = i === 1 ? outP(span(t, click - .35, click - .1), 3) * (1 - rf) : 0;
      const cr = { x: L(24 + i * 171, 16), y: T(478, 434 + i * 128), w: lerp2(158, 274, rf), h: lerp2(118, 116, rf) };
      const y = cr.y + (1 - p) * 18 - hover * 6;
      c.save(); c.globalAlpha = p > 0 ? 1 : 0;
      if (hover > 0) { c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 18 * hover; c.shadowOffsetY = 8 * hover; }
      fillRR(c, cr.x, y, cr.w, cr.h, 12, FX.bone2);
      c.restore();
      const th = { x: cr.x + 8, y: y + 8, w: cr.w - 16, h: cr.h - 44 };
      fillRR(c, th.x, th.y, th.w, th.h, 8, [FX.ink, FX.lime, FX.ink3][i]!);
      const k = t * (.8 + i * .3);
      if (i === 0) for (let j = 0; j < 6; j++) strokeLine(c, [[th.x + 10 + j * 14, th.y + th.h - 8], [th.x + 22 + j * 14 + 6 * Math.sin(k + j), th.y + 10]], FX.lime, 2);
      if (i === 1) { disc(c, th.x + th.w / 2, th.y + th.h / 2, 18, FX.ink); disc(c, th.x + th.w / 2 + 14 * Math.cos(k * 2), th.y + th.h / 2 + 8 * Math.sin(k * 2), 7, FX.orange); }
      if (i === 2) for (let j = 0; j < 3; j++) { c.save(); c.translate(th.x + th.w / 2, th.y + th.h / 2); c.rotate(k * .6 + j * .5); c.strokeStyle = FX.bone; c.lineWidth = 1.5; c.strokeRect(-14 - j * 5, -14 - j * 5, 28 + j * 10, 28 + j * 10); c.restore(); }
      txt(c, ['Brand systems', 'Motion', 'Web'][i]!, cr.x + 10, y + cr.h - 16, ax(12, 100, 700), FX.ink);
      txt(c, ['12 projects', '8 films', '20 sites'][i]!, cr.x + cr.w - 10, y + cr.h - 16, mono(9.5, 500), alpha(FX.ink, .55), 0, 'right');
    }
  }

  private pointer(c: CanvasRenderingContext2D, x: number, y: number, click: number) {
    c.save(); c.translate(x, y); const s = 1 - .14 * click; c.scale(s, s);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 22); c.lineTo(6, 17); c.lineTo(11, 27); c.lineTo(15, 25); c.lineTo(10, 15); c.lineTo(18, 15); c.closePath();
    c.fillStyle = FX.ink; c.fill(); c.strokeStyle = FX.bone; c.lineWidth = 1.6; c.stroke(); c.restore();
    if (click > .02) { c.beginPath(); c.arc(x, y, 8 + 22 * (1 - click), 0, TAU); c.strokeStyle = alpha(FX.lime, click); c.lineWidth = 2; c.stroke(); }
  }

  // =============================================================================================
  // 2. APPS: a create flow on the phone (tabs, focus, typing, press, loading, done), the title in two
  // vertical columns beside it; the result card then opens into the full-screen dashboard.
  // =============================================================================================
  private apps(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('app.land'), next = this.ev('data.land');
    const E = this.E8;
    c.fillStyle = FX.ink; c.fillRect(0, 0, FXW, FXH);
    // vertical title columns, sliding up through the strip's mask
    for (let i = 0; i < 2; i++) {
      const s = ['APPS THAT', 'FEEL MAGICAL.'][i]!;
      const p = outP(span(t, land + .04 + i * E, land + .5 + i * E), 4);
      if (p <= 0) continue;
      c.save(); c.beginPath(); c.rect(30, 200, 160, 600); c.clip();
      c.translate(i === 0 ? 92 : 168, 796 + (1 - p) * 620); c.rotate(-Math.PI / 2);
      txt(c, s, 0, 0, ax(68, 75, 900), i === 0 ? FX.bone : FX.lime);
      c.restore();
    }
    // the phone
    c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 40; c.shadowOffsetY = 26;
    fillRR(c, PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE.r, FX.ink); c.restore();
    rrect(c, PHONE.x + .75, PHONE.y + .75, PHONE.w - 1.5, PHONE.h - 1.5, PHONE.r); c.strokeStyle = '#3c4237'; c.lineWidth = 1.5; c.stroke();
    c.save(); rrect(c, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, SCREEN.r); c.clip();
    this.appScreen(c, t);
    c.restore();
    // the result card opens into the dashboard: the card is a window onto the dashboard, its text
    // leaves in the first 40 %, and its eight bars travel into the dashboard's eight bars
    const open = span(t, next - .26, next);
    if (open > 0) {
      const card = this.resultRect();
      const p = inOutP(open, 3);
      const R = lerpRect(card, { x: 0, y: 0, w: FXW, h: FXH, r: 0 }, p);
      c.save(); rrect(c, R.x, R.y, R.w, R.h, R.r); c.clip();
      const s = R.w / FXW;
      c.translate(R.x, R.y - (FXH * s - R.h) * .35 * (1 - p)); c.scale(s, s);
      this.hideDashBars = true; this.dashboard(c, next, 0); this.hideDashBars = false;
      c.restore();
      c.save(); c.globalAlpha = 1 - span(open, 0, .4); rrect(c, R.x, R.y, R.w, R.h, R.r); c.clip();
      c.translate(R.x - card.x * (R.w / card.w), R.y - card.y * (R.h / card.h)); c.scale(R.w / card.w, R.h / card.h);
      this.hideCardBars = true; this.resultCard(c, t, 1); this.hideCardBars = false; c.restore();
      for (let i = 0; i < 8; i++) {
        const from = { x: card.x + 18 + i * 28, b: card.y + 150, w: 16, h: 70 * CARD_BARS[i]! };
        const to = { x: 66 + i * 60, b: 676, w: 30, h: 176 * CARD_BARS[i]! * .9 };
        const q = inOutP(span(open, i * .02, .86 + i * .02), 3);
        const x = lerp2(from.x, to.x, q), bb = lerp2(from.b, to.b, q), w = lerp2(from.w, to.w, q), h = lerp2(from.h, to.h, q);
        fillRR(c, x, bb - h, w, h, lerp2(4, 6, q), i === 6 ? mixHex(FX.lime, FX.limeD, q) : FX.bone3);
      }
    }
  }
  private resultRect(): Rect { return { x: SCREEN.x + 18, y: SCREEN.y + 330, w: 254, h: 176, r: 20 }; }

  /** The app UI on the phone screen (screen space is the column; origin at SCREEN). */
  appScreen(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('app.land'), focus = this.ev('app.focus'), press = this.ev('app.press'), done = this.ev('app.done');
    const E = this.E8;
    const sx = SCREEN.x, sy = SCREEN.y, W = SCREEN.w;
    fillRR(c, sx, sy, W, SCREEN.h, 0, FX.ink2);
    txt(c, '9:41', sx + 26, sy + 30, mono(12, 600), FX.bone);
    fillRR(c, sx + W / 2 - 46, sy + 10, 92, 26, 13, FX.night);
    for (let i = 0; i < 3; i++) fillRR(c, sx + W - 64 + i * 6, sy + 26 - i * 3, 4, 6 + i * 3, 1, FX.bone);
    rrect(c, sx + W - 40, sy + 18, 20, 11, 3); c.strokeStyle = FX.bone; c.lineWidth = 1.2; c.stroke(); fillRR(c, sx + W - 38, sy + 20, 14, 7, 1.5, FX.lime);
    txt(c, 'Create', sx + 20, sy + 86, ax(30, 100, 900), FX.bone);
    txt(c, 'What should we make today?', sx + 20, sy + 108, mono(10.5, 500), alpha(FX.bone, .55));
    disc(c, sx + W - 34, sy + 76, 15, FX.ink3); c.beginPath(); c.arc(sx + W - 34, sy + 76, 15, 0, TAU); c.strokeStyle = FX.lime; c.lineWidth = 2; c.stroke();
    txt(c, 'S', sx + W - 34, sy + 81, ax(13, 100, 900), FX.lime, 0, 'center');
    // segmented control: the pill stretches, leading edge first, from Image to Film
    fillRR(c, sx + 20, sy + 126, 250, 36, 18, FX.ink3);
    const segT = land + E;
    const lead = spring(t - segT, .32, .85), trail = spring(t - segT - .07, .36, .9);
    const x0 = sx + 24, seg = 242 / 3;
    const left = x0 + seg * 2 * trail, right = x0 + seg + seg * 2 * lead;
    fillRR(c, left, sy + 130, right - left, 28, 14, FX.bone);
    ['Image', 'Motion', 'Film'].forEach((s, i) => {
      const mid = x0 + seg * (i + .5);
      const on = sat(1 - Math.abs((left + right) / 2 - mid) / seg);
      txt(c, s, mid, sy + 149, ax(12, 100, 700), mixHex(FX.bone, FX.ink, on), 0, 'center');
    });
    // prompt field: focus ring on the pre-kick, then the typing on the kick
    const f = span(t, focus, focus + .12);
    fillRR(c, sx + 20, sy + 178, 250, 116, 20, FX.ink3);
    rrect(c, sx + 20, sy + 178, 250, 116, 20); c.strokeStyle = mixHex(FX.line, FX.lime, f); c.lineWidth = 1 + f; c.stroke();
    if (f > 0) { c.save(); c.globalAlpha = .35 * hitP(t, focus, .18); rrect(c, sx + 14, sy + 172, 262, 128, 25); c.strokeStyle = FX.lime; c.lineWidth = 6; c.stroke(); c.restore(); }
    txt(c, 'Prompt', sx + 36, sy + 202, mono(10, 600), alpha(FX.bone, .5));
    const text = this.typed('app.type', 'launch the speaker', t);
    if (!text) txt(c, 'Describe your idea…', sx + 36, sy + 238, ax(17, 100, 500), alpha(FX.bone, .32));
    const tw = txt(c, text, sx + 36, sy + 238, ax(18, 100, 600), FX.bone);
    if (t > focus && t < press) {
      const blink = (Math.floor((t - focus) / .25) % 2 === 0) || text.length > 0 && text.length < 18;
      if (blink) fillRR(c, sx + 37 + tw, sy + 222, 2, 21, 1, FX.lime);
    }
    // chips
    [['Product film', 104], ['9:16', 50], ['30 s', 50]].forEach(([s, w], i) => {
      const x = sx + 20 + [0, 112, 170][i]!;
      rrect(c, x, sy + 306, w as number, 26, 13); c.strokeStyle = i === 0 ? FX.lime : FX.line; c.lineWidth = 1.3; c.stroke();
      txt(c, s as string, x + (w as number) / 2, sy + 323, ax(11, 100, 700), i === 0 ? FX.lime : alpha(FX.bone, .7), 0, 'center');
    });
    // the result slot, then the card that appears when the job is done
    const cardIn = spring(t - done - .05, .42, .82);
    if (cardIn < .02) {
      rrect(c, sx + 18, sy + 344, 254, 150, 20); c.setLineDash([4, 5]); c.strokeStyle = alpha(FX.bone, .16); c.lineWidth = 1.2; c.stroke(); c.setLineDash([]);
      txt(c, 'Your result appears here', sx + 145, sy + 424, mono(10, 500), alpha(FX.bone, .3), 0, 'center');
    } else this.resultCard(c, t, cardIn);
    // the button: press -> pill shrinks into a circle -> spinner -> ring closes -> check
    const by = sy + 518, bh = 56;
    const pr = t >= press ? (t < press + .1 ? (t - press) / .1 : 1 - spring(t - press - .1, .35, .7)) : 0;
    const sc = 1 - .05 * pr;
    const toCircle = spring(t - press - .08, .34, .92);
    const bw = lerp2(250, bh, toCircle);
    const bcx = sx + 145;
    c.save(); c.translate(bcx, by + bh / 2); c.scale(sc, sc);
    const doneP = span(t, done, done + .14);
    fillRR(c, -bw / 2, -bh / 2, bw, bh, bh / 2, FX.lime);
    if (toCircle < .5) {
      c.globalAlpha = 1 - span(toCircle, 0, .3);
      txt(c, 'Create', -8, 7, ax(18, 100, 900), FX.ink, 0, 'center');
      this.sparkle(c, 40, 0, 7);
      c.globalAlpha = 1;
    } else if (t < done) {
      const r0 = (t - press) * 7;
      c.beginPath(); c.arc(0, 0, 13, r0, r0 + Math.PI * 1.5); c.strokeStyle = FX.ink; c.lineWidth = 3.2; c.lineCap = 'round'; c.stroke();
    } else {
      c.beginPath(); c.arc(0, 0, 13, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, .75 + doneP)); c.strokeStyle = FX.ink; c.lineWidth = 3.2; c.stroke();
      const ck = span(t, done + .06, done + .24);
      const pts = [[-6, 0], [-1.5, 5], [7, -5]];
      const seg1 = sat(ck * 2), seg2 = sat(ck * 2 - 1);
      strokeLine(c, [pts[0]!, [lerp2(-6, -1.5, seg1), lerp2(0, 5, seg1)]], FX.ink, 3.2);
      if (seg2 > 0) strokeLine(c, [pts[1]!, [lerp2(-1.5, 7, seg2), lerp2(5, -5, seg2)]], FX.ink, 3.2);
    }
    c.restore();
    const burst = hitP(t, done, .14);
    if (burst > .03 && t >= done) { c.beginPath(); c.arc(bcx, by + bh / 2, 30 + 40 * (1 - burst), 0, TAU); c.strokeStyle = alpha(FX.lime, burst); c.lineWidth = 2; c.stroke(); }
    // tab bar
    for (let i = 0; i < 4; i++) {
      const x = sx + 44 + i * 67, y = sy + 590;
      c.strokeStyle = i === 1 ? FX.lime : alpha(FX.bone, .45); c.lineWidth = 1.8;
      if (i === 0) { c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x, y - 8); c.lineTo(x + 8, y); c.lineTo(x + 8, y + 7); c.lineTo(x - 8, y + 7); c.closePath(); c.stroke(); }
      if (i === 1) { for (let k = 0; k < 4; k++) { rrect(c, x - 8 + (k % 2) * 9, y - 8 + Math.floor(k / 2) * 9, 7, 7, 2); c.stroke(); } }
      if (i === 2) { c.beginPath(); c.arc(x, y, 9, 0, TAU); c.stroke(); strokeLine(c, [[x - 4, y], [x + 4, y]], alpha(FX.bone, .45), 1.8); strokeLine(c, [[x, y - 4], [x, y + 4]], alpha(FX.bone, .45), 1.8); }
      if (i === 3) { c.beginPath(); c.arc(x, y - 3, 4, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y + 9, 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    }
    // the touch point: the finger presses the field, then the button
    const touches: [number, number, number][] = [[focus, sx + 150, sy + 236], [press, bcx, by + bh / 2]];
    for (const [tt, x, y] of touches) {
      const a = span(t, tt - .16, tt) * (1 - span(t, tt + .12, tt + .3));
      if (a <= 0) continue;
      disc(c, x, y, 15, alpha(FX.bone, .28 * a)); disc(c, x, y, 7, alpha(FX.bone, .7 * a));
      const r = hitP(t, tt, .1);
      if (t >= tt && r > .03) { c.beginPath(); c.arc(x, y, 16 + 24 * (1 - r), 0, TAU); c.strokeStyle = alpha(FX.bone, r * .8); c.lineWidth = 1.5; c.stroke(); }
    }
    void land;
  }
  private sparkle(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
    c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * .32 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = FX.ink; c.fill();
  }
  private resultCard(c: CanvasRenderingContext2D, t: number, p: number) {
    const R = this.resultRect();
    const y = R.y + (1 - p) * 40;
    c.save(); c.globalAlpha *= sat(p * 1.4);
    fillRR(c, R.x, y, R.w, R.h, R.r, FX.bone);
    txt(c, 'Launch plan ready', R.x + 16, y + 30, ax(15, 100, 800), FX.ink);
    txt(c, '3 channels · 12 posts · 30 s film', R.x + 16, y + 48, mono(9.5, 500), alpha(FX.ink, .6));
    if (!this.hideCardBars) for (let i = 0; i < 8; i++) {
      const h = 70 * CARD_BARS[i]! * outP(span(t, this.ev('app.done') + .1 + i * .02, this.ev('app.done') + .4 + i * .02), 3);
      fillRR(c, R.x + 18 + i * 28, y + 150 - h, 16, h, 4, i === 6 ? FX.lime : FX.bone3);
    }
    txt(c, '+38%', R.x + R.w - 16, y + 30, ax(15, 100, 900), FX.orange, 0, 'right');
    c.restore();
  }

  // =============================================================================================
  // 3. DATA: the launch dashboard. Title on split-flap cells that lock on the kick, KPIs counting,
  // a line drawn over the bars, a filter that re-shapes the series, and in the breakdown a command
  // palette; Enter charges the tallest bar for the drop.
  // =============================================================================================
  private seriesAt(t: number) {
    const a = CARD_BARS.map((v) => v * .9), b = [.4, .36, .52, .48, .7, .64, 1, .74];
    const m = spring(t - (this.ev('data.land') + 2 * this.E8), .45, .85);
    return a.map((v, i) => lerp2(v, b[i]!, m));
  }
  /** The tallest bar's rect at time t (shared with the product section's hand-off). */
  barRect(t: number): Rect {
    const v = this.seriesAt(t);
    const h = 176 * v[6]!;
    return { x: 66 + 6 * 60, y: 676 - h, w: 30, h, r: 6 };
  }
  private data(c: CanvasRenderingContext2D, t: number) {
    this.dashboard(c, t, 0);
  }
  dashboard(c: CanvasRenderingContext2D, t: number, still: number) {
    const land = this.ev('data.land'), lock = this.ev('data.lock'), pal = this.ev('data.palette'), enter = this.ev('data.enter');
    const drop = this.ev('product.drop');
    const E = this.E8;
    c.fillStyle = FX.bone; c.fillRect(0, 0, FXW, FXH);
    txt(c, 'Launch overview', 36, 214, mono(12, 600), FX.ink);
    rrect(c, 460, 198, 78, 22, 11); c.strokeStyle = FX.orange; c.lineWidth = 1.3; c.stroke();
    txt(c, 'DEMO DATA', 499, 213, mono(9.5, 700), FX.orange, 0, 'center');
    // split-flap title: every cell rolls through glyphs and locks, the last one on the kick
    const lines = ['DATA TURNED', 'INTO EXPERIENCES.'];
    const size = fitAx(c, 'INTO EXPERIENCES.', 50, 500, 87.5, 900);
    const fam = F.archivo(87.5, 900);
    const GL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%#';
    lines.forEach((s, li) => {
      const lay = layout(s, fam, size);
      const by = 278 + li * (size * 1.06);
      const n = s.length;
      lay.glyphs.forEach((g, gi) => {
        if (g.ch === ' ') return;
        const order = li === 0 ? gi : 11 + gi;
        const lk = lock - (11 + 17 - 1 - order) * .026 - (li === 0 ? .12 : 0);
        const st = land + order * .012;
        if (t < st && !still) return;
        const x = 36 + g.x;
        c.save(); c.beginPath(); c.rect(x - 1, by - size * .92, g.w + 2, size * 1.1); c.clip();
        if (t >= lk || still) txt(c, g.ch, x, by, font(fam, size), FX.ink);
        else {
          const roll = (t - st) / Math.max(.05, lk - st);
          const k = Math.floor(roll * 9);
          const off = (roll * 9 - k);
          const ch1 = GL[Math.floor(hash(gi, li, k) * GL.length)]!, ch2 = GL[Math.floor(hash(gi, li, k + 1) * GL.length)]!;
          txt(c, ch1, x, by + off * size * 1.05, font(fam, size), alpha(FX.ink, .55));
          txt(c, ch2, x, by - (1 - off) * size * 1.05, font(fam, size), alpha(FX.ink, .55));
        }
        c.restore();
      });
      void n;
    });
    const lockFlash = hitP(t, lock, .09);
    if (lockFlash > .02 && t >= lock) fillRR(c, 36, 278 + size * 1.06 + 10, 500 * (1 - lockFlash * .3), 3, 1.5, alpha(FX.lime, lockFlash));
    // KPI tiles count up and lock on the same kick
    const kp = still ? 1 : outExpo(span(t, land + .1, lock));
    const kpis = [['Pre-orders', 12480, (v: number) => Math.round(v).toLocaleString('en-US')], ['Reach', 2.4, (v: number) => `${v.toFixed(1)}M`], ['Conversion', 6.8, (v: number) => `${v.toFixed(1)}%`]] as const;
    kpis.forEach(([label, val, fmt], i) => {
      const x = 36 + i * 170, y = 358;
      const ap = outP(span(t, land + i * .05, land + .35 + i * .05), 4);
      fillRR(c, x, y + (1 - ap) * 14, 160, 88, 14, i === 0 ? FX.ink : FX.bone2);
      txt(c, label, x + 14, y + 26 + (1 - ap) * 14, ax(11.5, 100, 600), i === 0 ? alpha(FX.bone, .7) : alpha(FX.ink, .65));
      txt(c, fmt(val * kp), x + 14, y + 66 + (1 - ap) * 14, ax(27, 100, 900), i === 0 ? FX.lime : FX.ink);
    });
    // chart card: bars (series morph on the filter), the line drawn over them, the tooltip
    fillRR(c, 36, 462, 536, 246, 18, FX.bone2);
    for (let g = 0; g < 4; g++) strokeLine(c, [[56, 676 - g * 44], [552, 676 - g * 44]], alpha(FX.ink, .08), 1);
    const v = this.seriesAt(t);
    const pts: number[][] = [];
    for (let i = 0; i < 8; i++) {
      const h = 176 * v[i]!;
      const x = 66 + i * 60;
      if (this.hideDashBars) { pts.push([x + 15, 676 - h - 16]); continue; }
      if (i === 6) {
        const charge = span(t, enter + .1, drop);
        c.save();
        if (charge > 0) { c.shadowColor = FX.lime; c.shadowBlur = 30 * charge; }
        fillRR(c, x, 676 - h, 30, h, 6, mixHex(FX.limeD, FX.lime, charge));
        c.restore();
        if (charge > 0) { const sy = 676 - h * ((t - enter) * 3 % 1); fillRR(c, x + 3, sy, 24, 3, 1.5, alpha(FX.bone, .9 * charge)); }
      } else fillRR(c, x, 676 - h, 30, h, 6, FX.bone3);
      pts.push([x + 15, 676 - h - 16]);
      txt(c, ['M', 'T', 'W', 'T', 'F', 'S', 'S', 'M'][i]!, x + 15, 697, mono(9.5, 500), alpha(FX.ink, .5), 0, 'center');
    }
    const draw = still ? 1 : outP(span(t, land + .3, lock), 2);
    if (draw > 0) {
      // the line is drawn, never faded: whole segments up to the pen, then the pen's partial one
      const u = draw * 7, k = Math.floor(u), f = u - k;
      const seg: number[][] = pts.slice(0, k + 1);
      if (k < 7) seg.push([lerp2(pts[k]![0]!, pts[k + 1]![0]!, f), lerp2(pts[k]![1]!, pts[k + 1]![1]!, f)]);
      strokeLine(c, seg, FX.ink, 2.5);
      pts.slice(0, k + 1).forEach((p) => disc(c, p[0]!, p[1]!, 3.5, FX.ink));
      if (draw > .98) {
        const end = pts[7]!;
        fillRR(c, end[0]! - 26, end[1]! - 36, 52, 22, 11, FX.orange);
        txt(c, '+38%', end[0]!, end[1]! - 21, ax(11, 100, 900), FX.bone, 0, 'center');
      }
    }
    // filter chips: the selection pill stretches from 7D to 30D, which re-shapes the series
    const ft = land + 2 * this.E8;
    const lead = spring(t - ft, .3, .85), trail = spring(t - ft - .06, .34, .9);
    const fx0 = 36;
    rrect(c, fx0, 724, 196, 34, 17); c.strokeStyle = alpha(FX.ink, .2); c.lineWidth = 1.2; c.stroke();
    const l = fx0 + 4 + 64 * trail, r = fx0 + 4 + 60 + 64 * lead;
    fillRR(c, l, 728, r - l, 26, 13, FX.ink);
    ['7D', '30D', '90D'].forEach((s, i) => {
      const mid = fx0 + 34 + i * 64; const on = sat(1 - Math.abs((l + r) / 2 - mid) / 64);
      txt(c, s, mid, 746, ax(11.5, 100, 800), mixHex(FX.ink, FX.bone, on), 0, 'center');
    });
    txt(c, 'Updated live · sample series', 538, 746, mono(9.5, 500), alpha(FX.ink, .5), 0, 'right');
    if (still) return;
    // breakdown: the room goes quiet, ⌘K opens, a query is typed, Enter charges the bar
    const dim = span(t, pal, pal + .2) * (1 - .45 * span(t, enter, enter + .2));
    if (dim > 0) {
      c.save(); c.fillStyle = alpha(FX.ink, .5 * dim); c.fillRect(0, 0, FXW, FXH);
      const b = this.barRect(t);
      if (t > enter) { fillRR(c, b.x, b.y, b.w, b.h, 6, FX.lime); }
      c.restore();
    }
    const po = spring(t - pal, .38, .85) * (1 - inP(span(t, enter + .02, enter + .2), 2));
    if (po > .01) {
      const sc = lerp2(.94, 1, po);
      c.save(); c.translate(304, 400); c.scale(sc, sc); c.translate(-304, -400 + (1 - po) * -30);
      c.globalAlpha = sat(po * 1.5);
      c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 30; c.shadowOffsetY = 14;
      fillRR(c, 54, 330, 500, 214, 20, FX.ink); c.shadowColor = 'transparent';
      fillRR(c, 72, 348, 40, 26, 8, FX.ink3); txt(c, '⌘K', 92, 366, mono(11, 700), FX.lime, 0, 'center');
      const q = this.typed('data.palette', 'show growth', t);
      const tw = txt(c, q || 'Search or run a command', 126, 368, ax(17, 100, 600), q ? FX.bone : alpha(FX.bone, .35));
      if (q && Math.floor(t * 4) % 2 === 0) fillRR(c, 128 + tw, 352, 2, 20, 1, FX.lime);
      strokeLine(c, [[72, 392], [536, 392]], FX.line, 1);
      const rows = ['Growth by week', 'Top regions', 'Launch readiness'];
      rows.forEach((s, i) => {
        const y = 404 + i * 44;
        const hl = i === 0 && q.length > 2;
        const fl = i === 0 ? hitP(t, enter, .08) : 0;
        if (hl) fillRR(c, 64, y, 480, 38, 10, mixHex(FX.ink3, FX.lime, fl));
        txt(c, s, 82, y + 25, ax(14, 100, 600), hl ? (fl > .5 ? FX.ink : FX.bone) : alpha(FX.bone, .6));
        txt(c, i === 0 ? '↵' : '', 524, y + 25, mono(13, 700), FX.lime, 0, 'right');
      });
      c.restore();
    }
    void E;
  }

  // =============================================================================================
  // 4. PRODUCT: on the drop the charged bar shoots up and becomes a speaker. Ink stage, letterbox,
  // a top light, rim lights, an orbiting reflection; the type slams in on the drop bar's kicks.
  // =============================================================================================
  private product(c: CanvasRenderingContext2D, t: number) {
    const drop = this.ev('product.drop'), l1 = this.ev('product.l1'), l2 = this.ev('product.l2'), l3 = this.ev('product.l3');
    const next = this.ev('motion.land');
    const shatterA = next - .32;
    c.fillStyle = FX.night; c.fillRect(0, 0, FXW, FXH);
    const lt = t - drop;
    const push = 1 + .07 * inOutSine(span(t, drop, next));
    c.save(); c.translate(304, 560); c.scale(push, push); c.translate(-304, -560);
    // top light and floor pool
    const cone = outP(span(t, drop + .05, drop + .5), 2);
    if (cone > 0) {
      const g = c.createLinearGradient(0, 110, 0, 760);
      g.addColorStop(0, alpha(FX.bone, .16 * cone)); g.addColorStop(1, alpha(FX.bone, 0));
      c.fillStyle = g; poly(c, [[250, 110], [358, 110], [520, 760], [88, 760]]); c.fill();
      const fl = c.createRadialGradient(304, 728, 10, 304, 728, 230);
      fl.addColorStop(0, alpha(FX.lime, .22 * cone)); fl.addColorStop(1, alpha(FX.lime, 0));
      c.fillStyle = fl; c.fillRect(60, 640, 488, 180);
    }
    // the type behind: three lines, three entrances, three kicks
    const tx = (p: number, from: number) => lerp2(from, 0, outExpo(p));
    const exitP = inP(span(t, shatterA, next - .06), 4);
    const f1 = ax(fitAx(c, 'PRODUCT', 96, 500, 125, 900), 125, 900);
    const p1 = span(t, l1, l1 + .45);
    if (p1 > 0) txt(c, 'PRODUCT', 36 + tx(p1, -560) - exitP * 640, 300, f1, FX.bone);
    const p2 = span(t, l2, l2 + .45);
    if (p2 > 0) {
      c.save(); c.font = f1; c.strokeStyle = FX.bone; c.lineWidth = 1.6; c.textBaseline = 'alphabetic';
      c.strokeText('STORIES', 36 + tx(p2, 560) + exitP * 640, 386); c.restore();
    }
    const p3 = span(t, l3, l3 + .22);
    if (p3 > 0) {
      const s3 = lerp2(1.35, 1, outExpo(p3));
      const f3 = ax(fitAx(c, 'THAT SELL.', 86, 500, 125, 900), 125, 900);
      c.save(); c.translate(TCX, 790); c.scale(s3, s3); txt(c, 'THAT SELL.', 0, exitP * 120, f3, FX.lime, 0, 'center'); c.restore();
    }
    // the product: a rounded cylinder; from the bar on the drop
    const bar = this.barRect(drop - 1e-3);
    const target: Rect = { x: 219, y: 412, w: 170, h: 300, r: 0 };
    const stretch = outExpo(span(t, drop, drop + .1));
    const settle = spring(t - drop - .08, .42, .78);
    let R: Rect = { x: bar.x, y: lerp2(bar.y, -60, stretch), w: bar.w, h: lerp2(bar.h, bar.y + bar.h + 60, stretch), r: 6 };
    R = lerpRect(R, target, settle);
    const phi = .6 + lt * .9;
    const tone = span(t, drop + .05, drop + .3);
    if (t < shatterA) this.speaker(c, R, phi, tone, t);
    else this.shatter(c, t, target, phi);
    // spec callouts
    const cl = outP(span(t, l3 + .25, l3 + .55), 3) * (1 - exitP);
    if (cl > 0) {
      c.save(); c.globalAlpha = cl;
      strokeLine(c, [[219 + 10, 520], [150, 520], [150 - 40 * cl, 520]], alpha(FX.bone, .6), 1);
      txt(c, '360° sound', 104 - 40 * cl + 40, 514, mono(10.5, 600), FX.bone, 0, 'right');
      strokeLine(c, [[389 - 10, 610], [460, 610], [460 + 40 * cl, 610]], alpha(FX.bone, .6), 1);
      txt(c, 'aluminium', 468 + 40 * cl - 40, 604, mono(10.5, 600), FX.bone);
      c.restore();
    }
    c.restore();
    // letterbox: slams in on the drop, opens on the way out; the slate lives in the top bar
    const lb = 118 * outExpo(span(t, drop, drop + .22)) * (1 - inOutP(span(t, shatterA + .05, next), 3));
    if (lb > .5) {
      c.fillStyle = '#060705'; c.fillRect(0, 0, FXW, lb); c.fillRect(0, FXH - lb, FXW, lb);
      c.save(); c.globalAlpha = span(t, drop + .15, drop + .4);
      // (below the top band, where the Dubplate cut's mascot walks, so the FICTIONAL PRODUCT label is never covered)
      txt(c, 'AURA ONE — LAUNCH FILM   ·   FICTIONAL PRODUCT', 36, (this.cues as any).variant?.startsWith('flex_gl') ? 214 : lb - 14, mono(10, 600), alpha(FX.bone, .65));
      txt(c, 'SC 04 / TK 1', 536, FXH - lb + 26, mono(10, 600), alpha(FX.bone, .5), 0, 'right');
      c.restore();
    }
  }
  private speaker(c: CanvasRenderingContext2D, R: Rect, phi: number, tone: number, t: number) {
    const cx = R.x + R.w / 2, rad = R.w / 2, ry = Math.min(24, R.w * .14);
    const top = R.y + ry, bot = R.y + R.h - ry;
    // reflection on the floor
    c.save(); c.globalAlpha = .18 * tone; c.translate(0, (bot + ry) * 2 + 6); c.scale(1, -1);
    fillRR(c, R.x, R.y, R.w, R.h, rad * .25, FX.deep); c.restore();
    // shadow
    c.save(); c.globalAlpha = .55 * tone; c.beginPath(); c.ellipse(cx, bot + ry + 4, rad * 1.25, ry * .9, 0, 0, TAU); c.fillStyle = '#000'; c.fill(); c.restore();
    // body with cylindrical shading; the highlight band slides as the camera orbits
    const hl = .32 + .12 * Math.sin(phi);
    const g = c.createLinearGradient(R.x, 0, R.x + R.w, 0);
    g.addColorStop(0, mixHex(FX.lime, '#0d110b', tone)); g.addColorStop(Math.max(.02, hl - .2), mixHex(FX.lime, '#26301f', tone));
    g.addColorStop(hl, mixHex(FX.lime, '#6c7d58', tone)); g.addColorStop(Math.min(.97, hl + .12), mixHex(FX.lime, '#2a3523', tone));
    g.addColorStop(.86, mixHex(FX.lime, '#11160f', tone)); g.addColorStop(1, mixHex(FX.lime, '#3d4a33', tone));
    c.beginPath(); c.moveTo(R.x, top); c.lineTo(R.x, bot); c.ellipse(cx, bot, rad, ry, 0, Math.PI, 0, true); c.lineTo(R.x + R.w, top);
    c.ellipse(cx, top, rad, ry, 0, 0, Math.PI, true); c.closePath(); c.fillStyle = g; c.fill();
    // rim lights: warm white right, lime left
    c.save(); c.globalAlpha = tone;
    strokeLine(c, [[R.x + R.w - 1.5, top + 4], [R.x + R.w - 1.5, bot]], alpha(FX.bone, .75), 2);
    strokeLine(c, [[R.x + 1.5, top + 10], [R.x + 1.5, bot - 6]], alpha(FX.lime, .5), 1.5);
    // grille: dots on the cylinder, foreshortened at the edges, rotating with the orbit
    for (let row = 0; row < 22; row++) {
      const y = top + 50 + row * 10;
      if (y > bot - 18) break;
      for (let j = 0; j < 44; j++) {
        const a = j / 44 * TAU + phi + (row % 2) * (TAU / 88);
        const z = Math.cos(a);
        if (z < .12) continue;
        disc(c, cx + Math.sin(a) * rad * .92, y, 1.5 * Math.sqrt(z), alpha('#0a0c09', .55 + .4 * z));
      }
    }
    // top cap and its light ring (pulses on the kicks)
    c.beginPath(); c.ellipse(cx, top, rad, ry, 0, 0, TAU); c.fillStyle = '#1b2217'; c.fill();
    const pulse = this.hit('kick', t, .12);
    c.save(); c.shadowColor = FX.lime; c.shadowBlur = 16 + 20 * pulse;
    c.beginPath(); c.ellipse(cx, top, rad * .72, ry * .7, 0, 0, TAU); c.strokeStyle = alpha(FX.lime, .75 + .25 * pulse); c.lineWidth = 3; c.stroke(); c.restore();
    txt(c, 'aura', cx, bot - 22, ax(11, 125, 900), alpha(FX.bone, .45), 1, 'center');
    c.restore();
  }
  /** The speaker's silhouette breaks into a 5 x 6 grid of modules that fly to the poster layout. */
  private shatter(c: CanvasRenderingContext2D, t: number, R: Rect, phi: number) {
    const next = this.ev('motion.land');
    const a = next - .32;
    for (let i = 0; i < 30; i++) {
      const col = i % 5, row = Math.floor(i / 5);
      const from = { x: R.x + col * 34 + 17, y: R.y + row * 50 + 25 };
      const to = this.moduleHome(i, 0);
      const d = Math.hypot(col - 2, row - 2.5);
      const p = inOutP(span(t, a + d * .018, next), 3);
      const x = lerp2(from.x, to.x, p), y = lerp2(from.y, to.y, p) - Math.sin(p * Math.PI) * 60;
      const s = lerp2(32, 50, p);
      c.save(); c.translate(x, y); c.rotate((1 - p) * 0 + p * (hash(i, 3) - .5) * .6 * (1 - p) * 4);
      this.module(c, i, s, mixHex('#2a3523', this.moduleColor(i), p), lerp2(0, 1, p) * 0, 0);
      c.restore();
    }
    void phi;
  }

  // =============================================================================================
  // 5. MOTION: a Swiss poster on a lime field. Modules morph (square, circle, quarter, triangle) on the
  // eighths, the type stretches its width; on the kick WITHOUT LIMITS. slams in. The modules then
  // build the character and the lime field closes into the story's sun.
  // =============================================================================================
  /** Colours and kinds follow the grid (diagonals), not chance: the field reads as designed. */
  private moduleColor(i: number) { const col = i % 10, row = Math.floor(i / 10); return [FX.ink, FX.bone, FX.ink, FX.orange, FX.ink][(col + row * 2) % 5]!; }
  private moduleHome(i: number, re: number) {
    const col = i % 10, row = Math.floor(i / 10);
    const a = { x: 61 + col * 54, y: 624 + row * 54 };
    // the kick's re-layout: the rows shear into a brick bond (no overlaps, same field)
    const b = { x: a.x + (row === 1 ? 27 : row === 0 ? -13 : 13), y: a.y - (row - 1) * 4 };
    return { x: lerp2(a.x, b.x, re), y: lerp2(a.y, b.y, re) };
  }
  /**
   * One module: kind 0 square, 1 circle, 2 quarter disc, 3 triangle, all as 24 points in the same
   * clockwise order from the top-left, so `m` morphs one kind into the next like a liquid.
   * `force` pins the kind (the character's parts).
   */
  private module(c: CanvasRenderingContext2D, i: number, s: number, color: string, m: number, kindShift: number, force = -1) {
    const kinds = 4;
    const k0 = force >= 0 ? force : ((i % 10) + Math.floor(i / 10) * 3 + kindShift) % kinds, k1 = force >= 0 ? force : (k0 + 1) % kinds;
    const pts = (k: number): number[][] => {
      const h = s / 2; const out: number[][] = [];
      for (let j = 0; j < 24; j++) {
        const a = j / 24 * TAU - Math.PI * 3 / 4;
        const cs = Math.cos(a), sn = Math.sin(a);
        if (k === 0) { const r = h / Math.max(Math.abs(cs), Math.abs(sn)); out.push([cs * r, sn * r]); }
        else if (k === 1) out.push([cs * h, sn * h]);
        else if (k === 2) {
          // quarter disc pivoting on the bottom-left corner: arc top-left -> bottom-right, then the two edges
          if (j < 18) { const b = -Math.PI / 2 + j / 17 * Math.PI / 2; out.push([-h + s * Math.cos(b), h + s * Math.sin(b)]); }
          else if (j < 21) { const f = (j - 17) / 3; out.push([lerp2(h, -h, f), h]); }
          else { const f = (j - 20) / 4; out.push([-h, lerp2(h, -h, f)]); }
        } else { const u = j / 24; const T = [[0, -h], [h, h], [-h, h]]; const seg = Math.floor(u * 3), f = u * 3 - seg; const A = T[seg]!, B = T[(seg + 1) % 3]!; out.push([lerp2(A[0]!, B[0]!, f), lerp2(A[1]!, B[1]!, f)]); }
      }
      return out;
    };
    const A = pts(k0), Bp = pts(k1);
    poly(c, A.map((p, j) => [lerp2(p[0]!, Bp[j]![0]!, m), lerp2(p[1]!, Bp[j]![1]!, m)]));
    c.fillStyle = color; c.fill();
  }
  private motion(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('motion.land'), slam = this.ev('motion.slam'), next = this.ev('stories.land');
    const E = this.E8;
    const build = next - .42;
    // the lime field (2 inverted punch frames on the slam), closing into the sun at the end
    const punch = t >= slam && t < slam + 2 / 60;
    const iris = inOutP(span(t, build + .08, next), 3);
    if (iris > 0) this.storyWorld(c, next, 0, 1);
    const sun = SUN;
    c.save();
    if (iris > 0) { c.beginPath(); c.arc(lerp2(304, sun.x, iris), lerp2(540, sun.y, iris), lerp2(1240, sun.r, iris), 0, TAU); c.clip(); }
    c.fillStyle = punch ? FX.ink : FX.lime; c.fillRect(0, 0, FXW, FXH);
    const fg = punch ? FX.lime : FX.ink;
    const typeOut = inP(span(t, build, build + .2), 3);
    // MOTION: letters rise from the centre outward, then stretch their width in a wave
    const word = 'MOTION';
    const base = fitAx(c, word, 110, 500, 112.5, 900);
    c.font = ax(base, 112.5, 900);
    const widths = Array.from(word).map((ch) => c.measureText(ch).width);
    const stretchT = span(t, slam + E, next - .5);
    const wf = widths.map((_, i) => 1 + .32 * Math.max(0, Math.sin((stretchT * 1.6 - Math.abs(i - 2.5) * .18) * Math.PI)) * (stretchT > 0 && stretchT < 1 ? 1 : 0));
    const total = widths.reduce((s, w, i) => s + w * wf[i]!, 0);
    let x = 36;
    const sc = Math.min(1, 500 / total);
    for (let i = 0; i < word.length; i++) {
      const st = land + .03 + Math.abs(i - 2.5) * .045;
      const p = spring(t - st, .42, .78);
      if (p > 0) {
        c.save(); c.beginPath(); c.rect(30, 220, 560, 112); c.clip();
        c.translate(x * sc + 36 * (1 - sc), 320 + (1 - p) * 120 - typeOut * 130); c.scale(wf[i]! * sc, 1);
        txt(c, word[i]!, 0, 0, ax(base, 112.5, 900), fg); c.restore();
      }
      x += widths[i]! * wf[i]!;
    }
    // WITHOUT (outline) / LIMITS. (solid): slam on the kick
    const sp = span(t, slam, slam + .2);
    if (sp > 0) {
      const s1 = lerp2(1.45, 1, outExpo(sp));
      const fw = ax(fitAx(c, 'WITHOUT', 110, 500, 112.5, 900), 112.5, 900);
      c.save(); c.translate(TCX, 432 - typeOut * 40); c.scale(s1, s1); c.font = fw; c.textAlign = 'center'; c.strokeStyle = fg; c.lineWidth = 2;
      c.textBaseline = 'alphabetic'; c.globalAlpha = 1 - typeOut; c.strokeText('WITHOUT', 0, 0); c.restore();
      const s2 = lerp2(1.6, 1, outExpo(span(t, slam + .04, slam + .26)));
      const fl = ax(fitAx(c, 'LIMITS.', 120, 500, 112.5, 900), 112.5, 900);
      c.save(); c.translate(TCX, 548 - typeOut * 40); c.scale(s2, s2); c.globalAlpha = 1 - typeOut; txt(c, 'LIMITS.', 0, 0, fl, fg, 0, 'center'); c.restore();
    }
    // modules: arrive from the speaker (shatter lands here), morph on the eighths, re-layout on the
    // kick, extrude for depth, then six of them build the character (drawn outside the iris)
    const re = spring(t - slam, .45, .82);
    const parts: (() => void)[] = [];
    for (let i = 0; i < 30; i++) {
      const home = this.moduleHome(i, re);
      const beatN = Math.floor((t - land) / E);
      const ph = (t - land) / E - beatN;
      const wave = Math.floor(i % 10 + Math.floor(i / 10)) % 4;
      const mor = beatN >= 0 && (beatN % 4) === wave ? spring(ph * E, .25, .8) : 0;
      const shift = Math.max(0, beatN - wave + 4) >> 2;
      const ext = 7 * outP(span(t, slam + 2 * E, slam + 3 * E), 3);
      const part = this.charPart(i);
      const cp = part ? inOutP(span(t, build + i * .004, next - .03), 3) : 0;
      const gone = part ? 0 : inP(span(t, build, build + .22), 2);
      let px = home.x, py = home.y, s = 50;
      if (part) { const tg = this.charPartPose(part, next); px = lerp2(home.x, tg.x, cp); py = lerp2(home.y, tg.y, cp) - Math.sin(cp * Math.PI) * 60; s = lerp2(50, tg.s, cp); }
      if (gone > 0) { py += gone * 340; s *= 1 - gone; }
      if (s < .5) continue;
      const rot = (beatN >= 0 ? (shift % 2) * Math.PI / 2 * spring(ph * E, .3, .85) : 0) * (1 - cp);
      const draw = () => {
        c.save(); c.translate(px, py); c.rotate(rot);
        if (ext > .2 && cp < .3) { c.save(); c.translate(ext, ext); this.module(c, i, s, alpha(FX.ink, .28), mor, shift); c.restore(); }
        if (part && cp > 0) {
          const head = part === 'head';
          const col = mixHex(this.moduleColor(i), head ? FX.bone : FX.ink, span(cp, .4, .9));
          // the module becomes its part: a circle for the head, a rounded block for the rest
          if (cp > .5) { if (head) { disc(c, 0, 0, s / 2, col); c.beginPath(); c.arc(0, 0, s / 2, 0, TAU); c.strokeStyle = FX.ink; c.lineWidth = 2.5 * span(cp, .6, 1); c.stroke(); } else fillRR(c, -s / 2, -s / 2, s, s, s * .3, col); }
          else this.module(c, i, s, col, mor * (1 - cp), shift);
        } else this.module(c, i, s, punch ? FX.lime : this.moduleColor(i), mor, shift);
        c.restore();
      };
      if (part && cp > 0) parts.push(draw); else draw();
    }
    c.restore();
    if (iris > .02) { c.save(); c.beginPath(); c.arc(lerp2(304, sun.x, iris), lerp2(540, sun.y, iris), lerp2(1240, sun.r, iris), 0, TAU); c.strokeStyle = alpha(FX.ink, .25); c.lineWidth = 2; c.stroke(); c.restore(); }
    for (const d of parts) d();
  }
  private charPart(i: number): string | null { return ({ 3: 'body', 14: 'head', 22: 'legL', 27: 'legR', 9: 'armL', 18: 'armR' } as Record<number, string>)[i] ?? null; }
  private charPartPose(part: string, t: number) {
    const k = this.charPose(t);
    const m: Record<string, { x: number; y: number; s: number }> = {
      body: { x: k.x, y: k.y - 52, s: 56 }, head: { x: k.x, y: k.y - 108, s: 52 }, legL: { x: k.x - 12, y: k.y - 12, s: 18 },
      legR: { x: k.x + 12, y: k.y - 12, s: 18 }, armL: { x: k.x - 34, y: k.y - 56, s: 16 }, armR: { x: k.x + 34, y: k.y - 56, s: 16 },
    };
    return m[part]!;
  }

  // =============================================================================================
  // 6. STORIES: a layered dusk landscape with parallax; the character walks, looks up, catches the
  // seed falling from the sun, and jumps for joy. Then the illustration drains to wireframe and
  // folds flat into the city's ground grid.
  // =============================================================================================
  private charPose(t: number) {
    const land = this.ev('stories.land'), spot = this.ev('stories.spot');
    const walk = span(t, land + .05, spot);
    return { x: lerp2(150, 300, inOutSine(walk)), y: 742 };
  }
  /** The story world. `wire` 0..1 drains the fills to outlines; `flat` 0..1 folds it toward the horizon. */
  storyWorld(c: CanvasRenderingContext2D, t: number, wire: number, still = 0) {
    const land = this.ev('stories.land');
    const pan = still ? 0 : Math.max(0, t - land) * 38;
    const night = wire;
    const sky = [mixHex('#e9e7d8', FX.night, night), mixHex('#f0e2cc', FX.night, night), mixHex('#f4d4b2', FX.night, night), mixHex('#f6c49c', FX.night, night)];
    sky.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, i * 160, FXW, 161 + (i === 3 ? 600 : 0)); });
    const horizon = 742;
    const layer = (seed: number, baseY: number, amp: number, speed: number, fill: string, trees = false) => {
      const off = pan * speed;
      const pts: number[][] = [[-10, FXH + 10]];
      for (let x = -10; x <= FXW + 10; x += 8) {
        const u = (x + off) / 140;
        pts.push([x, baseY - amp * (.55 + .45 * noise2(u, seed)) - amp * .35 * Math.sin(u * 1.7 + seed)]);
      }
      pts.push([FXW + 10, FXH + 10]);
      const fy = lerp2(1, .0, 0);
      void fy;
      poly(c, pts);
      if (wire < 1) { c.fillStyle = alpha(fill, 1 - wire); c.fill(); }
      if (wire > 0) { c.strokeStyle = alpha(FX.lime, wire * .9); c.lineWidth = 1.5; c.stroke(); }
      if (trees) {
        for (let k = 0; k < 9; k++) {
          const tx = ((k * 97 - off) % (FXW + 120) + FXW + 120) % (FXW + 120) - 60;
          const u = (tx + off) / 140;
          const ty = baseY - amp * (.55 + .45 * noise2(u, seed)) - amp * .35 * Math.sin(u * 1.7 + seed) + 4;
          const h = 34 + hash(k, seed) * 26;
          poly(c, [[tx, ty - h], [tx + 11, ty], [tx - 11, ty]]);
          if (wire < 1) { c.fillStyle = alpha(fill, 1 - wire); c.fill(); }
          if (wire > 0) { c.strokeStyle = alpha(FX.lime, wire * .9); c.lineWidth = 1.2; c.stroke(); }
        }
      }
    };
    // sun (the lime field became it); on the fold it sinks into the horizon
    const sink = this.sunSink;
    disc(c, SUN.x, lerp2(SUN.y, 760, sink), SUN.r * (1 - .6 * sink), FX.lime);
    if (wire > 0 && sink < .5) { c.beginPath(); c.arc(SUN.x, SUN.y, SUN.r + 8, 0, TAU); c.strokeStyle = alpha(FX.lime, wire * (1 - 2 * sink)); c.stroke(); }
    layer(1, 560, 70, .15, mixHex(FX.sage, '#efe6d6', .5));
    c.fillStyle = alpha('#f6e9d8', .25 * (1 - wire)); c.fillRect(0, 520, FXW, 60);
    layer(2, 640, 60, .35, FX.sage, true);
    layer(3, 700, 40, .6, FX.moss);
    c.fillStyle = mixHex(FX.deep, FX.night, wire); c.fillRect(0, horizon, FXW, FXH - horizon);
    if (wire > 0) strokeLine(c, [[0, horizon], [FXW, horizon]], alpha(FX.lime, wire), 1.5);
    // grass tufts on the ground, faster than everything
    for (let k = 0; k < 14; k++) {
      const gx = ((k * 53 - pan * 1.0) % (FXW + 40) + FXW + 40) % (FXW + 40) - 20;
      strokeLine(c, [[gx, horizon + 6], [gx + 3, horizon - 6]], alpha(FX.sage, .8 * (1 - wire)), 2);
    }
  }
  /** The character: built of the poster's modules (head, body, arms, legs). */
  character(c: CanvasRenderingContext2D, t: number, scale = 1, seedHold = 1) {
    const land = this.ev('stories.land'), spot = this.ev('stories.spot'), ctc = this.ev('stories.catch'), jump = this.ev('stories.jump');
    const k = this.charPose(t);
    const walking = t > land && t < spot;
    const ph = (t - land) * 2.3 * TAU;
    const swing = walking ? Math.sin(ph) * .5 : 0;
    const bob = walking ? Math.abs(Math.sin(ph)) * 4 : 0;
    // squash on landing, anticipation crouch, jump arc, landing squash
    const landSq = 1 + .22 * Math.exp(-(t - land) * 9) * Math.cos((t - land) * 22) * (t > land ? 1 : 0);
    const crouch = span(t, jump - .1, jump) * (1 - span(t, jump, jump + .06));
    const air = t > jump && t < jump + .42 ? Math.sin((t - jump) / .42 * Math.PI) : 0;
    const landB = t > jump + .42 ? Math.exp(-(t - jump - .42) * 10) * .2 : 0;
    const sy = landSq * (1 - .15 * crouch - landB * .8) * (1 + .1 * air), sx = (1 / sy);
    const look = outP(span(t, spot - .05, spot + .15), 3);
    const happy = t > ctc;
    c.save();
    c.translate(k.x, k.y - bob - air * 74); c.scale(scale * sx, scale * sy);
    // legs
    const leg = (side: number, a: number) => { c.save(); c.translate(side * 12, -26); c.rotate(a); strokeLine(c, [[0, 0], [0, 24]], FX.ink, 10); c.restore(); };
    leg(-1, swing); leg(1, -swing);
    // body
    fillRR(c, -28, -82, 56, 60, 18, FX.ink);
    // arms: swing while walking, reach up to catch, hug the seed
    const reach = outP(span(t, ctc - .18, ctc), 3) * (1 - .78 * inOutP(span(t, ctc + .12, ctc + .45), 3));
    const armA = (side: number) => walking ? -side * swing * .8 : lerp2(side * .25, side * -2.4, reach);
    for (const side of [-1, 1]) { c.save(); c.translate(side * 26, -72); c.rotate(armA(side)); strokeLine(c, [[0, 0], [0, 28]], FX.ink, 9); c.restore(); }
    // head: bone circle, eyes lead the look upward, happy arcs after the catch
    c.save(); c.translate(0, -108); c.rotate(-look * .25 + Math.sin(t * 2) * .03);
    disc(c, 0, 0, 26, FX.bone); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.strokeStyle = FX.ink; c.lineWidth = 2.5; c.stroke();
    const ey = -look * 4;
    if (!happy) { disc(c, -9, ey, 3.6, FX.ink); disc(c, 9, ey, 3.6, FX.ink); }
    else { for (const ex of [-9, 9]) { c.beginPath(); c.arc(ex, ey + 2, 4.5, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = FX.ink; c.lineWidth = 2.5; c.stroke(); } }
    if (happy) { c.beginPath(); c.arc(0, 8, 6, .2, Math.PI - .2); c.strokeStyle = FX.ink; c.lineWidth = 2.2; c.stroke(); }
    c.restore();
    c.restore();
    // the seed: falls from the sun, caught on the kick, then glows in the hands
    if (seedHold) {
      const fall = span(t, spot - .25, ctc);
      if (t > spot - .25) {
        const hands = { x: k.x, y: k.y - 150 - air * 74 };
        const held = t >= ctc;
        const sx0 = SUN.x, sy0 = SUN.y;
        const p = inP(fall, 2);
        const hug = inOutP(span(t, ctc + .12, ctc + .45), 3);
        const x = held ? hands.x : lerp2(sx0, hands.x, p), y = held ? lerp2(hands.y, k.y - 60 - bob - air * 74, hug) : lerp2(sy0, hands.y, p) - Math.sin(p * Math.PI) * 30;
        if (!held) for (let j = 1; j < 6; j++) { const q = inP(sat(fall - j * .04), 2); disc(c, lerp2(sx0, hands.x, q), lerp2(sy0, hands.y, q) - Math.sin(q * Math.PI) * 30, 6 - j, alpha(FX.lime, .5 - j * .08)); }
        this.drawCube(c, x, y, 22 * scale, this.cubeQ(t, 2), held ? 1 + hitP(t, ctc, .2) : .6);
        if (held) {
          const b = hitP(t, ctc, .16);
          for (let j = 0; j < 8; j++) { const a = j / 8 * TAU; strokeLine(c, [[x + Math.cos(a) * (24 + 10 * (1 - b)), y + Math.sin(a) * (24 + 10 * (1 - b))], [x + Math.cos(a) * (32 + 14 * (1 - b)), y + Math.sin(a) * (32 + 14 * (1 - b))]], alpha(FX.ink, b), 2); }
        }
      }
    }
  }
  private stories(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('stories.land'), next = this.ev('worlds.land');
    const wire = inOutP(span(t, next - .4, next - .12), 2);
    const flat = inOutP(span(t, next - .22, next), 3);
    c.fillStyle = FX.night; c.fillRect(0, 0, FXW, FXH);
    this.sunSink = inP(span(t, next - .3, next - .04), 2);
    c.save();
    if (flat > 0) { c.translate(0, 742); c.scale(1, 1 - .85 * flat); c.translate(0, -742); }
    this.storyWorld(c, t, wire);
    this.sunSink = 0;
    c.restore();
    if (flat > 0) this.groundGrid(c, flat);
    // title: per-word rise in the sky, italic
    const words = [['STORIES', 0, 0], ['BROUGHT', 1, 0], ['TO', 1, 1], ['LIFE.', 1, 2]] as const;
    c.font = ax(44, 100, 800, true);
    const sp = c.measureText(' ').width;
    let lx = 36;
    words.forEach(([w, line, k], i) => {
      const st = land + .12 + i * .08;
      const p = outP(span(t, st, st + .36), 4) * (1 - inP(span(t, next - .4, next - .2), 2));
      const size = line === 0 ? 70 : 44;
      const f = ax(size, 100, 800, true);
      if (k === 0) lx = 36;
      const y = line === 0 ? 312 : 366;
      c.font = f; const w0 = c.measureText(w).width;
      if (p > 0) {
        c.save(); c.globalAlpha = p > 0 ? 1 : 0;
        c.beginPath(); c.rect(lx - 6, y - size, w0 + 16, size * 1.25); c.clip();
        txt(c, w, lx, y + (1 - p) * size * .9, f, i === 3 ? FX.orangeD : FX.ink);
        c.restore();
      }
      lx += w0 + sp;
    });
    // the hero shrinks onto the street corner where WORLDS finds it
    const hp = this.heroInCity(this.ev('worlds.land'));
    c.save();
    c.translate(lerp2(300, hp.x, flat), lerp2(742, hp.y, flat)); c.scale(lerp2(1, hp.s, flat), lerp2(1, hp.s, flat)); c.translate(-300, -742);
    this.character(c, t, 1);
    c.restore();
  }
  heroInCity(t: number) { const p = proj([35, 0, 245], this.worldCam(t)); return { x: p[0], y: p[1], s: p[3] * .38 }; }
  /** The ground grid of the city as seen at the start of WORLDS (shared hand-off). */
  private groundGrid(c: CanvasRenderingContext2D, p: number) {
    const cam = this.worldCam(this.ev('worlds.land'));
    c.save(); c.globalAlpha = p;
    for (let i = -6; i <= 6; i++) {
      const a = proj([i * 70 - 35, 0, -500], cam), b = proj([i * 70 - 35, 0, 420], cam);
      strokeLine(c, [[a[0], a[1]], [b[0], b[1]]], alpha(FX.lime, .22), 1);
      const d = proj([-450, 0, i * 70 - 35], cam), e = proj([450, 0, i * 70 - 35], cam);
      strokeLine(c, [[d[0], d[1]], [e[0], e[1]]], alpha(FX.lime, .22), 1);
    }
    c.restore();
  }

  // =============================================================================================
  // 7. WORLDS: a procedural city rises out of the grid in a ripple; one camera move per phrase
  // (crane down + dolly in); the title stands up as billboards in 3D; on the way out the towers
  // become waves and the camera rises to top-down.
  // =============================================================================================
  worldCam(t: number): Cam {
    const land = this.ev('worlds.land'), out = this.ev('sound.land');
    // one move for the phrase: a high, turned view cranes down and dollies in; then up to top-down
    const m = inOutP(span(t, land - .1, out - .5), 2);
    const up = inOutP(span(t, out - .5, out - .2), 3);
    const pos: V3 = [lerp2(lerp2(-90, 80, m), 0, up), lerp2(lerp2(-760, -430, m), -1040, up), lerp2(lerp2(760, 760, m), 0.01, up)];
    return { pos, yaw: lerp2(lerp2(-.22, .14, m), 0, up), pitch: lerp2(lerp2(.78, .47, m), Math.PI / 2 - .001, up), f: 760, cx: 304, cy: 520 };
  }
  private towerH(i: number, j: number) {
    const n = (noise2(i * .42 + 3, j * .42 + 7) + 1) / 2;
    const lm = hash(i, j, 4) > .9 ? 1.3 : 1;
    const centre = i === 0 && j === 0 ? 1.35 : 1;
    const edge = 1 - .35 * sat((Math.hypot(i, j) - 2.5) / 3);
    return (30 + 210 * n * n) * lm * centre * edge;
  }
  private worlds(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('worlds.land'), title = this.ev('worlds.title'), next = this.ev('sound.land');
    const cam = this.worldCam(t);
    c.fillStyle = FX.night; c.fillRect(0, 0, FXW, FXH);
    const waveP = inOutP(span(t, next - .5, next - .15), 2);
    const ringP = inOutP(span(t, next - .2, next), 3);
    // ground grid
    c.save(); c.globalAlpha = 1 - ringP;
    for (let i = -6; i <= 6; i++) {
      const a = proj([i * 70 - 35, 0, -500], cam), b = proj([i * 70 - 35, 0, 420], cam);
      strokeLine(c, [[a[0], a[1]], [b[0], b[1]]], alpha(FX.lime, .22), 1);
      const d = proj([-450, 0, i * 70 - 35], cam), e = proj([450, 0, i * 70 - 35], cam);
      strokeLine(c, [[d[0], d[1]], [e[0], e[1]]], alpha(FX.lime, .22), 1);
    }
    const gp = proj([0, 0, 0], cam);
    const pool = c.createRadialGradient(gp[0], gp[1], 10, gp[0], gp[1], 420 * gp[3]);
    pool.addColorStop(0, alpha(FX.lime, .16)); pool.addColorStop(1, alpha(FX.lime, 0));
    c.fillStyle = pool; c.fillRect(0, 0, FXW, FXH);
    // the scan ray: a line of light sweeping the ground
    const sx = -420 + ((t - land) * 360) % 840;
    const s0 = proj([sx, 0, -500], cam), s1 = proj([sx, 0, 420], cam);
    strokeLine(c, [[s0[0], s0[1]], [s1[0], s1[1]]], alpha(FX.lime, .5), 2);
    c.restore();
    // towers
    type B = { i: number; j: number; x: number; z: number; h: number; d: number };
    const blocks: B[] = [];
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const d = Math.hypot(i, j);
      const rise = spring(t - (land + d * .045), .5, .8);
      let h = this.towerH(i, j) * rise;
      const wv = 60 + 50 * Math.sin(d * 1.1 - (t - (next - .5)) * 11) + 70 * this.au('low', t);
      h = lerp2(h, wv, waveP);
      const x = i * 70, z = j * 70;
      blocks.push({ i, j, x, z, h, d: Math.hypot(x - cam.pos[0], -h / 2 - cam.pos[1], z - cam.pos[2]) });
    }
    blocks.sort((a, b) => b.d - a.d);
    const hat = this.hit('hat', t, .06);
    if (ringP > 0) {
      // the night city contracts into the record; its tops (seen from above) fly onto the tick ring
      c.fillStyle = FX.bone; c.fillRect(0, 0, FXW, FXH);
      disc(c, REC.cx, REC.cy, lerp2(900, REC.disc, ringP), FX.night);
      // each top takes the ring slot of its own bearing from the centre: radial paths, no crossings
      const order = blocks.map((b) => ({ b, a: b.i === 0 && b.j === 0 ? -Math.PI / 2 : Math.atan2(b.j, b.i) + Math.hypot(b.i, b.j) * 1e-4 }))
        .sort((p, q) => p.a - q.a);
      for (let r = 0; r < order.length; r++) {
        const b = order[r]!.b;
        const ang = order[0]!.a + r / order.length * TAU;
        const p0 = proj([b.x, -b.h, b.z], cam);
        const tx = REC.cx + Math.cos(ang) * (REC.tick0 + 3), ty = REC.cy + Math.sin(ang) * (REC.tick0 + 3);
        const x = lerp2(p0[0], tx, ringP), y = lerp2(p0[1], ty, ringP);
        const s = lerp2(52 * p0[3], 3.5, ringP), sh = lerp2(52 * p0[3], 14, ringP);
        c.save(); c.translate(x, y); c.rotate((ang + Math.PI / 2) * ringP);
        fillRR(c, -s / 2, -sh / 2, s, sh, 1, mixHex(FX.bone2, FX.ink, ringP)); c.restore();
      }
      return;
    }
    for (const b of blocks) this.tower(c, cam, b.x, b.z, 26, b.h, b.i, b.j, hat);
    // annotations pinned to towers (the code behind the city)
    const ann: [number, number, string][] = [[2, -1, 'extrude(h)'], [-3, 1, 'noise(x, z)'], [1, 3, 'cam.dolly(0.8)']];
    const an = outP(span(t, title - .3, title + .1), 3) * (1 - waveP);
    if (an > 0) for (const [i, j, s] of ann) {
      const p = proj([i * 70, -this.towerH(i, j) - 10, j * 70], cam);
      c.save(); c.globalAlpha = an; disc(c, p[0], p[1], 3, FX.lime);
      strokeLine(c, [[p[0], p[1]], [p[0] + 18, p[1] - 18], [p[0] + 30, p[1] - 18]], alpha(FX.lime, .8), 1);
      txt(c, s, p[0] + 34, p[1] - 14, mono(10.5, 600), FX.lime); c.restore();
    }
    // spatial title: three billboards placed in the world where the end of the camera move frames
    // them in the safe zone; each stands up about its bottom edge on the kick
    const endCam = this.worldCam(next - .5);
    const fwd = norm3(sub3(this.unproj(304, 520, 1, endCam), endCam.pos));
    const lines: [string, number, number][] = [['WORLDS', 222, 306], ['BUILT FROM', 322, 376], ['CODE.', 392, 476]];
    lines.forEach(([s, y0, y1], li) => {
      const st = title - .12 + li * .07;
      const up = spring(t - st, .5, .78) * (1 - inP(span(t, next - .55, next - .32), 2));
      if (up <= .001) return;
      const D = 640;
      const BL = this.unproj(36, y1, D, endCam), BR = this.unproj(536, y1, D, endCam), TL0 = this.unproj(36, y0, D, endCam);
      const hv = sub3(TL0, BL), hl = Math.hypot(...hv);
      const ang = (1 - up) * Math.PI / 2;
      const lift = add3(scl3(hv, Math.cos(ang)), scl3(fwd, hl * Math.sin(ang)));
      const TL = add3(BL, lift), TR = add3(BR, lift);
      const p0 = proj(TL, cam), p1 = proj(TR, cam), p2 = proj(BL, cam);
      const w = 500, h = y1 - y0;
      c.save(); planeTransform(c, p0, p1, p2, w, h);
      const fs = fitAx(c, s, h * 1.3, w, 112.5, 900);
      txt(c, s, 0, h - 3, ax(fs, 112.5, 900), li === 2 ? FX.lime : FX.bone);
      c.restore();
    });
    // the tiny hero from the story, standing in the street, still holding the seed
    const hp = this.heroInCity(t);
    c.save(); c.translate(hp.x, hp.y); c.scale(hp.s, hp.s); c.translate(-300, -742);
    this.character(c, this.ev('stories.jump') + .9, 1, 1); c.restore();
  }
  /** Screen point at camera depth D -> world (inverse of proj). */
  private unproj(sx: number, sy: number, D: number, cam: Cam): V3 {
    let q: V3 = [(sx - cam.cx) * D / cam.f, (sy - cam.cy) * D / cam.f, -D];
    q = rotX(q, cam.pitch); q = rotY(q, cam.yaw);
    return add3(q, cam.pos);
  }
  /** A tower: dark glass with a cool key from the right, window bands, lit edges, an emissive top; fogged by distance. */
  private tower(c: CanvasRenderingContext2D, cam: Cam, x: number, z: number, hw: number, h: number, i: number, j: number, hat: number) {
    if (h < 1) return;
    const P = (dx: number, y: number, dz: number) => proj([x + dx, y, z + dz], cam);
    const top = [P(-hw, -h, -hw), P(hw, -h, -hw), P(hw, -h, hw), P(-hw, -h, hw)];
    const bot = [P(-hw, 0, -hw), P(hw, 0, -hw), P(hw, 0, hw), P(-hw, 0, hw)];
    const dist = Math.hypot(x - cam.pos[0], -h / 2 - cam.pos[1], z - cam.pos[2]);
    const fog = sat((dist - 650) / 900);
    const faces: [number[][], V3, string, string][] = [
      [[top[3]!, top[2]!, bot[2]!, bot[3]!], [0, 0, 1], '#3a4235', '#161a13'], [[top[1]!, top[2]!, bot[2]!, bot[1]!], [1, 0, 0], '#59634f', '#1e231a'],
      [[top[0]!, top[3]!, bot[3]!, bot[0]!], [-1, 0, 0], '#2a3026', '#121510'], [[top[0]!, top[1]!, bot[1]!, bot[0]!], [0, 0, -1], '#232820', '#101310'],
    ];
    for (const [pts, n, hi, lo] of faces) {
      const center: V3 = [x + n[0] * hw, -h / 2, z + n[2] * hw];
      if (dot3(n, sub3(cam.pos, center)) <= 0) continue;
      const tm = [(pts[0]![0]! + pts[1]![0]!) / 2, (pts[0]![1]! + pts[1]![1]!) / 2], bm = [(pts[2]![0]! + pts[3]![0]!) / 2, (pts[2]![1]! + pts[3]![1]!) / 2];
      const g = c.createLinearGradient(tm[0]!, tm[1]!, bm[0]!, bm[1]!);
      g.addColorStop(0, mixHex(hi, FX.night, fog)); g.addColorStop(1, mixHex(lo, FX.night, fog));
      poly(c, pts); c.fillStyle = g; c.fill();
      // window bands
      c.save(); poly(c, pts); c.clip();
      const floors = Math.floor(h / 14);
      for (let k = 1; k < floors; k++) {
        const v = k / floors;
        const a = [lerp2(pts[0]![0]!, pts[3]![0]!, v), lerp2(pts[0]![1]!, pts[3]![1]!, v)], b = [lerp2(pts[1]![0]!, pts[2]![0]!, v), lerp2(pts[1]![1]!, pts[2]![1]!, v)];
        strokeLine(c, [a, b], alpha(FX.bone, .07 * (1 - fog)), 1);
      }
      c.restore();
      // the edge toward the light catches it
      strokeLine(c, [pts[1]!, pts[2]!], alpha(FX.bone, (n[0] > 0 ? .55 : .22) * (1 - fog)), 1);
    }
    const lm = (i === 0 && j === 0) || hash(i, j, 4) > .9;
    const flick = hash(i, j, 11) > .78 && hat > .3;
    poly(c, top); c.fillStyle = mixHex(lm ? FX.lime : flick ? mixHex('#4a5541', FX.lime, hat) : '#4a5541', FX.night, fog * .7); c.fill();
    if (lm) { c.strokeStyle = alpha(FX.lime, .9); c.lineWidth = 1; c.stroke(); }
  }

  // =============================================================================================
  // 8. SOUND: the song itself, drawn. A record whose groove is the measured waveform, a ring that is
  // the current bar (its eight eighths marked, the playhead sweeping), particles on a rose curve
  // that changes its petals on the kicks. Then everything collapses into one point.
  // =============================================================================================
  private sound(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('sound.land'), k1 = this.ev('sound.k1'), k2 = this.ev('sound.k2'), next = this.ev('idea.land');
    const col = inOutP(span(t, next - .42, next - .1), 3);
    const bloom = span(t, next - .12, next);
    const punch = t >= k2 && t < k2 + 2 / 60;
    c.fillStyle = punch ? FX.ink : FX.bone; c.fillRect(0, 0, FXW, FXH);
    const cx = REC.cx, cy = REC.cy;
    const zoom = 1 + .035 * hitP(t, k1, .09) + .05 * hitP(t, k2, .09);
    // the record expands to fill the frame while its contents collapse to the centre
    const discR = lerp2(REC.disc, 900, col);
    const inner = 1 - col;
    c.save(); c.translate(cx, cy); c.scale(zoom, zoom); c.translate(-cx, -cy);
    disc(c, cx, cy, discR, FX.night);
    const intro = outP(span(t, land, land + .35), 3);
    if (inner > .01) {
      // groove: 22 turns, amplitude from the song's own waveform (outer = now), wound in on arrival
      const rot = (t + this.off) * 1.7;
      c.beginPath();
      const N = 2200;
      for (let n = 0; n <= N * intro; n++) {
        const s = n / N;
        const r = (REC.g0 + (REC.g1 - REC.g0) * s) * inner;
        const th = s * TAU * 22 + rot;
        const amp = this.waveAt(t - (1 - s) * 3.2) * 3.6 * (n % 2 ? 1 : -1) * inner;
        const x = cx + Math.cos(th) * (r + amp), y = cy + Math.sin(th) * (r + amp);
        n ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.strokeStyle = alpha(FX.bone, .34); c.lineWidth = .8; c.stroke();
      // label
      disc(c, cx, cy, 54 * inner * intro, FX.lime);
      c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(inner * intro, inner * intro);
      const song = songOf(this.cues);
      txt(c, song.line1, 0, -5, ax(fitAx(c, song.line1, 10.5, 92, 125, 900), 125, 900), FX.ink, .4, 'center');
      txt(c, song.line2, 0, 8, ax(fitAx(c, song.line2, 8.5, 92, 125, 900), 125, 900), FX.ink, .4, 'center');
      txt(c, song.tempo, 0, 26, mono(7, 600), alpha(FX.ink, .7), 0, 'center');
      c.restore();
      disc(c, cx, cy, 3.5 * inner, FX.ink);
      // rose particles on the record: petals 3 -> 5 on the first kick, 5 -> 7 on the second
      const kk = 3 + 2 * spring(t - k1, .3, .7) + 2 * spring(t - k2, .3, .7);
      for (let n = 0; n < 260; n++) {
        const th = n / 260 * TAU + (t + this.off) * .4;
        const r = 146 * Math.cos(kk * th) * inner * intro;
        const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r;
        disc(c, x, y, n % 13 === 0 ? 3 : 1.6, n % 13 === 0 ? FX.lime : FX.orange);
      }
    }
    c.restore();
    // the bar ring: 96 ticks = this bar's measured low band, the 8 eighths longer, a playhead
    if (inner > .01) {
      const gp = gridAt(this.cues, t + this.off);
      const barStart = gp.at(gp.sec * 8) - this.off, barLen = gp.at(gp.sec * 8 + 8) - gp.at(gp.sec * 8) || this.BAR;
      const ph = (t - barStart) / barLen;
      for (let n = 0; n < 96; n++) {
        const u = n / 96, a = u * TAU - Math.PI / 2;
        const past = u <= ph;
        const v = this.au('low', barStart + u * barLen);
        const eighth = n % 12 === 0;
        const r0 = REC.tick0 * lerp2(1, .1, col), len = (eighth ? 22 : 4 + 22 * v) * inner;
        strokeLine(c, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)]],
          eighth ? FX.orange : past ? FX.ink : alpha(FX.ink, .22), eighth ? 2.5 : 1.5);
      }
      const a = ph * TAU - Math.PI / 2, pr = (REC.tick0 + 32) * lerp2(1, .1, col);
      disc(c, cx + Math.cos(a) * pr, cy + Math.sin(a) * pr, 4.5 * inner, FX.ink);
      const rf = hitP(t, k1, .14) + hitP(t, k2, .14);
      if (rf > .03) { c.beginPath(); c.arc(cx, cy, REC.disc + 50 * (1 - Math.min(1, rf)), 0, TAU); c.strokeStyle = alpha(FX.orange, Math.min(1, rf)); c.lineWidth = 3; c.stroke(); }
    }
    // type: SOUND (letters ride the bands, at most 6 %), YOU CAN SEE.
    const fg = punch ? FX.bone : FX.ink;
    const sz = fitAx(c, 'SOUND', 78, 500, 125, 900);
    const fam = F.archivo(125, 900);
    const lay = layout('SOUND', fam, sz);
    const tp = outP(span(t, land + .02, land + .32), 4);
    const sw = lay.width, sx0 = TCX - sw / 2;
    lay.glyphs.forEach((g, i) => {
      const band = (['low', 'mid', 'high', 'mid', 'low'] as const)[i]!;
      const lift = this.au(band, t) * sz * .06;
      const gx = lerp2(sx0 + g.x, cx, col), gy = lerp2(272, cy, col);
      c.save(); c.beginPath(); c.rect(0, 196, FXW, 84); c.clip();
      c.translate(gx, gy - lift + (1 - tp) * sz); c.scale(1 - col, 1 - col);
      txt(c, g.ch, 0, 0, font(fam, sz), fg); c.restore();
    });
    const yp = outP(span(t, k1 - .05, k1 + .3), 4);
    if (yp > 0) {
      const f = ax(fitAx(c, 'YOU CAN SEE.', 54, 500, 112.5, 900), 112.5, 900);
      c.font = f; const tw = c.measureText('YOU CAN SEE.').width;
      c.save(); c.translate(lerp2(304, cx, col), lerp2(790, cy, col)); c.scale(1 - col, 1 - col); c.translate(-304, -790);
      c.beginPath(); c.rect(0, 736, FXW, 66); c.clip();
      const w1 = txt(c, 'YOU CAN ', TCX - tw / 2, 790 + (1 - yp) * 66, f, fg);
      txt(c, 'SEE.', TCX - tw / 2 + w1, 790 + (1 - yp) * 66, f, FX.orange);
      c.restore();
    }
    // the point blooms into the cube
    if (bloom > 0) {
      c.fillStyle = FX.ink; c.fillRect(0, 0, FXW, FXH);
      const s = spring(t - (next - .12), .3, .8);
      this.drawCube(c, 304, 455, lerp2(4, 120, s), this.cubeQ(t), s);
    }
  }

  // =============================================================================================
  // 9. ONE IDEA: the cube again, quiet. In the breakdown every scene orbits it; then everything is
  // pulled in for the drop.
  // =============================================================================================
  snapshot(id: string, at: number): HTMLCanvasElement {
    const key = `${id}@${at}`;
    let cv = this.snaps.get(key);
    if (cv) return cv;
    const s = .75;
    cv = document.createElement('canvas'); cv.width = Math.round(FXW * s); cv.height = Math.round(FXH * s);
    const c = cv.getContext('2d')!;
    c.scale(s, s);
    this.drawSection(c, id, at - this.off + this.off);
    this.snaps.set(key, cv);
    return cv;
  }
  /** The scenes as fragments: section id, a hero time, and the crop centre (column px). */
  frags(): [string, number, number, number][] {
    return [['websites', this.ev('web.click') - .05, 304, 520], ['apps', this.ev('app.done') + .15, 375, 520], ['data', this.ev('data.lock') + .1, 304, 520],
      ['product', this.ev('product.l3') + .5, 304, 560], ['motion', this.ev('motion.slam') + .5, 304, 470], ['stories', this.ev('stories.catch') + .3, 300, 560],
      ['worlds', this.ev('worlds.title') + .5, 304, 520], ['sound', this.ev('sound.k2') + .2, 304, 500], ['hook', this.ev('hook.unfold') + .7, 304, 480],
      ['apps', this.ev('app.press') + .2, 375, 600]];
  }
  private tile(c: CanvasRenderingContext2D, k: number, x: number, y: number, w: number, h: number, r = 8) {
    const [id, at, fx, fy] = this.frags()[k % 10]!;
    const img = this.snapshot(id, at);
    const s = img.width / FXW;
    const zoom = Math.max(w / 300, h / 420);
    const sw = w / zoom, sh = h / zoom;
    c.save(); rrect(c, x, y, w, h, r); c.clip();
    c.drawImage(img, (fx - sw / 2) * s, (fy - sh / 2) * s, sw * s, sh * s, x, y, w, h);
    c.restore();
  }
  private idea(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('idea.land'), pulse = this.ev('idea.pulse'), drop = this.ev('endless.drop');
    const br = this.cues.breakdowns.map((b) => [b[0]! - this.off, b[1]! - this.off]).find((b) => b[0]! > land && b[0]! < drop) ?? [drop - 1.3, drop - .3];
    c.fillStyle = FX.ink; c.fillRect(0, 0, FXW, FXH);
    const inhale = inExpo(span(t, br[1]!, drop));
    const orbitIn = outP(span(t, br[0]!, br[0]! + .35), 3) * (1 - inhale);
    // orbiting fragments of every scene
    const items: { k: number; x: number; y: number; z: number }[] = [];
    if (orbitIn > 0) {
      const spin = (t - br[0]!) * 1.4 + Math.pow(Math.max(0, t - br[0]!), 2) * .9;
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * TAU + spin;
        const rr = lerp2(250, 170, span(t, br[0]!, br[1]!)) * (1 - inhale);
        items.push({ k, x: Math.cos(a) * rr, y: Math.sin(a) * rr * .32 - 30, z: Math.sin(a) });
      }
      items.sort((a, b) => a.z - b.z);
    }
    const drawItems = (front: boolean) => {
      for (const it of items) {
        if ((it.z > 0) !== front) continue;
        const sc = (.75 + .3 * it.z) * orbitIn;
        const w = 78 * sc, h = 110 * sc;
        c.save(); c.globalAlpha = lerp2(.45, 1, (it.z + 1) / 2) * orbitIn;
        this.tile(c, it.k, 304 + it.x - w / 2, 455 + it.y - h / 2, w, h, 6);
        c.restore();
      }
    };
    drawItems(false);
    const sq = 1 - .18 * inhale;
    const flash = hitP(t, pulse, .12);
    this.drawCube(c, 304, 455, 120 * sq, this.cubeQ(t, 1 + 2.5 * span(t, br[0]!, drop)), 1 + flash);
    if (flash > .03 && t > pulse) { c.beginPath(); c.arc(304, 455, 110 + 120 * (1 - flash), 0, TAU); c.strokeStyle = alpha(FX.lime, flash); c.lineWidth = 2; c.stroke(); }
    drawItems(true);
    // ONE IDEA.
    const f = ax(fitAx(c, 'ONE IDEA.', 104, 500, 100, 900), 100, 900);
    const p = outP(span(t, land + .04, land + .45), 4);
    const out = inP(span(t, br[1]!, drop - .04), 3);
    c.save(); c.beginPath(); c.rect(0, 616, FXW, 110); c.clip();
    txt(c, 'ONE IDEA.', TCX, 708 + (1 - p) * 110 + out * 110, f, FX.bone, 0, 'center');
    c.restore();
  }

  // =============================================================================================
  // 10. ENDLESS POSSIBILITIES: on the drop the cube bursts into a tunnel of every scene flying at the
  // camera. Then the tiles converge into the title's letters.
  // =============================================================================================
  private tunnel(t: number, drop: number) {
    const out: { k: number; x: number; y: number; s: number; rot: number; z: number }[] = [];
    const dt = t - drop;
    for (let n = 0; n < 30; n++) {
      const ring = n % 3, slot = Math.floor(n / 3);
      const a = slot / 10 * TAU + ring * .7 + dt * (.25 + ring * .08);
      const z0 = 300 + ring * 330 + hash(n, 2) * 120;
      const burst = outExpo(sat(dt / .5));
      const z = ((z0 - dt * 520) % 1000 + 1000) % 1000 + 120;
      const R = lerp2(0, 300, burst);
      const sc = 600 / z;
      out.push({ k: n, x: 304 + Math.cos(a) * R * sc, y: 500 + Math.sin(a) * R * sc * 1.25, s: sc * burst, rot: Math.sin(a) * .2, z });
    }
    return out.sort((a, b) => b.z - a.z);
  }
  private endless(c: CanvasRenderingContext2D, t: number) {
    const drop = this.ev('endless.drop'), k1 = this.ev('endless.k1'), land = this.ev('flex.land');
    const conv = inOutP(span(t, land - .3, land), 3);
    const inv = t >= drop && t < drop + 2 / 60;
    c.fillStyle = inv ? FX.bone : FX.ink; c.fillRect(0, 0, FXW, FXH);
    const tiles = this.tunnel(t, drop);
    const slots = this.letterBoxes();
    for (const tl of tiles) {
      const w = 92 * tl.s, h = 128 * tl.s;
      const toSlot = conv > 0 && tl.k < slots.length;
      if (w < 2 && !toSlot) continue;
      const flip = Math.abs(Math.cos(Math.PI * spring(t - k1 - (tl.k % 10) * .012, .35, .8)));
      let x = tl.x - w * flip / 2, y = tl.y - h / 2, ww = w * flip, hh = h;
      const sl = slots[tl.k % slots.length]!;
      if (toSlot) { const q = inOutP(span(conv, (tl.k % 10) * .03, .7 + (tl.k % 10) * .03), 3); x = lerp2(x, sl.x, q); y = lerp2(y, sl.y, q); ww = lerp2(ww, sl.w, q); hh = lerp2(hh, sl.h, q); }
      else if (conv > 0) { const k = 1 - conv; ww *= k; hh *= k; }
      if (ww < 1) continue;
      c.save(); c.globalAlpha = toSlot ? 1 : sat(lerp2(.35, 1, sat((1000 - tl.z) / 700))) * (inv ? .3 : 1);
      this.tile(c, tl.k + (t > k1 + .1 ? 3 : 0), x, y, ww, hh, 8);
      c.restore();
    }
    // a scrim keeps the words readable over the tunnel
    const g = c.createRadialGradient(304, 520, 40, 304, 520, 330);
    g.addColorStop(0, alpha(FX.ink, .82 * (1 - conv))); g.addColorStop(1, alpha(FX.ink, 0));
    if (!inv) { c.fillStyle = g; c.fillRect(0, 200, FXW, 640); }
    const sl = outExpo(span(t, drop, drop + .2));
    const exit = inP(span(t, land - .32, land - .1), 4);
    const pk = 1 + .03 * hitP(t, k1, .1);
    const f1 = ax(fitAx(c, 'ENDLESS', 112, 500, 125, 900), 125, 900);
    const f2 = ax(fitAx(c, 'POSSIBILITIES.', 70, 500, 100, 900), 100, 900);
    c.save(); c.translate(TCX, 500 - exit * 60); c.scale(lerp2(1.5, 1, sl) * pk, lerp2(1.5, 1, sl) * pk); c.globalAlpha = 1 - exit;
    txt(c, 'ENDLESS', 0, 0, f1, inv ? FX.ink : FX.lime, 0, 'center'); c.restore();
    const s2 = outExpo(span(t, drop + .06, drop + .28));
    c.save(); c.translate(TCX, 572 - exit * 40); c.scale(lerp2(1.5, 1, s2) * pk, lerp2(1.5, 1, s2) * pk); c.globalAlpha = (1 - exit) * sat(s2 * 3);
    txt(c, 'POSSIBILITIES.', 0, 0, f2, inv ? FX.ink : FX.bone, 0, 'center'); c.restore();
  }

  // =============================================================================================
  // 11. MOTION FLEX: each letter is a window onto one scene; on the bar line the fill rises through
  // the letters, the credit and the CTA land, and the kick gives the final impact.
  // =============================================================================================
  private lockLayout(c: CanvasRenderingContext2D) {
    const s1 = fitAx(c, 'MOTION', 140, 500, 125, 900), s2 = fitAx(c, 'FLEX', 190, 500, 125, 900);
    return [{ s: 'MOTION', size: s1, y: 352 }, { s: 'FLEX', size: Math.min(s2, s1 * 1.36), y: 352 + s1 * .1 + Math.min(s2, s1 * 1.36) * .86 }];
  }
  letterBoxes() {
    const c = this.layer.ctx;
    const out: { x: number; y: number; w: number; h: number; ch: string; line: number; size: number; gx: number; by: number }[] = [];
    this.lockLayout(c).forEach((L, li) => {
      const fam = F.archivo(125, 900);
      const lay = layout(L.s, fam, L.size);
      for (const g of lay.glyphs) out.push({ x: 36 + g.x, y: L.y - L.size * .73, w: g.w, h: L.size * .74, ch: g.ch, line: li, size: L.size, gx: 36 + g.x, by: L.y });
    });
    return out;
  }
  private glyphPath(ch: string, size: number, x: number, y: number) {
    const key = `${ch}|${size.toFixed(2)}|${x.toFixed(2)}|${y.toFixed(2)}`;
    let p = this.paths.get(key);
    if (!p) { p = textPath2D(ch, F.archivo(125, 900), size, x, y); this.paths.set(key, p); }
    return p;
  }
  private lockup(c: CanvasRenderingContext2D, t: number) {
    const land = this.ev('flex.land'), solid = this.ev('flex.solid'), cta = this.ev('flex.cta'), impact = this.ev('flex.impact'), end = this.ev('end');
    const inv = t >= impact && t < impact + 2 / 60;
    c.fillStyle = FX.ink; c.fillRect(0, 0, FXW, FXH);
    const boxes = this.letterBoxes();
    const fill = outP(span(t, solid, solid + .38), 3);
    const tail = this.loopTail ? inOutP(span(t, end - .26, end), 3) : 0;
    c.save();
    if (tail > 0) { c.translate(CUBE_AT[0], CUBE_AT[1]); c.scale(1 - tail, 1 - tail); c.translate(-CUBE_AT[0], -CUBE_AT[1]); }
    boxes.forEach((b, i) => {
      const path = this.glyphPath(b.ch, b.size, b.gx, b.by);
      c.save(); c.clip(path);
      // the scene inside the letter, drifting
      const drift = (t - land) * 24 * (i % 2 ? 1 : -1);
      this.tile(c, i, b.x - 30, b.y - 40 + drift * .5, b.w + 60, b.h + 80, 0);
      // the fill rising through the letter, its edge marked in lime
      const top = b.y + b.h + 6 - (b.h + 12) * fill;
      c.fillStyle = inv ? FX.lime : b.line === 0 ? FX.bone : FX.lime;
      c.fillRect(b.x - 4, top, b.w + 8, b.y + b.h + 20 - top);
      c.restore();
      // the letter's outline carries the word while scenes fill it
      if (fill < 1) { c.save(); c.globalAlpha = 1 - fill; c.strokeStyle = b.line === 0 ? FX.bone : FX.lime; c.lineWidth = 2.2; c.stroke(path); c.restore(); }
      if (fill > 0 && fill < 1) fillRR(c, b.x, b.y + b.h + 6 - (b.h + 12) * fill - 1.5, b.w, 3, 1.5, FX.lime);
    });
    // the light sweep across the letters after the impact
    const sw = span(t, impact + .02, impact + .55);
    if (sw > 0 && sw < 1) {
      c.save();
      boxes.forEach((b) => { c.save(); c.clip(this.glyphPath(b.ch, b.size, b.gx, b.by));
        const x = lerp2(-120, 720, sw);
        const g = c.createLinearGradient(x - 60, 0, x + 60, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,250,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 30); c.restore(); });
      c.restore();
    }
    const L = this.lockLayout(c);
    const yCredit = L[1]!.y + 52;
    maskUp(c, 'Powered by Claude Opus 5.5', 36, yCredit, 26, span(t, solid + .08, solid + .45), ax(26, 100, 500), FX.bone);
    // CTA: the pill grows from the left, the words rise inside it, the kick punches it
    const cg = spring(t - cta, .42, .86);
    if (cg > .01) {
      const punch = 1 + .1 * hitP(t, impact, .08);
      const y = yCredit + 26;
      const w = 380 * cg;
      c.save(); c.translate(36, y + 33); c.scale(punch, punch); c.translate(-36, -(y + 33));
      fillRR(c, 36, y, w, 66, 33, inv ? FX.bone : FX.lime);
      c.save(); rrect(c, 36, y, w, 66, 33); c.clip();
      const tp = outP(span(t, cta + .08, cta + .4), 4);
      txt(c, 'COMMENT “MOTION”', 64, y + 44 + (1 - tp) * 44, ax(28, 100, 900), FX.ink);
      c.restore(); c.restore();
      maskUp(c, 'I’ll DM you every skill + repo', 36, y + 106, 21, span(t, cta + .2, cta + .55), ax(21, 100, 600), FX.bone);
      maskUp(c, 'behind this reel.', 36, y + 134, 21, span(t, cta + .26, cta + .6), ax(21, 100, 600), alpha(FX.bone, .7));
    }
    c.restore();
    if (tail > 0) {
      this.drawCube(c, CUBE_AT[0], CUBE_AT[1], 150 * inOutP(span(t, end - .2, end), 2), this.cubeQ(t - end), tail);
      // the opening line returns with it, so the replay's first frame is this frame's next
      c.save(); c.globalAlpha = span(t, end - .2, end); txt(c, '// made entirely in code with Claude Opus 5.5', 36, 216, mono(16, 600), FX.lime); c.restore();
    }
  }

  // =============================================================================================
  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const c = this.layer.ctx;
    this.layer.clear(FX.ink);
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    this.drawFrame(c, f.t - this.off);
    c.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0, ca: 0, vignette: 0, shake: [0, 0], zoom: 1 };
  }
  override dispose() { this.layer.texture.dispose(); }
}

