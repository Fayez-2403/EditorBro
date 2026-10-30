// The end (88.42-90 s): the final slam on the bar line. "I DON'T JUST EDIT VIDEOS." (from the bass dropout) sits above,
// "I BUILD THEM." slams in, a beat later the end card: the channel's logo and BUILT WITH CLAUDE OPUS 5.5 · TECHPE TREK.
// fin.black (beat 3, the bass dropout) cuts to black to the end.
import { A, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, mono, txt, ax, alpha, sat } from './common';
import { spring } from '../_vo';

export function endWorld(): World {
  let x!: AuraCtx; let t0 = 0, blk = 0, beat = 0;
  return {
    init(ctx) { x = ctx; t0 = x.ev('fin.line2'); blk = x.ev('fin.black'); beat = x.cues.beat; },
    draw(c, t) {
      c.fillStyle = '#030406'; c.fillRect(0, 0, FXW, FXH);
      if (t >= blk) return;   // the cut to black
      const f = x.frame('ph', 6.9 + (t - t0) * 0.3);   // the room behind, very low
      if (f) { c.save(); c.globalAlpha = 0.22; c.filter = 'blur(6px)'; c.drawImage(f, 0, 0, FXW, FXH); c.restore(); }
      const k = spring(t - t0, 0.26, 0.5);
      txt(c, 'I DON’T JUST EDIT VIDEOS.', CX, 380, ax(30, 125, 900), alpha(A.text, 0.7), 1.5, 'center');
      c.save(); c.translate(CX, 480); c.scale(1.5 - 0.5 * k, 1.5 - 0.5 * k); txt(c, 'I BUILD', 0, 0, ax(92, 125, 900), A.text, 1, 'center'); txt(c, 'THEM.', 0, 92, ax(92, 125, 900), A.teal, 1, 'center'); c.restore();
      const ec = t - (t0 + beat);
      if (ec >= 0) {
        const kk = ease.out(sat(ec / 0.25), 3);
        c.save(); c.globalAlpha = kk;
        if (x.logo) { c.save(); c.beginPath(); c.roundRect(CX - 44, 650 + (1 - kk) * 16, 88, 88, 16); c.clip(); c.drawImage(x.logo, CX - 44, 650 + (1 - kk) * 16, 88, 88); c.restore(); }
        txt(c, 'BUILT WITH CLAUDE OPUS 5.5', CX, 778, mono(15, 700), A.text, 3, 'center');
        txt(c, 'TECHPE TREK', CX, 802, mono(13, 700), A.lime, 4, 'center');
        c.restore();
      }
      const fl = pulse(t, t0, 0.07); if (fl > 0.02) { c.fillStyle = `rgba(255,255,255,${0.8 * fl})`; c.fillRect(0, 0, FXW, FXH); }
    },
  };
}
