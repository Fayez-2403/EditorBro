// OPUS 5.5: THE EDITOR'S AURA, V2 (projects/editors-aura/V2.md). Variant aura_v2: 89 s, the stock-footage intro, Dubplate's
// climax first and then rearranged on its phrase lines; variant aura_v2_51s: the 51.6 s first cut (the masked intro, Dubplate
// from its climax to the song's own fade). Each variant reads data/<variant>/. It reuses V1's worlds through an edit list
// (data/aura_v2/cues.json `edl`): each 'v1' range plays V1's measured choreography at V1 time T = T0 + (t - a) (bar-aligned, so
// on the beat), the intro (the masked developer) and the outro are V2-native. The renders' audio-reactive parts read the V2
// music at the time shown (a shifted AudioData); the IDE and the editor keep V1's audio (the editor shows V1's own timeline).
// New layer: a prompt card held over each render, zoom punches / chromatic splits / shake on every cut and hit (post), whip
// streaks at the cuts. V1 (aura.ts) is unchanged.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT, PH } from '../engine/gl';
import { AudioData } from '../engine/audio';
import { hash } from '../engine/util';
import { COL, FXW, FXH, SeqCache, spring, type SeqInfo } from './_vo';
import { A, CX, type AuraCtx, type AuraCues, type Screen, type World, ease, pulse, mono, txt, alpha, fillRR, sat } from './aura/common';
import { r1World } from './aura/r1_type';
import { r2World } from './aura/r2_ui';
import { r3World } from './aura/r3_shader';
import { r4World } from './aura/r4_chrome';
import { r5World } from './aura/r5_volcano';
import { r6World } from './aura/r6_pitstop';
import { ideWorld, PROMPTS, MAJOR_PROMPT, MAJOR_SKILLS, MAJOR_FILES } from './aura/ide';
import { editorWorld } from './aura/editor';
import { orbitWorld } from './aura/orbit';
import { endWorld } from './aura/end';
import { introV2World, type Face } from './aura/intro_v2';
import { outroV2World } from './aura/outro_v2';
import { introStockWorld } from './aura/intro_stock';
import { introV3World } from './aura/intro_v3';
import { r7World } from './aura/r7_robot';
import { botOverlay, type BotCue } from './aura/bot';

const HERO: Record<string, number> = { r1: 25.6, r2: 34.3, r3: 43.1, r4: 56.4, r5: 67.9, r6: 78.9 };   // as V1 (the export flashes)
type Cues2 = { duration: number; eighth: number; beat: number; bar: number; room?: string; intro_len?: number; bot?: BotCue[]; edl: [number, number, string, Record<string, any>][]; cards: [number, number, number][]; punches: [number, number][]; events: Record<string, number> };

/** An AudioData read at a shifted time (t + dt), so a V1 excerpt reacts to the music actually playing in V2. */
export class Shifted {
  base!: AudioData; dt = 0;
  get duration() { return this.base.duration; } get bpm() { return this.base.bpm; } get beats() { return this.base.beats; }
  get downbeats() { return this.base.downbeats; } get sections() { return this.base.sections; } get onsets() { return this.base.onsets; }
  env(n: string, t: number) { return this.base.env(n, t + this.dt); }
  envPeak(n: string, t: number, w?: number) { return this.base.envPeak(n, t + this.dt, w); }
  hit(k: string, t: number, hl?: number) { return this.base.hit(k, t + this.dt, hl); }
  events(k: string, a: number, b: number): [number, number][] { return this.base.events(k, a + this.dt, b + this.dt).map(([t, s]) => [t - this.dt, s]); }
  sample(t: number) { return this.base.sample(t + this.dt); }
  beatAt(t: number) { return this.base.beatAt(t + this.dt); } timeOfBeat(i: number) { return this.base.timeOfBeat(i) - this.dt; }
  barAt(t: number) { return this.base.barAt(t + this.dt); } nearestBeat(t: number) { return this.base.nearestBeat(t + this.dt) - this.dt; }
  section(t: number) { return this.base.section(t + this.dt); }
}

export default class AuraV2 extends Scene {
  private layer = new Layer2D();
  private rt!: THREE.WebGLRenderTarget;
  private c1!: AuraCues; private c2!: Cues2; private seq!: SeqCache;
  private au1!: AudioData; private au2!: AudioData; private P = new Shifted();
  private w1: Record<string, World> = {}; private intro!: World; private outro!: World; private r7: World | null = null;
  private dryList: [string, number][] | null = null;
  private dryCtx = new OffscreenCanvas(4, 4).getContext('2d') as unknown as CanvasRenderingContext2D;
  private wrapCache = new Map<number, string[]>();

  override async init() {
    const { renderer } = this.ctx; const px = PH / FXH;
    const J = async (u: string) => (await fetch(u)).json();
    // each V2 variant reads its own folder: aura_v2 (89 s, stock-footage intro), aura_v2_51s (the 51.6 s first cut, masked intro)
    const DIR = `/data/${(import.meta as any).env?.VITE_VARIANT || 'aura_v2'}`;
    this.c1 = await J('/data/aura/cues.json'); this.c2 = await J(`${DIR}/cues.json`);
    const introKind = this.c2.edl[0]![2];
    const media = await J('/data/aura/media.json'), face: Face | null = introKind === 'intro' ? await J(`${DIR}/face.json`) : null;
    if (introKind === 'intro_stock') Object.assign(media, await J('/data/aura_v2/stock.json'));
    this.au1 = new AudioData(await J('/data/aura/audio.json')); this.au2 = this.ctx.audio; this.P.base = this.au1;
    const { screens: scr, ...seqs } = media as { screens: Record<string, { src: string; w: number; h: number }> } & Record<string, SeqInfo>;
    this.seq = new SeqCache(seqs as unknown as Record<string, SeqInfo>, 260);
    const screens: Record<string, Screen> = {};
    for (const [k, s] of Object.entries(scr)) { const im = new Image(); im.src = s.src; await im.decode(); screens[k] = { img: im, w: s.w, h: s.h }; }
    let logo: HTMLImageElement | null = null;
    try { const im = new Image(); im.src = 'aura/screens/logo.jpg'; await im.decode(); logo = im; } catch { logo = null; }
    const thumbs: Record<string, HTMLImageElement> = {};
    for (const k of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r4_artifact', ...Array.from({ length: 8 }, (_, i) => `sheet_${i}`)]) {
      const im = new Image(); im.src = `aura/thumbs/${k}.jpg`; try { await im.decode(); thumbs[k] = im; } catch { /* run analysis/aura_thumbs.py */ }
    }
    this.rt = new THREE.WebGLRenderTarget(Math.round(COL.w * px), PH, { type: THREE.HalfFloatType, samples: 4 });
    const self = this;
    const frameRaw = (k: string, lt: number) => { if (self.dryList) { self.dryList.push([k, self.seq.index(k, lt)]); return null; } return self.seq.get(k, lt); };
    /** In reused V1 worlds, backshot frames where the unmasked face would show (its profile shots) become the rear view. */
    const rear = (lt: number) => 6.3 + ((lt * 0.37) % 1.25);
    const remap = this.c2.room === 'rear' ? rear : (lt: number) => ((lt >= 3.85 && lt < 6.2) || lt >= 7.6 ? rear(lt) : lt);
    const base: Omit<AuraCtx, 'frame' | 'audio'> = {
      cues: this.c1, seq: this.seq, screens, logo, renderer, px, thumbs,
      ev(n: string) { const v = self.c1.events[n]; if (typeof v !== 'number') throw new Error(`aura cue missing: ${n}`); return v; },
      dry: () => !!self.dryList,
      worldAt(T: number) { const r = self.base1(T); return [r.w, r.p]; },
    };
    const x1: AuraCtx = { ...base, audio: this.P as unknown as AudioData, frame: (k, lt) => frameRaw(k, k === 'ph' ? remap(lt) : lt) };
    const x2: AuraCtx = { ...base, audio: this.au2, frame: frameRaw };
    this.w1 = { orbit: orbitWorld(), editor: editorWorld('editor'), preview: editorWorld('preview'), ide: ideWorld(), aura: endWorld(),
      r1: r1World(), r2: r2World(), r3: r3World(), r4: r4World(), r5: r5World(), r6: r6World() };
    for (const w of Object.values(this.w1)) await w.init(x1);
    this.intro = introKind === 'intro_v3' ? introV3World(this.c2.intro_len!) : introKind === 'intro_stock' ? introStockWorld() : introV2World(face!); await this.intro.init(x2);
    if (this.c2.edl.some((r) => r[2] === 'r7')) { this.r7 = r7World(); await this.r7.init(x2); }   // V3: the robot dance (V3-native)
    this.outro = outroV2World(this.c2.events); await this.outro.init(x2);
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
  /** V1's own dispatch at V1 time T (montage intercuts over segments), as aura.ts. */
  private base1(T: number, montage = true): { w: World; p: Record<string, any>; n: string } {
    const m = montage ? this.c1.montage : [];
    for (let i = 0; i < m.length; i++) {
      const [a, b, w] = m[i]!; if (T < a || T >= b) continue;
      const [n, shot] = w.split('.') as [string, string?], k = m.slice(0, i).filter((q) => q[2] === w).length;
      return { w: this.w1[n]!, p: { shot: shot ?? 'rec', montage: true, k, t0: a }, n };
    }
    const s = this.c1.segments.find(([a, b]) => T >= a && T < b) ?? this.c1.segments[this.c1.segments.length - 1]!;
    return { w: this.w1[s[2]]!, p: s[3], n: s[2] };
  }
  /** What V2 shows at t: the world, its params, the time it is drawn at, and whether it is a render (audio shifted). */
  private at(t: number): { w: World; p: Record<string, any>; T: number; render: boolean } {
    const r = this.c2.edl.find(([a, b]) => t >= a && t < b) ?? this.c2.edl[this.c2.edl.length - 1]!;
    const [a, , kind, rp] = r;
    if (kind === 'intro' || kind === 'intro_stock' || kind === 'intro_v3') return { w: this.intro, p: {}, T: t, render: false };
    if (kind === 'major') return { w: this.w1.ide!, p: { ...rp, shot: 'major' }, T: t, render: false };   // V3-native times
    if (kind === 'r7') return { w: this.r7!, p: { ...rp, v2: true }, T: t, render: false };
    if (kind === 'outro') return { w: this.outro, p: {}, T: t, render: false };
    const T = rp.T0 + (t - a), F = this.c1.flashes;
    for (let i = F.length - 1; i >= 0; i--) {
      const [ft, n] = F[i]!; if (T >= ft && T < ft + this.c1.eighth / 2) return { w: this.w1[n]!, p: { flash: true, v2: true }, T: HERO[n]! + (T - ft), render: true };
    }
    const b = this.base1(T, !rp.nomontage);
    return { w: b.w, p: { ...b.p, v2: true }, T, render: /^r\d$/.test(b.n) };
  }
  private setAudio(t: number, T: number, render: boolean) { this.P.base = render ? this.au2 : this.au1; this.P.dt = render ? t - T : 0; }
  private draw2d(c: CanvasRenderingContext2D, t: number) {
    const { w, p, T, render } = this.at(t);
    this.setAudio(t, T, render);
    c.save(); w.draw(c, T, p); c.restore();
    this.overlay(c, t);
  }
  /** The V2 layer: the prompt card held over each render; whip streaks across each cut. */
  private overlay(c: CanvasRenderingContext2D, t: number) {
    const e8 = this.c2.eighth;
    for (const [a, b, pi] of this.c2.cards) {
      if (t < a || t >= b) continue;
      const s = pi === 0 ? MAJOR_PROMPT : PROMPTS[pi - 1]!, k = spring(t - a, 0.3, 0.7), n = pi === 0 ? s.length : Math.round(s.length * sat((t - a) / (3 * e8)));   // 0: the major prompt, already typed
      let L = this.wrapCache.get(pi);
      if (!L) { c.font = mono(12.5, 600); L = []; let line = ''; for (const wd of s.split(' ')) { const tt = line ? line + ' ' + wd : wd; if (c.measureText(tt).width > 528 && line) { L.push(line); line = wd; } else line = tt; } if (line) L.push(line); this.wrapCache.set(pi, L); }
      const h = 30 + L.length * 18;
      c.save(); c.globalAlpha = sat((t - a) / 0.1); c.translate(0, (1 - k) * -20);
      fillRR(c, 20, 86, 568, h, 12, 'rgba(6,9,14,0.78)'); c.strokeStyle = alpha(A.teal, 0.55); c.lineWidth = 1; c.beginPath(); c.roundRect(20.5, 86.5, 567, h - 1, 12); c.stroke();
      txt(c, pi === 0 ? `THE PROMPT · CLAUDE OPUS 5.5 · ${MAJOR_SKILLS.length} SKILLS + ${MAJOR_FILES.length} FILES ATTACHED` : `PROMPT ${String(pi).padStart(2, '0')} / 06 · CLAUDE OPUS 5.5`, 36, 104, mono(9.5, 700), pi === 0 ? '#D97757' : A.teal, 1.5, 'left');
      let left = n; L.forEach((l, i) => { if (left <= 0) return; txt(c, l.slice(0, left), 36, 124 + i * 18, mono(12.5, 600), A.text, 0, 'left'); left -= l.length + 1; });
      if (n < s.length || Math.floor(t * 2.5) % 2 === 0) { c.font = mono(12.5, 600); const li = Math.min(L.length - 1, Math.max(0, L.findIndex((_, i) => L!.slice(0, i + 1).join(' ').length >= n))); c.fillStyle = A.teal; c.fillRect(36 + c.measureText(L[li]!.slice(0, Math.max(0, n - L.slice(0, li).join(' ').length - (li ? 1 : 0)))).width + 2, 112 + li * 18, 7, 15); }
      c.restore();
    }
    if (this.c2.bot) botOverlay(c, t, this.c2.bot, { eighth: e8, beat: this.c2.beat });   // V3: Claude's bot (an illustration) does the editing
    for (const [a] of this.c2.edl.slice(1)) {   // whip streaks: a burst of horizontal light through each cut
      const d = t - a; if (d < -0.1 || d > 0.18) continue;
      const k = d < 0 ? 1 + d / 0.1 : 1 - d / 0.18;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const y = 60 + hash(a, i, 1) * 960, len = 260 + hash(a, i, 2) * 420, xx = -len + (FXW + 2 * len) * ((d + 0.1) / 0.28), g = c.createLinearGradient(xx - len, 0, xx, 0);
        g.addColorStop(0, 'rgba(160,240,255,0)'); g.addColorStop(1, `rgba(220,250,255,${0.55 * k})`); c.fillStyle = g; c.fillRect(xx - len, y, len, 2 + hash(a, i, 3) * 4);
      }
      c.fillStyle = `rgba(255,255,255,${0.12 * k})`; c.fillRect(0, 0, FXW, FXH); c.restore();
    }
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx, t = f.t;
    const { w, p, T, render } = this.at(t);
    this.setAudio(t, T, render);
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
    // the transition layer: a zoom punch, a chromatic split, a shake and a touch of flash on every cut and hit
    let pz = 0, pc = 0, ps = 0, pf = 0;
    for (const [pt, k] of this.c2.punches) { if (t < pt || t > pt + 0.5) continue; pz = Math.max(pz, k * pulse(t, pt, 0.085)); pc = Math.max(pc, k * pulse(t, pt, 0.06)); ps = Math.max(ps, k * pulse(t, pt, 0.05)); pf = Math.max(pf, k * pulse(t, pt, 0.035)); }
    const intro = t < this.c2.edl[0]![1], fi = Math.round(t * 60);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: intro ? 0.18 : 0, ca: 1.4 * pc, vignette: intro ? 0.25 : 0, flash: 0.12 * pf,
      zoom: 1 + 0.085 * pz, shake: [(hash(fi, 1) - 0.5) * 14 * ps, (hash(fi, 2) - 0.5) * 14 * ps] };
  }
  override dispose() { this.layer.texture.dispose(); this.rt?.dispose(); (window as any).__pdoomPrepare = undefined; }
}
