// Halcyon Grid: corporate site for a fictional battery-storage company.
// Normal mode is fully interactive; ?reel=1 exposes a deterministic 6 s tour through window.seek(t).
import './style.css';
import gsap from 'gsap';
import { createField } from './field';
import { sceneUtility, sceneCI, sceneMicrogrid, sceneOS, thumbShift, thumbIsland, thumbPeak, irChart, IR } from './scenes';
import { $, $$, clamp, ease, fmt, lerp, reducedMotion, seg } from './util';

const REEL = new URLSearchParams(location.search).get('reel') === '1';
if (REEL) document.documentElement.classList.add('reel');

// ---------------------------------------------------------------- inject art
const SCENES: Record<string, () => string> = { utility: sceneUtility, ci: sceneCI, micro: sceneMicrogrid, os: sceneOS };
const panels = $$('.panel');
panels.forEach((p) => ($('.panel__art', p).innerHTML = SCENES[p.dataset.scene!]()));
const THUMBS: Record<string, () => string> = { shift: thumbShift, island: thumbIsland, peak: thumbPeak };
$$('[data-thumb]').forEach((el) => (el.innerHTML = THUMBS[el.dataset.thumb!]()));
$('.ir-chart-wrap').innerHTML = irChart();

// ---------------------------------------------------------------- hero
const field = createField($<HTMLCanvasElement>('.hero__field'));
const hero = $('.hero');
const hdr = $('#hdr');
const wave = $<SVGPathElement>('.calm__wave');
const waveLen = wave.getTotalLength() || 260;
wave.style.strokeDasharray = `${waveLen}`;
const darkSecs = $$('.hero, .investors, .sustain, .ftr');
/** Header style follows the section underneath it: clear over the hero, dark glass over dark bands, chalk glass elsewhere. */
function updateHeader() {
  const probe = hdr.offsetHeight / 2;
  const heroR = hero.getBoundingClientRect();
  const overHero = heroR.bottom > probe + 10;
  const overDark = darkSecs.some((el) => { const r = el.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; });
  hdr.classList.toggle('is-solid', !overHero);
  hdr.classList.toggle('is-dark', !overHero && overDark);
}
const liveEls = { mw: $('[data-live="mw"]'), hz: $('[data-live="hz"]'), soc: $('[data-live="soc"]') };
const pulse = $('.pulse');

function renderHero(t: number, waveK: number) {
  field.draw(t);
  wave.style.strokeDashoffset = String(waveLen * (1 - waveK));
  liveEls.mw.textContent = `${fmt(1284 + 7 * Math.sin(t * 0.9) + 3 * Math.sin(t * 2.7))} MW`;
  liveEls.hz.textContent = `${(50 + 0.012 * Math.sin(t * 1.3) + 0.005 * Math.sin(t * 3.9)).toFixed(2)} Hz`;
  liveEls.soc.textContent = `${Math.round(68 + 1.5 * Math.sin(t * 0.21))}%`;
  const ph = (t * 0.8) % 1;
  pulse.style.boxShadow = `0 0 0 ${(ph * 10).toFixed(2)}px rgba(124, 242, 195, ${(0.5 * (1 - ph)).toFixed(3)})`;
}

// ---------------------------------------------------------------- stats
const statEls = $$('.stat');
function renderStats(k: number) {
  statEls.forEach((s, i) => {
    const kk = ease.out3(clamp(k * 1.18 - i * 0.06));
    const b = $('b', s);
    b.textContent = fmt(Number(b.dataset.to) * kk, Number(b.dataset.dec ?? 0));
    ($('.stat__bar i', s) as HTMLElement).style.transform = `scaleX(${kk})`;
  });
}

// ---------------------------------------------------------------- tabs
const tabs = $$<HTMLButtonElement>('[role="tab"]');
const tabRow = $('.tabs');
const ink = $('.tabs__ink');
tabs.forEach((b) => b.setAttribute('aria-label', $('.lg', b)?.textContent ?? b.textContent ?? ''));
const panelParts = panels.map((p) => ({ copy: $$('.panel__copy > *', p), bx: $$('.bx', p), flows: $$<SVGPathElement>('.flow', p), rotor: p.querySelector<SVGGElement>('.rotor'), lines: $$<SVGPathElement>('.os-line', p) }));
panelParts.forEach((pp) => pp.lines.forEach((l) => (l.style.strokeDasharray = `${l.getTotalLength()}`)));

function inkRect(i: number) {
  const b = tabs[i];
  return { x: b.offsetLeft, w: b.offsetWidth };
}
/** Transition from tab `from` to tab `to` at progress p (0..1). */
function renderTabs(from: number, to: number, p: number) {
  const a = inkRect(from), b = inkRect(to);
  const e = ease.inOut3(clamp(p / 0.6));
  ink.style.transform = `translateX(${lerp(a.x, b.x, e).toFixed(2)}px)`;
  ink.style.width = `${lerp(a.w, b.w, e).toFixed(2)}px`;
  tabs.forEach((t, i) => {
    const sel = i === (p < 0.3 ? from : to);
    t.setAttribute('aria-selected', String(sel));
    t.tabIndex = sel ? 0 : -1;
  });
  const showTo = from === to || p >= 0.32;
  panels.forEach((pn, i) => (pn.hidden = !(showTo ? i === to : i === from)));
  if (!showTo) {
    const q = ease.in2(seg(p, 0, 0.32));
    panels[from].style.opacity = String(1 - q);
    panels[from].style.transform = `translateY(${q * 10}px)`;
    return;
  }
  const q = from === to ? 1 : seg(p, 0.32, 1);
  const pn = panels[to], pp = panelParts[to];
  pn.style.opacity = String(ease.out3(seg(q, 0, 0.35)));
  pn.style.transform = `translateY(${(1 - ease.out3(seg(q, 0, 0.5))) * 14}px)`;
  pp.copy.forEach((el, i) => {
    const k = ease.out3(seg(q, 0.1 + i * 0.08, 0.6 + i * 0.08));
    el.style.opacity = String(k);
    el.style.transform = `translateY(${(1 - k) * 16}px)`;
  });
  const n = pp.bx.length;
  pp.bx.forEach((g, i) => {
    const k = ease.out3(seg(q, 0.05 + (i / Math.max(1, n)) * 0.55, 0.45 + (i / Math.max(1, n)) * 0.55));
    g.style.opacity = String(k);
    g.style.transform = `translateY(${((1 - k) * -14).toFixed(2)}px)`;
  });
  pp.lines.forEach((l, i) => (l.style.strokeDashoffset = String(l.getTotalLength() * (1 - ease.out3(seg(q, 0.2 + i * 0.1, 0.9 + i * 0.1))))));
}
function renderAmbient(t: number) {
  panelParts.forEach((pp) => {
    pp.flows.forEach((f) => (f.style.strokeDashoffset = String(-t * 34)));
    if (pp.rotor) pp.rotor.style.transform = `rotate(${(t * 70) % 360}deg)`;
  });
}

// ---------------------------------------------------------------- IR chart
const irLine = $<SVGPathElement>('.ir-line');
const irLen = irLine.getTotalLength();
irLine.style.strokeDasharray = `${irLen}`;
const irClip = $<SVGRectElement>('.ir-clip');
const irDots = $$<SVGGElement>('.ir-dot');
function renderChart(k: number) {
  const e = ease.inOut3(clamp(k / 0.85));
  irLine.style.strokeDashoffset = String(irLen * (1 - e));
  irClip.setAttribute('width', String(640 * e));
  irDots.forEach((d, i) => {
    const at = 0.08 + (i / (IR.length - 1)) * 0.82;
    const q = ease.out3(seg(e, at - 0.06, at + 0.14));
    d.style.opacity = String(q);
    d.style.transform = `scale(${0.4 + 0.6 * q})`;
  });
}

// ---------------------------------------------------------------- boot
const ready = async () => {
  await document.fonts.ready;
  await Promise.all(['500 40px "Instrument Sans"', '400 16px "Instrument Sans"', 'italic 400 40px "Instrument Serif"', '500 12px "JetBrains Mono"', '400 12px "JetBrains Mono"'].map((f) => document.fonts.load(f)));
};
if (REEL) initReel();
else initNormal();

// ================================================================= normal
function initNormal() {
  const rm = reducedMotion();
  let heroVisible = true;
  let clock = 6;
  const intro = gsap.timeline({ paused: rm });
  const heroBits = $$('.kicker, .hero__title, .hero__lede, .hero__cta, .hero__live');
  intro.fromTo(heroBits, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07 }, 0.1);
  const wv = { k: rm ? 1 : 0 };
  intro.to(wv, { k: 1, duration: 1.1, ease: 'power3.out' }, 0.7);
  if (rm) intro.progress(1);

  new IntersectionObserver((es) => (heroVisible = es[0].isIntersecting)).observe(hero);
  gsap.ticker.add((_t, dt) => {
    if (!rm && heroVisible && !document.hidden) clock += dt / 1000;
    if (heroVisible) renderHero(clock, wv.k);
    if (!rm) renderAmbient(clock);
  });
  window.addEventListener('resize', () => { field.resize(); renderHero(clock, wv.k); renderTabs(cur, cur, 1); });

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  // menu overlay
  const menuBtn = $<HTMLButtonElement>('.menu-btn');
  const overlay = $('#overlay');
  const setMenu = (v: boolean) => {
    overlay.hidden = !v;
    menuBtn.setAttribute('aria-expanded', String(v));
    $('span', menuBtn).textContent = v ? 'Close' : 'Menu';
    hdr.classList.toggle('is-menu', v);
    if (v && !rm) gsap.fromTo($$('a', overlay), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05 });
  };
  menuBtn.addEventListener('click', () => setMenu(overlay.hidden));
  $$('a', overlay).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // stats count-up
  const sk = { k: rm ? 1 : 0 };
  renderStats(sk.k);
  if (!rm) {
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      gsap.to(sk, { k: 1, duration: 2.2, ease: 'none', onUpdate: () => renderStats(sk.k) });
    }, { threshold: 0.4 });
    io.observe($('#stats'));
  }

  // tabs
  let cur = 0;
  const tp = { p: 1 };
  const select = (i: number, focus = false) => {
    if (i === cur) return;
    const from = cur;
    cur = i;
    tp.p = 0;
    gsap.to(tp, { p: 1, duration: rm ? 0.01 : 0.95, ease: 'none', overwrite: true, onUpdate: () => renderTabs(from, i, tp.p) });
    if (focus) tabs[i].focus();
    tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: rm ? 'auto' : 'smooth' });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') select((cur + 1) % tabs.length, true);
      if (e.key === 'ArrowLeft') select((cur + tabs.length - 1) % tabs.length, true);
      if (e.key === 'Home') select(0, true);
      if (e.key === 'End') select(tabs.length - 1, true);
    });
  });
  renderTabs(0, 0, 1);

  // chart
  const ck = { k: rm ? 1 : 0 };
  renderChart(ck.k);
  if (!rm) {
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      gsap.to(ck, { k: 1, duration: 2, ease: 'none', onUpdate: () => renderChart(ck.k) });
    }, { threshold: 0.5 });
    io.observe($('.ir-card'));
  }

  // scroll reveals
  const reveals = $$('.mission__statement, .sec-top, .panels, .ir-head, .ir-copy, .case, .sustain__in > *, .roles li, .news-list li, .ftr__top');
  if (!rm) {
    gsap.set(reveals, { opacity: 0, y: 28 });
    const io = new IntersectionObserver((es) => {
      const hits = es.filter((e) => e.isIntersecting).map((e) => e.target);
      hits.forEach((h) => io.unobserve(h));
      if (hits.length) gsap.to(hits, { opacity: 1, y: 0, duration: 0.85, ease: 'expo.out', stagger: 0.06 });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach((r) => io.observe(r));
  }

  // report modal
  const modal = $('#report-modal');
  const openBtn = $<HTMLButtonElement>('#report-btn');
  const card = $('.modal__card', modal);
  const close = () => {
    if (rm) { modal.hidden = true; openBtn.focus(); return; }
    gsap.to(card, { y: 16, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => { modal.hidden = true; openBtn.focus(); } });
  };
  openBtn.addEventListener('click', () => {
    modal.hidden = false;
    if (!rm) gsap.fromTo(card, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
    $<HTMLButtonElement>('.btn', card).focus();
  });
  $$('[data-close]', modal).forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
    if (e.key === 'Escape' && !overlay.hidden) setMenu(false);
    if (e.key === 'Tab' && !modal.hidden) {
      const f = $$<HTMLElement>('button', card);
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  window.seek = () => { intro.progress(1); renderHero(clock, 1); };
  ready().then(() => { renderTabs(cur, cur, 1); renderHero(clock, wv.k); window.__ready = true; });
}

// ================================================================= reel
function initReel() {
  const tap = document.createElement('div');
  tap.className = 'tap';
  document.body.appendChild(tap);
  let Y = { mission: 0, sol: 0, ir: 0, heroH: 700 };
  const docY = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
  const measure = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    field.resize();
    const h = hdr.offsetHeight;
    Y = {
      mission: docY($('#mission')) + 40 - h,
      sol: docY($('.solutions h2')) - h - 18,
      ir: docY($('.ir-head')) - h - 22,
      heroH: hero.offsetHeight,
    };
  };
  type Key = [number, number, (x: number) => number];
  const lin = (x: number) => x;
  const scrollAt = (t: number) => {
    const K: Key[] = [[0, 0, lin], [1.45, 0, lin], [1.95, Y.mission, ease.inOut3], [2.8, Y.mission + 22, lin], [3.18, Y.sol, ease.inOut3], [4.5, Y.sol + 14, lin], [4.9, Y.ir, ease.inOut3], [6, Y.ir + 22, lin]];
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) return lerp(K[i - 1][1], K[i][1], K[i][2](seg(t, K[i - 1][0], K[i][0])));
    return K[K.length - 1][1];
  };
  const tapAt = (t: number, t0: number, el: Element) => {
    const k = seg(t, t0, t0 + 0.34);
    if (k <= 0 || k >= 1) return;
    const r = el.getBoundingClientRect();
    tap.style.opacity = String(Math.sin(k * Math.PI));
    tap.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) scale(${lerp(0.6, 1, ease.out3(k))})`;
  };

  const seek = (t: number) => {
    t = clamp(t, 0, 6);
    renderHero(5 + t * 1.7, ease.out3(seg(t, 0.12, 1.0)));
    renderAmbient(t);
    renderStats(seg(t, 1.82, 2.85));
    // tabs: Utility -> C&I at 3.3 s, C&I -> Microgrids at 4.0 s
    if (t < 3.3) renderTabs(0, 0, 1);
    else if (t < 4.0) renderTabs(0, 1, seg(t, 3.3, 3.9));
    else renderTabs(1, 2, seg(t, 4.0, 4.6));
    renderChart(seg(t, 4.86, 5.9));
    const y = scrollAt(t);
    window.scrollTo({ top: y, behavior: 'instant' });
    updateHeader();
    tap.style.opacity = '0';
    tapAt(t, 3.18, tabs[1]);
    tapAt(t, 3.88, tabs[2]);
  };
  window.seek = seek;
  ready().then(() => {
    measure();
    seek(0);
    window.__ready = true;
  });
}
