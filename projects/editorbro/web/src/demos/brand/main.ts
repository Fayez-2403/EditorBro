// LUMA Audio · Halo. Normal mode: live turntable, colourway switching, scroll story with a sticky product.
// Reel mode (?reel=1): window.seek(t) puts the whole page into the exact state for t in [0, 6], no timers.
import './style.css';
import gsap from 'gsap';
import { Stage, VARIANTS, VARIANT_ORDER, type Palette, type Pose, type VariantId } from './headphones';
import * as THREE from 'three';

const REEL = new URLSearchParams(location.search).has('reel');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = window as unknown as { seek: (t: number) => void; __ready?: boolean };
document.documentElement.classList.toggle('reel', REEL);

// ---------- helpers (pure) ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = {
  out: (x: number) => 1 - Math.pow(1 - x, 4), // power3.out
  in: (x: number) => x * x * x, // power2.in
  expoOut: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOut: (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2), // power3.inOut
  expoInOut: (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
  smooth: (x: number) => x * x * (3 - 2 * x),
};
const TAU = Math.PI * 2;
const nearest = (target: number, ref: number) => target + TAU * Math.round((ref - target) / TAU);
const mixAngle = (a: number, b: number, k: number) => lerp(a, nearest(b, a), k);
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];

// ---------- elements ----------
const canvas = $<HTMLCanvasElement>('#stage');
const heroStage = $('#heroStage');
const storyStage = $('#storyStage');
const ctaStage = $('#ctaStage');
const story = $('#sound');
const cta = $('#buy');
const nav = $('#nav');
const roll = $('#roll');
const ring = $('#swatchRing');
const swatches = $$<HTMLButtonElement>('.swatch');
const chapters = $$('.chapter .ch-inner');
const nums = $$('.chapter .num');
const ctaVariant = $('#ctaVariant');
const bagCount = $('#bagCount');
const bag = $('#bag');
const toast = $('#toast');
const tap = $('#tap');
const root = document.documentElement;

const stage = new Stage(canvas, { preserve: REEL, dpr: REEL ? window.devicePixelRatio : Math.min(window.devicePixelRatio, 2) });

// ---------- layout ----------
const L = { vw: 0, vh: 0, A1: 1, A2: 2, A3: 3, mobile: true, swatchStep: 52 };
function measure() {
  L.vw = window.innerWidth; L.vh = window.innerHeight;
  L.mobile = L.vw < 900;
  L.A1 = story.offsetTop;
  L.A2 = story.offsetTop + story.offsetHeight - L.vh;
  L.A3 = cta.offsetTop;
  const s0 = swatches[0].getBoundingClientRect(), s1 = swatches[1].getBoundingClientRect();
  L.swatchStep = s1.left - s0.left;
  stage.resize(L.vw, L.vh);
}

interface R { cx: number; cy: number; w: number; h: number }
function rectOf(el: HTMLElement, inset: number): R {
  const b = el.getBoundingClientRect();
  return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: b.width * inset, h: b.height * inset };
}
const lerpR = (a: R, b: R, k: number): R => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

const ANGLES = [0.62, 1.3, -0.32]; // battery 3/4, ANC side-on (left cup to camera), spatial near-front
function chapterAngle(cp: number) {
  if (cp <= 0) return ANGLES[0];
  if (cp >= 2) return ANGLES[2];
  const i = Math.floor(cp), f = ease.smooth(cp - i);
  return lerp(ANGLES[i], ANGLES[i + 1], f);
}

interface Scene { pose: Pose; sw: number; cw: number; cp: number }
function sceneAt(y: number, time: number, ticksOverride?: number): Scene {
  const heroR = rectOf(heroStage, L.mobile ? 0.9 : 0.86);
  const storyR = rectOf(storyStage, L.mobile ? 0.74 : 0.7);
  const ctaR = rectOf(ctaStage, L.mobile ? 0.98 : 0.84);
  let r: R; let sw = 0, cw = 0;
  if (y <= L.A1) { const k = ease.inOut(clamp(y / L.A1)); r = lerpR(heroR, storyR, k); sw = k; }
  else if (y <= L.A2) { r = storyR; sw = 1; }
  else if (y <= L.A3) { const k = ease.inOut(clamp((y - L.A2) / (L.A3 - L.A2))); r = lerpR(storyR, ctaR, k); sw = 1 - k; cw = k; }
  else { r = ctaR; cw = 1; }
  const cp = (y - L.A1) / L.vh;
  const bump = (c: number) => clamp(1 - (Math.abs(cp - c) - 0.2) / 0.3);
  const ticks = ticksOverride ?? ease.out(clamp((cp + 0.6) / 0.55));
  // fade the canvas once the specs section starts covering the screen
  const pastCta = y - L.A3;
  const opacity = clamp(1 - pastCta / (L.vh * 0.9));
  const pose: Pose = {
    ...r, rotY: 0, time, opacity,
    ticks, ticksVis: bump(0) * sw, anc: bump(1) * sw, orbit: bump(2) * sw,
    halo: 1 - 0.3 * sw,
  };
  return { pose, sw, cw, cp };
}

// ---------- page chrome driven by the same numbers ----------
function updateChapters(cp: number, counts?: number[]) {
  chapters.forEach((el, i) => {
    const d = cp - i;
    const o = clamp(1 - (Math.abs(d) - 0.14) / 0.24);
    el.style.opacity = String(o);
    el.style.transform = `translate3d(0, ${(-d * 18).toFixed(2)}px, 0)`;
    const to = Number(nums[i].dataset.to);
    const k = counts?.[i] ?? ease.out(clamp((d + 0.62) / 0.55));
    nums[i].textContent = String(Math.round(to * k));
  });
}

let paletteFrom: Palette = VARIANTS.graphite, paletteTo: Palette = VARIANTS.graphite, mixK = 1;
let rollFrom = 0, rollTo = 0;
let current: VariantId = 'graphite';
function mixPalette(a: Palette, b: Palette, k: number): Palette {
  const c = new THREE.Color(), d = new THREE.Color();
  const out = { ...b };
  (Object.keys(a) as (keyof Palette)[]).forEach((key) => {
    if (key === 'label') return;
    out[key] = '#' + c.set(a[key]).lerp(d.set(b[key]), k).getHexString();
  });
  return out;
}
function applyColours(a: Palette, b: Palette, k: number, rollVal: number) {
  stage.setColors(a, b, k);
  root.style.setProperty('--accent', '#' + stage.uiColor.getHexString());
  root.style.setProperty('--roll', rollVal.toFixed(4));
  root.style.setProperty('--ring-x', `${(rollVal * L.swatchStep).toFixed(2)}px`);
}
function markSwatch(v: VariantId) {
  swatches.forEach((s) => s.setAttribute('aria-checked', String(s.dataset.variant === v)));
  ctaVariant.textContent = VARIANTS[v].label;
}

function setTap(t: number, taps: { t: number; el: HTMLElement }[]) {
  let shown = false;
  for (const tp of taps) {
    const u = t - tp.t;
    if (u < -0.32 || u > 0.6) continue;
    const b = tp.el.getBoundingClientRect();
    tap.style.transform = `translate(${b.left + b.width / 2}px, ${b.top + b.height / 2}px)`;
    const o = clamp((u + 0.32) / 0.14) * clamp((0.6 - u) / 0.22);
    tap.style.opacity = String(o);
    const press = u < 0 ? 1 - 0.18 * ease.in(clamp((u + 0.08) / 0.08)) : 0.82 + 0.18 * ease.out(clamp(u / 0.16));
    tap.style.setProperty('--press', press.toFixed(3));
    const rk = clamp(u / 0.45);
    tap.style.setProperty('--ring', (1 + 1.3 * ease.out(rk)).toFixed(3));
    tap.style.setProperty('--ring-o', (u >= 0 ? 0.9 * (1 - rk) : 0).toFixed(3));
    shown = true;
    break;
  }
  if (!shown) tap.style.opacity = '0';
}

function setBuyMorph(btn: HTMLElement, k: number) {
  const label = $('.btn-label', btn), done = $('.btn-done', btn);
  label.style.transform = `translateY(${(-110 * k).toFixed(1)}%)`;
  label.style.opacity = String(1 - k);
  done.style.transform = `translateY(${(110 * (1 - k)).toFixed(1)}%)`;
  done.style.opacity = String(k);
  btn.style.background = `color-mix(in srgb, var(--accent) ${(k * 100).toFixed(1)}%, var(--ink))`;
}

function setScroll(y: number) {
  const se = document.scrollingElement || document.documentElement;
  se.scrollTop = y;
}

// =====================================================================================
// Reel mode: one pure function of t.
// =====================================================================================
const T = {
  sand: 1.55, ember: 2.45, colour: 0.7,
  s1: [3.05, 3.85] as const, d1: [3.85, 4.55] as const, s2: [4.55, 5.2] as const,
  buy: 5.5,
};

function reelScroll(t: number) {
  const ctaY = L.A3;
  if (t < T.s1[0]) return 0;
  if (t < T.s1[1]) return lerp(0, L.A1, ease.inOut(seg(t, T.s1[0], T.s1[1])));
  if (t < T.d1[1]) return L.A1 + 34 * ease.smooth(seg(t, T.d1[0], T.d1[1]));
  if (t < T.s2[1]) return lerp(L.A1 + 34, ctaY, ease.expoInOut(seg(t, T.s2[0], T.s2[1])));
  return ctaY + 14 * seg(t, T.s2[1], 6);
}

function reelSeek(tIn: number) {
  const t = clamp(tIn, 0, 6);
  const y = Math.round(reelScroll(t));
  setScroll(y);
  const yy = (document.scrollingElement || document.documentElement).scrollTop;

  // colourways: graphite -> sand -> ember
  const k1 = ease.expoOut(seg(t, T.sand, T.sand + T.colour));
  const k2 = ease.expoOut(seg(t, T.ember, T.ember + T.colour));
  let a = VARIANTS.graphite, b = VARIANTS.sand, k = k1;
  if (t >= T.ember) { a = VARIANTS.sand; b = VARIANTS.ember; k = k2; }
  const rollVal = t >= T.ember ? 1 + k2 : k1;
  applyColours(a, b, k, rollVal);
  markSwatch(t >= T.ember ? 'ember' : t >= T.sand ? 'sand' : 'graphite');

  // 3D
  const ticks = ease.out(seg(t, 3.5, 4.5));
  const sc = sceneAt(yy, t, ticks);
  const turn = 0.5 + t * 0.3;
  const ch = chapterAngle(sc.cp) + 0.08 * Math.sin(t * 0.9);
  sc.pose.rotY = mixAngle(turn, ch, sc.sw);
  stage.render(sc.pose);

  // chapters + counters
  const cnt = ease.out(seg(t, 3.5, 4.5));
  updateChapters(sc.cp, [cnt, 1, 1]);

  // chrome
  nav.classList.toggle('solid', yy > 40);
  root.style.setProperty('--sheen', `${(lerp(100, -10, ease.inOut(seg(t, 0.15, 1.45)))).toFixed(2)}%`);
  root.style.setProperty('--pulse', (0.5 + 0.5 * Math.sin(t * 4.2)).toFixed(3));

  // Buy
  const ctaBtn = $('#ctaBuy');
  const bk = ease.expoOut(seg(t, T.buy + 0.06, T.buy + 0.5));
  setBuyMorph(ctaBtn, bk);
  const press = t >= T.buy - 0.06 && t < T.buy + 0.14 ? 0.97 : 1;
  ctaBtn.style.transform = `scale(${press})`;
  const bump = t < T.buy + 0.12 ? 0 : 1 + 0.35 * Math.sin(Math.PI * seg(t, T.buy + 0.12, T.buy + 0.42));
  bagCount.textContent = t < T.buy + 0.12 ? '0' : '1';
  bagCount.style.setProperty('--bump', bump.toFixed(3));

  setTap(t, [
    { t: T.sand, el: swatches[1] },
    { t: T.ember, el: swatches[2] },
    { t: T.buy, el: ctaBtn },
  ]);
}

// =====================================================================================
// Normal mode
// =====================================================================================
let angle = 0.5;
let last = 0;
const intro = { k: REDUCED ? 1 : 0 };
let count = 0;
let toastTimer = 0;

function setVariant(v: VariantId) {
  if (v === current) return;
  const now = mixPalette(paletteFrom, paletteTo, mixK);
  const rollNow = lerp(rollFrom, rollTo, ease.expoOut(mixK));
  paletteFrom = now; paletteTo = VARIANTS[v];
  rollFrom = rollNow; rollTo = VARIANT_ORDER.indexOf(v);
  current = v;
  markSwatch(v);
  const proxy = { k: 0 };
  mixK = 0;
  gsap.to(proxy, {
    k: 1, duration: REDUCED ? 0 : 0.75, ease: 'expo.out', overwrite: true,
    onUpdate: () => { mixK = proxy.k; },
  });
}

function addToBag(btn: HTMLElement) {
  count += 1;
  bagCount.textContent = String(count);
  bag.setAttribute('aria-label', `Bag, ${count} item${count === 1 ? '' : 's'}`);
  btn.dataset.added = '1';
  gsap.fromTo(bagCount, { '--bump': 1.4 }, { '--bump': 1, duration: 0.5, ease: 'power3.out' });
  toast.textContent = `LUMA Halo · ${VARIANTS[current].label} added to your bag`;
  gsap.to(toast, { y: '-140%', opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true });
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    gsap.to(toast, { y: '0%', opacity: 0, duration: 0.4, ease: 'power2.in' });
    btn.dataset.added = '0';
  }, 2600);
}

function frame(ms: number) {
  const time = ms / 1000;
  const dt = Math.min(0.05, last ? time - last : 0.016);
  last = time;
  const y = window.scrollY;
  if (y < L.A3 + L.vh) {
    const sc = sceneAt(y, REDUCED ? 0 : time);
    // integrated rotation: free spin in hero/CTA, settle on chapter angles in the story
    const spin = REDUCED ? 0 : 0.32;
    angle += dt * spin * (1 - sc.sw);
    if (sc.sw > 0) {
      const target = chapterAngle(sc.cp) + (REDUCED ? 0 : 0.08 * Math.sin(time * 0.9));
      angle = lerp(angle, nearest(target, angle), 1 - Math.exp(-dt * 5 * sc.sw));
    }
    sc.pose.rotY = angle;
    // intro: rise + fade in
    const ik = intro.k;
    sc.pose.opacity *= ik;
    sc.pose.cy += (1 - ik) * 40;
    sc.pose.w *= 0.9 + 0.1 * ik; sc.pose.h *= 0.9 + 0.1 * ik;
    sc.pose.halo *= ik;
    applyColours(paletteFrom, paletteTo, mixK, lerp(rollFrom, rollTo, mixK));
    stage.render(sc.pose);
    updateChapters(sc.cp);
  }
  nav.classList.toggle('solid', y > 40);
  if (!REDUCED) root.style.setProperty('--pulse', (0.5 + 0.5 * Math.sin(time * 3)).toFixed(3));
  requestAnimationFrame(frame);
}

let introTl: gsap.core.Timeline | null = null;
function startNormal() {
  swatches.forEach((s, i) => {
    s.addEventListener('click', () => setVariant(s.dataset.variant as VariantId));
    s.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const n = swatches[(i + dir + swatches.length) % swatches.length];
      n.focus();
      setVariant(n.dataset.variant as VariantId);
    });
  });
  swatches.forEach((s) => (s.tabIndex = s.dataset.variant === current ? 0 : -1));
  $$<HTMLElement>('[data-buy]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    addToBag(b);
  }));
  window.addEventListener('resize', measure);

  introTl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (!REDUCED) {
    introTl
      .from('.hero-title .ln > *', { yPercent: 115, duration: 0.95, stagger: 0.07 }, 0.1)
      .from('.eyebrow, .hero-sub', { y: 14, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' }, 0.2)
      .to(intro, { k: 1, duration: 1.3, ease: 'power3.out' }, 0.15)
      .from('.buy-panel > *', { y: 16, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out' }, 0.45)
      .from('.nav > *', { y: -10, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out' }, 0.3)
      .fromTo(root, { '--sheen': '100%' }, { '--sheen': '-10%', duration: 1.4, ease: 'power3.inOut' }, 0.9);
    gsap.fromTo(root, { '--sheen': '100%' }, { '--sheen': '-10%', duration: 1.4, ease: 'power3.inOut', repeat: -1, repeatDelay: 7, delay: 9 });
    // spec rows rise in as they enter
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        gsap.from(en.target.children, { y: 18, opacity: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' });
      });
    }, { threshold: 0.2 });
    $$('.spec-grid, .specs-head, .foot-cols').forEach((el) => io.observe(el));
  }
  requestAnimationFrame(frame);
}

// =====================================================================================
async function boot() {
  measure();
  const faces = ['300 52px Archivo', '600 15px Archivo', '200 92px Archivo', 'italic 400 40px "Instrument Serif"', '500 11px "JetBrains Mono"', '400 11px "JetBrains Mono"'];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;
  measure();
  if (REEL) {
    W.seek = reelSeek;
    reelSeek(0);
  } else {
    applyColours(paletteFrom, paletteTo, 1, 0);
    markSwatch('graphite');
    startNormal();
    W.seek = () => { introTl?.progress(1); intro.k = 1; };
  }
  W.__ready = true;
}
boot();
