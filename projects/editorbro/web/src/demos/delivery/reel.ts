// Dashr reel tour, a pure function of t over the real page (mobile, 432x768):
//  0.00-1.50  overview: the route draws in, pins pop, the sheet rises, the camera eases in
//  1.10-2.05  camera dives from the overview onto the courier
//  1.50-4.45  courier rides the route, camera follows a little ahead; ETA counts down
//  ~3.60      enters the nearby zone: amber geofence, "Arjun is nearby" toast
//  4.45-6.00  delivered: burst at the door, sheet grows, proof of delivery, signature draws, stars
import gsap from 'gsap';
import { DROP } from './map';
import type { FrameState, Cam } from './main';

interface DashrApi {
  render(s: FrameState): void;
  measure(sheetH?: number): unknown;
  overviewCam(sheetH?: number): Cam;
  pointAt(p: number): { x: number; y: number };
  P_NEAR: number;
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, d: number) => clamp((t - a) / d);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const expo = gsap.parseEase('expo.out');
const p3o = gsap.parseEase('power3.out');
const p3io = gsap.parseEase('power3.inOut');
const p2io = gsap.parseEase('power2.inOut');
const p2i = gsap.parseEase('power2.in');
const p1io = gsap.parseEase('power1.inOut');

const H0 = 318, H1 = 572;
const T = { ride: 1.5, rideDur: 2.95, dive: 1.1, diveDur: 0.95, near: 3.62, done: 4.45, grow: 4.55, sig: 4.88, stars: 5.55 };

export function startReel(api: DashrApi) {
  const win = window as Window & { seek?: (t: number) => void; __ready?: boolean };
  const panel = document.getElementById('panel')!;
  const ov = api.overviewCam(H0);
  const zF = 1.05;

  const seek = (tt: number) => {
    const t = clamp(tt, 0, 6);
    const grow = expo(seg(t, T.grow, 0.7));
    const sheet = lerp(H0, H1, grow);
    panel.style.transform = `translateY(${(1 - expo(seg(t, -0.5, 0.75))) * 105}%)`;
    panel.style.height = `${sheet}px`;
    api.measure(sheet);

    const p = 0.035 + 0.965 * p2io(seg(t, T.ride, T.rideDur));
    // camera: overview -> dive onto the courier -> follow slightly ahead -> pull back over the door
    const ovz = ov.z * (0.94 + 0.08 * p3o(seg(t, 0, 1.4)));
    const c = api.pointAt(p), ahead = api.pointAt(Math.min(1, p + 0.03));
    const fx = lerp(c.x, ahead.x, 0.6), fy = lerp(c.y, ahead.y, 0.6);
    const e = p3io(seg(t, T.dive, T.diveDur));
    let cam: Cam = { x: lerp(ov.x, fx, e), y: lerp(ov.y, fy, e), z: ovz * Math.pow(zF / ovz, e) };
    const e2 = p3io(seg(t, T.done, 1.1));
    cam = { x: lerp(cam.x, DROP[0] - 10, e2), y: lerp(cam.y, DROP[1] - 30, e2), z: cam.z * Math.pow(0.95 / zF, e2) };

    const toastIn = expo(seg(t, T.near, 0.5)), toastOut = p2i(seg(t, T.done, 0.3));
    api.render({
      p, time: t, cam,
      reveal: p2io(seg(t, -0.4, 1.3)),
      pinA: expo(seg(t, -0.5, 0.6)), pinB: expo(seg(t, 0.6, 0.6)), courierIn: expo(seg(t, 0.15, 0.6)),
      toast: toastIn * (1 - toastOut),
      burst: p3o(seg(t, T.done, 0.85)),
      pod: expo(seg(t, T.grow + 0.1, 0.6)),
      sig: p1io(seg(t, T.sig, 0.95)),
      stars: seg(t, T.stars, 0.4),
    });
  };

  win.seek = seek;
  seek(0);
  win.__ready = true;
}
