// OPUS 5.5: THE EDITOR'S AURA, V4 (projects/editors-aura/V4.md). Variant aura_v4: 28.3 s, the renders only, posted first (the
// behind-the-scenes V2 comes after). No opening cinematic, no IDE, no editor: nine renders in one continuous run on Dubplate
// (analysis/aura_v4_audio.py: V1 bars 23-27 + 32 to the fade, re-phased to the measured accents), the song's words acted out as
// captions, and V2's outro on a 3x3 grid. The edit is data/aura_v4/cues.json:
//   edl  [a, b, kind, p]: 'v1' = a V1 render (p.w) at V1 time T0 + (t - ag), or along p.tmap (speed ramps / a freeze);
//        'r7' | 'r8' | 'r9' = a V4-native render with its own start p.t0; 'outro'
//   xf   [cut, mode, start, end, opts]: a transition centred on a measured transient; both shots render through it and one
//        shader pass (aura/xfade.ts) composites them: zoom / burn / ink / whip / slice / claw / flash / iris
//   fx   the per-shot looks on the bass drop-outs (under water, the splash, the freeze), measured at 1 ms
// Each shot renders into its own column target (3D, then its 2D on top, HUD off: LOOK.clean); the captions and the render tag
// go over the composite. Every plate is a pure function of t.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT, makeRT, PH } from '../engine/gl';
import { AudioData } from '../engine/audio';
import { hash } from '../engine/util';
import { COL, FXW, FXH, SeqCache } from './_vo';
import { A, LOOK, type AuraCtx, type AuraCues, type World, pulse, sat } from './aura/common';
import { r1World } from './aura/r1_type';
import { r2World } from './aura/r2_ui';
import { r3World } from './aura/r3_shader';
import { r4World } from './aura/r4_chrome';
import { r5World } from './aura/r5_volcano';
import { r6World } from './aura/r6_pitstop';
import { r7World } from './aura/r7_robot';
import { r8World } from './aura/r8_ink';
import { r9World } from './aura/r9_bounce';
import { outroV2World, type Tile } from './aura/outro_v2';
import { XFade, type XName } from './aura/xfade';
import { drawCaptions, drawInfo, drawPrompt, makeVsBox, type Cap, type Label, type PromptCard } from './aura/lyrics_v4';
import { Shifted } from './aura_v2';

/** VITE_AURA_COVER=1: the renders without captions or tags (clean stills for the outro's thumbnails and the cover). */
const COVER = !!(import.meta as any).env?.VITE_AURA_COVER;
type Kind = 'v1' | 'r7' | 'r8' | 'r9' | 'outro';
type Entry = [number, number, Kind, Record<string, any>];
interface Cues4 {
  duration: number; eighth: number; beat: number; bar: number;
  edl: Entry[]; xf: [number, XName, number, number, Record<string, any>][];
  fx: { under: [number, number]; splash: number; freeze: [number, number] };
  captions: Cap[]; labels: Label[]; punches: [number, number][]; events: Record<string, number>; tiles: Tile[];
}

export default class AuraV4 extends Scene {
  private layer = new Layer2D();                                 // the captions, over the composite
  private shotLayer = new Layer2D(FXW, FXH);                     // one shot's 2D
  private rt3!: THREE.WebGLRenderTarget; private shotA!: THREE.WebGLRenderTarget; private shotB!: THREE.WebGLRenderTarget;
  private xf = new XFade();
  private c1!: AuraCues; private c4!: Cues4; private au4!: AudioData; private P = new Shifted();
  private w: Record<string, World> = {};
  private vsBox: HTMLCanvasElement | null = null;   // V4.1: the user's VS Code input box

  override async init() {
    const { renderer } = this.ctx; const px = PH / FXH;
    const J = async (u: string) => (await fetch(u)).json();
    this.c1 = await J('/data/aura/cues.json'); this.c4 = await J(this.ctx.params?.cues ?? '/data/aura_v4/cues.json');   // V4.1: data/aura_v41/cues.json
    this.au4 = this.ctx.audio; this.P.base = this.au4;
    let logo: HTMLImageElement | null = null;
    try { const im = new Image(); im.src = 'aura/screens/logo.jpg'; await im.decode(); logo = im; } catch { logo = null; }
    const thumbs: Record<string, HTMLImageElement> = {};
    for (const k of this.c4.tiles.map((x) => x.key)) { const im = new Image(); im.src = `aura/thumbs/${k}.jpg`; try { await im.decode(); thumbs[k] = im; } catch { /* analysis/aura_v4_thumbs.py */ } }
    this.rt3 = new THREE.WebGLRenderTarget(Math.round(COL.w * px), PH, { type: THREE.HalfFloatType, samples: 4 });
    this.shotA = makeRT(FXW, FXH, { depthBuffer: false }); this.shotB = makeRT(FXW, FXH, { depthBuffer: false });
    const base: Omit<AuraCtx, 'audio'> = {
      cues: this.c1, seq: new SeqCache({}, 1), screens: {}, logo, renderer, px, thumbs, frame: () => null, dry: () => false,
      ev: (n: string) => { const v = this.c1.events[n]; if (typeof v !== 'number') throw new Error(`aura cue missing: ${n}`); return v; },
      worldAt: () => [this.w.r1!, {}],
    };
    const x1: AuraCtx = { ...base, audio: this.P as unknown as AudioData };   // V1's renders: V1 choreography, V4's music
    const x4: AuraCtx = { ...base, audio: this.au4 };                          // V4-native worlds
    this.w = { r1: r1World(), r2: r2World(), r3: r3World(), r4: r4World(), r5: r5World(), r6: r6World() };
    for (const w of Object.values(this.w)) await w.init(x1);
    this.w.r7 = r7World(); this.w.r8 = r8World(); this.w.r9 = r9World(); this.w.outro = outroV2World(this.c4.events, this.c4.tiles);
    for (const k of ['r7', 'r8', 'r9', 'outro']) await this.w[k]!.init(x4);
    if (this.c4.edl.some((e) => e[3].prompt)) { try { const im = new Image(); im.src = 'aura/screens/user_9.png'; await im.decode(); this.vsBox = makeVsBox(im); } catch { this.vsBox = null; } }
  }

  /** The entry on screen at t (the last one starting at or before t). */
  private entryAt(t: number): Entry { const E = this.c4.edl; for (let i = E.length - 1; i >= 0; i--) if (t >= E[i]![0]) return E[i]!; return E[0]!; }
  /** An entry's world, params and time at t (also past its ends, for the transitions). */
  private resolve(e: Entry, t: number): { w: World; p: Record<string, any>; T: number; shifted: boolean } {
    const [, , kind, p] = e;
    if (kind !== 'v1') return { w: this.w[kind === 'outro' ? 'outro' : kind]!, p, T: t, shifted: false };
    let T: number;
    const m = p.tmap as [number, number][] | undefined;
    if (m) {   // piecewise-linear t -> T keyframes (slope 1 outside them)
      if (t <= m[0]![0]) T = m[0]![1] + (t - m[0]![0]);
      else if (t >= m[m.length - 1]![0]) T = m[m.length - 1]![1] + (t - m[m.length - 1]![0]);
      else { let i = 0; while (t > m[i + 1]![0]) i++; const [ta, Ta] = m[i]!, [tb, Tb] = m[i + 1]!; T = Ta + (Tb - Ta) * (t - ta) / (tb - ta); }
    } else T = p.T0 + (t - (p.ag ?? e[0]));
    return { w: this.w[p.w]!, p: { ...p, v2: false }, T, shifted: true };
  }
  /** Render one shot (its 3D, then its 2D, HUD off) into a column target. */
  private shot(e: Entry, t: number, into: THREE.WebGLRenderTarget) {
    const tt = typeof e[3].hold === 'number' ? e[3].hold : t;   // V4.1's prompt beat holds the video's first frame (its music too)
    const { renderer, comp } = this.ctx, { w, p, T, shifted } = this.resolve(e, tt);
    this.P.base = this.au4; this.P.dt = shifted ? tt - T : 0;
    clearRT(renderer, into, [0.027, 0.035, 0.05]);
    if (w.render3d) { w.render3d(T, this.rt3, p); comp.draw(renderer, this.rt3.texture, into, { mode: 'replace', premult: false }); }
    const L = this.shotLayer; L.clear(w.render3d ? undefined : A.ink);
    LOOK.clean = true; try { L.ctx.save(); w.draw(L.ctx, T, p); L.ctx.restore(); } finally { LOOK.clean = false; }
    comp.draw(renderer, L.upload(), into);
  }
  /** The per-shot looks at t (0..1): under water while the bass is out, the splash as it returns, the freeze in the last gap. */
  private looks(t: number) {
    const { under: [u0, u1], splash, freeze: [f0, f1] } = this.c4.fx;
    const under = t < u0 || t >= u1 ? 0 : sat((t - u0) / 0.06);
    const sp = t >= splash && t < splash + 0.4 ? 1 - (t - splash) / 0.4 : 0;
    const fr = t < f0 || t >= f1 ? 0 : sat((t - f0) / 0.05);
    return { under, splash: sp, freeze: fr };
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx, t = f.t, px = PH / FXH;
    clearRT(renderer, out, [0.027, 0.035, 0.05]);
    const X = this.c4.xf.find(([, , s, e]) => t >= s && t < e);
    let b: THREE.Texture | null = null, mode: XName = 'cut', k = 0, o: Record<string, any> = {};
    if (X) {
      const [cut, md, s, e, opts] = X;
      this.shot(this.entryAt(cut - 1e-4), t, this.shotA); this.shot(this.entryAt(cut + 1e-4), t, this.shotB);
      b = this.shotB.texture; mode = md; k = (t - s) / (e - s); o = opts;
    } else this.shot(this.entryAt(t), t, this.shotA);
    const cx = Math.round(COL.x * px);
    out.viewport.set(cx, 0, this.shotA.width, out.height); out.scissor.set(cx, 0, this.shotA.width, out.height); out.scissorTest = true;
    const card = this.entryAt(t)[3].prompt as PromptCard | undefined;
    this.xf.render(renderer, out, this.shotA.texture, b, { mode, k, t, seed: o.seed ?? 0, c: o.c, ...this.looks(t), prompt: card && !X ? 1 : 0 });
    out.viewport.set(0, 0, out.width, out.height); out.scissorTest = false;
    // the captions and the render tag
    const c = this.layer.ctx; this.layer.clear();
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    if (!COVER) { drawCaptions(c, t, this.c4.captions, this.au4); drawInfo(c, t, this.c4.labels); if (card) drawPrompt(c, t, card, this.vsBox); }
    c.restore();
    comp.draw(renderer, this.layer.upload(), out);
    // the punches: a zoom, a chromatic split, a shake, a touch of flash on every cut and accent (measured transients)
    let pz = 0, pc = 0, ps = 0, pf = 0;
    for (const [pt, s] of this.c4.punches) { if (t < pt || t > pt + 0.5) continue; pz = Math.max(pz, s * pulse(t, pt, 0.085)); pc = Math.max(pc, s * pulse(t, pt, 0.06)); ps = Math.max(ps, s * pulse(t, pt, 0.05)); pf = Math.max(pf, s * pulse(t, pt, 0.035)); }
    const fi = Math.round(t * 60);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0.03, ca: 1.5 * pc, vignette: 0, flash: 0.1 * pf,
      zoom: 1 + 0.07 * pz, shake: [(hash(fi, 1) - 0.5) * 12 * ps, (hash(fi, 2) - 0.5) * 12 * ps] };
  }
  override dispose() { this.layer.texture.dispose(); this.shotLayer.texture.dispose(); this.rt3?.dispose(); this.shotA?.dispose(); this.shotB?.dispose(); }
}
