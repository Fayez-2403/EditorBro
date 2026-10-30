// The Halcyon hero: a twisting ribbon of light lines with charge pulses travelling along it.
// drawField(t) is a pure function of t (no clocks, no randomness), so the reel can seek it frame by frame.
import { fract, hash } from './util';

export interface Field {
  resize(): void;
  draw(t: number): void;
}

export function createField(canvas: HTMLCanvasElement): Field {
  const ctx = canvas.getContext('2d')!;
  let W = 1, H = 1, dpr = 1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };

  const N = 54;
  const SEG = 150;

  function lineY(u: number, nx: number, t: number, mobile: boolean) {
    const cy = mobile ? 0.74 : 0.58;
    const amp = mobile ? 0.085 : 0.12;
    const spread = mobile ? 0.3 : 0.5;
    const env = 0.35 + 0.65 * Math.sin(Math.min(1, Math.max(0, nx)) * Math.PI * 0.92 + 0.12);
    const wave = Math.sin(nx * 4.6 + t * 0.32 + u * 2.4) * 0.55 + Math.sin(nx * 1.9 - t * 0.21 + u * 1.1) * 0.45;
    const twist = Math.sin(nx * 2.3 + t * 0.16 + 0.7);
    return H * cy + wave * H * amp * env + (u - 0.5) * H * spread * (0.18 + 0.82 * twist) * (mobile ? 1.15 : 1);
  }

  function draw(t: number) {
    const mobile = W < 760;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#05080c');
    bg.addColorStop(0.55, '#08121a');
    bg.addColorStop(1, '#0b1a22');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // faint survey grid
    ctx.strokeStyle = 'rgba(160, 220, 210, 0.045)';
    ctx.lineWidth = 1;
    const step = mobile ? 54 : 80;
    ctx.beginPath();
    for (let x = (W % step) / 2; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // horizon glow
    const gy = H * (mobile ? 0.74 : 0.6);
    const glow = ctx.createRadialGradient(W * (mobile ? 0.6 : 0.68), gy, 0, W * (mobile ? 0.6 : 0.68), gy, Math.max(W, H) * 0.6);
    glow.addColorStop(0, 'rgba(60, 200, 170, 0.16)');
    glow.addColorStop(1, 'rgba(60, 200, 170, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#2a8f86');
    grad.addColorStop(0.45, '#7cf2c3');
    grad.addColorStop(0.75, '#9ee8ff');
    grad.addColorStop(1, '#ffb25b');
    ctx.strokeStyle = grad;
    const x0 = -W * 0.05, x1 = W * 1.05;
    for (let j = 0; j < N; j++) {
      const u = j / (N - 1);
      const edge = Math.abs(u - 0.5) * 2;
      ctx.globalAlpha = 0.1 + 0.26 * Math.pow(edge, 3) + (j % 9 === 4 ? 0.14 : 0);
      ctx.lineWidth = j % 9 === 4 ? 1.4 : 1;
      ctx.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const x = x0 + ((x1 - x0) * i) / SEG;
        const y = lineY(u, x / W, t, mobile);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // charge pulses: short bright comets riding individual lines
    ctx.lineCap = 'round';
    for (let k = 0; k < 16; k++) {
      const j = Math.floor(hash(k + 1) * N);
      const u = j / (N - 1);
      const speed = 0.05 + hash(k + 40) * 0.07;
      const head = fract(hash(k + 80) + t * speed) * 1.25 - 0.1;
      const amber = k % 4 === 0;
      for (let s = 0; s < 14; s++) {
        const a = head - s * 0.006, b = head - (s + 1) * 0.006;
        ctx.globalAlpha = (1 - s / 14) * 0.9;
        ctx.strokeStyle = amber ? '#ffc27a' : '#c8fff0';
        ctx.lineWidth = 2.2 - s * 0.1;
        ctx.beginPath();
        ctx.moveTo(a * W, lineY(u, a, t, mobile));
        ctx.lineTo(b * W, lineY(u, b, t, mobile));
        ctx.stroke();
      }
      const hx = head * W, hy = lineY(u, head, t, mobile);
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
      g.addColorStop(0, amber ? 'rgba(255, 194, 122, 0.55)' : 'rgba(200, 255, 240, 0.5)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(hx - 14, hy - 14, 28, 28);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // keep the copy side quiet: darken the top-left where the headline sits
    const veil = mobile ? ctx.createLinearGradient(0, 0, 0, H) : ctx.createLinearGradient(0, 0, W, 0);
    if (mobile) {
      veil.addColorStop(0, 'rgba(5, 8, 12, 0.92)');
      veil.addColorStop(0.5, 'rgba(5, 8, 12, 0.55)');
      veil.addColorStop(0.68, 'rgba(5, 8, 12, 0)');
    } else {
      veil.addColorStop(0, 'rgba(5, 8, 12, 0.88)');
      veil.addColorStop(0.42, 'rgba(5, 8, 12, 0.45)');
      veil.addColorStop(0.62, 'rgba(5, 8, 12, 0)');
    }
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);
  }

  resize();
  return { resize, draw };
}
