// V2 outro (42.95 s to the song's own fade, about 8.6 s): everything important stays on screen. "I DON'T JUST EDIT VIDEOS." is
// held while "I BUILD THEM." slams on the final bar line; a beat later the end card (the channel's logo, BUILT WITH CLAUDE OPUS
// 5.5 · TECHPE TREK); on the next bar the six renders land in a 3x2 grid, one per eighth (real stills of the renders,
// analysis/aura_thumbs.py), each pulsing on the beat; then a slow push and the fade with the song.
import { A, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, mono, txt, ax, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';

const NAMES = ['TYPE', 'PRODUCT UI', 'SHADER', 'CHROME', 'VOLCANO', 'PIT STOP'];
const COLS = ['#C8F31D', A.teal, A.violet, A.blue, A.amber, '#FF5A5F'];
export interface Tile { key: string; name: string; col: string }
const SIX: Tile[] = NAMES.map((name, i) => ({ key: `r${i + 1}`, name, col: COLS[i]! }));

/** `tiles`: the renders in the grid (V2/V3: the six, 3x2). V4 passes nine: the same outro on a 3x3 grid of smaller tiles. */
export function outroV2World(ev: Record<string, number>, tiles: Tile[] = SIX): World {
  let x!: AuraCtx; let beat = 0;
  return {
    init(ctx) { x = ctx; beat = x.cues.beat; },
    draw(c, t) {
      const t0 = ev['o.slam']!, card = ev['o.card']!, push = ev['o.push']!, fade = ev['o.fade']!, end = ev['o.end']!;
      c.fillStyle = '#040508'; c.fillRect(0, 0, FXW, FXH);
      // a slow aurora behind (pure function of t)
      for (const [cx, cy, r, col, sp] of [[150, 300, 520, '63,214,224', 0.3], [470, 700, 560, '155,123,255', -0.25], [320, 980, 480, '255,181,71', 0.2]] as [number, number, number, string, number][]) {
        const g = c.createRadialGradient(cx + 60 * Math.sin(t * sp), cy + 40 * Math.cos(t * sp * 1.3), 10, cx, cy, r);
        g.addColorStop(0, `rgba(${col},0.16)`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
      }
      const pz = 1 + 0.045 * ease.inOut(span(t, push, end), 2);
      c.save(); c.translate(CX, 470); c.scale(pz, pz); c.translate(-CX, -470);
      txt(c, 'I DON’T JUST EDIT VIDEOS.', CX, 150, ax(30, 125, 900), alpha(A.text, 0.78), 1.5, 'center');
      const k = spring(t - t0, 0.26, 0.5);
      c.save(); c.translate(CX, 226); c.scale(1.45 - 0.45 * k, 1.45 - 0.45 * k); txt(c, 'I BUILD THEM.', 0, 0, ax(54, 125, 900), A.teal, 1, 'center'); c.restore();
      // the renders
      const nine = tiles.length > 6, tw = nine ? 86 : 112, th = nine ? 153 : 199, gx = 16, ry = nine ? 172 : th + 34, x0 = CX - (3 * tw + 2 * gx) / 2, y0 = 254;
      for (let i = 0; i < tiles.length; i++) {
        const tt = ev[`o.tile${i}`]!; if (t < tt) continue;
        const kk = spring(t - tt, 0.24, 0.55), col = i % 3, row = Math.floor(i / 3), xx = x0 + col * (tw + gx), yy = y0 + row * ry, T = tiles[i]!;
        const im = x.thumbs[T.key], beatPulse = pulse(t, tt + Math.floor((t - tt) / beat) * beat, 0.12) * (t > tt + beat ? 1 : 0);
        c.save(); c.translate(xx + tw / 2, yy + th / 2); c.scale(0.6 + 0.4 * kk, 0.6 + 0.4 * kk); c.globalAlpha = sat((t - tt) / 0.08);
        c.beginPath(); c.roundRect(-tw / 2, -th / 2, tw, th, 10); c.save(); c.clip();
        if (im) { const z = 1.06 + 0.04 * Math.sin((t - tt) * 0.8 + i); c.drawImage(im, -tw / 2 * z, -th / 2 * z, tw * z, th * z); } else { c.fillStyle = A.panel; c.fill(); }
        c.restore();
        c.strokeStyle = alpha(T.col, 0.55 + 0.45 * beatPulse); c.lineWidth = 2; c.beginPath(); c.roundRect(-tw / 2, -th / 2, tw, th, 10); c.stroke();
        txt(c, `${T.key.toUpperCase().replace('R', 'R0')} · ${T.name}`, -tw / 2, th / 2 + 18, mono(nine ? 9 : 10, 700), T.col, 1, 'left');
        c.restore();
      }
      // the end card
      if (t >= card) {
        const kk = ease.out(sat((t - card) / 0.3), 3), cy = nine ? 778 : 722, ls = nine ? 52 : 72;
        c.save(); c.globalAlpha = kk;
        if (x.logo) { c.save(); c.beginPath(); c.roundRect(CX - ls / 2, cy + (1 - kk) * 14, ls, ls, 14); c.clip(); c.drawImage(x.logo, CX - ls / 2, cy + (1 - kk) * 14, ls, ls); c.restore(); }
        txt(c, 'BUILT WITH CLAUDE OPUS 5.5', CX, cy + ls + 28, mono(15, 700), A.text, 3, 'center');
        txt(c, 'TECHPE TREK', CX, cy + ls + 50, mono(13, 700), A.lime, 4, 'center');
        c.restore();
      }
      c.restore();
      const fl = pulse(t, t0, 0.07); if (fl > 0.02) { c.fillStyle = `rgba(255,255,255,${0.75 * fl})`; c.fillRect(0, 0, FXW, FXH); }
      const f = span(t, fade, end); if (f > 0) { c.fillStyle = `rgba(0,0,0,${ease.in(f, 1.6)})`; c.fillRect(0, 0, FXW, FXH); }
    },
  };
}
