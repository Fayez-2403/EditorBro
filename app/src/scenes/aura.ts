// OPUS 5.5: THE EDITOR'S AURA (projects/editors-aura): a 90 s music-led editor film on General Levy "Dubplate". One scene runs
// the whole reel: it reads data/aura/cues.json (every time a measured bar / beat / eighth, analysis/aura_cues.py) and dispatches
// the world on screen. 3D worlds render into a column-sized target that is composited under the 2D layer. Footage (the user's
// placeholder backshots and their real IDE recording) plays from frame sequences (analysis/aura_media.py) through SeqCache and
// the main.ts prepare barrier, so every frame stays a pure function of t.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT, PH } from '../engine/gl';
import { COL, FXW, FXH, SeqCache, type SeqInfo } from './_vo';
import { A, type AuraCtx, type AuraCues, type Screen, type World } from './aura/common';
import { stubWorld } from './aura/stub';
import { r1World } from './aura/r1_type';
import { r2World } from './aura/r2_ui';
import { r3World } from './aura/r3_shader';
import { r4World } from './aura/r4_chrome';
import { r5World } from './aura/r5_volcano';
import { r6World } from './aura/r6_pitstop';
import { ideWorld } from './aura/ide';
import { editorWorld } from './aura/editor';
import { orbitWorld } from './aura/orbit';
import { endWorld } from './aura/end';

/** The hero moment of each render, shown in the six export flashes (the same times as the thumbnails). */
const HERO: Record<string, number> = { r1: 25.6, r2: 34.3, r3: 43.1, r4: 56.4, r5: 67.9, r6: 78.9 };

type WorldName = 'orbit' | 'editor' | 'ide' | 'r1' | 'r2' | 'r3' | 'r4' | 'r5' | 'r6' | 'aura' | 'preview';

export default class Aura extends Scene {
  private layer = new Layer2D();
  private rt!: THREE.WebGLRenderTarget;
  private cues!: AuraCues;
  private seq!: SeqCache;
  private worlds: Partial<Record<WorldName, World>> = {};
  private dryList: [string, number][] | null = null;
  private dryCtx = new OffscreenCanvas(4, 4).getContext('2d') as unknown as CanvasRenderingContext2D;
  private x!: AuraCtx;

  override async init() {
    const { renderer } = this.ctx;
    const px = PH / FXH;
    this.cues = await (await fetch('/data/aura/cues.json')).json();
    const media = await (await fetch('/data/aura/media.json')).json();
    const { screens: scr, ...seqs } = media as { screens: Record<string, { src: string; w: number; h: number }> } & Record<string, SeqInfo>;
    this.seq = new SeqCache(seqs as unknown as Record<string, SeqInfo>, 260);
    const screens: Record<string, Screen> = {};
    for (const [k, s] of Object.entries(scr)) { const im = new Image(); im.src = s.src; await im.decode(); screens[k] = { img: im, w: s.w, h: s.h }; }
    let logo: HTMLImageElement | null = null;
    try { const im = new Image(); im.src = 'aura/screens/logo.jpg'; await im.decode(); logo = im; } catch { logo = null; }
    this.rt = new THREE.WebGLRenderTarget(Math.round(COL.w * px), PH, { type: THREE.HalfFloatType, samples: 4 });
    const thumbs: Record<string, HTMLImageElement> = {};
    for (const k of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r4_artifact', ...Array.from({ length: 8 }, (_, i) => `sheet_${i}`)]) {
      const im = new Image(); im.src = `aura/thumbs/${k}.jpg`; try { await im.decode(); thumbs[k] = im; } catch { /* missing: run analysis/aura_thumbs.py */ }
    }
    const self = this;
    this.x = {
      cues: this.cues, seq: this.seq, screens, logo, audio: this.ctx.audio, renderer, px,
      ev(n: string) { const v = self.cues.events[n]; if (typeof v !== 'number') throw new Error(`aura cue missing: ${n}`); return v; },
      frame(k: string, lt: number) {
        if (self.dryList) { self.dryList.push([k, self.seq.index(k, lt)]); return null; }
        return self.seq.get(k, lt);
      },
      dry: () => !!self.dryList,
      thumbs,
      worldAt(T: number) { const r = self.base(T); return [r.w, r.p]; },
    };
    for (const n of ['orbit', 'editor', 'ide', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'aura', 'preview'] as WorldName[]) this.worlds[n] = stubWorld(n);
    this.worlds.r1 = r1World();
    this.worlds.r2 = r2World();
    this.worlds.r3 = r3World();
    this.worlds.r4 = r4World();
    this.worlds.r5 = r5World();
    this.worlds.r6 = r6World();
    this.worlds.ide = ideWorld();
    this.worlds.editor = editorWorld('editor');
    this.worlds.preview = editorWorld('preview');
    this.worlds.orbit = orbitWorld();
    this.worlds.aura = endWorld();
    for (const w of new Set(Object.values(this.worlds))) await w!.init(this.x);
    (window as any).__pdoomPrepare = (t: number) => this.prepare(t);
    await this.prepare(0);
  }
  private async prepare(t: number) {
    this.dryList = [];
    try { this.draw2d(this.dryCtx, t); } finally { /* the list is complete */ }
    const need = this.dryList; this.dryList = null;
    await Promise.all(need.map(([k, i]) => this.seq.load(k, i)));
    for (const [k, i] of need) for (let d = 1; d <= 5; d++) void this.seq.load(k, i + d);
  }
  /** The base world at reel time t: the montage intercuts (index k among their kind) override the segment. */
  private base(t: number): { w: World; p: Record<string, any>; n: WorldName } {
    const m = this.cues.montage;
    for (let i = 0; i < m.length; i++) {
      const [a, b, w] = m[i]!; if (t < a || t >= b) continue;
      const [n, shot] = w.split('.') as [WorldName, string?], k = m.slice(0, i).filter((q) => q[2] === w).length;
      return { w: this.worlds[n]!, p: { shot: shot ?? 'rec', montage: true, k, t0: a }, n };
    }
    const s = this.cues.segments.find(([a, b]) => t >= a && t < b) ?? this.cues.segments[this.cues.segments.length - 1]!;
    return { w: this.worlds[s[2] as WorldName]!, p: s[3], n: s[2] as WorldName };
  }
  /** What is on screen at t and the time it is drawn at: the export flashes (one eighth each) show each render's hero moment. */
  private at(t: number): { w: World; p: Record<string, any>; T: number } {
    const F = this.cues.flashes;   // a sixteenth apart: each holds until the next (the last for a sixteenth)
    for (let i = F.length - 1; i >= 0; i--) {
      const [ft, n] = F[i]!; if (t >= ft && t < ft + this.cues.eighth / 2) return { w: this.worlds[n as WorldName]!, p: { flash: true }, T: HERO[n]! + (t - ft) };
    }
    const b = this.base(t); return { w: b.w, p: b.p, T: t };
  }
  private draw2d(c: CanvasRenderingContext2D, t: number) {
    const { w, p, T } = this.at(t);
    c.save(); w.draw(c, T, p); c.restore();
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx, t = f.t;
    const { w, p, T } = this.at(t);
    clearRT(renderer, out, [0.027, 0.035, 0.05]);
    if (w.render3d) {
      w.render3d(T, this.rt, p);
      const px = PH / FXH, cx = Math.round(COL.x * px);
      out.viewport.set(cx, 0, this.rt.width, out.height); out.scissor.set(cx, 0, this.rt.width, out.height); out.scissorTest = true;
      comp.draw(renderer, this.rt.texture, out, { mode: 'replace', premult: false });
      out.viewport.set(0, 0, out.width, out.height); out.scissorTest = false;
    }
    const c = this.layer.ctx; this.layer.clear(w.render3d ? undefined : A.ink);
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    this.draw2d(c, t);
    c.restore();
    comp.draw(renderer, this.layer.upload(), out);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0, ca: 0, vignette: 0, flash: 0, zoom: 1, shake: [0, 0] };
  }
  override dispose() { this.layer.texture.dispose(); this.rt?.dispose(); (window as any).__pdoomPrepare = undefined; }
}
