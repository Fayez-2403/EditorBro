// Motion Flex, Claude cut: the 6-bar process intro of `flex_full`, how the reel is made. One prompt,
// the code it becomes, the measured beat grid, the frames as a function of time, the drop on "no
// After Effects", and the code's own characters assembling the cube that opens the reel.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT } from '../engine/gl';
import { hash } from '../engine/util';
import {
  COL, FX, FXW, FXH, sat, lerp2, span, outP, inP, inOutP, outExpo, spring, hitP, alpha, mixHex, rrect, fillRR, disc,
  strokeLine, ax, mono, fitAx, txt, poly, qRot, add3, proj, type Cam, frameRand,
} from './_vo';
import Flex, { loadFlexCues, songOf, gridAt, type FlexCues } from './flex';

const CODE_LINES = [
  "const cues = await loadFlexCues()   // measured beat grid",
  "const kick = cues.events['hook.unfold']",
  "",
  "export default class Flex extends Scene {",
  "  drawFrame(c, t) {                 // every frame = f(t)",
  "    const id = this.section(t)",
  "    this.drawSection(c, id, t)",
  "  }",
  "  hook(c, t) {",
  "    const p = spring(t - kick, .5, .82)",
  "    face.p = lerp(face.p, slab.p, p)",
  "  }",
  "  websites(c, t) {",
  "    const R = lerpRect(BROWSER, PHONE, rf)",
  "    this.page(c, t, R, rf)          // reflow",
  "  }",
];
const KEYWORDS = /\b(const|await|export|default|class|extends|this|return)\b/g;
const CHIPS = ['UI morphs', 'kinetic type', 'beat sync', '3D camera', 'safe zones'];
const HEAD: [string, string, string][] = [
  ['intro.code', 'IT STARTS WITH', 'ONE PROMPT.'], ['intro.grid', 'CLAUDE OPUS 5.5', 'WRITES THE CODE.'],
  ['intro.frames', 'EVERY CUT', 'ON THE BEAT.'], ['intro.drop', 'EVERY FRAME', 'IS CODE.'],
  ['intro.just', 'NO AFTER', 'EFFECTS.'], ['intro.seed', 'NO TIMELINE.', 'JUST CODE.'], ['intro.handoff', 'HERE’S WHAT', 'IT BUILT.'],
];
const PANEL = { x: 36, y: 372, w: 500, h: 352, r: 18 };

export default class FlexIntro extends Scene {
  private layer = new Layer2D();
  cues!: FlexCues;
  reel: Flex | null = null;

  override async init() {
    this.cues = await loadFlexCues();
    if (!this.reel) { this.reel = new Flex(this.ctx); await this.reel.init(); }
  }
  ev(n: string) { const v = this.cues.events[n]; if (v === undefined) throw new Error(`flex cue missing: ${n}`); return v; }
  get E8() { return this.cues.eighth; }

  drawFrame(c: CanvasRenderingContext2D, t: number) {
    const drop = this.ev('intro.drop'), seed = this.ev('intro.seed');
    const inv = t >= drop && t < drop + 2 / 60;
    c.fillStyle = inv ? FX.lime : FX.ink; c.fillRect(0, 0, FXW, FXH);
    c.save();
    const shake = 13 * hitP(t, drop, .05) + 6 * hitP(t, this.ev('intro.just'), .05);
    if (shake > .2) c.translate((frameRand(t, 3) - .5) * shake, (frameRand(t, 4) - .5) * shake * .7);
    this.headline(c, t, inv);
    if (t < seed) this.panel(c, t, inv); else this.assemble(c, t);
    c.restore();
    this.hud(c, t);
  }

  /** One claim per bar; old words leave upward through their line mask, new words rise in (one current). */
  private headline(c: CanvasRenderingContext2D, t: number, inv: boolean) {
    let k = HEAD.findIndex(([until]) => t < this.ev(until));
    if (k < 0) k = HEAD.length - 1;
    const start = k === 0 ? 0 : this.ev(HEAD[k - 1]![0]);
    const end = this.ev(HEAD[k]![0]);
    const big = k === 4 || k === 5;
    const [, l1, l2] = HEAD[k]!;
    const size = big ? Math.min(fitAx(c, l1, 80, 500, 112.5, 900), fitAx(c, l2, 80, 500, 112.5, 900)) : fitAx(c, 'WRITES THE CODE.', 50, 500, 100, 900);
    const f = big ? ax(size, 112.5, 900) : ax(size, 100, 900);
    const y1 = big ? 276 : 262, y2 = y1 + size * 1.0;
    const slam = big ? lerp2(1.35, 1, outExpo(span(t, start, start + .2))) : 1;
    const out = inP(span(t, end - .16, end), 3);
    [l1, l2].forEach((s, i) => {
      const p = big ? sat((t - start) / .05) : outP(span(t, start + .03 + i * .06, start + .38 + i * .06), 4);
      const y = i ? y2 : y1;
      c.save(); c.beginPath(); c.rect(0, y - size * 1.0, FXW, size * 1.22); c.clip();
      c.translate(36, y); c.scale(slam, slam);
      txt(c, s, 0, (1 - p) * size * 1.15 - out * size * 1.15, f, i ? (inv ? FX.ink : FX.lime) : (inv ? FX.ink : FX.bone));
      c.restore();
    });
    if (k === 0) { c.save(); c.globalAlpha = span(t, .05, .3); txt(c, '// how this reel was made', 36, 216, mono(16, 600), FX.lime); c.restore(); }
  }

  private panel(c: CanvasRenderingContext2D, t: number, inv: boolean) {
    const code = this.ev('intro.code'), grid = this.ev('intro.grid'), frames = this.ev('intro.frames'), drop = this.ev('intro.drop');
    const P = PANEL;
    const appear = outP(span(t, .1, .45), 4);
    c.save(); c.translate(0, (1 - appear) * 40); c.globalAlpha = sat(appear * 2);
    fillRR(c, P.x, P.y, P.w, P.h, P.r, inv ? FX.ink : FX.ink2);
    rrect(c, P.x + .5, P.y + .5, P.w - 1, P.h - 1, P.r); c.strokeStyle = FX.line; c.lineWidth = 1; c.stroke();
    for (let i = 0; i < 3; i++) disc(c, P.x + 20 + i * 14, P.y + 20, 4.5, [FX.orange, FX.bone3, FX.bone3][i]!);
    const title = t < code ? 'terminal' : t < grid ? 'scenes/flex.ts' : t < frames ? 'beat grid · measured' : t < drop ? 'render · every frame = f(t)' : 'timeline';
    txt(c, title, P.x + P.w / 2, P.y + 25, mono(10.5, 600), alpha(FX.bone, .55), 0, 'center');
    strokeLine(c, [[P.x, P.y + 40], [P.x + P.w, P.y + 40]], FX.line, 1);
    // contents scroll upward from one state to the next inside the panel
    c.beginPath(); c.rect(P.x, P.y + 41, P.w, P.h - 41); c.clip();
    const states: [number, number, (y: number) => void][] = [
      [0, code, (y) => this.terminal(c, t, y)], [code, grid, (y) => this.codeView(c, t, y)], [grid, frames, (y) => this.gridView(c, t, y)],
      [frames, drop, (y) => this.filmView(c, t, y)], [drop, this.ev('intro.seed'), (y) => this.timelineView(c, t, y)],
    ];
    for (const [a, b, draw] of states) {
      const enter = a === 0 ? 1 : outP(span(t, a - .1, a + .2), 4);
      const leave = inOutP(span(t, b - .1, b + .2), 3);
      if (t < a - .1 || t > b + .2) continue;
      draw((1 - enter) * (P.h - 40) - leave * (P.h - 40));
    }
    c.restore();
  }

  private terminal(c: CanvasRenderingContext2D, t: number, dy: number) {
    const send = this.ev('intro.send');
    const P = PANEL, x = P.x + 22, y0 = P.y + 82 + dy;
    txt(c, 'motion-flex  ~', x, y0 - 6, mono(11, 600), alpha(FX.lime, .7));
    const typed = this.typed('intro.prompt', 'make a motion reel on the beat', t);
    const lift = outP(span(t, send, send + .25), 3) * 0;
    const tw = txt(c, '> ' + typed, x, y0 + 30 - lift, mono(17, 600), FX.bone);
    if (t < send && Math.floor(t * 4) % 2 === 0) fillRR(c, x + tw + 3, y0 + 14, 9, 20, 1.5, FX.lime);
    const kp = hitP(t, send, .1);
    if (t >= send) {
      // Enter: the key flashes, the reply begins
      fillRR(c, P.x + P.w - 92, y0 + 12, 64, 26, 7, mixHex(FX.ink3, FX.lime, kp));
      txt(c, 'enter ↵', P.x + P.w - 60, y0 + 30, mono(10.5, 700), kp > .5 ? FX.ink : alpha(FX.bone, .6), 0, 'center');
      const lines = [`● reading the song: ${songOf(this.cues).tempo}`, '● planning 12 scenes, one per section', '● writing scenes/flex.ts'];
      lines.forEach((s, i) => {
        const p = span(t, send + .12 + i * .14, send + .3 + i * .14);
        if (p <= 0) return;
        c.save(); c.globalAlpha = p;
        txt(c, s, x, y0 + 78 + i * 28, mono(12.5, 500), i === 2 ? FX.lime : alpha(FX.bone, .8));
        c.restore();
      });
    }
  }
  private typed(key: string, text: string, t: number) {
    const ts = this.cues.typing[key] ?? [];
    let n = 0; for (const x of ts) if (t >= x) n++;
    return text.slice(0, n);
  }

  /** Real lines of the reel's code, written in on the sixteenths, syntax-coloured. */
  private codeView(c: CanvasRenderingContext2D, t: number, dy: number) {
    const code = this.ev('intro.code'), skills = this.ev('intro.skills');
    const P = PANEL, x = P.x + 22;
    const per = this.E8 / 2;
    const shown = Math.floor((t - code) / per) + 1;
    const scroll = Math.max(0, shown - 13) * 17;
    for (let i = 0; i < CODE_LINES.length; i++) {
      if (i >= shown) break;
      const y = P.y + 66 + i * 17 - scroll + dy;
      const fresh = sat((t - code - i * per) / .12);
      txt(c, String(i + 1).padStart(2, ' '), x, y, mono(10, 500), alpha(FX.bone, .25));
      this.codeLine(c, CODE_LINES[i]!.slice(0, Math.ceil(CODE_LINES[i]!.length * fresh)), x + 26, y);
    }
    // capability chips land on the kick
    CHIPS.forEach((s, i) => {
      const p = spring(t - skills - i * .05, .32, .8);
      if (p <= .01) return;
      c.font = mono(10.5, 700); const w = c.measureText(s).width + 22;
      c.font = mono(10.5, 700);
      const before = CHIPS.slice(0, i).reduce((acc, ch) => acc + c.measureText(ch).width + 30, 0);
      const cx = P.x + 22 + before, cy = P.y + P.h - 40 + dy;
      c.save(); c.translate(cx, cy + 12); c.scale(p, p); c.translate(-cx, -(cy + 12));
      fillRR(c, cx, cy, w, 24, 12, FX.lime);
      txt(c, s, cx + 11, cy + 16, mono(10.5, 700), FX.ink);
      c.restore();
    });
  }
  private codeLine(c: CanvasRenderingContext2D, s: string, x: number, y: number) {
    c.font = mono(11.5, 500);
    const ci = s.indexOf('//');
    const body = ci >= 0 ? s.slice(0, ci) : s, comment = ci >= 0 ? s.slice(ci) : '';
    // keywords, strings, numbers, the rest
    const parts: [string, string][] = [];
    let last = 0;
    const re = new RegExp(`${KEYWORDS.source}|'[^']*'|\\b\\d*\\.?\\d+\\b`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      if (m.index > last) parts.push([body.slice(last, m.index), FX.bone]);
      const tok = m[0];
      parts.push([tok, tok.startsWith("'") ? FX.orange : /\d/.test(tok[0]!) || tok.startsWith('.') ? FX.bone3 : FX.lime]);
      last = m.index + tok.length;
    }
    if (last < body.length) parts.push([body.slice(last), FX.bone]);
    if (comment) parts.push([comment, alpha(FX.bone, .38)]);
    let cx = x;
    for (const [p, col] of parts) { cx += txt(c, p, cx, y, mono(11.5, 500), col); }
  }

  /** The song's own waveform over the measured grid; the grid locks on the kick. */
  private gridView(c: CanvasRenderingContext2D, t: number, dy: number) {
    const grid = this.ev('intro.grid'), lock = this.ev('intro.lock');
    const P = PANEL, x0 = P.x + 20, x1 = P.x + P.w - 20, w = x1 - x0;
    const off = this.cues.reel_offset, dur = this.cues.duration - off;
    const mid = P.y + 150 + dy;
    const scan = outP(span(t, grid, lock), 2);
    // waveform of the reel's 12 bars
    const n = 268;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      if (u > scan) break;
      const v = this.wave(off + u * dur);
      const h = 4 + v * 64;
      fillRR(c, x0 + u * w, mid - h / 2, Math.max(1, w / n - .6), h, .8, u < scan - .02 ? alpha(FX.bone, .75) : FX.lime);
    }
    // eighth grid and bar lines; before the lock they hang loose, then snap
    const snap = spring(t - lock, .25, .8);
    for (let k = 0; k <= 96; k++) {
      const u = k / 96;
      const jitter = (hash(k, 7) - .5) * 14 * (1 - snap);
      const bar = k % 8 === 0;
      const xx = x0 + u * w + jitter;
      strokeLine(c, [[xx, mid + 46], [xx, mid + 46 + (bar ? 18 : 7)]], bar ? FX.lime : alpha(FX.bone, .4), bar ? 1.5 : 1);
      if (bar && k < 96) txt(c, String(k / 8 + 1), xx + 3, mid + 76, mono(9, 600), alpha(FX.bone, .5));
    }
    // measured kicks
    for (const [kt, s] of this.ctx.audio.onsets.kick ?? []) {
      if (kt < off || kt > off + dur || s < .45) continue;
      const u = (kt - off) / dur;
      if (u > scan) continue;
      disc(c, x0 + u * w, mid - 46, 3 + 2 * s, FX.orange);
    }
    const flash = hitP(t, lock, .12);
    const rd: [string, string][] = [['tempo', songOf(this.cues).tempo.replace(' pulse', '')], ['unit', `${this.E8.toFixed(4)} s`], ['sections', '12'], ['grid', t >= lock ? 'locked' : 'fitting…']];
    rd.forEach(([k, v], i) => {
      const xx = x0 + i * (w / 4);
      txt(c, k, xx, P.y + 292 + dy, mono(9.5, 500), alpha(FX.bone, .45));
      txt(c, v, xx, P.y + 312 + dy, ax(15, 100, 800), i === 3 && t >= lock ? mixHex(FX.lime, FX.bone, 1 - flash) : FX.bone);
    });
  }
  private wave(t: number) {
    const w = this.cues.wave, i = t * this.cues.wave_rate;
    const k = Math.max(0, Math.min(w.length - 2, Math.floor(i))), f = sat(i - k);
    return w[k]! * (1 - f) + w[k + 1]! * f;
  }

  /** The reel's frames on a strip, scrubbed by a playhead; it freezes in the breakdown. */
  private filmView(c: CanvasRenderingContext2D, t: number, dy: number) {
    const frames = this.ev('intro.frames'), freeze = this.ev('intro.freeze'), drop = this.ev('intro.drop');
    const P = PANEL;
    const br = this.cues.breakdowns[0] ?? [freeze + .07, freeze + 1.07];
    // speed: runs, eases to a stop in the silence, kicks back in when the bass returns
    const v = (tt: number) => tt < freeze ? 1 : tt < br[1]! ? Math.max(0, 1 - (tt - freeze) / .35) : Math.min(2.4, (tt - br[1]!) / .15);
    let pos = 0; for (let s = frames; s < t; s += 1 / 120) pos += v(s) / 120;
    const tw = 112, th = 196, gap = 10;
    const ids = this.reel!.frags();
    const cy = P.y + 70 + dy;
    for (let i = -1; i < 8; i++) {
      const x = P.x + 20 + i * (tw + gap) - ((pos * 260) % (tw + gap));
      const k = Math.floor(pos * 260 / (tw + gap)) + i;
      const [id, at] = ids[((k % 10) + 10) % 10]!;
      fillRR(c, x - 3, cy - 3, tw + 6, th + 6, 8, FX.ink3);
      c.save(); rrect(c, x, cy, tw, th, 6); c.clip();
      const img = this.reel!.snapshot(id, at);
      c.drawImage(img, x, cy, tw, th * 1.0); c.restore();
      txt(c, `${String(Math.round(at * 60)).padStart(4, '0')}`, x + 4, cy + th + 16, mono(9, 600), alpha(FX.bone, .45));
    }
    // sprocket holes
    for (let i = 0; i < 26; i++) { const x = P.x + 10 + ((i * 22 - pos * 260) % 572 + 572) % 572; fillRR(c, x, cy - 16, 10, 6, 2, FX.ink3); fillRR(c, x, cy + th + 22, 10, 6, 2, FX.ink3); }
    const ph = P.x + P.w / 2;
    strokeLine(c, [[ph, cy - 22], [ph, cy + th + 6]], FX.lime, 2);
    poly(c, [[ph - 6, cy - 24], [ph + 6, cy - 24], [ph, cy - 16]]); c.fillStyle = FX.lime; c.fill();
    const frame = Math.floor(pos * 260 / (tw + gap) * 37) % 1746;
    txt(c, `frame ${String(frame).padStart(4, '0')} / 1746`, P.x + 20, P.y + 330 + dy, mono(11, 600), FX.bone);
    txt(c, `t = ${(frame / 60).toFixed(3)} s   →   drawFrame(c, t)`, P.x + P.w - 20, P.y + 330 + dy, mono(11, 600), t > freeze && t < br[1]! ? FX.lime : alpha(FX.bone, .6), 0, 'right');
    void drop;
  }

  /** A keyframe timeline, struck through on the drop. */
  private timelineView(c: CanvasRenderingContext2D, t: number, dy: number) {
    const drop = this.ev('intro.drop');
    const P = PANEL;
    for (let r = 0; r < 5; r++) {
      const y = P.y + 70 + r * 46 + dy;
      txt(c, ['Position', 'Scale', 'Rotation', 'Opacity', 'Mask'][r]!, P.x + 18, y + 14, mono(10, 600), alpha(FX.bone, .45));
      fillRR(c, P.x + 96, y, P.w - 116, 22, 5, FX.ink3);
      for (let k = 0; k < 6; k++) {
        const x = P.x + 112 + ((k * 83 + r * 37) % (P.w - 150));
        c.save(); c.translate(x, y + 11); c.rotate(Math.PI / 4); fillRR(c, -5, -5, 10, 10, 1, alpha(FX.bone, .6)); c.restore();
      }
    }
    const s = outExpo(span(t, drop, drop + .14));
    strokeLine(c, [[P.x + 20, P.y + 300 + dy], [lerp2(P.x + 20, P.x + P.w - 20, s), lerp2(P.y + 300, P.y + 60, s) + dy]], FX.lime, 5);
  }

  /** The code's characters fly into the faces of the cube that opens the reel. */
  private assemble(c: CanvasRenderingContext2D, t: number) {
    const seed = this.ev('intro.seed'), hand = this.ev('intro.handoff');
    const reel = this.reel!;
    const q = reel.cubeQ(t - hand);
    const cam: Cam = { pos: [0, 0, 1100], yaw: 0, pitch: 0, f: 1100, cx: 304, cy: 500 };
    const N = 8, a = 150;
    // target cells: the visible faces of the cube, 8 x 8 each
    const faces = [[0, 0, 1], [1, 0, 0], [0, -1, 0], [-1, 0, 0], [0, 1, 0], [0, 0, -1]] as [number, number, number][];
    const cells: { x: number; y: number; d: number; lit: number; s: number }[] = [];
    for (const n of faces) {
      const nw = qRot(q, n);
      if (nw[2] <= .02) continue;
      const u: [number, number, number] = Math.abs(n[1]) > .5 ? [1, 0, 0] : [-n[2], 0, n[0]];
      const v: [number, number, number] = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
      const lit = .3 + .7 * Math.max(0, nw[0] * -.45 + nw[1] * -.75 + nw[2] * .55);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const pu = (i + .5) / N - .5, pv = (j + .5) / N - .5;
        const p = qRot(q, add3([n[0] * a / 2, n[1] * a / 2, n[2] * a / 2], add3([u[0] * pu * a, u[1] * pu * a, u[2] * pu * a], [v[0] * pv * a, v[1] * pv * a, v[2] * pv * a])));
        const pr = proj(p, cam);
        cells.push({ x: pr[0], y: pr[1], d: pr[2], lit, s: pr[3] * a / N });
      }
    }
    // sources: the code panel's characters
    const P = PANEL;
    const fill = span(t, hand - .32, hand - .05);
    cells.forEach((cl, k) => {
      const line = k % 15, col = Math.floor(hash(k, 3) * 40);
      const sx = P.x + 48 + col * 11.5, sy = P.y + 66 + line * 17;
      const st = seed + hash(k, 5) * 1.0;
      const p = inOutP(span(t, st, st + .9), 3);
      const x = lerp2(sx, cl.x, p), y = lerp2(sy, cl.y, p) - Math.sin(p * Math.PI) * 50 * (hash(k, 8) - .3);
      const size = lerp2(7, cl.s * lerp2(.62, 1.04, fill), p);
      if (p <= 0) { txt(c, String.fromCharCode(97 + Math.floor(hash(k, 9) * 26)), sx, sy, mono(11.5, 500), alpha(FX.bone, .5)); return; }
      fillRR(c, x - size / 2, y - size / 2, size, size, lerp2(2, 0, fill), mixHex(FX.bone, mixHex(FX.limeDD, FX.lime, cl.lit), p));
    });
    void FXH;
  }

  private hud(c: CanvasRenderingContext2D, t: number) {
    const lines: [string, string][] = [['intro.code', "prompt.send('make a motion reel on the beat')"], ['intro.grid', 'claude.write(scenes/flex.ts)'],
      ['intro.frames', `grid = measure(song)   // ${songOf(this.cues).tempo}`], ['intro.drop', 'for (n of frames) render(n / 60)'],
      ['intro.seed', 'afterEffects = null'], ['intro.handoff', 'cube.assemble(code)']];
    const code = (lines.find(([u]) => t < this.ev(u)) ?? lines[lines.length - 1]!)[1];
    const y = 858;
    c.save(); c.globalAlpha = .62;
    txt(c, code, 36, y, mono(10.5, 500), FX.bone);
    txt(c, `t ${t.toFixed(2).padStart(5, '0')}s`, 536, y, mono(10.5, 500), FX.bone, 0, 'right');
    const idx = gridAt(this.cues, t).eighth;
    for (let i = 0; i < 8; i++) fillRR(c, 36 + i * 11, y + 10, 7, i === idx ? 7 : 3, 1.5, i === idx ? FX.lime : alpha(FX.bone, .5));
    c.restore();
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const c = this.layer.ctx;
    this.layer.clear(FX.ink);
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    this.drawFrame(c, f.t);
    c.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.layer.upload(), out);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0, ca: 0, vignette: 0, shake: [0, 0], zoom: 1 };
  }
  override dispose() { this.layer.texture.dispose(); }
}
void [poly, KEYWORDS];
