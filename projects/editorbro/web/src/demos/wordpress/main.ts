// Meridian Freight: classic WordPress business layout. Normal mode is fully interactive; ?reel=1 is a 6 s seekable tour.
import './style.css';
import gsap from 'gsap';
import { oceanArt, roadArt, airArt, thumbCalendar, thumbReefer, thumbTower, ART_W, ART_H, AIR, type HeroArt } from './art';
import { hydrateIcons } from './icons';
import { $, $$, clamp, ease, fmt, lerp, reducedMotion, seg } from './util';

const REEL = new URLSearchParams(location.search).get('reel') === '1';
document.documentElement.classList.add('js');
if (REEL) document.documentElement.classList.add('reel');
hydrateIcons();

// ---------------------------------------------------------------- art
const ARTS: Record<string, HeroArt> = { ocean: oceanArt(), road: roadArt(), air: airArt() };
const THUMBS: Record<string, () => string> = { calendar: thumbCalendar, reefer: thumbReefer, tower: thumbTower };
$$('[data-thumb]').forEach((el) => (el.innerHTML = THUMBS[el.dataset.thumb!]()));
$('.stats__bg').innerHTML = statsBackdrop();

function statsBackdrop() {
  const cx = 1180, cy = 330, R = 430;
  let s = `<svg viewBox="0 0 1440 640" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><g fill="none" stroke="#7FB0DA">`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" stroke-opacity=".14"/>`;
  for (let i = 1; i <= 6; i++) s += `<ellipse cx="${cx}" cy="${cy}" rx="${(Math.sin((i * Math.PI) / 13) * R).toFixed(1)}" ry="${R}" stroke-opacity=".08"/>`;
  for (const lat of [-50, -25, 0, 25, 50]) {
    const y = cy - R * Math.sin((lat * Math.PI) / 180), hw = R * Math.cos((lat * Math.PI) / 180);
    s += `<ellipse cx="${cx}" cy="${y.toFixed(1)}" rx="${hw.toFixed(1)}" ry="${(hw * 0.08).toFixed(1)}" stroke-opacity=".07"/>`;
  }
  s += `</g></svg>`;
  return s;
}

// ---------------------------------------------------------------- hero slider
const DUR = 7; // seconds per slide in autoplay
const slides = $$('.slide');
const tabs = $$('.hero__tab');
const bars = tabs.map((t) => $('.hero__bar i', t));
interface SlideParts { art: HTMLElement; dim: HTMLElement; hud: HTMLElement; line: HTMLElement; card: HTMLElement; copy: HTMLElement[]; plane?: SVGGElement; trail?: SVGPathElement; route?: SVGPathElement; anchor: HeroArt['hud'] }
const parts: SlideParts[] = slides.map((sl) => {
  const art = $('.slide__art', sl);
  const a = ARTS[sl.dataset.art!];
  art.innerHTML = a.svg;
  const hud = $('.hud', sl);
  art.appendChild(hud); // the tag rides the Ken Burns move with the picture
  const dim = document.createElement('div');
  dim.className = 'slide__dim';
  art.appendChild(dim);
  return {
    art, dim, hud, line: $('.hud__line', hud), card: $('.hud__card', hud),
    copy: $$('.slide__copy > *', sl), anchor: a.hud,
    plane: sl.querySelector<SVGGElement>('.air-plane') ?? undefined,
    trail: sl.querySelector<SVGPathElement>('.air-trail') ?? undefined,
    route: sl.querySelector<SVGPathElement>('.air-route') ?? undefined,
  };
});
const edge = document.createElement('i');
edge.className = 'hero__edge';
edge.setAttribute('aria-hidden', 'true');
$('.hero__slides').appendChild(edge);

/** Puts each tracking tag over its anchor, using the same xMaxYMax-slice maths as the SVG. */
function placeHuds() {
  for (const p of parts) {
    const bw = p.art.offsetWidth, bh = p.art.offsetHeight;
    const s = Math.max(bw / ART_W, bh / ART_H);
    let x = bw - ART_W * s + p.anchor.x * s;
    const y = bh - ART_H * s + p.anchor.y * s;
    if (p.plane) x = bw - ART_W * s + 1048 * s; // air tag sits over the arc's crest
    p.hud.style.left = `${x}px`;
    p.hud.style.top = `${p.plane ? bh - ART_H * s + 412 * s : y}px`;
    p.hud.classList.toggle('hud--left', x > bw * 0.62);
  }
}

const airLen = parts[2].route?.getTotalLength() ?? 1;
if (parts[2].trail) parts[2].trail.style.strokeDasharray = `${airLen} ${airLen}`;

function renderSlideLife(i: number, age: number) {
  const p = parts[i];
  const kb = 1 + 0.065 * (1 - ease.out3(clamp(age / 8)));
  p.art.style.transform = `scale(${kb.toFixed(4)})`;
  const l = ease.out3(seg(age, 0.55, 1.05));
  const c = ease.out3(seg(age, 0.8, 1.3));
  p.line.style.transform = `scaleY(${l})`;
  p.hud.style.opacity = String(seg(age, 0.45, 0.6));
  p.card.style.opacity = String(c);
  p.card.style.transform = `translateY(${(1 - c) * 10}px)`;
  if (p.plane && p.trail && p.route) {
    const u = 0.08 + ((age * 0.055) % 0.84);
    const L = airLen * u;
    const a = p.route.getPointAtLength(L), b = p.route.getPointAtLength(Math.min(airLen, L + 2));
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
    p.plane.setAttribute('transform', `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${ang.toFixed(2)})`);
    p.trail.style.strokeDashoffset = String(airLen - L);
  }
}

/** One render path for both modes: transition from -> to at progress p (0..1), `age` = seconds since `to` took over. */
function renderSlider(from: number, to: number, p: number, age: number, dir = 1, bar = age / DUR) {
  const e = ease.expoInOut(p);
  slides.forEach((sl, i) => {
    const on = i === to || (i === from && p < 1);
    sl.classList.toggle('is-on', on);
    sl.style.zIndex = i === to ? '2' : '1';
    sl.setAttribute('aria-hidden', String(i !== to));
  });
  const inc = slides[to];
  if (p < 1 && from !== to) {
    const cut = (1 - e) * 100;
    inc.style.clipPath = dir > 0 ? `inset(0 0 0 ${cut}%)` : `inset(0 ${cut}% 0 0)`;
    edge.style.opacity = String(Math.min(1, Math.min(p, 1 - p) * 12));
    edge.style.left = dir > 0 ? `${cut}%` : `${100 - cut}%`;
    const out = parts[from];
    out.dim.style.opacity = String(e * 0.65);
    out.art.style.translate = `${-e * 5 * dir}% 0`;
    parts[to].art.style.translate = `${(1 - e) * 7 * dir}% 0`;
    out.copy.forEach((el) => {
      const k = seg(p, 0, 0.32);
      el.style.opacity = String(1 - k);
      el.style.transform = `translateY(${-k * 14}px)`;
    });
  } else {
    inc.style.clipPath = 'none';
    edge.style.opacity = '0';
    parts[to].art.style.translate = '0 0';
  }
  parts[to].dim.style.opacity = '0';
  parts[to].copy.forEach((el, j) => {
    const k = from === to ? 1 : ease.out3(seg(p, 0.42 + j * 0.07, 0.92 + j * 0.07));
    el.style.opacity = String(k);
    el.style.transform = `translateY(${(1 - k) * 30}px)`;
  });
  renderSlideLife(to, age);
  if (p < 1 && from !== to) renderSlideLife(from, age + 6);
  tabs.forEach((t, i) => t.classList.toggle('is-active', i === to));
  bars.forEach((b, i) => (b.style.transform = `scaleX(${i === to ? clamp(bar) : 0})`));
}

// ---------------------------------------------------------------- mobile menu
const header = $('#header');
const burger = $<HTMLButtonElement>('.burger');
const mnav = $('#mnav');
const mItems = $$(':scope > .mnav__list > li, :scope > .mnav__foot', mnav);
const burgerBars = $$('span', burger);
const subs = $$('.mnav__item--sub', mnav).map((li) => ({
  li, btn: $<HTMLButtonElement>('.mnav__toggle', li), list: $('.mnav__sub', li), plus: $('.mnav__plus', li), kids: $$('.mnav__sub li', li), v: 0,
}));

function renderMnav(open: number) {
  mnav.classList.toggle('is-shown', open > 0.001);
  mnav.style.clipPath = `inset(0 0 ${((1 - open) * 100).toFixed(2)}% 0)`;
  mItems.forEach((el, i) => {
    const k = clamp(open * 1.7 - i * 0.07);
    el.style.opacity = String(k);
    el.style.transform = `translateY(${(1 - k) * -12}px)`;
  });
  const x = open;
  burgerBars[0].style.transform = `translateY(${7 * x}px) rotate(${45 * x}deg)`;
  burgerBars[1].style.transform = `scaleX(${1 - x})`;
  burgerBars[2].style.transform = `translateY(${-7 * x}px) rotate(${-45 * x}deg)`;
  burgerBars[2].style.width = `${14 + 8 * x}px`;
  burger.setAttribute('aria-expanded', String(open > 0.5));
  burger.setAttribute('aria-label', open > 0.5 ? 'Close menu' : 'Open menu');
}
function renderSub(s: (typeof subs)[number], v: number) {
  s.v = v;
  s.list.style.height = v <= 0 ? '0px' : v >= 1 ? 'auto' : `${s.list.scrollHeight * v}px`;
  s.plus.style.transform = `rotate(${45 * v}deg)`;
  s.kids.forEach((k, i) => {
    const q = clamp(v * 1.6 - i * 0.09);
    k.style.opacity = String(q);
    k.style.transform = `translateY(${(1 - q) * 10}px)`;
  });
  s.btn.setAttribute('aria-expanded', String(v > 0.5));
}

// ---------------------------------------------------------------- stats
const statEls = $$('.stat__num');
function renderStats(k: number) {
  statEls.forEach((el, i) => {
    const kk = ease.out3(clamp(k * 1.15 - i * 0.05));
    const to = Number(el.dataset.to), dec = Number(el.dataset.dec ?? 0);
    el.innerHTML = `${fmt(to * kk, dec)}${el.dataset.suffix ? `<span class="suf">${el.dataset.suffix}</span>` : ''}`;
  });
}

// ---------------------------------------------------------------- testimonials
const rViewport = $('.reviews__viewport');
const rTrack = $('.reviews__track');
const quotes = $$('.quote', rTrack);
const dotsWrap = $('.dots');
quotes.forEach((_, i) => {
  const b = document.createElement('button');
  b.setAttribute('role', 'tab');
  b.setAttribute('aria-label', `Testimonial ${i + 1}`);
  b.innerHTML = '<i></i>';
  b.dataset.i = String(i);
  dotsWrap.appendChild(b);
});
const dots = $$('button', dotsWrap);
function renderReviews(pos: number) {
  const w = rViewport.clientWidth + 24;
  rTrack.style.transform = `translate3d(${(-pos * w).toFixed(2)}px,0,0)`;
  quotes.forEach((q, i) => {
    const d = Math.min(1, Math.abs(i - pos));
    q.style.opacity = String(1 - d * 0.55);
    q.setAttribute('aria-hidden', String(d > 0.5));
  });
  dots.forEach((d, i) => {
    ($('i', d) as HTMLElement).style.transform = `scaleX(${1 - Math.min(1, Math.abs(i - pos))})`;
    d.setAttribute('aria-selected', String(Math.round(pos) === i));
  });
}

// ---------------------------------------------------------------- boot
const ready = async () => {
  await document.fonts.ready;
  await Promise.all(
    ['700 40px "Barlow Condensed"', '600 20px "Barlow Condensed"', '400 16px Barlow', '600 16px Barlow', '500 12px "IBM Plex Mono"'].map((f) => document.fonts.load(f)),
  );
};

if (REEL) initReel();
else initNormal();

// ================================================================= normal mode
function initNormal() {
  const rm = reducedMotion();
  // slider
  const st = { from: 0, to: 0, p: 1, age: 0, timer: 0, dir: 1, busy: false, paused: false };
  const draw = () => renderSlider(st.from, st.to, st.p, st.age, st.dir, st.timer / DUR);
  const go = (to: number, dir = to > st.to ? 1 : -1) => {
    to = (to + slides.length) % slides.length;
    if (st.busy || to === st.to) return;
    Object.assign(st, { from: st.to, to, p: 0, age: 0, timer: 0, dir, busy: true });
    gsap.to(st, { p: 1, duration: rm ? 0.01 : 1.15, ease: 'none', onUpdate: draw, onComplete: () => { st.busy = false; st.from = st.to; draw(); } });
  };
  gsap.ticker.add((_t, dt) => {
    if (document.hidden) return;
    st.age += dt / 1000;
    if (!st.paused && !rm) st.timer += dt / 1000;
    if (!st.busy && st.timer >= DUR) go(st.to + 1, 1);
    draw();
  });
  tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
  $$('.hero__arrows [data-dir]').forEach((b) => b.addEventListener('click', () => go(st.to + Number(b.dataset.dir), Number(b.dataset.dir))));
  const hero = $('.hero');
  hero.addEventListener('mouseenter', () => (st.paused = true));
  hero.addEventListener('mouseleave', () => (st.paused = false));
  hero.addEventListener('focusin', () => (st.paused = true));
  hero.addEventListener('focusout', () => (st.paused = false));
  hero.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(st.to + 1, 1);
    if (e.key === 'ArrowLeft') go(st.to - 1, -1);
  });
  swipe(hero, (d) => go(st.to + d, d));
  window.addEventListener('resize', placeHuds);
  placeHuds();
  draw();

  // desktop dropdowns
  const items = $$('.menu__item.has-sub');
  const setOpen = (item: HTMLElement, v: boolean) => {
    if (item.classList.contains('is-open') === v) return;
    item.classList.toggle('is-open', v);
    $('.menu__toggle', item).setAttribute('aria-expanded', String(v));
    if (v && !rm) gsap.fromTo($$('.dd-list li, .dd-promo', item), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.045 });
  };
  items.forEach((item) => {
    let timer = 0;
    item.addEventListener('mouseenter', () => { clearTimeout(timer); items.forEach((o) => o !== item && setOpen(o, false)); setOpen(item, true); });
    item.addEventListener('mouseleave', () => { timer = window.setTimeout(() => setOpen(item, false), 180); });
    $('.menu__toggle', item).addEventListener('click', () => setOpen(item, !item.classList.contains('is-open')));
    item.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(item, false); $<HTMLButtonElement>('.menu__toggle', item).focus(); } });
    item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget as Node)) setOpen(item, false); });
  });
  document.addEventListener('click', (e) => { if (!(e.target as Element).closest('.has-sub')) items.forEach((i) => setOpen(i, false)); });

  // mobile menu
  const m = { open: 0 };
  let mOpen = false;
  const toggleMenu = (v = !mOpen) => {
    mOpen = v;
    gsap.to(m, { open: v ? 1 : 0, duration: rm ? 0.01 : v ? 0.6 : 0.35, ease: v ? 'power3.out' : 'power2.in', overwrite: true, onUpdate: () => renderMnav(m.open) });
  };
  burger.addEventListener('click', () => toggleMenu());
  subs.forEach((s) => {
    renderSub(s, 0);
    s.btn.addEventListener('click', () => {
      const p = { v: s.v };
      const to = s.v > 0.5 ? 0 : 1;
      gsap.to(p, { v: to, duration: rm ? 0.01 : to ? 0.5 : 0.3, ease: to ? 'power3.out' : 'power2.in', onUpdate: () => renderSub(s, p.v) });
    });
  });
  $$('a', mnav).forEach((a) => a.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mOpen) { toggleMenu(false); burger.focus(); } });
  renderMnav(0);

  // sticky header
  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 42);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // stats
  const sp = { k: 0 };
  renderStats(rm ? 1 : 0);
  if (!rm) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        io.disconnect();
        gsap.to(sp, { k: 1, duration: 2.2, ease: 'none', onUpdate: () => renderStats(sp.k) });
      }
    }, { threshold: 0.35 });
    io.observe($('#stats'));
  }

  // testimonials
  const r = { pos: 0, auto: 0 };
  const rgo = (i: number) => {
    i = (i + quotes.length) % quotes.length;
    gsap.to(r, { pos: i, duration: rm ? 0.01 : 0.85, ease: 'power3.out', overwrite: true, onUpdate: () => renderReviews(r.pos) });
  };
  $$('[data-rdir]').forEach((b) => b.addEventListener('click', () => rgo(Math.round(r.pos) + Number(b.dataset.rdir))));
  dots.forEach((d) => d.addEventListener('click', () => rgo(Number(d.dataset.i))));
  swipe(rViewport, (d) => rgo(Math.round(r.pos) + d));
  window.addEventListener('resize', () => renderReviews(r.pos));
  renderReviews(0);
  let rHover = false;
  rViewport.addEventListener('mouseenter', () => (rHover = true));
  rViewport.addEventListener('mouseleave', () => (rHover = false));
  if (!rm) window.setInterval(() => { if (!rHover && !document.hidden) rgo(Math.round(r.pos) + 1); }, 7000);

  // scroll reveals
  const reveals = $$('.reveal');
  if (rm) reveals.forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
  else {
    const io = new IntersectionObserver((es) => {
      const hits = es.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
      hits.forEach((el) => io.unobserve(el));
      gsap.to(hits, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  // tracking + newsletter
  const form = $<HTMLFormElement>('.track__card');
  const out = $('.track__result', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ref = ($<HTMLInputElement>('#track-input').value.trim() || 'MRDU 418207-3').toUpperCase().slice(0, 18);
    out.hidden = false;
    out.innerHTML = `<div><small>Reference</small><b>${ref.replace(/[<>&]/g, '')}</b></div><div><small>Status</small><b class="ok">In transit</b></div>
      <div><small>Position</small><b>Arabian Sea · 412 nm W</b></div><div><small>ETA</small><b>04 Nov · 14:00</b></div>`;
    if (!rm) gsap.fromTo($$('div', out), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05 });
  });
  const nf = $<HTMLFormElement>('.news-form');
  nf.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($<HTMLInputElement>('input', nf).value);
    $('.news-form__msg').textContent = ok ? 'Thanks. Monday’s rates are on their way (demo: nothing is sent).' : 'Please enter a valid email address.';
  });

  // hero intro
  const intro = gsap.timeline({ paused: rm });
  intro.fromTo(parts[0].copy, { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' }, 0.15)
    .fromTo('.hero__ui', { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power3.out' }, 0.5)
    .fromTo('.track__card', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.45);
  window.seek = () => { intro.progress(1); st.age = 2; st.timer = 2; draw(); };
  ready().then(() => { placeHuds(); window.__ready = true; });
}

function swipe(el: HTMLElement, cb: (dir: number) => void) {
  let x0 = 0, y0 = 0, on = false;
  el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; on = true; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointerup', (e) => {
    if (!on) return;
    on = false;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) cb(dx < 0 ? 1 : -1);
  });
}

// ================================================================= reel mode
function initReel() {
  const tap = document.createElement('div');
  tap.className = 'tap';
  document.body.appendChild(tap);
  const reveals = $$('.reveal');
  const svcCards = $$('.svc');
  reveals.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
  subs.forEach((s) => renderSub(s, 0));
  const services = subs[0];

  let headerH = 64;
  let Y = { services: 0, stats: 0, reviews: 0 };
  const docY = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
  const measure = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    headerH = header.offsetHeight;
    Y = {
      services: docY($('#services')) + 34 - headerH,
      stats: docY($('#stats')) - headerH,
      reviews: docY($('#reviews')) + 26 - headerH,
    };
    placeHuds();
  };

  const tapAt = (t: number, t0: number, x: number, y: number, dx = 0) => {
    const k = seg(t, t0, t0 + 0.34);
    if (k <= 0 || k >= 1) return false;
    const vis = Math.sin(k * Math.PI);
    tap.style.opacity = String(vis);
    tap.style.transform = `translate(${x + dx * ease.inOut3(k)}px, ${y}px) scale(${lerp(0.6, 1, ease.out3(k))})`;
    return true;
  };

  type Key = [number, number, (x: number) => number];
  const scrollAt = (t: number) => {
    const K: Key[] = [
      [0, 0, ease.inOut3], [2.66, 0, ease.inOut3], [3.06, Y.services, ease.inOut3], [3.62, Y.services + 56, (x) => x],
      [4.02, Y.stats, ease.inOut3], [4.62, Y.stats + 30, (x) => x], [5.02, Y.reviews, ease.inOut3], [6, Y.reviews + 26, (x) => x],
    ];
    for (let i = 1; i < K.length; i++) {
      if (t <= K[i][0]) return lerp(K[i - 1][1], K[i][1], K[i][2](seg(t, K[i - 1][0], K[i][0])));
    }
    return K[K.length - 1][1];
  };

  const seek = (t: number) => {
    t = clamp(t, 0, 6);
    // 1. hero slider: Ocean holds, wipes to Road & rail at 0.5-1.4 s
    if (t < 0.5) renderSlider(0, 0, 1, DUR - 0.5 + t);
    else renderSlider(0, 1, seg(t, 0.5, 1.4), t - 0.5, 1);
    // 2. menu drops at 1.52 s, Services expands at 1.95 s, closes 2.42-2.70 s
    const open = ease.out3(seg(t, 1.52, 2.0)) * (1 - ease.in2(seg(t, 2.42, 2.7)));
    renderMnav(open);
    renderSub(services, open > 0 ? ease.out3(seg(t, 1.95, 2.38)) : 0);
    // 3. scroll tour
    const y = scrollAt(t);
    window.scrollTo({ top: y, behavior: 'instant' });
    header.classList.toggle('is-stuck', y > 42);
    svcCards.forEach((c, i) => {
      const k = ease.out3(seg(t, 2.62 + i * 0.05, 3.12 + i * 0.05));
      c.style.opacity = String(k);
      c.style.transform = `translateY(${(1 - k) * 26}px)`;
    });
    renderStats(seg(t, 3.78, 4.75));
    // 4. testimonial swipes from quote 1 to quote 2
    renderReviews(ease.inOut3(seg(t, 5.08, 5.68)));
    // tap indicator
    tap.style.opacity = '0';
    const b = burger.getBoundingClientRect();
    if (!tapAt(t, 1.4, b.left + b.width / 2, b.top + b.height / 2)) {
      const sb = services.btn.getBoundingClientRect();
      if (!tapAt(t, 1.84, sb.left + 90, sb.top + sb.height / 2)) {
        const q = rViewport.getBoundingClientRect();
        const k = seg(t, 5.0, 5.66);
        if (k > 0 && k < 1) {
          tap.style.opacity = String(Math.min(1, Math.sin(k * Math.PI) * 1.6));
          tap.style.transform = `translate(${q.right - 70 - ease.inOut3(k) * 220}px, ${q.top + q.height * 0.42}px) scale(0.9)`;
        }
      }
    }
  };

  window.seek = seek;
  ready().then(() => {
    measure();
    seek(0);
    window.__ready = true;
  });
}
