// Vox template, kinetic statement: a few short lines of bold condensed type on torn paper strips.
// params: { line, lines: string[], hi?: number[] (lines set on red), chip?: string, sub?: string,
//           open?: boolean (the opening shot: every line is up within the first half second, not on the voice) }
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, torn, halftone, block, blockWidth, voxLabel, pop } from './_vo';
import { hash } from '../engine/util';

export default class VoxKinetic extends VoxPlate {
  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, lines: string[] = p.lines, hi: number[] = p.hi ?? [];
    const maxW = VOX_BOX.x1 - VOX_BOX.x0 - 40;
    const size = Math.min(124, ...lines.map((s) => Math.floor(124 * maxW / blockWidth(c, s, 124))));
    const lh = size * 1.08, total = lh * lines.length;
    const top = (VOX_BOX.y0 + VOX_BOX.y1) / 2 - total / 2 + (p.chip ? 30 : 0);

    // a halftone field behind the type, upper right
    halftone(c, VOX_BOX.x1 - 40, VOX_BOX.y0 + 40, 170, 'rgba(184, 49, 42, 0.32)');

    if (p.chip) {
      const a = pop(ts, this.line.start - 0.1);
      if (a > 0) {
        c.save(); c.globalAlpha = a;
        c.fillStyle = VOX.navy; c.fillRect(VOX_BOX.x0, top - 92, 196, 46);
        voxLabel(c, p.chip, VOX_BOX.x0 + 16, top - 61, 22, VOX.yellow);
        c.restore();
      }
    }
    lines.forEach((s, i) => {
      const a = p.open ? pop(ts, i * 0.08 - 0.17, 0.17) : pop(ts, this.beat(i, lines.length) - 0.05, 0.17);
      if (a <= 0) return;
      const y = top + lh * (i + 1), w = blockWidth(c, s, size), red = hi.includes(i);
      c.save();
      c.translate(0, (1 - a) * 26);
      c.rotate((hash(i, 3, this.ctx.params.line) - 0.5) * 0.03);
      torn(c, VOX_BOX.x0 - 6, y - size * 0.84, w + 36, size * 1.0, 31 + i * 7 + this.ctx.params.line, red ? VOX.red : VOX.cream, true, 4);
      block(c, s, VOX_BOX.x0 + 12, y, size, red ? VOX.paper : VOX.navy);
      c.restore();
    });
    if (p.sub) {
      const a = pop(ts, this.beat(lines.length - 0.5, lines.length));
      if (a > 0) { c.save(); c.globalAlpha = a; voxLabel(c, p.sub, VOX_BOX.x0, top + total + 64, 22, VOX.navy); c.restore(); }
    }
  }
}
