// Small pure helpers shared by the Meridian Freight demo. Everything the reel drives is a function of t.
import gsap from 'gsap';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Linear progress of t through the window [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const ease = {
  out3: gsap.parseEase('power3.out'),
  expoOut: gsap.parseEase('expo.out'),
  inOut3: gsap.parseEase('power3.inOut'),
  expoInOut: gsap.parseEase('expo.inOut'),
  in2: gsap.parseEase('power2.in'),
};

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll(sel)) as T[];

export const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
