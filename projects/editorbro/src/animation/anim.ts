// Motion primitives. Every function is pure: same inputs, same output. Time is in frames or seconds as named.
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => clamp((x - a) / (b - a || 1e-9));

export type Ease = (t: number) => number;
export const linear: Ease = (t) => t;
export const smoothStep: Ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smootherStep: Ease = (t) => { t = clamp(t); return t * t * t * (t * (6 * t - 15) + 10); };
export const easeInCubic: Ease = (t) => clamp(t) ** 3;
export const easeOutCubic: Ease = (t) => 1 - (1 - clamp(t)) ** 3;
export const easeInOutCubic: Ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
export const easeOutQuint: Ease = (t) => 1 - (1 - clamp(t)) ** 5;
export const easeInQuint: Ease = (t) => clamp(t) ** 5;
export const easeInOutQuint: Ease = (t) => { t = clamp(t); return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2; };
export const easeOutExpo: Ease = (t) => (clamp(t) >= 1 ? 1 : 1 - 2 ** (-10 * clamp(t)));
export const easeInExpo: Ease = (t) => (clamp(t) <= 0 ? 0 : 2 ** (10 * clamp(t) - 10));
export const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;

/** x mapped from [a,b] to [from,to] through an ease (clamped). */
export const remap = (x: number, a: number, b: number, from = 0, to = 1, ease: Ease = linear) => lerp(from, to, ease(invLerp(a, b, x)));

/** 0 before `at`, then 0->1 over `dur` frames with an ease. */
export const reveal = (frame: number, at: number, dur: number, ease: Ease = easeOutCubic) => ease(invLerp(at, at + dur, frame));
/** in at `a`, hold, out at `b` (both over `d` frames). */
export const window_ = (frame: number, a: number, b: number, d = 10, ease: Ease = easeInOutCubic) =>
  Math.min(ease(invLerp(a, a + d, frame)), 1 - ease(invLerp(b - d, b, frame)));

/** critically damped spring step response, t in seconds, w = stiffness (rad/s): no overshoot */
export const criticalSpring = (t: number, w = 9) => (t <= 0 ? 0 : 1 - (1 + w * t) * Math.exp(-w * t));
/** underdamped spring step response (zeta < 1 overshoots) */
export const dampedSpring = (t: number, w = 12, zeta = 0.45) => {
  if (t <= 0) return 0;
  if (zeta >= 1) return criticalSpring(t, w);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
};

/** start frame of item i of n spread over `span` frames */
export const stagger = (i: number, n: number, span: number) => (n <= 1 ? 0 : (i / (n - 1)) * span);

/** shortest-path angle interpolation (radians) */
export const angleLerp = (a: number, b: number, t: number) => {
  let d = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};

/** number counted up from 0 to value between frames [at, at+dur] */
export const countUp = (frame: number, at: number, dur: number, value: number, ease: Ease = easeOutExpo) => value * ease(invLerp(at, at + dur, frame));
export const fmt = (x: number, decimals = 1) => x.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** a decaying pulse on every beat (t seconds): 1 at the beat, falling with `decay` (1/s) */
export const beatPulse = (t: number, bpm = 100, decay = 7) => {
  const b = 60 / bpm, ph = ((t % b) + b) % b;
  return Math.exp(-decay * ph);
};

/** Catmull-Rom through points (any dimension), u in [0,1]; endpoints are held */
export function spline(points: number[][], u: number): number[] {
  const n = points.length - 1, x = clamp(u) * n, i = Math.min(n - 1, Math.floor(x)), t = x - i;
  const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(n, i + 2)];
  return p1.map((_, k) => {
    const a = p0[k], b = p1[k], c = p2[k], d = p3[k];
    return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  });
}

/** keyframed value: [[frame, value], ...] with an ease per segment */
export function keys(frame: number, k: [number, number][], ease: Ease = easeInOutCubic) {
  if (frame <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [f0, v0] = k[i], [f1, v1] = k[i + 1];
    if (frame <= f1) return lerp(v0, v1, ease(invLerp(f0, f1, frame)));
  }
  return k[k.length - 1][1];
}
