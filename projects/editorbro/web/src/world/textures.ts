// Procedural canvas textures for the highway: asphalt with lane paint, concrete, palm fronds, bark.
import * as THREE from 'three';
import { mulberry32 } from './rng';

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
};
const tex = (c: HTMLCanvasElement, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

// Road cross-section across u (ROAD_W metres), one dash period (12 m) along v.
export const ROAD_X0 = -11.2, ROAD_X1 = 5.0;
export function asphalt() {
  const W = 2048, H = 1024, rnd = mulberry32(11);
  const [c, g] = canvas(W, H);
  g.fillStyle = '#56575a'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60000; i++) {
    const v = 60 + rnd() * 70;
    g.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + rnd() * 0.3})`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
  }
  const px = (x: number) => ((x - ROAD_X0) / (ROAD_X1 - ROAD_X0)) * W;
  // tyre tracks, darker
  for (const lane of [0, -3.6, -7.2]) {
    for (const off of [-0.8, 0.8]) {
      const gr = g.createLinearGradient(px(lane + off - 0.45), 0, px(lane + off + 0.45), 0);
      gr.addColorStop(0, 'rgba(30,30,32,0)'); gr.addColorStop(0.5, 'rgba(30,30,32,0.28)'); gr.addColorStop(1, 'rgba(30,30,32,0)');
      g.fillStyle = gr; g.fillRect(px(lane + off - 0.45), 0, px(lane + off + 0.45) - px(lane + off - 0.45), H);
    }
  }
  // paint: solid edge lines, dashed lane lines (3 m dash in a 12 m period)
  const paint = (x: number, w: number, y0: number, y1: number, col: string) => {
    g.fillStyle = col; g.fillRect(px(x - w / 2), y0, px(x + w / 2) - px(x - w / 2), y1 - y0);
  };
  paint(3.4, 0.16, 0, H, '#e9e6dc');
  paint(-9.4, 0.16, 0, H, '#e6c75a');
  for (const x of [-1.8, -5.4]) paint(x, 0.14, 0, H * 0.25, '#ece9df');
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(80,80,84,${0.3 + rnd() * 0.5})`;
    g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 6, 1 + rnd() * 3);
  }
  const t = tex(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function concrete() {
  const W = 512, H = 256, rnd = mulberry32(5);
  const [c, g] = canvas(W, H);
  g.fillStyle = '#a3a898'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const v = 150 + rnd() * 70;
    g.fillStyle = `rgba(${v},${v + 4},${v - 6},0.25)`;
    g.fillRect(rnd() * W, rnd() * H, 2, 2);
  }
  for (let i = 0; i < 30; i++) {
    const x = rnd() * W, w = 4 + rnd() * 30;
    const gr = g.createLinearGradient(0, H * 0.2, 0, H);
    gr.addColorStop(0, 'rgba(90,85,70,0)'); gr.addColorStop(1, 'rgba(90,85,70,0.35)');
    g.fillStyle = gr; g.fillRect(x, H * 0.2, w, H);
  }
  g.fillStyle = 'rgba(60,60,55,0.5)';
  for (let x = 0; x < W; x += 128) g.fillRect(x, 0, 2, H);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// One frond: rib along v, leaflets angled out to both sides, alpha outside.
export function frond() {
  const W = 256, H = 1024, rnd = mulberry32(21);
  const [c, g] = canvas(W, H);
  g.clearRect(0, 0, W, H);
  for (let y = 40; y < H - 20; y += 9) {
    const k = y / H;
    const len = (W / 2 - 8) * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.75 + rnd() * 0.25);
    for (const s of [-1, 1]) {
      const shade = 70 + rnd() * 50;
      g.strokeStyle = `rgb(${shade * 0.55},${shade + 30},${shade * 0.35})`;
      g.lineWidth = 3 + rnd() * 2;
      g.beginPath();
      g.moveTo(W / 2, y);
      g.quadraticCurveTo(W / 2 + s * len * 0.6, y + 14, W / 2 + s * len, y + 42 + rnd() * 20);
      g.stroke();
    }
  }
  g.strokeStyle = '#6b6a3a'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
  const t = tex(c);
  return t;
}

// Bush body: dense leaf speckle, light on top-left, so the blobs read as foliage instead of rock.
export function foliage() {
  const W = 512, rnd = mulberry32(31);
  const [c, g] = canvas(W, W);
  g.fillStyle = '#4c5c2c'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 9000; i++) {
    const l = 25 + rnd() * 45, x = rnd() * W, y = rnd() * W;
    g.fillStyle = `hsl(${78 + rnd() * 30}, ${30 + rnd() * 25}%, ${l}%)`;
    g.beginPath(); g.ellipse(x, y, 3 + rnd() * 5, 1.5 + rnd() * 2.5, rnd() * 3.14, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(10,18,6,${0.3 + rnd() * 0.4})`;
    g.beginPath(); g.arc(rnd() * W, rnd() * W, 1 + rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Leaf clump card (alpha), stuck around bush tops to break their outline.
export function leafCard() {
  const W = 256, rnd = mulberry32(41);
  const [c, g] = canvas(W, W);
  g.clearRect(0, 0, W, W);
  for (let i = 0; i < 420; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (W * 0.46);
    const x = W / 2 + Math.cos(a) * r, y = W / 2 + Math.sin(a) * r * 0.8;
    g.fillStyle = `hsl(${76 + rnd() * 34}, ${32 + rnd() * 28}%, ${22 + rnd() * 38}%)`;
    g.beginPath(); g.ellipse(x, y, 5 + rnd() * 7, 2 + rnd() * 3, rnd() * 3.14, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

export function bark() {
  const W = 128, H = 512, rnd = mulberry32(8);
  const [c, g] = canvas(W, H);
  g.fillStyle = '#7d6d58'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 10 + rnd() * 8) {
    g.fillStyle = `rgba(50,40,30,${0.3 + rnd() * 0.3})`;
    g.fillRect(0, y, W, 3 + rnd() * 3);
    g.fillStyle = `rgba(200,185,160,${0.1 + rnd() * 0.15})`;
    g.fillRect(0, y + 4, W, 2);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// The clapperboard face the truck tows: slate with chalk lines.
export function slate() {
  const W = 1024, H = 700;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#17171a'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(240,240,235,0.85)'; g.lineWidth = 6;
  g.strokeRect(30, 30, W - 60, H - 60);
  for (const y of [260, 450]) { g.beginPath(); g.moveTo(30, y); g.lineTo(W - 30, y); g.stroke(); }
  g.beginPath(); g.moveTo(W / 2, 260); g.lineTo(W / 2, H - 30); g.stroke();
  g.fillStyle = 'rgba(240,240,235,0.92)';
  g.font = '800 120px Fraunces'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('EditorBro', W / 2, 150);
  g.font = '700 56px Fraunces';
  g.fillText('SCENE 01', W / 4, 355); g.fillText('TAKE 01', (W * 3) / 4, 355);
  g.font = '600 46px Fraunces';
  g.fillText('PROMPT', W / 4, 560); g.fillText('RENDER', (W * 3) / 4, 560);
  return tex(c);
}
