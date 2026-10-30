// Vox template, lollipop scale: one dot per row on a min..max scale, values typed as given.
// params: { line, title: string, sub?: string, min: number, max: number,
//           rows: { name: string, value: number, label: string, hi?: boolean }[], note?: string, noteWord?: number | string }
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, torn, block, blockWidth, voxLabel, pop } from './_vo';
import { ease, lerp } from '../engine/util';

export default class VoxLollipop extends VoxPlate {
  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, rows: { name: string; value: number; label: string; hi?: boolean }[] = p.rows;
    const n = rows.length, w = VOX_BOX.x1 - VOX_BOX.x0;
    const a0 = pop(ts, this.line.start - 0.1);
    if (a0 > 0) {
      c.save(); c.globalAlpha = a0;
      block(c, p.title, VOX_BOX.x0, VOX_BOX.y0 + 58, Math.min(72, Math.floor(72 * w / blockWidth(c, p.title, 72))), VOX.navy);
      if (p.sub) voxLabel(c, p.sub, VOX_BOX.x0, VOX_BOX.y0 + 92, 19, VOX.navy);
      c.restore();
    }
    const x0 = VOX_BOX.x0 + 6, x1 = VOX_BOX.x1 - 70, top = VOX_BOX.y0 + 150, pitch = Math.min(80, (VOX_BOX.y1 - 120 - top) / n);
    const xOf = (v: number) => lerp(x0, x1, (v - p.min) / (p.max - p.min));
    // scale ticks
    if (a0 > 0) {
      c.save(); c.globalAlpha = a0 * 0.8;
      for (const v of [p.min, (p.min + p.max) / 2, p.max]) voxLabel(c, String(v), xOf(v), top + n * pitch + 6, 18, VOX.navy, 'center');
      c.restore();
    }
    rows.forEach((r, i) => {
      const t0 = this.beat(i * 0.8, n), a = pop(ts, t0 - 0.05, 0.17);
      if (a <= 0) return;
      const y = top + i * pitch;
      c.save(); c.globalAlpha = Math.min(1, a * 2);
      if (r.hi) torn(c, VOX_BOX.x0 - 8, y - 30, w + 16, pitch - 6, 601 + i, VOX.yellow, true, 3);
      voxLabel(c, r.name, VOX_BOX.x0, y - 6, 19, VOX.navy);
      c.fillStyle = 'rgba(20, 33, 61, 0.25)'; c.fillRect(x0, y + 14, x1 - x0, 3);
      const g = ease.outCubic(pop(ts, t0, 0.42)), x = lerp(x0, xOf(r.value), g);
      c.fillStyle = r.hi ? VOX.red : VOX.navy; c.fillRect(x0, y + 13, x - x0, 5);
      c.beginPath(); c.arc(x, y + 15, r.hi ? 13 : 10, 0, Math.PI * 2); c.fill();
      if (g >= 1) voxLabel(c, r.label, x + 20, y + 22, 21, VOX.navy);
      c.restore();
    });
    if (p.note) {
      const at = p.noteWord !== undefined ? this.word(p.noteWord) : this.beat(n, n);
      const b = pop(ts, at - 0.05, 0.17);
      if (b > 0) {
        c.save(); c.globalAlpha = b;
        const sz = Math.min(52, Math.floor(52 * (w - 30) / blockWidth(c, p.note, 52)));
        torn(c, VOX_BOX.x0 - 4, VOX_BOX.y1 - 70, blockWidth(c, p.note, sz) + 34, sz * 1.1, 677 + p.line, VOX.red, true, 3);
        block(c, p.note, VOX_BOX.x0 + 12, VOX_BOX.y1 - 70 + sz * 0.88, sz, VOX.paper);
        c.restore();
      }
    }
  }
}
