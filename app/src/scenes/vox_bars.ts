// Vox template, bar race: one torn bar per row, growing on its beat, values typed as given.
// params: { line, title: string, sub?: string, max: number,
//           rows: { name: string, value: number, label: string, hi?: boolean, ref?: boolean }[],
//           stamp?: string, stampWord?: number | string, note?: string, noteWord?: number | string }
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, torn, block, blockWidth, voxLabel, stamp, pop } from './_vo';
import { ease } from '../engine/util';

export default class VoxBars extends VoxPlate {
  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, rows: { name: string; value: number; label: string; hi?: boolean; ref?: boolean }[] = p.rows;
    const n = rows.length, w = VOX_BOX.x1 - VOX_BOX.x0;
    const a0 = pop(ts, this.line.start - 0.1);
    if (a0 > 0) {
      c.save(); c.globalAlpha = a0;
      block(c, p.title, VOX_BOX.x0, VOX_BOX.y0 + 58, Math.min(72, Math.floor(72 * w / blockWidth(c, p.title, 72))), VOX.navy);
      if (p.sub) voxLabel(c, p.sub, VOX_BOX.x0, VOX_BOX.y0 + 92, 19, VOX.navy);
      c.restore();
    }
    const top = VOX_BOX.y0 + 140, pitch = Math.min(78, (VOX_BOX.y1 - 150 - top) / n);
    rows.forEach((r, i) => {
      const t0 = this.beat(i * 0.8, n);
      const a = pop(ts, t0 - 0.05, 0.17);
      if (a <= 0) return;
      const y = top + i * pitch;
      c.save(); c.globalAlpha = Math.min(1, a * 2);
      voxLabel(c, r.name, VOX_BOX.x0, y, 19, VOX.navy);
      const g = ease.outCubic(pop(ts, t0, 0.5));
      const len = Math.max(10, (r.value / p.max) * (w - 10) * g);
      torn(c, VOX_BOX.x0, y + 10, len, 30, 307 + i * 11 + p.line, r.ref ? VOX.navy : r.hi ? VOX.yellow : '#D9CDB5', !!(r.hi || r.ref), 3);
      const inside = len > w * 0.55;
      const lab = g >= 1 ? r.label : '';
      if (lab) voxLabel(c, lab, inside ? VOX_BOX.x0 + len - 14 : VOX_BOX.x0 + len + 12, y + 32, 21, inside && r.ref ? VOX.paper : VOX.navy, inside ? 'right' : 'left');
      c.restore();
    });
    if (p.stamp) {
      const at = p.stampWord !== undefined ? this.word(p.stampWord) : this.beat(n, n);
      stamp(c, p.stamp, VOX_BOX.cx, VOX_BOX.y1 - (p.note ? 112 : 70), 64, pop(ts, at - 0.05, 0.17));
    }
    if (p.note) {
      const at = p.noteWord !== undefined ? this.word(p.noteWord) : this.beat(n, n);
      const b = pop(ts, at - 0.05);
      if (b > 0) { c.save(); c.globalAlpha = b; voxLabel(c, p.note, VOX_BOX.cx, VOX_BOX.y1 - 8, 20, VOX.navy, 'center'); c.restore(); }
    }
  }
}
