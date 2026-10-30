// Night-trek template, one repo: its real GitHub page (a 3x capture) in a browser window, toured by a camera pose
// ladder that holds at each stop so it can be read: wide -> the name -> Star (click, live stars roll up) -> what the
// voice names, each outlined -> a second stop (README section, demo image, About) -> pull out. A callout under the
// claim changes at each stop. All timed to the spoken line; the whip pan in and out comes from TrekPlate.
// params: { line, img, boxes (key of boxes.json), boxesFile?, url, index, of?, owner, name, stars (thousands), claim,
//           notes: [at the first stop, at the second], focus?: string[] (boxes.json word keys) | focusBoxes?: box[],
//           readBox?: box (default: the README heading), readLabel?, nameWord?, focusFrom?, full?, noWatermark? }
// (box = [x, y, w, h] in page CSS px)
import type { Frame } from '../engine/scene';
import { TrekPlate, TREK, wide, wideFit, riseFont, browser, hilite, cursor, starBadge, camAt, loadImg, F, font, clamp, ease, type Pose } from './_vo';

const boxFiles = new Map<string, Promise<Record<string, any>>>();
const boxes = (f: string) => { if (!boxFiles.has(f)) boxFiles.set(f, fetch(f).then((r) => r.json())); return boxFiles.get(f)!; };

const TITLE_Y = 134;                            // the repo title row on every GitHub page (page px)

export default class TrekRepo extends TrekPlate {
  img: ImageBitmap | null = null;
  bx: any = null;
  override async load() {
    this.img = await loadImg(this.ctx.params.img);
    this.bx = (await boxes(this.ctx.params.boxesFile ?? 'repos/boxes.json'))[this.ctx.params.boxes];
  }

  draw(c: CanvasRenderingContext2D, t: number, _f: Frame) {
    const p = this.ctx.params, bx = this.bx, l = this.line;
    if (!bx) return;
    // layouts: full-screen (window nearly edge to edge), tall (no watermark), or the original
    const L = p.full ? { BX: 8, BW: 592, idx: 150, name: 204, BY: 214, BH: 536, claim: 792, note: 822 }
      : p.noWatermark ? { BX: 24, BW: 560, idx: 150, name: 204, BY: 222, BH: 520, claim: 790, note: 820 }
      : { BX: 24, BW: 560, idx: 178, name: 236, BY: 262, BH: 420, claim: 742, note: 776 };
    const { BX, BW, BY, BH } = L;
    const TX = p.full ? 20 : BX;                // text margin
    const t0 = l.start;
    const tName = p.nameWord ? this.word(p.nameWord) : this.frac(0.06);
    const tStar = Math.max(tName + 0.7, this.frac(0.16));
    const tFocus = Math.max(tStar + 0.9, this.frac(p.focusFrom ?? 0.32));
    const tRead = Math.max(tFocus + 1.2, this.frac(0.66)), tOut = this.frac(0.94);
    const foc: [number, number, number, number][] = p.focusBoxes ?? (p.focus as string[] ?? []).map((k) => bx.words[k]).filter(Boolean);
    const u = foc.length ? foc.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0] + a[2], b[0] + b[2]) - Math.min(a[0], b[0]), Math.max(a[1] + a[3], b[1] + b[3]) - Math.min(a[1], b[1])]) : [32, 300, 900, 600];
    const rd: number[] = p.readBox ?? bx.readme ?? [65, 1100, 838, 50];
    const nameX = (bx.name && bx.name[1] > 60 ? bx.name[0] : 64) + 180;
    // the stops (page px; z 1 = the page's full width), each with an arrive and a leave time: holds are readable
    const fz = Math.min(2.0, Math.max(1.2, 900 / Math.max(u[2], u[3] * 1.1)));
    const rz = Math.min(2.0, Math.max(1.25, 900 / Math.max(rd[2], rd[3] * 1.15)));
    const stop = (a: number, b: number, x: number, y: number, z: number): Pose[] => [{ t: a, x, y, z }, { t: Math.max(a + 0.01, b), x, y, z }];
    const poses: Pose[] = [
      ...stop(t0 - 0.25, tName - 0.6, 640, 470, 1.0),                                                // wide
      ...stop(tName, tStar - 0.55, nameX, TITLE_Y, 2.6),                                              // the name
      ...stop(tStar - 0.2, tStar + 0.45, 1080, TITLE_Y, 2.6),                                         // Star
      ...stop(tFocus, tRead - 0.6, u[0] + Math.min(u[2], 900) / 2, u[1] + Math.min(u[3], 520) / 2, fz), // first stop
      ...stop(tRead, tOut - 0.45, rd[0] + Math.min(rd[2], 900) / 2, rd[1] + Math.min(rd[3], 480) / 2 + (rd[3] < 120 ? 140 : 0), rz), // second stop
      { t: tOut, x: 640, y: 560, z: 1.0 },                                                            // pull out
    ];
    const cam = camAt(poses, t);

    // header: index, owner, name
    const a = clamp((t - (t0 - 0.2)) / 0.35);
    c.save();
    c.font = wide(56, 900); c.lineWidth = 2; c.strokeStyle = TREK.lime; c.globalAlpha = a;
    c.strokeText(`0${p.index}`, TX, L.idx);
    c.font = font(F.mono(500), 16); c.fillStyle = TREK.slate; c.fillText(`/0${p.of ?? 5}   github.com/${p.owner}`, TX + 112, L.idx - 2);
    c.restore();
    const ns = wideFit(c, p.name, 46, BW - 170);   // leave room for the star badge at the top right
    riseFont(c, p.name, TX, L.name, clamp((t - (t0 - 0.1)) / 0.4), wide(ns, 900), ns, TREK.lime);

    // the real page through the camera
    const map = browser(c, this.img, cam, BX, BY, BW, BH, p.url);
    c.save(); c.beginPath(); c.roundRect(BX, BY + 34, BW, BH - 34, [0, 0, 18, 18]); c.clip();
    const span = Math.max(0.2, (tRead - 0.7 - tFocus - 0.15) / Math.max(1, foc.length));
    foc.forEach((b, i) => {   // what the voice names, outlined one by one
      hilite(c, map(b[0], b[1]), map(b[0] + Math.min(b[2], 860), b[1] + Math.min(b[3], 520)), clamp((t - (tFocus + 0.15 + i * span)) / 0.3));
    });
    hilite(c, map(rd[0], rd[1]), map(rd[0] + Math.min(rd[2], 860), rd[1] + Math.min(rd[3], 480)), clamp((t - (tRead + 0.25)) / 0.35), p.readLabel ?? 'README');
    // the cursor: drifts in, clicks Star, follows the first stop, then points at the second
    const star = map(1196, TITLE_Y), first = foc[0] ? map(foc[0][0] + 40, foc[0][1] + Math.min(foc[0][3], 60) / 2) : map(640, 600), read = map(rd[0] + 30, rd[1] + Math.min(rd[3], 60) / 2);
    const lerp2 = (A: [number, number], B: [number, number], k: number) => [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k] as [number, number];
    let pt: [number, number];
    if (t < tStar) pt = lerp2([BX + BW * 0.5, BY + BH * 0.75], star, ease.inOutCubic(clamp((t - tName) / Math.max(0.2, tStar - tName))));
    else if (t < tRead) pt = lerp2(star, first, ease.inOutCubic(clamp((t - tStar - 0.4) / Math.max(0.2, tFocus - tStar - 0.4))));
    else pt = lerp2(first, read, ease.inOutCubic(clamp((t - tRead) / 0.5)));
    if (t > tName - 0.2 && t < tOut) cursor(c, pt[0], pt[1], clamp((t - tStar) / 0.45));
    c.restore();
    starBadge(c, BX + BW - 2, BY - 4, p.stars, clamp((t - tStar) / 0.6));

    // the claim, and a callout that changes at each stop
    const cs = wideFit(c, p.claim, 44, BW - 20);
    riseFont(c, p.claim, TX, L.claim, clamp((t - (tFocus - 0.1)) / 0.4), wide(cs, 900), cs, TREK.white);
    const notes: string[] = p.notes ?? [];
    const ni = t >= tRead ? 1 : 0, note = notes[ni];
    if (note && t > tFocus) {
      const na = clamp((t - (ni ? tRead : tFocus) - 0.15) / 0.35);
      c.save(); c.globalAlpha = na; c.translate(0, (1 - ease.outCubic(na)) * 10);
      c.font = font(F.mono(600), 16); const sw = c.measureText(note).width, mw = BW - 20;
      if (sw > mw) c.font = font(F.mono(600), Math.floor(16 * mw / sw));
      c.fillStyle = TREK.purple; c.fillText(note, TX, L.note); c.restore();
    }
    return {};
  }
}
