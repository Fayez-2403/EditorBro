// V4 captions (aura_v4.ts): Dubplate's own words, each acted out literally, on the syllable (whisper's word starts snapped to the
// vocal onsets at 1 ms, analysis/aura_v4_audio.py), and the only info the reel carries: what it is (the hook) and which render is
// on screen (a small tag + a 9-step progress line). Kept inside the 9:16 safe area (x 24-584, y 128-900). Pure functions of t.
import type { AudioData } from '../../engine/audio';
import { hash } from '../../engine/util';
import { A, CX, FXW, FXH, ease, pulse, ax, mono, txt, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';

export interface Cap { kind: string; t0: number; t1: number; w?: Record<string, number>; lines?: [string, number][]; talks?: number[]; nouns?: [string, number][]; crowd?: number; gap?: [number, number] }
export interface Label { a: number; b: number; n: number; key: string; name: string; col: string }
const TAU = Math.PI * 2;
const INK = '#0A0C10';

/** Text on a dark slab (legible on the light and the dark renders alike), wiped in from the left and slammed. */
function slab(c: CanvasRenderingContext2D, s: string, y: number, t: number, t0: number, font: string, col: string, bg: string = INK, rot = -0.025) {
  if (t < t0) return;
  c.font = font; const w = c.measureText(s).width + 40, h = parseInt(font.match(/(\d+(?:\.\d+)?)px/)![1]!, 10) * 1.18;
  const k = spring(t - t0, 0.24, 0.55), wipe = ease.out(sat((t - t0) / 0.09), 3);
  c.save(); c.translate(CX, y); c.rotate(rot); c.scale(1.25 - 0.25 * k, 1.25 - 0.25 * k);
  c.save(); c.beginPath(); c.rect(-w / 2, -h / 2 - 4, w * wipe, h + 8); c.clip();
  fillRR(c, -w / 2, -h / 2, w, h, 6, alpha(bg, 0.94)); txt(c, s, 0, h * 0.34, font, col, 1, 'center'); c.restore();
  c.restore();
}

/** Heavy type with a dark outline (legible over white robots and white paper alike). */
function stroked(c: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, fill: string, lw = 10, tracking = 0) {
  c.save(); c.font = font; c.letterSpacing = `${tracking}px`; c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = lw; c.strokeStyle = INK; c.strokeText(s, x, y); c.restore();
  txt(c, s, x, y, font, fill, tracking, 'center');
}

/** A pictogram person (feet at y). */
function figure(c: CanvasRenderingContext2D, x: number, y: number, h: number, female: boolean, col: string) {
  c.fillStyle = col; const hr = h * 0.105, sh = y - h + 2 * hr + h * 0.045, bw = h * 0.3, r = h * 0.05;
  c.beginPath(); c.arc(x, y - h + hr, hr, 0, TAU); c.fill();
  c.beginPath(); c.roundRect(x - bw / 2 - h * 0.1, sh, h * 0.075, h * 0.36, r); c.roundRect(x + bw / 2 + h * 0.025, sh, h * 0.075, h * 0.36, r); c.fill();
  if (!female) {
    c.beginPath(); c.roundRect(x - bw / 2, sh, bw, h * 0.42, r); c.fill();
    c.beginPath(); c.roundRect(x - bw / 2, sh + h * 0.38, bw * 0.45, y - sh - h * 0.38, r); c.roundRect(x + bw * 0.05, sh + h * 0.38, bw * 0.45, y - sh - h * 0.38, r); c.fill();
  } else {
    const hem = sh + h * 0.5;
    c.beginPath(); c.moveTo(x - bw * 0.38, sh); c.lineTo(x + bw * 0.38, sh); c.lineTo(x + bw * 0.78, hem); c.lineTo(x - bw * 0.78, hem); c.closePath(); c.fill();
    c.beginPath(); c.roundRect(x - bw * 0.36, hem - 2, bw * 0.24, y - hem + 2, r); c.roundRect(x + bw * 0.12, hem - 2, bw * 0.24, y - hem + 2, r); c.fill();
  }
}

/** The radiation trefoil (radius R). */
function trefoil(c: CanvasRenderingContext2D, R: number, rot: number) {
  c.fillStyle = '#FFD23F'; c.beginPath(); c.arc(0, 0, R * 1.18, 0, TAU); c.fill();
  c.fillStyle = INK;
  for (let i = 0; i < 3; i++) { const a = rot + i * TAU / 3 - Math.PI / 2; c.beginPath(); c.arc(0, 0, R, a - Math.PI / 6, a + Math.PI / 6); c.arc(0, 0, R * 0.22, a + Math.PI / 6, a - Math.PI / 6, true); c.closePath(); c.fill(); }
  c.beginPath(); c.arc(0, 0, R * 0.14, 0, TAU); c.fill();
}

/** A glowing claw mark across the frame (three strokes), drawn over [t0, t0 + 0.5]. */
function claws(c: CanvasRenderingContext2D, t: number, t0: number, cx: number, cy: number, s: number, col = '#FFF4DC') {
  const a = t - t0; if (a < 0 || a > 0.55) return;
  const draw = ease.out(sat(a / 0.1), 3), fade = 1 - sat((a - 0.2) / 0.35);
  c.save(); c.translate(cx, cy); c.rotate(-0.42); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x0 = (i - 1) * 46 * s, len = 300 * s * draw;
    c.strokeStyle = alpha(col, 0.95 * fade); c.lineWidth = (9 - Math.abs(i - 1) * 2) * s; c.shadowColor = alpha('#FFB547', fade); c.shadowBlur = 18;
    c.beginPath(); c.moveTo(x0, -150 * s); c.quadraticCurveTo(x0 + 18 * s, -150 * s + len / 2, x0, -150 * s + len); c.stroke();
  }
  c.restore();
}

function hook(c: CanvasRenderingContext2D, t: number, q: Cap) {
  const out = ease.in(span(t, q.t1 - 0.1, q.t1), 2); if (out >= 1) return;
  c.save(); c.globalAlpha = 1 - out; c.translate(0, -60 * out);
  const [l1, l2, l3] = q.lines!;
  slab(c, l1![0], 430, t, l1![1], ax(66, 110, 900), '#FFFFFF');
  slab(c, l2![0], 516, t, l2![1], ax(58, 110, 900), A.lime, INK, 0.02);
  if (t >= l3![1]) { const a = sat((t - l3![1]) / 0.08), yy = 580 - 6 * (1 - ease.out(sat((t - l3![1]) / 0.1))); fillRR(c, CX - 70, yy - 16, 140, 24, 12, alpha(INK, 0.85 * a)); txt(c, 'BUILT WITH', CX, yy + 1, mono(14, 700), alpha('#FFFFFF', a), 4, 'center'); }
  slab(c, l3![0], 622, t, l3![1] + 0.04, ax(40, 112, 900), '#FFFFFF', '#D97757', -0.015);
  c.restore();
}

function nuke(c: CanvasRenderingContext2D, t: number, q: Cap) {
  const w = q.w!, bomb = w.bomb!, e = t - bomb;
  const out = ease.in(span(t, q.t1 - 0.25, q.t1), 2); c.save(); c.globalAlpha = 1 - out;
  if (t >= w.like! && e < 0) {   // "LIKE A" then NUCLEAR on its trefoil
    const k = spring(t - w.like!, 0.22, 0.55); stroked(c, t >= w.a! ? 'LIKE A' : 'LIKE', CX, 392 - 10 * (1 - k), ax(34, 125, 900), '#FFFFFF', 8, 6);
  }
  if (t >= w.nuclear! && e < 0) {
    const k = spring(t - w.nuclear!, 0.3, 0.6), R = 118 * k;
    c.save(); c.translate(CX, 530); c.rotate(0.05 * Math.sin((t - w.nuclear!) * 3)); trefoil(c, R, (t - w.nuclear!) * 1.4 + 0.3); c.restore();
    c.save(); c.translate(CX, 560); c.scale(1.3 - 0.3 * k, 1.3 - 0.3 * k);
    c.lineJoin = 'round'; c.font = ax(92, 75, 900); c.textAlign = 'center'; c.lineWidth = 12; c.strokeStyle = INK; c.strokeText('NUCLEAR', 0, 32);
    txt(c, 'NUCLEAR', 0, 32, ax(92, 75, 900), '#FFFFFF', 0, 'center'); c.restore();
  }
  if (e >= 0) {   // BOMB: the trefoil and the word blow apart, a shockwave, the word BOMB white-hot
    for (let i = 0; i < 7; i++) {   // NUCLEAR's letters as debris
      const a = hash(i, 11) * TAU, v = 520 + 600 * hash(i, 12), d = v * (1 - Math.exp(-e * 3)) / 3;
      const lx = CX + (i - 3) * 50 + Math.cos(a) * d, ly = 560 + Math.sin(a) * d - 60 * e, f = 1 - sat(e / 0.6);
      if (f <= 0) continue;
      c.save(); c.translate(lx, ly); c.rotate((hash(i, 13) - 0.5) * 8 * e); c.globalAlpha = f; txt(c, 'NUCLEAR'[i]!, 0, 30, ax(92, 75, 900), '#FFFFFF', 0, 'center'); c.restore();
    }
    for (let r = 0; r < 2; r++) {   // shockwaves
      const ee = e - r * 0.08; if (ee < 0 || ee > 0.8) continue;
      const rr = 40 + 900 * ease.out(ee / 0.8, 2.2); c.strokeStyle = alpha(r ? '#FFB547' : '#FFF6E0', 0.9 * (1 - ee / 0.8)); c.lineWidth = 26 * (1 - ee / 0.8) + 2;
      c.beginPath(); c.arc(CX, 540, rr, 0, TAU); c.stroke();
    }
    if (e < 0.35) {   // speed lines
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 28; i++) { const a = hash(i, 21) * TAU, r0 = 80 + 600 * ease.out(e / 0.35), r1 = r0 + 120 + 160 * hash(i, 22); c.strokeStyle = alpha('#FFE7B0', 0.6 * (1 - e / 0.35)); c.lineWidth = 3; c.beginPath(); c.moveTo(CX + Math.cos(a) * r0, 540 + Math.sin(a) * r0); c.lineTo(CX + Math.cos(a) * r1, 540 + Math.sin(a) * r1); c.stroke(); }
      c.restore();
    }
    const k = spring(e, 0.2, 0.45), sh = 10 * pulse(t, bomb, 0.12), dx = (hash(Math.round(t * 60), 1) - 0.5) * sh, dy = (hash(Math.round(t * 60), 2) - 0.5) * sh;
    c.save(); c.translate(CX + dx, 590 + dy); const s = (1.6 - 0.6 * k) * (1 + 0.06 * e);
    c.scale(s, s); c.shadowColor = '#FF7A1A'; c.shadowBlur = 40; txt(c, 'BOMB', 0, 52, ax(158, 62, 900), '#FFF6E0', 2, 'center'); c.restore();
    if (e < 0.14) { c.fillStyle = `rgba(255,248,230,${0.85 * (1 - e / 0.14)})`; c.fillRect(0, 0, FXW, FXH); }
  }
  c.restore();
}

function talk(c: CanvasRenderingContext2D, t: number, q: Cap) {
  const out = ease.in(span(t, q.t1 - 0.12, q.t1), 2); if (out >= 1) return;
  const tk = q.talks!.filter((v) => v <= t), last = tk[tk.length - 1]; if (last === undefined) return;
  c.save(); c.globalAlpha = 1 - out;
  // the speech bubble: TALK TO THE, popping on every "talk"
  const k = spring(t - last, 0.16, 0.45), s = 1.14 - 0.14 * k;
  c.save(); c.translate(CX, 214); c.scale(s, s);
  c.beginPath(); c.roundRect(-150, -34, 300, 62, 31); c.moveTo(-40, 27); c.lineTo(-62, 52); c.lineTo(-12, 27);
  c.fillStyle = 'rgba(10,12,16,0.94)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2.5; c.stroke();   // dark, white-edged: reads on white and on black
  txt(c, 'TALK TO THE', 0, 9, ax(30, 112, 900), '#FFFFFF', 2, 'center'); c.restore();
  // the noun and its people
  const nouns = q.nouns!.filter(([, v]) => v <= t), cur = nouns[nouns.length - 1];
  const COLS: Record<string, string> = { BOYS: A.teal, GIRLS: '#FF6F91', WOMAN: A.violet, MAN: A.amber };
  const group = (n: string): [boolean, number][] => (n === 'BOYS' ? [[false, 62], [false, 62], [false, 62]] : n === 'GIRLS' ? [[true, 62], [true, 62], [true, 62]] : n === 'WOMAN' ? [[true, 104]] : [[false, 104]]);
  if (q.crowd !== undefined && t >= q.crowd) {   // everyone together
    fillRR(c, 40, 350, 528, 108, 40, 'rgba(8,10,14,0.72)');
    const kk = spring(t - q.crowd, 0.25, 0.6), all: [boolean, number, string][] = [[false, 58, A.teal], [true, 58, '#FF6F91'], [false, 58, A.teal], [true, 80, A.violet], [false, 80, A.amber], [true, 58, '#FF6F91'], [false, 58, A.teal], [true, 58, '#FF6F91']];
    all.forEach(([f, h, col], i) => { const bounce = 6 * Math.abs(Math.sin((t - q.crowd!) * 9.95 + i)); figure(c, 84 + i * 63, 440 - bounce, h * (0.6 + 0.4 * kk), f, col); });
  } else if (cur) {
    const [n, tn] = cur, kk = spring(t - tn, 0.22, 0.55), col = COLS[n]!;
    c.save(); c.translate(CX, 318); c.scale(1.2 - 0.2 * kk, 1.2 - 0.2 * kk); stroked(c, n, 0, 26, ax(74, 100, 900), '#FFFFFF', 12, 3); c.fillStyle = col; c.fillRect(-60, 40, 120, 6); c.restore();
    const g = group(n), gw = g.length * 72 + 40;
    if (t >= tn) fillRR(c, CX - gw / 2 * kk, 360, gw * kk, 124, 30, 'rgba(8,10,14,0.72)');
    g.forEach(([f, h], i) => { const ki = spring(t - tn - i * 0.05, 0.2, 0.5); if (t < tn + i * 0.05) return; const xx = CX + (i - (g.length - 1) / 2) * 72; c.save(); c.translate(xx, 470); c.scale(ki, ki); figure(c, 0, 0, h, f, col); c.restore(); });
  }
  c.restore();
}

function computer(c: CanvasRenderingContext2D, t: number, q: Cap) {
  const w = q.w!, out = ease.in(span(t, q.t1 - 0.12, q.t1), 2); if (t < q.t0 || out >= 1) return;
  const k = spring(t - q.t0, 0.22, 0.6);
  c.save(); c.globalAlpha = (1 - out) * sat((t - q.t0) / 0.06); c.translate(0, 18 * (1 - k));
  fillRR(c, 34, 168, 540, 214, 14, 'rgba(9,12,17,0.94)'); c.strokeStyle = alpha(A.teal, 0.5); c.lineWidth = 1.5; c.beginPath(); c.roundRect(34.5, 168.5, 539, 213, 14); c.stroke();
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(58 + i * 20, 190, 6, 0, TAU); c.fill(); });
  txt(c, 'terminal', CX, 195, mono(12, 600), A.dim, 1, 'center');
  const typed = (s: string, t0: number, cps: number) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
  txt(c, '> ' + typed('talk to the', w.talk!, 40), 56, 236, mono(20, 600), A.teal, 0.5, 'left');
  if (t >= w.computer!) txt(c, typed('COMPUTER', w.computer!, 70), 56, 300, mono(56, 800), '#FFFFFF', 1, 'left');
  if (t >= w.tongue!) {
    const G = '01<>{}/#$%&*+=?';
    const s = 'TONGUE'.split('').map((ch, i) => (t - w.tongue! > 0.05 + i * 0.035 ? ch : G[Math.floor(hash(i, Math.floor(t * 40)) * G.length)]!)).join('');
    txt(c, s, 56, 362, mono(56, 800), A.lime, 1, 'left');
  }
  c.font = mono(56, 800); const cx_ = t >= w.tongue! ? 56 + c.measureText('TONGUE').width + 8 : t >= w.computer! ? 56 + c.measureText(typed('COMPUTER', w.computer!, 70)).width + 8 : 0;
  if (cx_ && Math.floor(t * 4) % 2 === 0) { c.fillStyle = A.teal; c.fillRect(cx_, t >= w.tongue! ? 318 : 256, 26, 50); }
  c.restore();
}

function lion(c: CanvasRenderingContext2D, t: number, q: Cap) {
  const w = q.w!, out = ease.in(span(t, q.t1 - 0.15, q.t1), 2); if (t < q.t0 || out >= 1) return;
  c.save(); c.globalAlpha = 1 - out;
  if (t >= w.go!) { const k = spring(t - w.go!, 0.2, 0.55); fillRR(c, CX - 120, 186, 240, 40, 20, 'rgba(9,12,17,0.82)'); txt(c, 'GO TELL THEM…', CX, 213 - 6 * (1 - k), mono(17, 700), '#FFFFFF', 3, 'center'); }
  if (t >= w.tougher!) {
    const k = spring(t - w.tougher!, 0.2, 0.5), sp = 8 * ease.out(sat((t - w.tougher!) / 0.12));
    c.save(); c.translate(CX, 318); c.scale(1.3 - 0.3 * k, 1.3 - 0.3 * k); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 14;
    c.save(); c.beginPath(); c.rect(-300, -80, 600, 80); c.clip(); txt(c, 'TOUGHER', -sp, 32, ax(96, 85, 900), A.gold, 2, 'center'); c.restore();
    c.save(); c.beginPath(); c.rect(-300, 0, 600, 80); c.clip(); txt(c, 'TOUGHER', sp, 32, ax(96, 85, 900), A.gold, 2, 'center'); c.restore();   // the slash splits the word
    c.restore();
  }
  claws(c, t, w.tougher!, CX + 20, 330, 0.8);
  if (t >= w.than!) { const k = spring(t - w.than!, 0.2, 0.55); txt(c, 'THAN A', CX, 420 - 8 * (1 - k), ax(40, 125, 900), '#FFFFFF', 6, 'center'); }
  if (t >= w.lion!) {
    const k = spring(t - w.lion!, 0.22, 0.5), sh = 9 * Math.exp(-(t - w.lion!) / 0.25), dx = (hash(Math.round(t * 60), 5) - 0.5) * sh;
    c.save(); c.translate(CX + dx, 520); c.scale(1.35 - 0.35 * k, 1.35 - 0.35 * k); c.shadowColor = alpha(A.amber, 0.8); c.shadowBlur = 30; txt(c, 'LION', 0, 46, ax(140, 75, 900), A.gold, 3, 'center'); c.restore();
  }
  claws(c, t, w.lion!, CX - 10, 560, 1.15);
  c.restore();
}

function sound(c: CanvasRenderingContext2D, t: number, q: Cap, au: AudioData) {
  const w = q.w!, out = ease.in(span(t, q.t1 - 0.12, q.t1), 2); if (t < q.t0 || out >= 1) return;
  c.save(); c.globalAlpha = 1 - out;
  const word = (s: string, t0: number, y: number) => {
    if (t < t0) return; c.font = ax(92, 100, 900); const W = c.measureText(s).width; let xx = CX - W / 2;
    s.split('').forEach((ch, i) => {
      const cw = c.measureText(ch).width, band = ['low', 'mid', 'high'][i % 3]!, v = au.env(band, t - i * 0.018), ki = spring(t - t0 - i * 0.03, 0.18, 0.5);
      const col = v > 0.8 ? '#FF5A5F' : v > 0.55 ? '#FFD23F' : '#43D58A';
      c.save(); c.translate(xx + cw / 2, y); c.scale(1, Math.max(0.05, ki) * (0.72 + 0.5 * v)); txt(c, ch, 0, 0, ax(92, 100, 900), col, 0, 'center'); c.restore(); xx += cw;
    });
  };
  word('SOUND', w.sound!, 330); word('TEST', w.test!, 430);
  if (t >= w.sound!) {   // the level meter and the test-tone trace
    const v = au.env('rms', t); for (let i = 0; i < 24; i++) { const on = i / 24 < v; c.fillStyle = on ? (i > 19 ? '#FF5A5F' : i > 14 ? '#FFD23F' : '#43D58A') : 'rgba(255,255,255,0.12)'; c.fillRect(64 + i * 20.5, 470, 16, 10); }
    c.strokeStyle = alpha('#FFFFFF', 0.85); c.lineWidth = 2.5; c.beginPath();
    for (let i = 0; i <= 120; i++) { const xx = 64 + i * 4, yy = 512 + Math.sin(i * 0.42 + t * 40) * 16 * au.env('high', t - i * 0.004); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
  }
  c.restore();
}

function under(c: CanvasRenderingContext2D, t: number, q: Cap) {
  const w = q.w!, [g0, g1] = q.gap!; if (t < q.t0 || t > q.t1) return;
  const back = t >= g1, sp = t - g1, WL = 470;
  c.save(); c.globalAlpha = back ? 1 - sat(sp / 0.25) : sat((t - g0) / 0.08);
  // the water line
  c.strokeStyle = alpha('#BFF4FF', 0.9); c.lineWidth = 3; c.beginPath();
  for (let i = 0; i <= 60; i++) { const xx = 30 + i * 9.13, yy = WL + 5 * Math.sin(i * 0.5 + t * 7) + (back ? -40 * Math.sin(i * 0.9) * Math.exp(-sp / 0.08) : 0); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke();
  if (t >= w.going!) { const k = spring(t - w.going!, 0.2, 0.55); txt(c, 'GOING', CX, WL - 22 - 10 * (1 - k), ax(76, 100, 900), '#FFFFFF', 3, 'center'); }
  if (t >= w.under!) {
    const sink = 30 + 190 * ease.in(sat((t - w.under!) / 0.5), 1.6), y = WL - 10 + sink;
    c.save(); c.beginPath(); c.rect(0, 0, FXW, WL); c.clip(); txt(c, 'UNDER', CX, y, ax(96, 100, 900), '#FFFFFF', 3, 'center'); c.restore();
    c.save(); c.beginPath(); c.rect(0, WL, FXW, FXH - WL); c.clip();
    for (let row = 0; row < 12; row++) {   // under the line: tinted, rippling in strips
      const y0 = WL + row * 18; c.save(); c.beginPath(); c.rect(0, y0, FXW, 18); c.clip();
      txt(c, 'UNDER', CX + 7 * Math.sin(row * 0.9 + t * 9), y, ax(96, 100, 900), alpha('#8FE6FF', 0.85 - row * 0.04), 3, 'center'); c.restore();
    }
    c.restore();
    for (let i = 0; i < 14; i++) {   // bubbles
      const bt = w.under! + hash(i, 31) * 0.35, a = t - bt; if (a < 0) continue;
      const bx = CX - 160 + 320 * hash(i, 32) + 8 * Math.sin(a * 9 + i), by = y + 30 - a * 260; if (by < WL) continue;
      c.strokeStyle = alpha('#DFFAFF', 0.8); c.lineWidth = 1.5; c.beginPath(); c.arc(bx, by, 3 + 5 * hash(i, 33), 0, TAU); c.stroke();
    }
  }
  if (back) for (let i = 0; i < 26; i++) {   // the splash as the bass comes back
    const a = hash(i, 41) * Math.PI, v = 600 + 500 * hash(i, 42), xx = CX + Math.cos(a) * v * sp, yy = WL - Math.sin(a) * v * sp + 1400 * sp * sp;
    c.fillStyle = alpha('#DFFAFF', 1 - sat(sp / 0.25)); c.beginPath(); c.arc(xx, yy, 3 + 3 * hash(i, 43), 0, TAU); c.fill();
  }
  c.restore();
}

function one(c: CanvasRenderingContext2D, t: number, q: Cap) {
  const w = q.w!; if (t < w.number! || t >= q.t1) return;
  const e = t - w.number!, k = spring(e, 0.24, 0.55);
  c.save();
  c.save(); c.translate(CX, 640); c.rotate(e * 0.4); c.globalCompositeOperation = 'lighter';   // rays
  for (let i = 0; i < 16; i++) { c.fillStyle = alpha(A.gold, 0.12 * k); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 520, i * TAU / 16, i * TAU / 16 + 0.12); c.closePath(); c.fill(); }
  c.restore();
  txt(c, 'NUMBER', CX, 352 - 10 * (1 - k), ax(46, 125, 900), A.gold, 10, 'center');
  c.save(); c.translate(CX, 640); c.scale(1.4 - 0.4 * k, 1.4 - 0.4 * k);
  const g = c.createLinearGradient(0, -200, 0, 120); g.addColorStop(0, '#FFF1B8'); g.addColorStop(0.5, '#F2C66D'); g.addColorStop(1, '#B8761F');
  c.font = ax(330, 90, 900); c.textAlign = 'center'; c.fillStyle = g; c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.fillText('1', 0, 118);
  c.shadowBlur = 0; c.save(); c.beginPath(); c.rect(-140, -230, 280, 360); c.clip();   // the glint
  const gx = -260 + 520 * sat(e / 0.35); const gg = c.createLinearGradient(gx - 40, 0, gx + 40, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = gg; c.fillRect(-140, -230, 280, 360); c.restore();
  c.restore(); c.restore();
}

/** All captions at t. */
export function drawCaptions(c: CanvasRenderingContext2D, t: number, caps: Cap[], au: AudioData) {
  for (const q of caps) {
    if (t < q.t0 - 0.01 || t > q.t1 + 0.6) continue;
    if (q.kind === 'hook') hook(c, t, q); else if (q.kind === 'nuke') nuke(c, t, q); else if (q.kind === 'talk') talk(c, t, q);
    else if (q.kind === 'computer') computer(c, t, q); else if (q.kind === 'lion') lion(c, t, q); else if (q.kind === 'sound') sound(c, t, q, au);
    else if (q.kind === 'under') under(c, t, q); else if (q.kind === 'one') one(c, t, q);
  }
}

/** Which render is on screen: a 9-step progress line and a tag, slid in on each cut. */
export function drawInfo(c: CanvasRenderingContext2D, t: number, labels: Label[]) {
  const L = labels.find((l) => t >= l.a && t < l.b); if (!L) return;
  const k = ease.out(sat((t - L.a) / 0.14), 3);
  for (let i = 0; i < 9; i++) { c.fillStyle = i < L.n ? 'rgba(255,255,255,0.75)' : i === L.n ? L.col : 'rgba(255,255,255,0.22)'; fillRR(c, 28 + i * 31, 132, 26, 3, 1.5, c.fillStyle as string); }
  c.save(); c.translate(-30 * (1 - k), 0); c.globalAlpha = k;
  const s = `${L.key} · ${L.name}`; c.font = mono(12, 700); const tw = c.measureText(s).width + 26;
  fillRR(c, 28, 144, tw, 26, 13, 'rgba(8,10,14,0.62)'); c.fillStyle = L.col; c.beginPath(); c.arc(41, 157, 3.5, 0, TAU); c.fill();
  txt(c, s, 51, 161, mono(12, 700), '#FFFFFF', 1.5, 'left'); c.restore();
}

// ---------------------------------------------------------------- V4.1: the prompt card ("empty hand -> camera" as PROMPT -> VIDEO)
export interface PromptCard { n: number; of?: number; text: string; t0: number; t1: number }
/** The real Claude Code input box from the user's VS Code (user_9.png, cleaned of its old text and attachments as V2 did):
 *  its source rectangle, where the text starts, the send button. */
export const VSBOX = { sx: 912, sy: 826, sw: 1382, sh: 408, clear: [927, 841, 1352, 305] as const, tx: 958, ty: 922, lh: 66, tw: 1240, send: [2244, 1187] as const };
const VS_UI = '"Segoe UI", "Segoe UI Variable", system-ui, sans-serif';
/** Crop the input box out of the screenshot and clear it (call once). */
export function makeVsBox(img: HTMLImageElement): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = VSBOX.sw; cv.height = VSBOX.sh; const g = cv.getContext('2d')!;
  g.drawImage(img, VSBOX.sx, VSBOX.sy, VSBOX.sw, VSBOX.sh, 0, 0, VSBOX.sw, VSBOX.sh);
  const [x, y, w, h] = VSBOX.clear; g.fillStyle = '#000'; g.fillRect(x - VSBOX.sx, y - VSBOX.sy, w, h);
  return cv;
}
/** The prompt beat: the user's VS Code input box, in the same place every time, the prompt typing in (a real prompt), the send
 *  button pressed on the beat before the video. Drawn over the coming render, out of focus. */
export function drawPrompt(c: CanvasRenderingContext2D, t: number, p: PromptCard, box: HTMLCanvasElement | null) {
  const W = 568, s = W / VSBOX.sw, H = VSBOX.sh * s, x0 = CX - W / 2, y0 = FXH * 0.5 - H / 2 + 20;
  const k = sat((t - p.t0) / 0.08), sc = 1.03 - 0.03 * ease.out(k, 3);
  c.save(); c.translate(CX, FXH * 0.5); c.scale(sc, sc); c.translate(-CX, -FXH * 0.5);
  txt(c, `PROMPT ${String(p.n).padStart(2, '0')} / ${String(p.of ?? 11).padStart(2, '0')}`, x0 + 4, y0 - 14, mono(13, 700), A.teal, 2, 'left');
  txt(c, 'VS CODE · CLAUDE CODE', x0 + W - 4, y0 - 14, mono(11, 600), 'rgba(255,255,255,0.55)', 1.5, 'right');
  c.save(); c.shadowColor = alpha(A.teal, 0.35); c.shadowBlur = 36; fillRR(c, x0, y0, W, H, 10, '#000'); c.restore();
  c.save(); c.translate(x0, y0); c.scale(s, s);
  if (box) c.drawImage(box, 0, 0);
  else { fillRR(c, 4, 4, VSBOX.sw - 8, VSBOX.sh - 8, 30, '#000'); c.strokeStyle = '#6FC3DF'; c.lineWidth = 3; c.beginPath(); c.roundRect(14, 14, VSBOX.sw - 28, VSBOX.sh - 28, 28); c.stroke(); }
  c.translate(-VSBOX.sx, -VSBOX.sy);
  // the prompt types in over the first 0.24 s of the beat (52 px Segoe UI, as VS Code draws it, wrapped to the box)
  const f = `400 52px ${VS_UI}`; c.font = f; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; (c as any).letterSpacing = '0px';
  const lines: string[] = []; let line = '';
  for (const w of p.text.split(' ')) { const tt = line ? line + ' ' + w : w; if (c.measureText(tt).width > VSBOX.tw && line) { lines.push(line); line = w; } else line = tt; }
  if (line) lines.push(line);
  const total = p.text.length, n = Math.round(total * sat((t - p.t0 - 0.03) / 0.24));
  let left = n, cx = VSBOX.tx, cy = VSBOX.ty;
  if (n === 0) { c.fillStyle = '#7A7A7A'; c.fillText('Queue another message…', VSBOX.tx, VSBOX.ty); }
  lines.forEach((l, i) => {
    if (left <= 0) return; const ss = l.slice(0, left); const y = VSBOX.ty + i * VSBOX.lh;
    c.fillStyle = '#F2F2F2'; c.fillText(ss, VSBOX.tx, y); cx = VSBOX.tx + c.measureText(ss).width + 4; cy = y; left -= l.length + 1;
  });
  if (((t - p.t0) * 7) % 1 < 0.62 || n < total) { c.fillStyle = '#FFFFFF'; c.fillRect(cx, cy - 44, 3, 58); }
  // the send button: a ring on the beat before the video
  const sk = t >= p.t1 - 0.1 ? 1 - sat((t - (p.t1 - 0.1)) / 0.1) : 0;
  if (t >= p.t1 - 0.1) { c.save(); c.globalAlpha = 0.4 + 0.6 * sk; c.strokeStyle = '#FF8A65'; c.lineWidth = 7; c.beginPath(); c.arc(VSBOX.send[0], VSBOX.send[1], 34 + 60 * (1 - sk), 0, Math.PI * 2); c.stroke(); c.restore(); }
  c.restore(); c.restore();
}
