// Pure helpers for the Halcyon Grid demo. Everything the reel drives is a function of t.
import gsap from 'gsap';

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const fract = (x: number) => x - Math.floor(x);
export const hash = (n: number) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);

export const ease = {
  out3: gsap.parseEase('power3.out'),
  expoOut: gsap.parseEase('expo.out'),
  inOut3: gsap.parseEase('power3.inOut'),
  in2: gsap.parseEase('power2.in'),
};

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll(sel)) as T[];
export const fmt = (n: number, d = 0) => n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
