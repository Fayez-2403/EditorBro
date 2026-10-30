// Vox template, brand opener: the brand's own logo file pops in fast on its dark tile (reel-export skill: a logo
// sits on its own dark tile, never redrawn), with a halftone burst behind it and an optional line under it.
// params: { line, src: string (under public/), sub?: string, subWord?: number | string }
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, halftone, voxLabel, pop } from './_vo';

export default class VoxLogo extends VoxPlate {
  img: ImageBitmap | null = null;

  override async init() {
    const blob = await (await fetch(this.ctx.params.src)).blob();
    this.img = await createImageBitmap(blob);
  }

  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, t0 = this.ctx.start;
    const size = 430, cx = VOX_BOX.cx, cy = VOX_BOX.y0 + 290;
    // pop: 0.55 -> 1.0 in two poses on twos (no bounce), from the very first frame
    const k = pop(ts, t0, 0.17), s = 0.55 + 0.45 * k;
    halftone(c, cx, cy, 250 * (0.6 + 0.4 * k), 'rgba(184, 49, 42, 0.30)', 12);
    c.save();
    c.translate(cx, cy); c.scale(s, s);
    const r = 34, x = -size / 2, y = -size / 2;
    const tile = () => { c.beginPath(); c.roundRect(x, y, size, size, r); };
    c.save(); c.translate(6, 9); tile(); c.fillStyle = 'rgba(20, 33, 61, 0.28)'; c.fill(); c.restore();
    tile(); c.fillStyle = '#000'; c.fill();
    if (this.img) { c.save(); tile(); c.clip(); c.drawImage(this.img, x, y, size, size); c.restore(); }
    c.restore();
    if (p.sub) {
      const at = p.subWord !== undefined ? this.word(p.subWord) : this.line.start + 0.6;
      const a = pop(ts, at - 0.05);
      if (a > 0) { c.save(); c.globalAlpha = a; voxLabel(c, p.sub, cx, cy + size / 2 + 70, 24, VOX.navy, 'center'); c.restore(); }
    }
  }
}
