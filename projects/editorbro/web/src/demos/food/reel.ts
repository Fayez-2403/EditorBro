// Tiffinly reel tour: a pure function of t (0-6 s) over the real app DOM. No timers, no rAF.
//  0.00-1.45  home lands, scrolls to Saffron Handi, tap
//  1.50-2.05  kitchen menu slides up
//  2.10 / 2.92  ADD Chicken Dum Biryani, scroll, ADD Double ka Meetha (dish flies into the cart bar)
//  3.42-3.98  tap View cart, cart sheet with the bill
//  4.00-4.40  tap Place order, button fills
//  4.32-6.00  status: confirmed (check draws) -> cooking -> out for delivery
import gsap from 'gsap';
import { RESTAURANTS, type Restaurant } from './data';
import type { StatusState } from './main';
import { art } from './art';

export interface FoodApi {
  setCart(e: Array<[string, number]>): void;
  setRest(r: Restaurant): void;
  renderSteppers(): void;
  renderCartBar(total?: number): void;
  renderCart(): void;
  drawStatus(s: StatusState): void;
  fillOrderSummary(): void;
  itemTotal(): number;
  syncTabs(): void;
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t: number, a: number, d: number) => clamp((t - a) / d);
const expo = gsap.parseEase('expo.out');
const p3o = gsap.parseEase('power3.out');
const p3io = gsap.parseEase('power3.inOut');
const p2i = gsap.parseEase('power2.in');
const p2io = gsap.parseEase('power2.inOut');

const A = 'sh-cdb', B = 'sh-dkm';
// Layout offset that ignores transforms (the reel moves things with transforms).
const absTop = (el: HTMLElement | null) => { let y = 0; while (el) { y += el.offsetTop; el = el.offsetParent as HTMLElement | null; } return y; };
const T = {
  scroll: 0.95, tapCard: 1.42, rest: 1.5, tapA: 2.08, addA: 2.16, menuScroll: 2.4, tapB: 2.9, addB: 2.98,
  tapCart: 3.42, cart: 3.48, tapPlace: 4.0, place: 4.04, status: 4.34, check: 4.42, cook: 4.98, out: 5.46,
};
const TAPS: Array<{ t: number; sel: string; dx?: number }> = [
  { t: T.tapCard, sel: '.rcard[data-rest="saffron-handi"] .rart' },
  { t: T.tapA, sel: `#mi-${A} .mctl` },
  { t: T.tapB, sel: `#mi-${B} .mctl` },
  { t: T.tapCart, sel: '#cartbarBtn .cb-r' },
  { t: T.tapPlace, sel: '#place .pr' },
];

export function startReel(api: FoodApi) {
  const win = window as Window & { seek?: (t: number) => void; __ready?: boolean };
  const q = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
  const qa = (s: string) => [...document.querySelectorAll<HTMLElement>(s)];

  api.setRest(RESTAURANTS[1]);
  const home = q('#home'), rest = q('#rest'), restScroll = q('#restScroll'), cartEl = q('#cart'), status = q('#status');
  const bar = q('#cartbar'), scrim = q('#scrim'), tap = q('#tap'), fly = q('#fly');
  fly.innerHTML = art('biryani');
  const flyB = fly.cloneNode() as HTMLElement;
  flyB.innerHTML = art('meetha');
  fly.after(flyB);
  for (const [el, z] of [[rest, 40], [bar, 45], [cartEl, 50], [status, 60]] as const) el.style.zIndex = String(z);

  const enter: Array<{ el: HTMLElement; at: number; dy: number }> = [];
  // The first frame is already composed (nav, search, promo in place); the chips and cards are still settling.
  qa('.nav > *').forEach((el, i) => enter.push({ el, at: -0.9 + i * 0.04, dy: -12 }));
  enter.push({ el: q('.search'), at: -0.8, dy: 22 });
  enter.push({ el: q('.promo'), at: -0.62, dy: 30 });
  qa('.chip').forEach((el, i) => enter.push({ el, at: -0.42 + i * 0.06, dy: 22 }));
  enter.push({ el: q('.sec-head'), at: -0.12, dy: 22 });
  qa('.rcard').forEach((el, i) => enter.push({ el, at: -0.08 + i * 0.08, dy: 46 }));

  let key = '';
  let homeY = -1, menuY = -1;

  const seek = (tt: number) => {
    const t = clamp(tt, 0, 6);
    // cart contents for this instant
    const a = t >= T.addA ? 1 : 0, b = t >= T.addB ? 1 : 0;
    const k = `${a}${b}`;
    if (k !== key) {
      key = k;
      api.setCart([[A, a], [B, b]]);
      api.renderSteppers();
      api.renderCart();
      api.fillOrderSummary();
    }
    const total = 329 + 129 * p3o(seg(t, T.addB, 0.4)) * b;
    api.renderCartBar(Math.round(a ? total : 0));
    if (homeY < 0) {
      homeY = Math.max(0, absTop(q('.rcard[data-rest="saffron-handi"]')) - 118);
      menuY = Math.max(0, absTop(q(`#mi-${B}`)) - absTop(restScroll) - 250);
    }

    // home: land, then scroll to the kitchen
    for (const e of enter) {
      const p = expo(seg(t, e.at, 0.8));
      e.el.style.opacity = String(p);
      e.el.style.transform = `translateY(${(1 - p) * e.dy}px)`;
    }
    const sy = homeY * p3io(seg(t, T.scroll, 0.5));
    window.scrollTo(0, sy);
    const press = Math.sin(Math.PI * seg(t, T.tapCard - 0.06, 0.24));
    q('.rcard[data-rest="saffron-handi"]').style.transform = `scale(${1 - press * 0.025})`;
    q('#tray').style.transform = `rotate(${-8 + t * 7}deg)`;
    qa('.steam path').forEach((p, i) => {
      const c = (t * 0.7 + i * 0.33) % 1;
      p.style.transform = `translateY(${-c * 10}px)`;
      p.style.opacity = String(0.8 * Math.sin(c * Math.PI));
    });

    // sheets
    const pR = expo(seg(t, T.rest, 0.62));
    const pC = expo(seg(t, T.cart, 0.6));
    const pS = expo(seg(t, T.status, 0.62));
    home.style.transformOrigin = `50% ${sy + 384}px`;
    gsap.set(home, { scale: 1 - 0.06 * pR, borderRadius: 22 * pR });
    gsap.set(scrim, { autoAlpha: pR });
    gsap.set(rest, { autoAlpha: pR > 0 ? 1 : 0, yPercent: (1 - pR) * 100, xPercent: 0, scale: 1 - 0.05 * pC });
    gsap.set(cartEl, { autoAlpha: pC > 0 ? 1 : 0, yPercent: (1 - pC) * 100, xPercent: 0, scale: 1 - 0.04 * pS });
    gsap.set(status, { autoAlpha: pS > 0 ? 1 : 0, yPercent: (1 - pS) * 100, xPercent: 0 });
    restScroll.scrollTop = menuY * p3io(seg(t, T.menuScroll, 0.45));
    api.syncTabs();

    // cart bar
    const pBin = expo(seg(t, T.addA + 0.04, 0.6)), pBout = p2i(seg(t, T.cart - 0.02, 0.28));
    const bump = Math.sin(Math.PI * seg(t, T.addB + 0.36, 0.3));
    gsap.set(bar, { autoAlpha: pBin > 0 && pBout < 1 ? 1 : 0, yPercent: (1 - pBin) * 120 + pBout * 120 });
    q('#cartbarBtn').style.transform = `scale(${1 + bump * 0.025 - Math.sin(Math.PI * seg(t, T.tapCart - 0.06, 0.24)) * 0.02})`;

    // steppers pop in
    for (const [id, at] of [[A, T.addA], [B, T.addB]] as const) {
      const qn = document.querySelector<HTMLElement>(`#mi-${id} .q`);
      if (qn) { const p = expo(seg(t, at, 0.45)); qn.style.transform = `translateY(${(1 - p) * 70}%)`; qn.style.opacity = String(p); }
      const host = document.querySelector<HTMLElement>(`#mi-${id} .mctl`);
      if (host) host.style.transform = `scale(${1 - 0.06 * Math.sin(Math.PI * seg(t, at - 0.1, 0.22))})`;
    }

    // dishes fly into the cart bar
    const flyTo = (el: HTMLElement, from: string, at: number) => {
      const p = seg(t, at, 0.44);
      if (p <= 0 || p >= 1) { el.style.opacity = '0'; return; }
      const s = q(from).getBoundingClientRect(), d = bar.getBoundingClientRect();
      const x0 = s.left + s.width / 2, y0 = s.top + s.height / 2 - 40, x1 = d.left + 52, y1 = d.top + d.height / 2;
      const e = p2io(p);
      const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - Math.sin(e * Math.PI) * 110;
      el.style.opacity = String(Math.min(1, (1 - p) * 6));
      el.style.transform = `translate(${x - 26}px, ${y - 26}px) scale(${1.1 - e * 0.55}) rotate(${e * 200}deg)`;
    };
    flyTo(fly, `#mi-${A} .mart`, T.addA);
    flyTo(flyB, `#mi-${B} .mart`, T.addB);

    // place order
    const pf = p2io(seg(t, T.place, 0.32));
    const fill = document.querySelector<HTMLElement>('#place .fill');
    if (fill) fill.style.transform = `scaleX(${pf})`;
    const label = document.getElementById('placeLabel');
    if (label) label.textContent = t >= T.place ? (pf >= 1 ? 'Order placed' : 'Placing order…') : 'Place order';
    const placeBtn = document.getElementById('place');
    if (placeBtn) placeBtn.style.transform = `scale(${1 - Math.sin(Math.PI * seg(t, T.tapPlace - 0.06, 0.24)) * 0.025})`;

    // status
    const kk = p3io(seg(t, T.cook, 0.42)) + p3io(seg(t, T.out, 0.46));
    api.drawStatus({ k: kk, check: p3o(seg(t, T.check, 0.42)), time: Math.max(0, t - T.status) });

    // finger taps
    tap.style.opacity = '0';
    for (const tp of TAPS) {
      const u = seg(t, tp.t - 0.14, 0.5);
      if (u <= 0 || u >= 1) continue;
      const r = q(tp.sel).getBoundingClientRect();
      const s = 0.7 + 0.5 * p3o(u);
      tap.style.opacity = String(Math.min(1, u * 5) * (1 - p2i(seg(u, 0.55, 0.45))));
      tap.style.transform = `translate(${r.left + r.width / 2 - 28}px, ${r.top + r.height / 2 - 28}px) scale(${s})`;
      tap.style.setProperty('--ring', String(p3o(u)));
    }
  };

  win.seek = seek;
  seek(0);
  win.__ready = true;
}
