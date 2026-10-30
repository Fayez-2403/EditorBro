// Vox template, before / after: the same option cards reorder (shuffled, then reversed) and the pick
// does not change. params: { line, title: string, options: string[], picked: number, tag?: string,
//                            stamp: string, stampWord?: number | string, note?: string, noteWord?: number | string }
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, torn, block, blockWidth, voxLabel, stamp, pop } from './_vo';
import { ease } from '../engine/util';

// slot of each option, per phase: original, shuffled, reversed
const ORDERS = [[0, 1, 2, 3], [2, 0, 3, 1], [3, 2, 1, 0]];

export default class VoxShuffle extends VoxPlate {
  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, opts: string[] = p.options, w = VOX_BOX.x1 - VOX_BOX.x0;
    const a0 = pop(ts, this.line.start - 0.1);
    if (a0 > 0) {
      c.save(); c.globalAlpha = a0;
      block(c, p.title, VOX_BOX.x0, VOX_BOX.y0 + 58, Math.min(72, Math.floor(72 * w / blockWidth(c, p.title, 72))), VOX.navy);
      c.restore();
    }
    const top = VOX_BOX.y0 + 100, h = 68, gap = 14;
    const ph1 = this.beat(1, 4), ph2 = this.beat(2, 4);
    const m1 = ease.inOutCubic(pop(ts, ph1, 0.33)), m2 = ease.inOutCubic(pop(ts, ph2, 0.33));
    opts.forEach((o, i) => {
      const s0 = ORDERS[0]![i]!, s1 = ORDERS[1]![i]!, s2 = ORDERS[2]![i]!;
      const slot = s0 + (s1 - s0) * m1 + (s2 - s1) * m2;
      const a = pop(ts, this.line.start + i * 0.08, 0.17);
      if (a <= 0) return;
      const y = top + slot * (h + gap), pick = i === p.picked;
      c.save(); c.globalAlpha = Math.min(1, a * 2);
      torn(c, VOX_BOX.x0 + (pick ? 0 : 30), y, w - 30, h, 501 + i, pick ? VOX.yellow : VOX.cream, true, 3);
      block(c, o, VOX_BOX.x0 + (pick ? 22 : 52), y + h * 0.7, 40, VOX.navy);
      if (pick) voxLabel(c, p.tag ?? 'PICKED', VOX_BOX.x1 - 50, y + h * 0.62, 20, VOX.red, 'right');
      c.restore();
    });
    const at = p.stampWord !== undefined ? this.word(p.stampWord) : this.beat(3, 4);
    stamp(c, p.stamp, VOX_BOX.cx, top + 4 * (h + gap) + 70, 80, pop(ts, at - 0.05, 0.17));
    if (p.note) {
      const nt = p.noteWord !== undefined ? this.word(p.noteWord) : at + 0.5;
      const b = pop(ts, nt - 0.05);
      if (b > 0) { c.save(); c.globalAlpha = b; voxLabel(c, p.note, VOX_BOX.cx, VOX_BOX.y1 - 8, 20, VOX.navy, 'center'); c.restore(); }
    }
  }
}
