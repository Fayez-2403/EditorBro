// The reel's own multitrack editor (an original design, not a copy of any NLE). Its timeline IS this reel: the six renders on
// V1, the IDE shots on V2, the backshot on V3, the montage and the flashes on FX, the song's measured waveform on A1, the
// foley cues on A2 (all from data/aura/cues.json and audio.json). The program monitor plays the reel through worldAt(T):
// 2D worlds are drawn scaled into it, 3D worlds render into a viewport cut out of the render target (the 2D layer leaves a
// hole there), so a push into the monitor becomes a seamless cut into the next world.
// Modes: rough (the rough cut, off the beat; scrub; push into the IDE), drop (Renders 01 and 02 dropped on the beat, play,
// morph into Render 03), final (the impossible timeline: overview, macro keyframes, dawn, a 2-frame nudge, lock, export),
// and the montage snaps. kind 'preview' is the big preview window flashed in the fast section.
import type * as THREE from 'three';
import { A, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, mono, txt, ax, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';
import { hash } from '../../engine/util';

const MON = { x: 164, y: 112, w: 280, h: 498 }, PMON = { x: 64, y: 132, w: 480, h: 853 };
const COLS: Record<string, string> = { r1: '#C8F31D', r2: A.teal, r3: A.violet, r4: A.blue, r5: A.amber, r6: '#FF5A5F' };
const NAMES: Record<string, string> = { r1: 'R01 · TYPE', r2: 'R02 · PRODUCT', r3: 'R03 · SHADER', r4: 'R04 · CHROME', r5: 'R05 · VOLCANO', r6: 'R06 · PIT STOP' };
const TRACKS = ['V3', 'V2', 'V1', 'FX', 'A1', 'A2'];
const TL = { x0: 64, x1: 596, ruler: 648, top: 670, th: 40, gap: 5 };
type Clip = { tr: string; a: number; b: number; name: string; col: string; thumb?: string; key: string };
type Mon = { T: number | null; ph?: number; rect: { x: number; y: number; w: number; h: number } };

export function editorWorld(kind: 'editor' | 'preview' = 'editor'): World {
  let x!: AuraCtx; let e8 = 0, beat = 0, bar = 0;
  let clips: Clip[] = [];
  const ev = (n: string) => x.ev(n);
  /** The push into the monitor (0..1): rough -> the IDE, drop -> Render 03. */
  const pushK = (t: number, p: Record<string, any>) =>
    p.mode === 'rough' ? ease.in(span(t, ev('editor.push'), ev('ide.in')), 2.2) : p.mode === 'drop' ? ease.in(span(t, ev('rt2.morph'), ev('r3.in')), 2.2) : 0;
  const zoomXf = (k: number) => { const m = kind === 'preview' ? PMON : MON, Z = 1 + (FXW / m.w - 1) * k; return { Z, ox: m.x * (1 - k) - Z * m.x, oy: m.y * (1 - k) - Z * m.y }; };
  /** What the program monitor shows at t, as reel time T (null: the backshot frames of the rough cut). */
  const mon = (t: number, p: Record<string, any>): Mon => {
    const m = kind === 'preview' ? PMON : MON, k = pushK(t, p), { Z, ox, oy } = zoomXf(k);
    const rect = { x: Z * m.x + ox, y: Z * m.y + oy, w: Z * m.w, h: Z * m.h };
    if (kind === 'preview') return { T: t - e8, rect };              // the volcano, from the beat before (never this flash)
    if (p.montage) return { T: 66.4 + (t - p.t0), rect };
    if (p.mode === 'rough') return t >= ev('editor.push') ? { T: ev('ide.in'), rect } : { T: null, ph: playhead(t, p) * 0.75, rect };
    if (p.mode === 'drop') {
      if (t >= ev('rt2.morph')) return { T: ev('r3.in'), rect };
      if (t >= ev('rt2.play')) return { T: 30.32 + (t - ev('rt2.play')) * 1.6, rect };
      if (t >= ev('rt2.drop2')) return { T: 34.3, rect };
      if (t >= ev('rt2.drop1')) return { T: 25.6, rect };
      return { T: 36.4, rect };
    }
    // final: the hero moments, then an impossible edit on the beats
    if (t < ev('fin.macro')) return { T: 78.31 + (t - ev('fin.timeline')), rect };
    if (t < ev('fin.dawn')) return { T: 56.21 + (t - ev('fin.macro')), rect };
    if (t < ev('fin.nudge')) { const b = Math.floor((t - ev('fin.dawn')) / beat), lt = t - ev('fin.dawn') - b * beat; return { T: [23.4, 33.2, 45.0, 67.2][Math.min(3, b)]! + lt, rect }; }
    if (t < ev('fin.export')) return { T: 66.0 + (t - ev('fin.nudge')), rect };
    return { T: 79.6, rect };
  };
  /** The playhead's reel time (what the monitor shows, so the timeline and the picture agree). */
  const playhead = (t: number, p: Record<string, any>): number => {
    if (p.mode === 'rough') { const s = ease.inOut(span(t, ev('editor.scrub'), ev('editor.push') - e8), 3); return 1.2 + (t - ev('editor.rough')) * 0.6 + 15 * s; }
    const m = mon(t, p); return m.T ?? 0;
  };
  /** The visible window of the timeline, eased between keyframes. */
  const win = (t: number, p: Record<string, any>): [number, number] => {
    if (p.montage) return [56, 76];
    if (p.mode === 'rough') return [0, 24];
    if (p.mode === 'drop') return [12, 46];
    const K: [number, [number, number]][] = [[ev('fin.timeline'), [0, 90]], [ev('fin.macro'), [54.6, 58.6]], [ev('fin.dawn'), [0, 90]], [ev('fin.nudge'), [80.25, 81.45]], [ev('fin.click'), [0, 90]]];
    let w = K[0]![1];
    for (let i = 1; i < K.length; i++) { const [tk, wk] = K[i]!, k = ease.inOut(span(t, tk, tk + 0.35), 3); w = [w[0] + (wk[0] - w[0]) * k, w[1] + (wk[1] - w[1]) * k]; }
    return w;
  };
  // ---------------------------------------------------------------- drawing
  const timeline = (c: CanvasRenderingContext2D, t: number, p: Record<string, any>) => {
    const [a, b] = win(t, p), X = (T: number) => TL.x0 + ((T - a) / (b - a)) * (TL.x1 - TL.x0), ty = (i: number) => TL.top + i * (TL.th + TL.gap);
    fillRR(c, 8, TL.ruler - 14, FXW - 16, 6 * (TL.th + TL.gap) + 40, 12, '#0C1016');
    // ruler: bars (numbers on the phrases), beats, eighths when zoomed
    c.save(); c.beginPath(); c.rect(TL.x0, TL.ruler - 12, TL.x1 - TL.x0, 6 * (TL.th + TL.gap) + 34); c.clip();
    const pxs = (TL.x1 - TL.x0) / (b - a), step = pxs * e8 > 6 ? e8 : pxs * beat > 5 ? beat : bar;
    for (let T = Math.ceil(a / step) * step; T <= b; T += step) {
      const isBar = Math.abs(T / bar - Math.round(T / bar)) < 1e-4, xx = X(T);
      c.fillStyle = isBar ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)'; c.fillRect(xx, TL.ruler + (isBar ? 0 : 8), 1, isBar ? 16 : 8);
      if (isBar) { const n = Math.round(T / bar); if (n % 4 === 0 || pxs * bar > 40) txt(c, String(n + 1), xx + 3, TL.ruler + 9, mono(9, 600), A.dim, 0, 'left'); c.fillStyle = 'rgba(255,255,255,0.04)'; c.fillRect(xx, TL.top, 1, 6 * (TL.th + TL.gap)); }
    }
    c.restore();
    // track labels
    TRACKS.forEach((n, i) => { fillRR(c, 14, ty(i), 44, TL.th, 6, '#151B24'); txt(c, n, 36, ty(i) + 25, mono(11, 700), n.startsWith('A') ? A.green : n === 'FX' ? A.amber : A.text, 1, 'center'); });
    c.save(); c.beginPath(); c.rect(TL.x0, TL.top - 2, TL.x1 - TL.x0, 6 * (TL.th + TL.gap)); c.clip();
    // clips
    const lockK = p.mode === 'final' ? pulse(t, ev('fin.click'), 0.25) : 0, locked = p.mode === 'final' && t >= ev('fin.click');
    for (const cl of clips) {
      const vis = visible(cl, t, p); if (vis.alpha <= 0) continue;
      const i = TRACKS.indexOf(cl.tr), y = ty(i) + vis.dy;
      let xa = X(cl.a + vis.da), xb = X(cl.b + vis.db); if (xb < TL.x0 - 4 || xa > TL.x1 + 4) continue;
      if (xb - xa < 2) xb = xa + 2;
      c.save(); c.globalAlpha = vis.alpha;
      fillRR(c, xa, y, xb - xa, TL.th, 6, alpha(cl.col, 0.26));
      const im = cl.thumb ? x.thumbs[cl.thumb] : undefined;
      if (im && xb - xa > 26) { c.save(); c.beginPath(); c.roundRect(xa, y, xb - xa, TL.th, 6); c.clip(); const w = TL.th * 304 / 540; for (let xx = xa + 3; xx < xb; xx += w + 2) c.drawImage(im, xx, y + 1, w, TL.th - 2); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(xa, y, xb - xa, TL.th); c.restore(); }
      c.fillStyle = cl.col; c.fillRect(xa, y, 3, TL.th);
      if (xb - xa > 46) txt(c, cl.name, xa + 8, y + 13, mono(9, 700), A.text, 0.5, 'left');
      if (vis.flash > 0) { c.fillStyle = alpha('#FFFFFF', 0.7 * vis.flash); c.fillRect(xa, y, xb - xa, TL.th); }
      if (vis.off) { c.fillStyle = A.red; c.beginPath(); c.moveTo(xa, y - 1); c.lineTo(xa + 6, y - 1); c.lineTo(xa, y + 7); c.fill(); }
      if (locked && cl.tr !== 'A1') { c.strokeStyle = alpha(A.teal, 0.35 + 0.65 * lockK); c.lineWidth = 1.5; c.beginPath(); c.roundRect(xa + 0.5, y + 0.5, xb - xa - 1, TL.th - 1, 6); c.stroke(); }
      c.restore();
    }
    // A1: the song's measured waveform; A2: the foley cues
    const ya = ty(4) + TL.th / 2;
    c.fillStyle = alpha(A.green, 0.55);
    for (let xx = TL.x0; xx < TL.x1; xx += 2) { const T = a + ((xx - TL.x0) / (TL.x1 - TL.x0)) * (b - a); if (T < 0 || T > 90) continue; const v = x.audio.env('rms', T) * 0.8 + x.audio.env('bass', T) * 0.2; c.fillRect(xx, ya - v * 17, 1.4, v * 34); }
    c.fillStyle = alpha(A.amber, 0.8);
    for (const [T] of (x.cues as any).sfx as [number, string, number][]) { if (T < a || T > b) continue; c.fillRect(X(T), ty(5) + 8, 1.5, TL.th - 16); }
    if (p.mode === 'final' && t >= ev('fin.macro') && t < ev('fin.dawn')) keyframes(c, t, X, ty(2));
    c.restore();
    // the playhead
    const Tp = playhead(t, p), xp = X(Tp);
    if (xp >= TL.x0 && xp <= TL.x1) {
      c.fillStyle = A.amber; c.fillRect(xp - 0.75, TL.ruler - 4, 1.5, 6 * (TL.th + TL.gap) + 26);
      c.beginPath(); c.moveTo(xp - 6, TL.ruler - 10); c.lineTo(xp + 6, TL.ruler - 10); c.lineTo(xp, TL.ruler - 2); c.fill();
    }
    // the nudge: the R06 edge moves two frames onto the bar line
    if (p.mode === 'final' && t >= ev('fin.nudge') && t < ev('fin.click') + 0.2) {
      const xb0 = X(80.84); c.strokeStyle = alpha(A.teal, 0.9); c.setLineDash([4, 4]); c.beginPath(); c.moveTo(xb0, TL.top - 4); c.lineTo(xb0, TL.top + 3 * (TL.th + TL.gap)); c.stroke(); c.setLineDash([]);
      const done = t >= ev('fin.nudge') + 2 * e8;
      txt(c, done ? 'ON THE BAR' : '−2f', xb0 + 8, TL.top - 6, mono(11, 700), done ? A.teal : A.amber, 1, 'left');
    }
  };
  /** Keyframes on the R04 opacity curve during the macro: the curve is pulled down and released on the beats. */
  const keyframes = (c: CanvasRenderingContext2D, t: number, X: (T: number) => number, y: number) => {
    const t0 = ev('fin.macro'), d = 0.5 + 0.5 * Math.sin(Math.min(1, (t - t0) / (2 * beat)) * Math.PI);
    const pts = [55.578, 56.209, 56.84, 57.472, 58.104].map((T, i) => [X(T), y + 8 + (i === 2 ? 18 * d : i % 2 ? 6 : 0)] as [number, number]);
    c.strokeStyle = A.cyan; c.lineWidth = 1.5; c.beginPath(); pts.forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke();
    for (const [a, b] of pts) { c.save(); c.translate(a, b); c.rotate(Math.PI / 4); c.fillStyle = A.cyan; c.fillRect(-4, -4, 8, 8); c.restore(); }
  };
  /** A clip's state: the rough cut is off the beat; Renders 01-02 drop in (drop mode); the montage snaps. */
  const visible = (cl: Clip, t: number, p: Record<string, any>) => {
    const r = { alpha: 1, dy: 0, da: 0, db: 0, flash: 0, off: false };
    if (p.mode === 'rough') {
      if (cl.tr !== 'V3') { r.alpha = cl.tr === 'A1' ? 1 : 0; return r; }
      r.da = (hash(cl.a, 3) - 0.5) * 0.5; r.db = (hash(cl.b, 4) - 0.5) * 0.5; r.off = true; return r;
    }
    if (cl.key === 'rough') { r.alpha = 0; return r; }   // the rough cut exists only in rough mode
    const isR = /^r\d$/.test(cl.key);
    if (p.montage) {
      if (cl.key === 'r5' && p.k === 0) { const k = spring(t - p.t0, 0.12, 0.6); r.dy = -70 * (1 - k); r.flash = pulse(t, p.t0 + 0.08, 0.06); }
      if (cl.key === 'r6' && p.k === 2) { const k = spring(t - p.t0, 0.12, 0.6); r.dy = -70 * (1 - k); r.flash = pulse(t, p.t0 + 0.08, 0.06); }
      if (cl.key === 'r6' && p.k < 2) r.alpha = 0.25;
      return r;
    }
    if (p.mode === 'drop') {
      if (cl.key === 'r1' || cl.key === 'r2') {
        const td = ev(cl.key === 'r1' ? 'rt2.drop1' : 'rt2.drop2'), k = t < td - 0.18 ? 0 : spring(t - (td - 0.18), 0.16, 0.55);
        r.alpha = t < td - 0.18 ? 0 : 1; r.dy = -90 * (1 - k); r.flash = pulse(t, td, 0.08);
      } else if (isR) r.alpha = 0.18;
      return r;
    }
    if (p.mode === 'final' && cl.key === 'r6') r.db = t < ev('fin.nudge') ? 0.033 : 0.033 * (1 - ease.inOut(span(t, ev('fin.nudge'), ev('fin.nudge') + 2 * e8), 3));
    return r;
  };
  /** The monitor's content: a 2D world drawn scaled, or the 2D overlay of a 3D world over the hole. */
  const monitor = (c: CanvasRenderingContext2D, t: number, p: Record<string, any>, m: Mon) => {
    const R = kind === 'preview' ? PMON : MON;
    c.save(); c.shadowColor = alpha(A.teal, 0.25); c.shadowBlur = 30; fillRR(c, R.x - 3, R.y - 3, R.w + 6, R.h + 6, 8, '#000'); c.restore();
    if (m.T === null) {
      const f = x.frame('ph', m.ph ?? 0); if (f) c.drawImage(f, R.x, R.y, R.w, R.h); else { c.fillStyle = '#000'; c.fillRect(R.x, R.y, R.w, R.h); }
    } else {
      const [w, wp] = x.worldAt(m.T);
      c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
      if (w.render3d) c.clearRect(R.x, R.y, R.w, R.h);
      c.translate(R.x, R.y); c.scale(R.w / FXW, R.h / FXH); w.draw(c, m.T, wp); c.restore();
    }
    c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 1; c.strokeRect(R.x - 0.5, R.y - 0.5, R.w + 1, R.h + 1);
  };
  const tc = (T: number) => { const f = Math.max(0, Math.round(T * 60)), s = Math.floor(f / 60); return `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f % 60).padStart(2, '0')}`; };
  const at = (Tp: number) => clips.find((q) => q.tr === 'V1' && Tp >= q.a && Tp < q.b) ?? clips.find((q) => q.tr === 'V2' && Tp >= q.a && Tp < q.b);
  return {
    init(ctx) {
      x = ctx; e8 = x.cues.eighth; beat = x.cues.beat; bar = x.cues.bar;
      for (const [a, b, n, sp] of x.cues.segments) {
        if (n.startsWith('r')) clips.push({ tr: 'V1', a, b, name: NAMES[n]!, col: COLS[n]!, thumb: n, key: n });
        else if (n === 'ide') clips.push({ tr: 'V2', a, b, name: `IDE · ${sp.shot}${sp.prompt ? ' ' + sp.prompt : ''}`, col: '#6FC3DF', key: 'ide' });
        else if (n === 'editor') clips.push({ tr: 'V2', a, b, name: `EDIT · ${sp.mode}`, col: '#8A94A6', key: 'edit' });
        else clips.push({ tr: 'V3', a, b, name: n === 'orbit' ? 'BACKSHOT · AI' : 'END', col: '#5A6678', key: n });
      }
      // the rough cut: the backshot chopped into seven clips across the first 24 s
      for (let i = 0; i < 7; i++) clips.push({ tr: 'V3', a: 7.58 + i * 2.4, b: 7.58 + (i + 1) * 2.4 - 0.15, name: `ROUGH ${i + 1}`, col: '#5A6678', key: 'rough' });
      for (const [a, b] of x.cues.montage) clips.push({ tr: 'FX', a, b, name: '', col: A.amber, key: 'fx' });
      for (const [T] of x.cues.flashes) clips.push({ tr: 'FX', a: T, b: T + e8 / 2, name: '', col: '#FFFFFF', key: 'fx' });
      clips.push({ tr: 'A1', a: 0, b: x.ev('dh.slam'), name: 'DHURANDHAR · TITLE TRACK', col: A.amber, key: 'a1' });
      clips.push({ tr: 'A1', a: x.ev('dh.slam'), b: 90, name: 'DUBPLATE · GENERAL LEVY', col: A.green, key: 'a1' });
      clips.push({ tr: 'A2', a: 0, b: 90, name: `FOLEY · ${((x.cues as any).sfx as unknown[]).length} CUES`, col: A.amber, key: 'a2' });
    },
    render3d(t, rt, p) {
      const r = x.renderer; r.setRenderTarget(rt); r.setClearColor('#07090D', 1); r.clear();
      const m = mon(t, p); if (m.T === null) return;
      const [w, wp] = x.worldAt(m.T); if (!w.render3d) return;
      const px = rt.height / FXH, vx = m.rect.x * px, vy = (FXH - m.rect.y - m.rect.h) * px;
      (rt.viewport as THREE.Vector4).set(vx, vy, m.rect.w * px, m.rect.h * px); rt.scissor.set(Math.max(0, vx), Math.max(0, vy), Math.min(rt.width, m.rect.w * px), Math.min(rt.height, m.rect.h * px)); rt.scissorTest = true;
      try { w.render3d(m.T, rt, wp); } finally { rt.viewport.set(0, 0, rt.width, rt.height); rt.scissor.set(0, 0, rt.width, rt.height); rt.scissorTest = false; r.setRenderTarget(rt); }
    },
    draw(c, t, p) {
      const m = mon(t, p), k = pushK(t, p), { Z, ox, oy } = zoomXf(k);
      c.save(); c.transform(Z, 0, 0, Z, ox, oy);
      // the room: cool night, then dawn through the window (final mode)
      c.fillStyle = '#07090D'; c.fillRect(0, 0, FXW, FXH);
      const dawn = p.mode === 'final' ? ease.inOut(span(t, ev('fin.dawn'), ev('fin.dawn') + 1.4), 2) : 0;
      if (dawn > 0) { const g = c.createLinearGradient(FXW, 0, 0, FXH); g.addColorStop(0, `rgba(255,170,90,${0.22 * dawn})`); g.addColorStop(0.6, `rgba(255,140,80,${0.05 * dawn})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, FXW, FXH); }
      if (kind === 'preview') {
        txt(c, 'PREVIEW · R05 VOLCANO · 60 fps · 1080×1920', 64, 118, mono(11, 700), alpha(A.text, 0.75), 1.5, 'left');
        monitor(c, t, p, m);
        const q = sat((t - (p.t0 ?? t)) / e8); fillRR(c, 64, 1000, 480, 4, 2, 'rgba(255,255,255,0.12)'); fillRR(c, 64, 1000, 480 * (0.62 + 0.04 * q), 4, 2, A.amber);
        c.restore(); return;
      }
      // the top bar
      txt(c, 'AURA EDIT', 16, 86, ax(16, 125, 900), A.text, 2, 'left');
      txt(c, 'editors-aura · 60 fps', 16, 102, mono(9, 600), A.dim, 0.8, 'left');
      const Tp = playhead(t, p);
      txt(c, tc(Tp), 440, 92, mono(15, 700), A.amber, 1, 'right');
      const ex = p.mode === 'final' ? span(t, ev('fin.export'), ev('fin.back') - 0.05) : 0, exOn = p.mode === 'final' && t >= ev('fin.export');
      fillRR(c, 452, 72, 140, 30, 8, exOn ? A.teal : '#1A202A'); txt(c, exOn ? (ex >= 1 ? 'EXPORTED ✓' : 'EXPORTING…') : 'EXPORT', 522, 92, ax(12, 110, 800), exOn ? '#04191C' : A.text, 1.5, 'center');
      if (exOn) { c.fillStyle = alpha('#FFFFFF', 0.5 * pulse(t, ev('fin.export'), 0.08)); c.fillRect(452, 72, 140, 30); }
      // inspector (left), meters (right)
      fillRR(c, 8, MON.y, 148, MON.h, 10, '#0C1016'); fillRR(c, 452, MON.y, 148, MON.h, 10, '#0C1016');
      const cl = at(Tp);
      txt(c, 'INSPECTOR', 18, MON.y + 22, mono(10, 700), A.dim, 1.5, 'left');
      if (cl) { fillRR(c, 18, MON.y + 36, 10, 10, 2, cl.col); txt(c, cl.name, 34, MON.y + 45, mono(10, 700), A.text, 0.3, 'left'); }
      const opa = p.mode === 'final' && t >= ev('fin.macro') && t < ev('fin.dawn') ? Math.round(100 - 22 * (0.5 + 0.5 * Math.sin(Math.min(1, (t - ev('fin.macro')) / (2 * beat)) * Math.PI))) : 100;
      ([['Opacity', `${opa}%`], ['Blend', 'Normal'], ['Speed', '1.00×'], ['Cut', 'on the 1/8'], ['Grade', dawn > 0.5 ? 'Dawn' : 'Night']] as [string, string][]).forEach(([a, b], i) => {
        const y = MON.y + 78 + i * 34; txt(c, a, 18, y, mono(10, 600), A.dim, 0.5, 'left'); txt(c, b, 146, y, mono(10, 700), i === 0 && opa < 100 ? A.cyan : A.text, 0.3, 'right'); c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(18, y + 10, 128, 1);
      });
      const bb = Math.floor(Tp / bar + 1e-6), e = Math.floor((Tp - bb * bar) / e8 + 1e-6);
      txt(c, `BAR ${bb + 1} · ${e + 1}/8`, 18, MON.y + 270, mono(11, 700), A.amber, 1, 'left');
      for (let i = 0; i < 8; i++) fillRR(c, 18 + i * 16, MON.y + 282, 12, 12, 3, i === e ? A.amber : '#1A202A');
      txt(c, 'AUDIO', 462, MON.y + 22, mono(10, 700), A.dim, 1.5, 'left');
      const lv = x.audio.env('rms', Math.max(0, Tp)), lv2 = x.audio.env('bass', Math.max(0, Tp));
      for (const [i, v] of [[0, lv], [1, lv * 0.92 + lv2 * 0.08]] as [number, number][]) {
        fillRR(c, 470 + i * 22, MON.y + 40, 14, 300, 4, '#151B24');
        const h = 300 * v; const g = c.createLinearGradient(0, MON.y + 340, 0, MON.y + 40); g.addColorStop(0, A.green); g.addColorStop(0.75, A.amber); g.addColorStop(1, A.red);
        c.fillStyle = g; c.fillRect(470 + i * 22, MON.y + 340 - h, 14, h);
      }
      txt(c, 'BPM 95.00', 520, MON.y + 60, mono(11, 700), A.text, 0.5, 'left');
      txt(c, 'TARGET', 520, MON.y + 92, mono(9, 600), A.dim, 0.8, 'left'); txt(c, '−14 LUFS', 520, MON.y + 108, mono(11, 700), A.text, 0.3, 'left');
      txt(c, 'GRID', 520, MON.y + 140, mono(9, 600), A.dim, 0.8, 'left'); txt(c, '1/8 · 0.316 s', 520, MON.y + 156, mono(10, 700), A.text, 0.3, 'left');
      // the monitor + its labels
      monitor(c, t, p, m);
      txt(c, 'PROGRAM', MON.x + MON.w, MON.y - 6, mono(9, 700), A.dim, 1.5, 'right');
      if (p.mode === 'rough') txt(c, 'ROUGH CUT · v0 · 7 CUTS OFF THE BEAT', CX, MON.y + MON.h + 20, mono(10, 700), A.red, 1, 'center');
      else if (p.mode === 'final' && t >= ev('fin.click')) {
        const kk = spring(t - ev('fin.click'), 0.25, 0.5);
        c.save(); c.translate(CX, MON.y + MON.h + 20); c.scale(kk, kk); fillRR(c, -120, -13, 240, 24, 12, alpha(A.teal, 0.18)); txt(c, 'LOCKED · 0 OFF THE GRID', 0, 4, mono(10, 700), A.teal, 1.5, 'center'); c.restore();
      } else txt(c, `${(cl?.name ?? '').toUpperCase()}`, CX, MON.y + MON.h + 20, mono(10, 700), A.dim, 1, 'center');
      timeline(c, t, p);
      if (p.mode === 'final' && t >= ev('fin.export') && t < ev('fin.back')) {   // the export bar
        fillRR(c, 24, 1000, 560, 6, 3, 'rgba(255,255,255,0.1)'); fillRR(c, 24, 1000, 560 * ex, 6, 3, A.teal);
        txt(c, `EXPORT · master.mp4 · ${Math.round(ex * 100)}%`, 24, 990, mono(10, 700), A.teal, 1, 'left');
      }
      c.restore();
      if (p.mode === 'final' && t >= ev('fin.line1')) {   // the line on the bass dropout
        c.fillStyle = `rgba(3,4,6,${0.75 * sat((t - ev('fin.line1')) / 0.12)})`; c.fillRect(0, 0, FXW, FXH);
        const kk = spring(t - ev('fin.line1'), 0.3, 0.6);
        c.save(); c.translate(CX, 520); c.scale(0.9 + 0.1 * kk, 0.9 + 0.1 * kk); txt(c, 'I DON’T JUST', 0, -22, ax(52, 125, 900), A.text, 1, 'center'); txt(c, 'EDIT VIDEOS.', 0, 36, ax(52, 125, 900), A.text, 1, 'center'); c.restore();
      }
      if (k > 0.9) { c.fillStyle = `rgba(255,255,255,${(k - 0.9) * 4})`; c.fillRect(0, 0, FXW, FXH); }
    },
  };
}
