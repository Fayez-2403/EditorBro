// The roadside billboard, hand-painted in canvas: "WELCOME TO / Editor Bro" in a gold oval on turquoise planks,
// a film camera on a tripod at the left, a cursor arrow swooping in at the right, small painted props below.
// Our own design. It borrows the idea of a painted town-welcome sign, not any game's art.
import { mulberry32 } from './rng';

export const SIGN_W = 2048;
export const SIGN_H = 1408;

const C = {
  panelTop: '#2f8fc2', panelBot: '#21689a', plank: '#3cb7ae', plankDark: '#1d6f72', gap: '#164f55',
  gold: '#f2c35a', goldDeep: '#b9822c', goldHi: '#fff1b8', rim: '#5d3a1c', ink: '#47270f', cream: '#f3e2b4',
};

function textOnArc(g: CanvasRenderingContext2D, s: string, cx: number, cy: number, rx: number, ry: number, spacing: number) {
  const widths = [...s].map((ch) => g.measureText(ch).width + spacing);
  const speed = (th: number) => Math.hypot(rx * Math.sin(th), ry * Math.cos(th));
  // total parametric span, walking from the top centre
  let span = 0;
  for (const w of widths) span += w / speed(-Math.PI / 2);
  let th = -Math.PI / 2 - span / 2;
  [...s].forEach((ch, i) => {
    const w = widths[i];
    const mid = th + w / 2 / speed(th);
    const x = cx + rx * Math.cos(mid), y = cy + ry * Math.sin(mid);
    const ang = Math.atan2(ry * Math.cos(mid), -rx * Math.sin(mid));
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.fillText(ch, 0, 0);
    g.restore();
    th += w / speed(th);
  });
}

function paintedText(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number) {
  g.font = `900 ${size}px Fraunces`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  // drop shadow
  g.fillStyle = 'rgba(10,30,40,0.45)';
  g.fillText(s, x + size * 0.035, y + size * 0.05);
  // outline
  g.strokeStyle = C.ink;
  g.lineWidth = size * 0.075;
  g.strokeText(s, x, y);
  // gold fill, light from the top
  const grd = g.createLinearGradient(0, y - size * 0.75, 0, y + size * 0.05);
  grd.addColorStop(0, C.goldHi);
  grd.addColorStop(0.35, C.gold);
  grd.addColorStop(1, C.goldDeep);
  g.fillStyle = grd;
  g.fillText(s, x, y);
  // brush highlight on the upper edge
  g.save();
  g.globalAlpha = 0.5;
  g.strokeStyle = C.goldHi;
  g.lineWidth = size * 0.012;
  g.strokeText(s, x - size * 0.006, y - size * 0.012);
  g.restore();
}

function camera(g: CanvasRenderingContext2D) {
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // tripod
  g.strokeStyle = '#3b3550';
  g.lineWidth = 22;
  for (const [x2, y2] of [[205, 1215], [330, 1240], [455, 1210]]) {
    g.beginPath(); g.moveTo(330, 820); g.lineTo(x2, y2); g.stroke();
  }
  g.strokeStyle = '#8c86b8';
  g.lineWidth = 7;
  for (const [x2, y2] of [[205, 1215], [330, 1240], [455, 1210]]) {
    g.beginPath(); g.moveTo(326, 822); g.lineTo(x2 - 4, y2 - 2); g.stroke();
  }
  // film reels
  for (const [cx, cy, r] of [[262, 545, 96], [430, 565, 84]]) {
    g.fillStyle = '#4d4770'; g.strokeStyle = C.ink; g.lineWidth = 12;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#a49fd0';
    for (let k = 0; k < 5; k++) {
      const a = k * (Math.PI * 2 / 5) + 0.3;
      g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52, r * 0.2, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = C.ink; g.beginPath(); g.arc(cx, cy, r * 0.12, 0, Math.PI * 2); g.fill();
  }
  // body
  const body = new Path2D();
  body.roundRect(190, 630, 300, 200, 26);
  g.fillStyle = '#5f5a8c'; g.fill(body);
  g.strokeStyle = C.ink; g.lineWidth = 12; g.stroke(body);
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(205, 645, 270, 40);
  // lens, pointing at the title
  const lens = new Path2D();
  lens.moveTo(490, 680); lens.lineTo(600, 650); lens.lineTo(600, 810); lens.lineTo(490, 780); lens.closePath();
  g.fillStyle = '#3b3550'; g.fill(lens); g.stroke(lens);
  g.fillStyle = '#9fe6ff'; g.beginPath(); g.ellipse(600, 730, 18, 72, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = C.ink; g.lineWidth = 8; g.stroke();
  // tally light
  g.fillStyle = '#ff5a3c'; g.beginPath(); g.arc(450, 670, 14, 0, Math.PI * 2); g.fill();
  g.restore();
}

function cursor(g: CanvasRenderingContext2D) {
  g.save();
  g.translate(1700, 470);
  g.rotate(-0.42);
  g.scale(1.45, 1.45);
  // speed streaks behind it
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineCap = 'round';
  g.lineWidth = 9;
  for (const [y, l] of [[60, 120], [100, 170], [140, 110]]) {
    g.beginPath(); g.moveTo(-40, y); g.lineTo(-40 - l, y + 40); g.stroke();
  }
  const p = new Path2D('M0 0 L0 190 L48 148 L80 222 L112 208 L80 136 L142 136 Z');
  g.fillStyle = '#f7f5ee'; g.fill(p);
  g.save(); g.clip(p);
  g.fillStyle = '#cfd6e6'; g.beginPath(); g.moveTo(0, 0); g.lineTo(142, 136); g.lineTo(160, 260); g.lineTo(0, 260); g.fill();
  g.restore();
  g.strokeStyle = C.ink; g.lineWidth = 11; g.lineJoin = 'round'; g.stroke(p);
  g.restore();
  // sparkle
  star(g, 1500, 330, 46, '#fff4c2');
  star(g, 1880, 760, 30, '#fff4c2');
}

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  g.save();
  g.translate(x, y);
  g.fillStyle = col; g.strokeStyle = C.ink; g.lineWidth = 6;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.32 : r;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath(); g.fill(); g.stroke();
  g.restore();
}

function props(g: CanvasRenderingContext2D) {
  // pebbles row (like painted stones), each a colour of the studio
  const cols = ['#7b6fd6', '#3f8fe0', '#e05a7a', '#2bb3a0', '#f0a33c'];
  cols.forEach((c, i) => {
    const x = 840 + i * 92, y = 1078 + (i % 2) * 10;
    g.fillStyle = c; g.strokeStyle = C.ink; g.lineWidth = 7;
    g.beginPath(); g.ellipse(x, y, 34, 22, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(x - 10, y - 8, 12, 6, -0.3, 0, Math.PI * 2); g.fill();
  });
  // a coral-red </> at the bottom right
  g.save();
  g.font = '900 150px Fraunces';
  g.textAlign = 'center';
  g.lineJoin = 'round';
  g.strokeStyle = C.ink; g.lineWidth = 14;
  g.strokeText('</>', 1480, 1170);
  g.fillStyle = '#ff6b4a'; g.fillText('</>', 1480, 1170);
  g.restore();
  // a yellow play button at the bottom left
  g.save();
  g.translate(600, 1110);
  g.fillStyle = '#ffd23f'; g.strokeStyle = C.ink; g.lineWidth = 10;
  g.beginPath(); g.arc(0, 0, 64, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = C.ink; g.beginPath(); g.moveTo(-18, -32); g.lineTo(34, 0); g.lineTo(-18, 32); g.closePath(); g.fill();
  g.restore();
}

// 'welcome' opens the reel; 'cta' closes it (the band says FORK IT, the painted line under the oval is the repo URL).
export async function paintSign(variant: 'welcome' | 'cta' = 'welcome'): Promise<HTMLCanvasElement> {
  await document.fonts.load('900 100px Fraunces');
  await document.fonts.load('600 60px Fraunces');
  const cv = document.createElement('canvas');
  cv.width = SIGN_W; cv.height = SIGN_H;
  const g = cv.getContext('2d')!;
  const rnd = mulberry32(2403);
  const cx = SIGN_W / 2, cy = 712;

  // panel
  const pg = g.createLinearGradient(0, 0, 0, SIGN_H);
  pg.addColorStop(0, C.panelTop); pg.addColorStop(1, C.panelBot);
  g.fillStyle = pg; g.fillRect(0, 0, SIGN_W, SIGN_H);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.04})`;
    g.fillRect(rnd() * SIGN_W, rnd() * SIGN_H, 40 + rnd() * 160, 2 + rnd() * 3);
  }

  // outer rim, gold rope, then planks inside
  g.lineWidth = 64; g.strokeStyle = C.rim;
  g.beginPath(); g.ellipse(cx, cy, 905, 615, 0, 0, Math.PI * 2); g.stroke();
  g.save();
  g.beginPath(); g.ellipse(cx, cy, 850, 562, 0, 0, Math.PI * 2); g.clip();
  for (let y = cy - 600, k = 0; y < cy + 600; y += 96, k++) {
    const shade = 0.88 + rnd() * 0.18;
    g.fillStyle = C.plank; g.globalAlpha = 1;
    g.fillRect(0, y, SIGN_W, 92);
    g.fillStyle = `rgba(0,0,0,${0.12 - shade * 0.1})`; g.fillRect(0, y, SIGN_W, 92);
    for (let s = 0; s < 26; s++) {
      g.strokeStyle = `rgba(20,90,95,${0.15 + rnd() * 0.2})`;
      g.lineWidth = 1 + rnd() * 2.5;
      const yy = y + 8 + rnd() * 76, x0 = rnd() * SIGN_W;
      g.beginPath(); g.moveTo(x0, yy); g.bezierCurveTo(x0 + 200, yy + (rnd() - 0.5) * 10, x0 + 400, yy + (rnd() - 0.5) * 10, x0 + 600, yy); g.stroke();
    }
    g.fillStyle = C.gap; g.fillRect(0, y + 92, SIGN_W, 4);
    if (k % 2) { g.fillStyle = C.gap; g.fillRect(300 + rnd() * 1400, y, 4, 92); }
  }
  g.restore();
  const rope = g.createLinearGradient(0, cy - 600, 0, cy + 600);
  rope.addColorStop(0, C.goldHi); rope.addColorStop(0.5, C.gold); rope.addColorStop(1, C.goldDeep);
  g.lineWidth = 46; g.strokeStyle = rope;
  g.beginPath(); g.ellipse(cx, cy, 874, 586, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 6; g.strokeStyle = C.ink;
  g.beginPath(); g.ellipse(cx, cy, 898, 610, 0, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, 851, 563, 0, 0, Math.PI * 2); g.stroke();
  // rope twists
  g.strokeStyle = 'rgba(90,55,20,0.55)'; g.lineWidth = 5;
  for (let a = 0; a < Math.PI * 2; a += 0.035) {
    const x1 = cx + Math.cos(a) * 852, y1 = cy + Math.sin(a) * 564;
    const x2 = cx + Math.cos(a + 0.02) * 896, y2 = cy + Math.sin(a + 0.02) * 608;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }

  // "WELCOME TO" on a cream band along the top
  g.lineWidth = 92; g.strokeStyle = C.cream;
  g.beginPath(); g.ellipse(cx, cy, 790, 505, 0, -Math.PI / 2 - 0.36, -Math.PI / 2 + 0.36); g.stroke();
  g.lineWidth = 6; g.strokeStyle = C.ink;
  g.beginPath(); g.ellipse(cx, cy, 790 + 46, 505 + 46, 0, -Math.PI / 2 - 0.355, -Math.PI / 2 + 0.355); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, 790 - 46, 505 - 46, 0, -Math.PI / 2 - 0.37, -Math.PI / 2 + 0.37); g.stroke();
  g.font = '700 70px Fraunces'; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  textOnArc(g, variant === 'cta' ? 'FORK IT' : 'WELCOME TO', cx, cy, 790, 505, 14);

  camera(g);
  cursor(g);
  props(g);
  paintedText(g, 'Editor', 1040, 760, 300);
  paintedText(g, 'Bro', 1060, 1010, 300);

  // small painted line under the oval
  g.font = '700 46px Fraunces'; g.textAlign = 'center'; g.fillStyle = C.cream; g.textBaseline = 'middle';
  g.fillText(variant === 'cta' ? 'github.com/Fayez-2403/EditorBro' : 'PROMPT  ·  BUILD  ·  RENDER', cx, 1360);

  // weather: speckles, rust drips from the top edge, edge darkening
  for (let i = 0; i < 2600; i++) {
    const a = rnd() * 0.12;
    g.fillStyle = rnd() < 0.5 ? `rgba(255,250,235,${a})` : `rgba(30,20,10,${a})`;
    const r = 1 + rnd() * 3;
    g.fillRect(rnd() * SIGN_W, rnd() * SIGN_H, r, r);
  }
  for (let i = 0; i < 14; i++) {
    const x = rnd() * SIGN_W, len = 60 + rnd() * 220;
    const dg = g.createLinearGradient(0, 0, 0, len);
    dg.addColorStop(0, 'rgba(110,70,40,0.35)'); dg.addColorStop(1, 'rgba(110,70,40,0)');
    g.fillStyle = dg; g.fillRect(x, 0, 3 + rnd() * 5, len);
  }
  const vg = g.createRadialGradient(cx, cy, 500, cx, cy, 1300);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,20,30,0.35)');
  g.fillStyle = vg; g.fillRect(0, 0, SIGN_W, SIGN_H);
  return cv;
}
