// Render 02: a premium product-launch film for a fictional app ("Lumen"; no real brand), interface choreography in the
// HyperFrames spirit (the brief cites @Screeendev's SaaS Launch Animation as inspiration only). Restrained: dark glass panels,
// one teal and one violet accent, precise cursor moves on the beat. Bar 1: the cursor opens into the dashboard, which separates
// into depth layers. Bar 2: a nav button click opens a full page (masked reveal); a chart draws on the beats and becomes a
// wipe. Bar 3: a device rotates into view, a feature card folds away, "INTERFACES → CINEMA", and the panel flips into the editor.
import { V2HY, LOOK, A, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, statement, ax, mono, txt, fillRR, alpha, sat, span } from './common';
import { spring } from '../_vo';

const BG0 = '#05070C', GLASS = 'rgba(22,28,40,0.78)', EDGE = 'rgba(255,255,255,0.10)';
type Pt = [number, number];
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

function glass(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 18, a = 1) {
  c.save(); c.globalAlpha *= a;
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 40; c.shadowOffsetY = 18; fillRR(c, x, y, w, h, r, GLASS);
  c.shadowColor = 'transparent';
  const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(255,255,255,0.09)'); g.addColorStop(0.4, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  fillRR(c, x, y, w, h, r, g);
  c.beginPath(); c.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r); c.strokeStyle = EDGE; c.lineWidth = 1; c.stroke();
  c.restore();
}
function cursor(c: CanvasRenderingContext2D, x: number, y: number, press = 0) {
  c.save(); c.translate(x, y); c.scale(1 - 0.12 * press, 1 - 0.12 * press);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 26); c.lineTo(7, 20); c.lineTo(12, 31); c.lineTo(16, 29); c.lineTo(11, 18); c.lineTo(20, 18); c.closePath();
  c.fillStyle = '#FFFFFF'; c.fill(); c.strokeStyle = '#0A0D14'; c.lineWidth = 1.6; c.stroke(); c.restore();
}

export function r2World(): World {
  let x!: AuraCtx; let b0 = 0, bar = 0, e8 = 0;
  /** The cursor path: a keyframe on every beat of the render (eased between), clicks where marked. */
  let path: { t: number; p: Pt; click?: boolean }[] = [];
  const cur = (t: number): [Pt, number] => {
    let i = 0; while (i < path.length - 1 && path[i + 1]!.t <= t) i++;
    const a = path[i]!, b = path[Math.min(i + 1, path.length - 1)]!, k = b.t > a.t ? ease.inOut(sat((t - a.t) / (b.t - a.t)), 3) : 1;
    const press = Math.max(...path.filter((q) => q.click).map((q) => pulse(t, q.t, 0.06)), 0);
    return [[lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k)], press];
  };
  return {
    init(ctx) {
      x = ctx; b0 = x.ev('r2.in'); bar = x.cues.bar; e8 = x.cues.eighth; const q = bar / 4;
      path = [
        { t: b0, p: [CX, 560] }, { t: b0 + q, p: [470, 330] }, { t: b0 + 2 * q, p: [150, 640] }, { t: b0 + 3 * q, p: [96, 268] },
        { t: x.ev('r2.page') - e8, p: [96, 268] }, { t: x.ev('r2.page'), p: [96, 268], click: true },
        { t: x.ev('r2.page') + 2 * q, p: [430, 760] }, { t: x.ev('r2.chart'), p: [430, 760], click: true },
        { t: x.ev('r2.device'), p: [520, 980] }, { t: x.ev('r2.flip'), p: [300, 600], click: true }, { t: b0 + 3 * bar, p: [300, 600] },
      ];
    },
    draw(c, t, p) {
      c.fillStyle = BG0; c.fillRect(0, 0, FXW, FXH);
      const amb = c.createRadialGradient(CX, 380, 40, CX, 380, 760);
      amb.addColorStop(0, 'rgba(63,214,224,0.10)'); amb.addColorStop(0.5, 'rgba(155,123,255,0.06)'); amb.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = amb; c.fillRect(0, 0, FXW, FXH);
      const lt = t - b0, page = x.ev('r2.page'), dev = x.ev('r2.device'), flip = x.ev('r2.flip');
      // the flip at the end: the whole interface turns sideways (scaleX -> 0) into the editor
      const fl = ease.in(span(t, flip, b0 + 3 * bar), 2);
      c.save(); c.translate(CX, 540); c.scale(Math.cos(fl * Math.PI / 2), 1 - 0.06 * fl); c.translate(-CX, -540);
      if (t < page) this.dashboard(c, t, lt);
      else if (t < dev) this.feature(c, t, page);
      else this.device(c, t, dev);
      c.restore();
      if (t >= dev) statement(c, 'INTERFACES → CINEMA', t, x.ev('r2.title'), 880, A.text, A.teal);
      const [[cx_, cy_], press] = cur(t);
      for (const q of path.filter((q) => q.click && t >= q.t && t < q.t + 0.4)) {
        const r = (t - q.t) / 0.4; c.strokeStyle = alpha(A.teal, 1 - r); c.lineWidth = 2; c.beginPath(); c.arc(q.p[0], q.p[1], 8 + 40 * r, 0, Math.PI * 2); c.stroke();
      }
      if (fl < 0.9) cursor(c, cx_, cy_, press);
      if (!LOOK.clean) { c.save(); if (p?.v2) c.translate(0, V2HY);   // V2: the prompt card sits above the HUD; V4 (clean): no HUD
      txt(c, 'R02 · PRODUCT FILM', 32, 84, mono(12, 600), alpha(A.text, 0.5), 2, 'left');
      txt(c, 'LUMEN · fictional product', FXW - 32, 84, mono(12, 600), alpha(A.text, 0.5), 1, 'right');
      c.restore(); }
    },
    // ---- bar 1: the window opens from the cursor, then separates into depth layers (parallax)
    dashboard(c: CanvasRenderingContext2D, t: number, lt: number) {
      const open = spring(lt, 0.45, 0.72), sep = ease.inOut(span(lt, bar * 0.5, bar), 3);
      const W = 520, H = 720, X = CX - W / 2, Y = 180;
      c.save(); c.translate(CX, 560); c.scale(lerp(0.02, 1, open), lerp(0.02, 1, open)); c.translate(-CX, -560);
      // layer 0: the window and its sidebar
      const L = (z: number) => { const s = 1 + 0.035 * z * sep; c.translate(CX, 540); c.scale(s, s); c.translate(-CX - (z - 1.2) * 12 * sep, -540 - z * 24 * sep); };
      c.save(); L(0); glass(c, X, Y, W, H, 22);
      fillRR(c, X, Y, 120, H, 22, 'rgba(255,255,255,0.03)');
      txt(c, 'Lumen', X + 22, Y + 44, ax(20, 100, 800), A.text, 0, 'left');
      ['Overview', 'Projects', 'Renders', 'Assets', 'Settings'].forEach((s, i) => {
        if (i === 0) fillRR(c, X + 12, Y + 78 + i * 42, 96, 32, 8, alpha(A.teal, 0.16));
        txt(c, s, X + 24, Y + 100 + i * 42, ax(13, 100, 600), i === 0 ? A.cyan : A.dim, 0, 'left');
      });
      c.restore();
      // layer 1: KPI cards (numbers count up on the beats)
      c.save(); L(1);
      [['Renders', 1284], ['Frames', 76800], ['On-beat', 99.7]].forEach(([k, v], i) => {
        const cx0 = X + 136 + i * 126, kk = ease.out(span(lt, 0.15 + i * e8, 0.9 + i * e8), 3);
        glass(c, cx0, Y + 24, 116, 92, 14);
        txt(c, String(k), cx0 + 14, Y + 50, mono(11, 600), A.dim, 1, 'left');
        const n = (v as number) * kk; txt(c, v === 99.7 ? n.toFixed(1) + '%' : Math.round(n).toLocaleString('en-US'), cx0 + 14, Y + 92, ax(22, 100, 800), i === 2 ? A.teal : A.text, 0, 'left');
      });
      c.restore();
      // layer 2: the chart card (bars rise on eighths)
      c.save(); L(2); glass(c, X + 136, Y + 136, 368, 250, 16);
      txt(c, 'Render throughput', X + 154, Y + 166, ax(14, 100, 700), A.text, 0, 'left');
      for (let i = 0; i < 12; i++) {
        const kk = ease.out(span(lt, 0.3 + i * e8 * 0.5, 0.7 + i * e8 * 0.5), 3), h = (40 + 140 * (0.5 + 0.5 * Math.sin(i * 1.3 + 1))) * kk;
        fillRR(c, X + 160 + i * 28, Y + 366 - h, 16, h, 4, i === 9 ? A.teal : alpha(A.violet, 0.55));
      }
      c.restore();
      // layer 2: recent renders (rows tick in on eighths)
      c.save(); L(1.6); glass(c, X + 136, Y + 404, 368, 296, 16);
      txt(c, 'Recent renders', X + 154, Y + 434, ax(14, 100, 700), A.text, 0, 'left');
      [['R01 kinetic type', A.lime], ['R02 product film', A.teal], ['R03 shader set', A.violet], ['R04 chrome logo', A.blue], ['R05 volcano', A.amber]].forEach(([n, col], i) => {
        const kk = ease.out(span(lt, 0.5 + i * e8, 0.8 + i * e8), 3), ry = Y + 462 + i * 46;
        c.globalAlpha = kk; fillRR(c, X + 152, ry, 336, 36, 8, 'rgba(255,255,255,0.035)');
        fillRR(c, X + 164, ry + 12, 12, 12, 3, col as string);
        txt(c, n as string, X + 188, ry + 23, ax(12, 100, 600), A.text, 0, 'left');
        txt(c, i < 2 ? 'done' : i === 2 ? 'rendering' : 'queued', X + 476, ry + 23, mono(10, 600), i < 2 ? A.green : i === 2 ? A.amber : A.faint, 1, 'right');
      });
      c.globalAlpha = 1; c.restore();
      // layer 3: a notification floating closest to us
      c.save(); L(3.2);
      const nk = ease.out(span(lt, bar * 0.55, bar * 0.8), 3);
      c.globalAlpha *= nk; glass(c, X + 230, Y + 318 + (1 - nk) * 30, 270, 64, 14);
      c.beginPath(); c.arc(X + 256, Y + 350 + (1 - nk) * 30, 9, 0, Math.PI * 2); c.fillStyle = A.green; c.fill();
      txt(c, 'Render complete · 60 fps', X + 276, Y + 355 + (1 - nk) * 30, ax(13, 100, 600), A.text, 0, 'left');
      c.restore();
      c.restore();
    },
    // ---- bar 2: the click opens a full feature page (a circle mask from the button); a chart draws on the beats -> wipe
    feature(c: CanvasRenderingContext2D, t: number, page: number) {
      const rk = ease.inOut(span(t, page, page + 0.42), 3), r = 30 + rk * 1300;
      this.dashboard(c, t, t - b0);
      c.save(); c.beginPath(); c.arc(96, 268, r, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#080B12'; c.fillRect(0, 0, FXW, FXH);
      const k = ease.out(span(t, page + 0.12, page + 0.5), 4);
      c.globalAlpha = k;
      txt(c, 'Every frame,', 44, 240 + (1 - k) * 20, ax(46, 100, 800), A.text, -0.5, 'left');
      txt(c, 'on the beat.', 44, 296 + (1 - k) * 20, ax(46, 100, 800), A.teal, -0.5, 'left');
      txt(c, 'Timelines that render themselves.', 44, 336, ax(17, 100, 500), A.dim, 0, 'left');
      glass(c, 36, 400, FXW - 72, 360, 20);
      txt(c, 'Beat alignment · last 30 renders', 58, 436, ax(14, 100, 700), A.text, 0, 'left');
      // the line draws one eighth per point, then sweeps up as the wipe
      const ch = x.ev('r2.chart'), pts: Pt[] = Array.from({ length: 16 }, (_, i) => [60 + i * 31, 700 - 210 * (0.35 + 0.5 * Math.pow(i / 15, 1.6) + 0.07 * Math.sin(i * 2.1))]);
      const st = (t - (ch - 4 * e8)) / e8, si = Math.floor(st), drawn = st <= 0 ? 0 : st >= 4 ? 15 : Math.min(15, (si + ease.out(st - si, 3)) * 15 / 4);
      c.strokeStyle = A.teal; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath();
      for (let i = 0; i <= Math.floor(drawn); i++) i ? c.lineTo(pts[i]![0], pts[i]![1]) : c.moveTo(pts[i]![0], pts[i]![1]);
      const fi = Math.floor(drawn), fr = drawn - fi; if (fi < 15) c.lineTo(lerp(pts[fi]![0], pts[fi + 1]![0], fr), lerp(pts[fi]![1], pts[fi + 1]![1], fr)); c.stroke();
      if (t >= ch) {   // the tooltip pops on the last point
        const tk = spring(t - ch, 0.3, 0.6), [lx, ly] = pts[15]!;
        c.beginPath(); c.arc(lx, ly, 7 + 5 * pulse(t, ch, 0.1), 0, Math.PI * 2); c.fillStyle = A.teal; c.fill();
        c.save(); c.translate(lx - 150, ly - 70); c.scale(tk, tk); fillRR(c, 0, 0, 140, 46, 10, '#E8FBFD');
        txt(c, '99.7% on beat', 14, 29, ax(15, 100, 800), '#06222A', 0, 'left'); c.restore();
      }
      const wipe = ease.inOut(span(t, x.ev('r2.device') - 2 * e8, x.ev('r2.device')), 3);
      if (wipe > 0) { c.globalAlpha = 1; c.fillStyle = A.teal; c.fillRect(0, FXH * (1 - wipe), FXW, FXH * wipe); }
      c.restore();
      if (rk < 1) { c.strokeStyle = alpha(A.teal, 0.9 * (1 - rk)); c.lineWidth = 3; c.beginPath(); c.arc(96, 268, r, 0, Math.PI * 2); c.stroke(); }
    },
    // ---- bar 3: a device rotates into view, a feature card folds away
    device(c: CanvasRenderingContext2D, t: number, dev: number) {
      c.fillStyle = '#071016'; c.fillRect(0, 0, FXW, FXH);
      const rot = spring(t - dev, 0.6, 0.7), yaw = (1 - rot) * 1.2, W = 280, H = 580;
      c.save(); c.translate(CX + 82, 520); c.transform(Math.cos(yaw), Math.sin(yaw) * 0.18, 0, 1, 0, 0);
      c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 50; c.shadowOffsetY = 26; fillRR(c, -W / 2, -H / 2, W, H, 46, '#0D1118'); c.shadowColor = 'transparent';
      c.beginPath(); c.roundRect(-W / 2 + 1, -H / 2 + 1, W - 2, H - 2, 46); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; c.stroke();
      fillRR(c, -W / 2 + 14, -H / 2 + 14, W - 28, H - 28, 34, '#0A0E16');
      txt(c, 'Lumen', -W / 2 + 36, -H / 2 + 74, ax(22, 100, 800), A.text, 0, 'left');
      const k = ease.out(span(t, dev + 0.3, dev + 1.0), 3);
      fillRR(c, -W / 2 + 32, -H / 2 + 100, (W - 64) * k, 150, 18, alpha(A.violet, 0.35));
      txt(c, 'Export ready', -W / 2 + 50, -H / 2 + 150, ax(16, 100, 700), A.text, 0, 'left');
      for (let i = 0; i < 4; i++) {
        const kk = ease.out(span(t, dev + 0.5 + i * e8, dev + 0.9 + i * e8), 3);
        fillRR(c, -W / 2 + 32, -H / 2 + 276 + i * 64, (W - 64) * kk, 48, 12, 'rgba(255,255,255,0.05)');
        fillRR(c, -W / 2 + 46, -H / 2 + 292 + i * 64, 16, 16, 4, i === 1 ? A.teal : A.line2);
        c.globalAlpha = kk; txt(c, ['9:16 · 1080×1920', '60 fps · H.264', 'beat map · 95 BPM', 'stems · 4 tracks'][i]!, -W / 2 + 74, -H / 2 + 305 + i * 64, ax(12, 100, 600), A.text, 0, 'left'); c.globalAlpha = 1;
      }
      c.restore();
      // the feature card beside it folds away (scaleY) a beat later
      const fold = ease.inOut(span(t, dev + bar / 2, dev + bar / 2 + 0.4), 3);
      if (fold < 1) {
        c.save(); c.translate(124, 330); c.scale(1, 1 - fold); glass(c, -100, -70, 200, 140, 16);
        txt(c, '60 fps', -78, -22, ax(28, 100, 800), A.teal, 0, 'left'); txt(c, 'frame-exact seek(t)', -78, 10, mono(12, 600), A.dim, 0, 'left'); c.restore();
      }
    },
  } as World & Record<string, any>;
}
