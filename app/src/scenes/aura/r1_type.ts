// Render 01: kinetic typography + a music machine (an original piece; the brief cites @adrianduta96's Motion Graphics Music
// Machine as inspiration only). Clean white and black. Bar 1: a word on every beat (TYPE / BECOMES / MOTION / LAYERS). Bar 2:
// the letters break into tiles that become a machine; a ball strikes a tile on every eighth where the song has a kick or a
// snare (data/aura/audio.json onsets, within 45 ms of the grid), so every impact is a real musical hit. Bar 3: the finished
// composition, "WORDS → MOTION", and the last letter becomes the text cursor of the next shot.
import { V2HY, LOOK, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, statement, ax, txt, fillRR, sat, span } from './common';
import { spring } from '../_vo';

const INK = '#0B0B0C', PAPER = '#F3F2EE';
export const R1_CURSOR = { x: 70, y: 742 };   // where the cursor ends: the Claude Code input's caret in the next shot

export function r1World(): World {
  let x!: AuraCtx; let b0 = 0, bar = 0, e8 = 0; let hits: number[] = [];
  const tiles = 'MOTION!!'.split('');
  // the machine: 8 tiles on a zigzag, top to bottom (logical px of the 608 x 1080 column; the camera pans down it)
  const pos = (k: number) => ({ x: k % 2 ? 420 : 188, y: 250 + k * 190 });
  return {
    init(ctx) {
      x = ctx; b0 = x.ev('r1.in'); bar = x.cues.bar; e8 = x.cues.eighth;
      const on = [...(x.audio.onsets.kick ?? []), ...(x.audio.onsets.snare ?? [])].map(([t]) => t);
      const m0 = b0 + bar;   // bar 2 of the render
      hits = [];
      for (let k = 0; k < 8; k++) { const g = m0 + k * e8; if (on.some((o) => Math.abs(o - g) < 0.045)) hits.push(g); }
      if (hits.length < 6) hits = Array.from({ length: 8 }, (_, k) => m0 + k * e8);   // the grid itself if the onsets are sparse
    },
    draw(c, t, p) {
      const beat = bar / 4, lt = t - b0;
      c.fillStyle = PAPER; c.fillRect(0, 0, FXW, FXH);
      this.marks(c, t, p);
      const flash = pulse(t, b0, 0.05);
      if (lt < bar) this.bar1(c, t, lt, beat); else if (lt < 2 * bar) this.bar2(c, t, lt - bar); else this.bar3(c, t, lt - 2 * bar);
      if (flash > 0.02) { c.fillStyle = `rgba(0,0,0,${0.9 * flash})`; c.fillRect(0, 0, FXW, FXH); }
    },
    // ---- bar 1: a word on every beat
    bar1(c: CanvasRenderingContext2D, t: number, lt: number, beat: number) {
      const q = Math.min(3, Math.floor(lt / beat)), qt = lt - q * beat;
      if (q === 0) {   // TYPE slams in on a spring
        const s = 1 + 2.2 * (1 - spring(qt, 0.32, 0.5));
        c.save(); c.translate(CX, 560); c.scale(s, s); txt(c, 'TYPE', 0, 0, ax(150, 125, 900), INK, -2, 'center'); c.restore();
      } else if (q === 1) {   // it splits: top half slides left, bottom right; BECOMES in the gap
        const k = ease.out(span(qt, 0, 0.35), 4), d = 130 * k;
        for (const [y0, y1, dx] of [[380, 520, -d], [520, 640, d]] as const) {
          c.save(); c.beginPath(); c.rect(0, y0, FXW, y1 - y0); c.clip(); c.translate(dx, 0);
          txt(c, 'TYPE', CX, 560, ax(150, 125, 900), INK, -2, 'center'); c.restore();
        }
        c.save(); c.globalAlpha = k; c.beginPath(); c.rect(CX - d * 2.2, 486, 4.4 * d, 72); c.clip();
        txt(c, 'BECOMES', CX, 548, ax(52, 125, 900), INK, 4, 'center'); c.restore();
      } else if (q === 2) {   // MOTION: each letter drops in, a sixteenth apart, and bounces
        const L = 'MOTION'; c.font = ax(108, 100, 900); const w = c.measureText(L).width; let xx = CX - w / 2;
        for (let i = 0; i < L.length; i++) {
          const d = qt - i * beat / 8, k = d <= 0 ? 0 : spring(d, 0.34, 0.42), y = 600 - (1 - k) * 700;
          const lw = c.measureText(L[i]!).width; if (d > 0) txt(c, L[i]!, xx, y, ax(108, 100, 900), INK, 0, 'left'); xx += lw;
        }
      } else {   // LAYERS: an echo stack expanding toward the viewer
        const k = ease.out(span(qt, 0, beat), 3);
        for (let i = 7; i >= 0; i--) {
          const s = 0.62 + 0.36 * k + i * 0.035 * k, y = 520 + i * 40 * k;
          c.save(); c.translate(CX, y); c.scale(s, s); c.font = ax(88, 125, 900); c.textAlign = 'center';
          if (i === 0) { c.fillStyle = INK; c.fillText('LAYERS', 0, 0); }
          else { c.lineWidth = 2.2 / s; c.strokeStyle = INK; c.strokeText('LAYERS', 0, 0); }
          c.restore();
        }
      }
      // the beat ticks along the bottom (the piece keeps time with the song)
      for (let i = 0; i < 4; i++) fillRR(c, CX - 66 + i * 36, 980, 24, 6, 3, i <= q ? INK : '#C9C8C2');
    },
    // ---- bar 2: the machine; the ball strikes a tile on every hit
    bar2(c: CanvasRenderingContext2D, t: number, lt: number) {
      const n = hits.length, first = hits[0]!;
      // the ball: parabolic hops between hit points (it falls in from above before the first)
      let bx = pos(0).x, by = -80, k = 0;
      if (t < first) { const s = sat((t - (first - e8)) / e8); bx = pos(0).x; by = lerp(-80, pos(0).y - 64, s * s); }
      else {
        k = Math.min(n - 1, hits.filter((h) => h <= t).length - 1);
        const h0 = hits[k]!, h1 = hits[k + 1] ?? h0 + e8, s = sat((t - h0) / (h1 - h0));
        const p0 = pos(k), p1 = pos(Math.min(k + 1, 7));
        bx = lerp(p0.x, p1.x, s); by = lerp(p0.y - 64, p1.y - 64, s) - 120 * 4 * s * (1 - s);
      }
      const cam = Math.max(0, Math.min(1080, by - 420));   // the camera follows the ball down the machine
      c.save(); c.translate(0, -cam);
      // the track: thin rails between the tiles
      c.strokeStyle = '#BDBBB3'; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i < 8; i++) { const p = pos(i); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); } c.stroke();
      tiles.forEach((L, i) => {
        const p = pos(i), hit = hits[i] ?? Infinity, h = pulse(t, hit, 0.07), sq = 1 - 0.18 * h;
        c.save(); c.translate(p.x, p.y); c.scale(1 + 0.12 * h, sq);
        fillRR(c, -62, -54, 124, 108, 14, h > 0.05 ? INK : '#FFFFFF');
        c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.roundRect(-62, -54, 124, 108, 14); c.stroke();
        txt(c, L, 0, 30, ax(78, 100, 900), h > 0.05 ? PAPER : INK, 0, 'center'); c.restore();
        if (t >= hit && t < hit + 0.5) {   // the ring and sparks on the strike
          const r = (t - hit) / 0.5;
          c.strokeStyle = `rgba(11,11,12,${1 - r})`; c.lineWidth = 3 * (1 - r); c.beginPath(); c.arc(p.x, p.y - 54, 30 + 120 * ease.out(r, 2), 0, Math.PI * 2); c.stroke();
          for (let s = 0; s < 8; s++) {
            const a = (s / 8) * Math.PI * 2 + i, d = 40 + 90 * ease.out(r, 2);
            c.fillStyle = `rgba(11,11,12,${1 - r})`; c.fillRect(p.x + Math.cos(a) * d - 3, p.y - 54 + Math.sin(a) * d * 0.6 - 3, 6, 6);
          }
        }
      });
      c.beginPath(); c.arc(bx, by, 26, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
      c.restore();
      if (!LOOK.clean) txt(c, `HIT ${Math.max(0, k + (t >= first ? 1 : 0))}/${n}`, 32, 1010, ax(13, 100, 700), INK, 2, 'left');
    },
    // ---- bar 3: the tiles snap into one row (MOTION), the ball becomes its full stop, the statement, then N -> the cursor
    bar3(c: CanvasRenderingContext2D, t: number, lt: number) {
      const row = 'MOTION', tw = 80, gap = 8, x0 = CX - (row.length * (tw + gap) - gap) / 2 + tw / 2, y = 470;
      const cur = x.ev('r1.cursor'), m = ease.inOut(span(t, cur, x.ev('rt1.in')), 3);
      for (let i = 0; i < 8; i++) {
        const from = pos(i), d = lt - i * 0.035, k = d <= 0 ? 0 : spring(d, 0.42, 0.62);
        const fx = from.x, fy = from.y - 420;                                  // where the camera left them
        if (i >= 6) {                                                           // the two "!" fly off the top
          const yy = lerp(fy, -200, ease.in(sat(d / 0.4), 2)); if (yy < -150) continue;
          c.save(); c.translate(fx, yy); fillRR(c, -40, -36, 80, 72, 12, INK); txt(c, '!', 0, 22, ax(54, 100, 900), PAPER, 0, 'center'); c.restore(); continue;
        }
        let X = lerp(fx, x0 + i * (tw + gap), k), Y = lerp(fy, y, k), S = lerp(1, tw / 124, k);
        if (i === 5 && m > 0) {                                                 // N shrinks into the caret and travels to it
          X = lerp(X, R1_CURSOR.x, m); Y = lerp(Y, R1_CURSOR.y - 12, m);
          const on = Math.floor((t - cur) / 0.16) % 2 === 0 || m > 0.55;
          c.save(); c.translate(X, Y);
          if (m < 0.35) { const q = 1 - m / 0.35; c.scale(S * lerp(0.05, 1, q), S); fillRR(c, -62, -54, 124, 108, 14, INK); }
          else if (on) { c.fillStyle = INK; c.fillRect(-2, -14, lerp(10, 3, m), 28); }
          c.restore(); continue;
        }
        c.save(); c.translate(X, Y); c.scale(S, S); fillRR(c, -62, -54, 124, 108, 14, INK);
        txt(c, row[i]!, 0, 30, ax(78, 100, 900), PAPER, 0, 'center'); c.restore();
      }
      const dot = spring(lt - 0.3, 0.4, 0.5);                                     // the ball lands as the full stop
      c.beginPath(); c.arc(lerp(CX, x0 + 6 * (tw + gap) - 18, dot), lerp(-60, y + 26, dot), 14, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
      statement(c, 'WORDS → MOTION', t, x.ev('r1.title') + 2 * e8, 640, INK, INK);   // two eighths after the row lands
    },
    /** Motion-design furniture: crop marks, a faint baseline grid, the live grid readout. */
    marks(c: CanvasRenderingContext2D, t: number, p?: Record<string, any>) {
      c.strokeStyle = '#D4D2CB'; c.lineWidth = 1;
      for (let yy = 120; yy < FXH; yy += 60) { c.beginPath(); c.moveTo(24, yy); c.lineTo(FXW - 24, yy); c.stroke(); }
      c.strokeStyle = INK; c.lineWidth = 1.5;
      for (const [cx_, cy_, sx, sy] of [[24, 96, 1, 1], [FXW - 24, 96, -1, 1], [24, FXH - 60, 1, -1], [FXW - 24, FXH - 60, -1, -1]] as const) {
        c.beginPath(); c.moveTo(cx_, cy_ + sy * 22); c.lineTo(cx_, cy_); c.lineTo(cx_ + sx * 22, cy_); c.stroke();
      }
      const b = Math.floor(t / bar + 1e-6), e = Math.floor((t - b * bar) / e8 + 1e-6) + 1;
      if (!LOOK.clean) { c.save(); if (p?.v2) c.translate(0, V2HY);   // V2: the prompt card sits above the HUD; V4 (clean): no HUD
      txt(c, 'R01 · KINETIC TYPE', 32, 84, ax(13, 100, 700), INK, 2, 'left');
      txt(c, `95 BPM · BAR ${String(b + 1).padStart(2, '0')} · ${e}/8`, FXW - 32, 84, ax(13, 100, 700), INK, 2, 'right');
      c.restore(); }
    },
  } as World & Record<string, any>;
}
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
