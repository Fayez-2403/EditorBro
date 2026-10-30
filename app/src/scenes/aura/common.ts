// The Editor's Aura (projects/editors-aura): shared design, types and helpers for the reel's worlds.
// Every world is a pure function of t; times come from data/aura/cues.json (measured bars / beats / eighths of the song).
import type * as THREE from 'three';
import type { AudioData } from '../../engine/audio';
import { SeqCache, ax, mono, txt, alpha, fillRR, rrect, FXW, FXH, sat, span } from '../_vo';

export { FXW, FXH };
export const CX = FXW / 2;
/** V2 (aura_v2.ts) holds a prompt card at the top of each render; the renders' top HUD moves down by this much there. */
export const V2HY = 78;
/** V4 (aura_v4.ts) shows the renders clean: no HUD readouts, no end statements (V4 draws its own captions). V4 sets it around each
 *  render's draw; V1-V3 never touch it. */
export const LOOK = { clean: false };

/** The grade from the brief: teal-blue highlights, deep charcoal, cool monitor light, warm amber practicals. */
export const A = {
  ink: '#07090D', char: '#0E1117', graphite: '#151A22', panel: '#1A202A', panel2: '#222A36', line: '#2C3644', line2: '#3A4656',
  text: '#E8EEF6', dim: '#93A0B2', faint: '#5A6678', teal: '#3FD6E0', tealD: '#1A8C99', cyan: '#7FF0FF', blue: '#4C8DFF',
  violet: '#9B7BFF', violetD: '#5B45B8', green: '#43D58A', greenD: '#1F7A4D', amber: '#FFB547', amberD: '#B8761F', red: '#FF5A5F',
  white: '#FFFFFF', gold: '#F2C66D', lime: '#C8F31D',
};

export interface AuraCues {
  duration: number; bpm: number; eighth: number; beat: number; bar: number; phrases: number[];
  segments: [number, number, string, Record<string, any>][];
  events: Record<string, number>;
  montage: [number, number, string][];
  flashes: [number, string][];
}

export interface Screen { img: HTMLImageElement; w: number; h: number }

/** What a world can reach: the cues, footage (frame sequences), screenshots, the measured audio, the renderer. */
export interface AuraCtx {
  cues: AuraCues;
  ev(n: string): number;
  /** Frame of footage sequence k at clip time lt (null in the prepare dry run). */
  frame(k: string, lt: number): ImageBitmap | null;
  seq: SeqCache;
  screens: Record<string, Screen>;
  logo: HTMLImageElement | null;
  audio: AudioData;
  renderer: THREE.WebGLRenderer;
  /** Real pixels per logical px (2 at --scale 2). */
  px: number;
  dry(): boolean;
  /** Thumbnails of the six renders (analysis/aura_thumbs.py): r1..r6, r4_artifact, sheet_0..7. */
  thumbs: Record<string, HTMLImageElement>;
  /** The world the reel shows at reel time T (segments + montage, no flash override): the editor's monitor plays the reel. */
  worldAt(T: number): [World, Record<string, any>];
}

/** A world of the reel. 3D worlds render into the column-sized target; draw() paints 2D on top (or the whole picture). */
export interface World {
  init(x: AuraCtx): Promise<void> | void;
  render3d?(t: number, rt: THREE.WebGLRenderTarget, p: Record<string, any>): void;
  draw(c: CanvasRenderingContext2D, t: number, p: Record<string, any>): void;
}

// ---------------------------------------------------------------- small helpers
export const ease = {
  out: (x: number, n = 3) => 1 - Math.pow(1 - sat(x), n),
  in: (x: number, n = 3) => Math.pow(sat(x), n),
  inOut: (x: number, n = 3) => { x = sat(x); return x < 0.5 ? Math.pow(2 * x, n) / 2 : 1 - Math.pow(2 - 2 * x, n) / 2; },
  expo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * sat(x))),
  back: (x: number, s = 1.7) => { x = sat(x) - 1; return 1 + x * x * ((s + 1) * x + s); },
};
/** A decaying pulse after t0 (1 at t0), half-life hl. */
export const pulse = (t: number, t0: number, hl = 0.08) => (t < t0 ? 0 : Math.pow(0.5, (t - t0) / hl));
/** The strongest pulse from a list of hit times. */
export const pulses = (t: number, ts: number[], hl = 0.08) => ts.reduce((m, t0) => Math.max(m, pulse(t, t0, hl)), 0);
/** Eighth index of t and its phase (0..1) on the reel's grid. */
export const eighthAt = (cues: AuraCues, t: number) => { const x = t / cues.eighth; const i = Math.floor(x + 1e-6); return { i, f: x - i }; };

export function label(c: CanvasRenderingContext2D, s: string, x: number, y: number, size = 13, col: string = A.dim, align: CanvasTextAlign = 'left', track = 1.2) {
  txt(c, s, x, y, mono(size, 600), col, track, align);
}
export function title(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string = A.text, align: CanvasTextAlign = 'center', width = 125) {
  txt(c, s, x, y, ax(size, width, 900), col, 0, align);
}
/** The end-of-render statement ("WORDS → MOTION"): a thin rule, then the line rising out of it. */
export function statement(c: CanvasRenderingContext2D, s: string, t: number, t0: number, y: number, col: string = A.text, rule: string = A.teal) {
  if (t < t0 || LOOK.clean) return;
  const k = ease.out(span(t, t0, t0 + 0.35), 4), w = 300 * k;
  c.save(); c.fillStyle = rule; c.fillRect(CX - w / 2, y + 16, w, 2);
  c.beginPath(); c.rect(0, y - 46, FXW, 60); c.clip();
  txt(c, s, CX, y + (1 - k) * 46, ax(34, 125, 900), col, 2, 'center'); c.restore();
}
export { ax, mono, txt, alpha, fillRR, rrect, sat, span };
