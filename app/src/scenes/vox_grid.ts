// Vox template, grid: many identical tiles filling in one by one, then a total lands.
// params: { line, title: string, sub?: string, n: number, cols: number, tile: string, total: string, totalWord?: number | string }
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, torn, block, blockWidth, voxLabel, stamp, pop } from './_vo';

export default class VoxGrid extends VoxPlate {
  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, n: number = p.n, cols: number = p.cols, rows = Math.ceil(n / cols);
    const w = VOX_BOX.x1 - VOX_BOX.x0, gap = 12;
    const a0 = pop(ts, this.line.start - 0.1);
    if (a0 > 0) {
      c.save(); c.globalAlpha = a0;
      block(c, p.title, VOX_BOX.x0, VOX_BOX.y0 + 58, Math.min(72, Math.floor(72 * w / blockWidth(c, p.title, 72))), VOX.navy);
      if (p.sub) voxLabel(c, p.sub, VOX_BOX.x0, VOX_BOX.y0 + 92, 19, VOX.navy);
      c.restore();
    }
    const tw = (w - gap * (cols - 1)) / cols, th = 62, top = VOX_BOX.y0 + 128;
    const l = this.line, end = l.start + (l.end - l.start) * 0.7;
    for (let i = 0; i < n; i++) {
      const at = l.start + (end - l.start) * (i / n);
      const a = pop(ts, at, 0.12);
      const x = VOX_BOX.x0 + (i % cols) * (tw + gap), y = top + Math.floor(i / cols) * (th + gap);
      // empty slot outline, then the filled tile
      c.strokeStyle = 'rgba(20, 33, 61, 0.18)'; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, tw - 4, th - 4);
      if (a <= 0) continue;
      c.save(); c.globalAlpha = Math.min(1, a * 2);
      torn(c, x, y, tw, th, 401 + i, i % 2 ? VOX.cream : '#E9DCC1', true, 2.5);
      voxLabel(c, p.tile, x + tw / 2, y + th / 2 + 8, 20, VOX.navy, 'center');
      c.restore();
    }
    const at = p.totalWord !== undefined ? this.word(p.totalWord) : end;
    stamp(c, p.total, VOX_BOX.cx, top + rows * (th + gap) + 70, 76, pop(ts, at - 0.05, 0.17));
  }
}
