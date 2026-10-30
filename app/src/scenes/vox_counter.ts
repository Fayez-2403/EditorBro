// Vox template, counter: a number that counts up on twos and lands exactly on the value given.
// params: { line, value: number, decimals?: number, prefix?: string, suffix?: string, kicker?: string,
//           subs?: string[], land?: number | string (word whose start the count lands on; default mid-line) }
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, torn, halftone, block, blockWidth, voxLabel, pop } from './_vo';
import { ease } from '../engine/util';

export default class VoxCounter extends VoxPlate {
  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, d = p.decimals ?? 0, l = this.line;
    const land = p.land !== undefined ? this.word(p.land) : l.start + (l.end - l.start) * 0.5;
    const k = ease.outCubic(pop(ts, l.start, Math.max(0.3, land - l.start)));
    const s = `${p.prefix ?? ''}${(p.value * k).toFixed(d)}${p.suffix ?? ''}`;
    const final = `${p.prefix ?? ''}${p.value.toFixed(d)}${p.suffix ?? ''}`;
    const w = VOX_BOX.x1 - VOX_BOX.x0;
    const size = Math.min(230, Math.floor(230 * (w - 70) / blockWidth(c, final, 230)));
    const cy = VOX_BOX.y0 + 230;

    if (p.kicker) {
      const a = pop(ts, l.start - 0.1);
      if (a > 0) { c.save(); c.globalAlpha = a; voxLabel(c, p.kicker, VOX_BOX.x0, VOX_BOX.y0 + 28, 22, VOX.navy); c.restore(); }
    }
    halftone(c, VOX_BOX.x0 + 70, cy + 40, 150, 'rgba(184, 49, 42, 0.28)');
    const a = pop(ts, l.start - 0.05, 0.17);
    if (a > 0) {
      c.save(); c.translate(0, (1 - a) * 30);
      torn(c, VOX_BOX.x0, cy - size * 0.8, w, size * 1.08, 211 + p.line, VOX.yellow);
      block(c, s, VOX_BOX.x0 + 30, cy + size * 0.12, size, VOX.navy);
      c.restore();
    }
    (p.subs ?? []).forEach((sub: string, i: number) => {
      // the lines follow the landing, but always arrive before the voice ends (a late landing word packs them tighter)
      const b = pop(ts, Math.min(land + 0.15, l.end - 0.45) + i * 0.2, 0.17);
      if (b <= 0) return;
      const sz = Math.min(56, Math.floor(56 * (w - 40) / blockWidth(c, sub, 56)));
      const y = cy + size * 0.5 + 70 + i * (sz * 1.25);
      c.save(); c.translate(0, (1 - b) * 20);
      torn(c, VOX_BOX.x0 - 4, y - sz * 0.85, blockWidth(c, sub, sz) + 34, sz * 1.05, 223 + i + p.line, i === 0 ? VOX.navy : VOX.cream, true, 3);
      block(c, sub, VOX_BOX.x0 + 12, y, sz, i === 0 ? VOX.paper : VOX.navy);
      c.restore();
    });
  }
}
