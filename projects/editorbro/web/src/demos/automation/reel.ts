// Flowsmith reel tour, a pure function of t (mobile 432x768):
//  0.00-1.30  canvas: steps drop into place one by one, links draw
//  1.42       tap Run
//  1.55-4.45  packets travel node to node; each step spins, then shows its output; the log sheet rises and fills
//  4.45-6.00  success: banner, summary row, log grows, the camera pulls back to show the whole flow lit
import gsap from 'gsap';
import type { FNode, Sched, RunView } from './main';

interface FlowApi {
  nodes: FNode[];
  schedule(): Sched;
  drawRun(v: RunView): void;
  setBanner(k: number): void;
  fitCam(bottomInset?: number, topInset?: number): { x: number; y: number; z: number };
  cam: { x: number; y: number; z: number };
  applyCam(): void;
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, d: number) => clamp((t - a) / d);
const expo = gsap.parseEase('expo.out');
const p3o = gsap.parseEase('power3.out');
const p2io = gsap.parseEase('power2.inOut');
const p2i = gsap.parseEase('power2.in');
const T = { tap: 1.42, run: 1.55, runEnd: 4.45, ok: 4.5 };

export function startReel(api: FlowApi) {
  const win = window as Window & { seek?: (t: number) => void; __ready?: boolean };
  const sched = api.schedule();
  const scale = (T.runEnd - T.run) / sched.total;
  const side = document.getElementById('side')!;
  const runBtn = document.getElementById('run')!;
  const tap = document.createElement('div');
  tap.className = 'tap';
  document.body.append(tap);

  const seek = (tt: number) => {
    const t = clamp(tt, 0, 6);
    // log sheet: peek -> run -> success
    // grows while the log fills, then settles to header + summary so the lit flow fills the screen
    const h = 96 + 180 * expo(seg(t, T.run + 0.05, 0.6)) - 104 * expo(seg(t, T.ok + 0.25, 0.7));
    side.style.height = `${h}px`;
    const banner = expo(seg(t, T.ok, 0.55));
    api.setBanner(banner);
    Object.assign(api.cam, api.fitCam(h, 50 * banner));
    api.applyCam();

    const rt = t < T.run ? -1 : (t - T.run) / scale;
    api.drawRun({
      rt, sched, time: t,
      assemble: api.nodes.map((_, i) => expo(seg(t, -0.5 + i * 0.12, 0.7))),
      edgeDraw: p2io(seg(t, 0.05, 1.1)),
    });
    // success sweep: each step glows in turn
    api.nodes.forEach((n, i) => {
      const u = seg(t, T.ok + 0.15 + i * 0.07, 0.5);
      document.getElementById(`n-${n.id}`)!.style.setProperty('--sw', String(Math.sin(u * Math.PI)));
    });
    // finger tap on Run
    const press = Math.sin(Math.PI * seg(t, T.tap - 0.06, 0.24));
    runBtn.style.transform = `scale(${1 - 0.05 * press})`;
    const u = seg(t, T.tap - 0.14, 0.5);
    if (u > 0 && u < 1) {
      const r = runBtn.getBoundingClientRect();
      tap.style.opacity = String(Math.min(1, u * 5) * (1 - p2i(seg(u, 0.55, 0.45))));
      tap.style.transform = `translate(${r.left + r.width / 2 - 28}px, ${r.top + r.height / 2 - 28}px) scale(${0.7 + 0.5 * p3o(u)})`;
      tap.style.setProperty('--ring', String(p3o(u)));
    } else tap.style.opacity = '0';
  };

  win.seek = seek;
  seek(0);
  win.__ready = true;
}
