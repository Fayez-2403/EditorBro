// Tiffinly: browse kitchens, open a menu, fill a cart, place the order and watch it move.
// Normal mode is a working app; ?reel=1 hands the same DOM to a deterministic seek(t) tour (reel.ts).
import gsap from 'gsap';
import './style.css';
import { CHIPS, RESTAURANTS, DISHES, restOf, inr, bill, type Restaurant, type Dish } from './data';
import { art, logoMark, I, vegMark, statusScene } from './art';
import { startReel } from './reel';

type Win = Window & { seek?: (t: number) => void; __ready?: boolean };
const win = window as Win;
const REEL = new URLSearchParams(location.search).get('reel') === '1';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desk = matchMedia('(min-width: 900px)');
const D = (s: number) => (RM ? 0.001 : s);
document.documentElement.classList.toggle('reel', REEL);

// ---------- state ----------
export const cart = new Map<string, number>();
let cartRest: Restaurant | null = null;
let shownRest: Restaurant = RESTAURANTS[1];
let chip = 'all';
const flags = new Set<string>();
let query = '';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];

// ---------- templates ----------
const rating = (r: Restaurant) => `<span class="rate">${I.star}${r.rating.toFixed(1)}</span>`;

const card = (r: Restaurant, i: number) => `
<article class="rcard" data-rest="${r.id}" style="--tint:${r.tint}" tabindex="0" role="button" aria-label="Open ${r.name}">
  <div class="rart">
    <div class="rart-pattern"></div>
    <div class="rart-dish d${i % 3}">${art(r.art)}</div>
    <span class="offer">${I.tag}${r.offer}</span>
    <button class="fav" aria-label="Save ${r.name}">${I.heart}</button>
    <span class="eta">${I.clock}${r.time}</span>
  </div>
  <div class="rinfo">
    <div class="rrow"><h3>${r.name}</h3>${rating(r)}</div>
    <p class="cuis">${r.cuisines}</p>
    <p class="rmeta"><span>${r.km} km</span><i></i><span>${inr(r.forTwo)} for two</span>${r.veg ? '<i></i><span class="pure">Pure veg</span>' : ''}</p>
  </div>
</article>`;

const stepper = (d: Dish, q: number, small = false) => q > 0
  ? `<div class="step${small ? ' sm' : ''}" data-dish="${d.id}"><button class="minus" aria-label="Remove one ${d.name}">−</button><span class="q" aria-live="polite">${q}</span><button class="plus" aria-label="Add one more ${d.name}">+</button></div>`
  : `<button class="add" data-dish="${d.id}" aria-label="Add ${d.name}">ADD<span>+</span></button>`;

const menuItem = (d: Dish) => `
<div class="mitem" id="mi-${d.id}">
  <div class="mtext">
    <div class="mtags">${vegMark(d.veg)}${d.tag ? `<span class="best">${d.tag}</span>` : ''}</div>
    <h4>${d.name}</h4>
    <p class="mprice">${inr(d.price)}</p>
    <p class="mdesc">${d.desc}</p>
  </div>
  <div class="mart" style="--tint:${restOf(d.id).tint}">${art(d.art)}<div class="mctl">${stepper(d, cart.get(d.id) ?? 0)}</div></div>
</div>`;

function restView(r: Restaurant) {
  const sections = [...new Set(r.dishes.map((x) => x.section))];
  return `
  <div class="rcover" style="--tint:${r.tint}">
    <div class="rart-pattern"></div>
    <div class="rcover-dish">${art(r.art)}</div>
    <button class="icon-btn back" data-close="rest" aria-label="Back">${I.back}</button>
    <button class="icon-btn search-btn" aria-label="Search menu">${I.search}</button>
  </div>
  <div class="rhead">
    <div class="rhead-top"><h2>${r.name}</h2>${rating(r)}</div>
    <p class="cuis">${r.cuisines}</p>
    <div class="rstats">
      <div><b>${r.time}</b><span>Delivery</span></div>
      <div><b>${r.km} km</b><span>Distance</span></div>
      <div><b>${r.ratings}</b><span>Ratings</span></div>
      <div><b>${inr(r.forTwo)}</b><span>For two</span></div>
    </div>
    <div class="ostrip">${I.tag}<span><b>${r.offer}</b> · auto-applied at checkout</span></div>
  </div>
  <nav class="mtabs">${sections.map((s, i) => `<a href="#sec-${i}" class="${i ? '' : 'on'}">${s}</a>`).join('')}</nav>
  <div class="menu">${sections.map((s, i) => `<section id="sec-${i}"><h3 class="msec">${s}<span>${r.dishes.filter((x) => x.section === s).length}</span></h3>${r.dishes.filter((x) => x.section === s).map(menuItem).join('')}</section>`).join('')}</div>
  <p class="fine">Prices include packaging. Menu and prices are set by the kitchen.</p>`;
}

function cartView() {
  const items = [...cart.entries()].filter(([, q]) => q > 0).map(([id, q]) => ({ d: DISHES.get(id)!, q }));
  if (!items.length || !cartRest) {
    return `<header class="shead"><button class="icon-btn" data-close="cart" aria-label="Close cart">${I.back}</button><div><h2>Your cart</h2></div></header>
    <div class="empty"><div class="empty-art">${logoMark(64)}</div><h3>Your tiffin is empty</h3><p>Pick a kitchen and add a dish or two. Your cart stays here while you browse.</p><button class="btn ghost" data-close="cart">Browse kitchens</button></div>`;
  }
  const b = bill(items.reduce((s, x) => s + x.d.price * x.q, 0));
  return `
  <header class="shead"><button class="icon-btn" data-close="cart" aria-label="Back to menu">${I.back}</button><div><h2>${cartRest.name}</h2><p>${I.clock}Delivery in ${cartRest.time} · Home</p></div></header>
  <div class="cscroll">
    <div class="cbox items">${items.map(({ d, q }) => `<div class="citem">${vegMark(d.veg)}<div class="cname"><b>${d.name}</b><span>${inr(d.price)}</span></div>${stepper(d, q, true)}<b class="cprice">${inr(d.price * q)}</b></div>`).join('')}
      <label class="note">${I.note}<input placeholder="Add cooking instructions (less spicy, no onion…)" aria-label="Cooking instructions"/></label>
    </div>
    <div class="cbox bill">
      <h3>Bill details</h3>
      <div class="brow"><span>Item total</span><b data-k="items">${inr(b.itemTotal)}</b></div>
      <div class="brow"><span>Delivery fee <small>${cartRest.km} km</small></span><b>${inr(b.delivery)}</b></div>
      <div class="brow"><span>Taxes <small>GST 5%</small></span><b>${inr(b.taxes)}</b></div>
      <div class="brow total"><span>To pay</span><b data-k="total">${inr(b.total)}</b></div>
    </div>
    <div class="cbox addr"><span class="ai">${I.home}</span><div><b>Deliver to Home</b><span>Flat 3B, 12th Main, Indiranagar, Bengaluru</span></div><button class="link">Change</button></div>
    <div class="cbox addr"><span class="ai">${I.card}</span><div><b>Pay by UPI</b><span>You pay after the kitchen accepts</span></div><button class="link">Change</button></div>
  </div>
  <div class="place-wrap"><button class="place" id="place"><span class="fill"></span><span class="pl"><b>${inr(b.total)}</b><small>TOTAL</small></span><span class="pr"><span id="placeLabel">Place order</span>${I.right}</span></button></div>`;
}

function statusView() {
  return `
  <header class="sthead"><div><small>Order #TF-20418</small><h2 id="stTitle">Order confirmed</h2><p id="stSub">Saffron Handi has your order.</p></div><button class="icon-btn light" data-close="status" aria-label="Close">${I.close}</button></header>
  <div class="eta-row"><span class="eta-big"><b id="stEta">29</b> min</span><span class="eta-note">Arriving by <b id="stBy">1:31 PM</b></span></div>
  <div class="scene-wrap">${statusScene()}</div>
  <div class="stpanel">
    <div class="steps-wrap">
      <div class="track"><i id="stFill"></i></div>
      <ol class="steps" id="steps">
        <li class="on"><span class="dot">${I.check}</span><b>Confirmed</b><small>1:02 PM</small></li>
        <li><span class="dot">${I.pot}</span><b>Cooking</b><small id="stT1">Next</small></li>
        <li><span class="dot">${I.bike}</span><b>Out for delivery</b><small id="stT2">Then</small></li>
      </ol>
    </div>
    <div class="rider" id="rider"><span class="rav" id="rav"><i class="rav-ic">${I.bike}</i><i class="rav-in">RK</i></span><div><b id="rTitle">Finding a delivery partner</b><span id="rSub">Assigned while your food is packed</span></div><button class="icon-btn" id="rCall" aria-label="Call partner">${I.phone}</button></div>
    <div class="osum" id="osum"></div>
  </div>`;
}

function shell() {
  return `
  <div class="home" id="home">
    <header class="nav">
      <a class="brand" href="#" aria-label="Tiffinly home">${logoMark()}<span class="word">tiffin<em>ly</em></span></a>
      <button class="loc">${I.pin}<span><b>Home ${I.down}</b><small>12th Main, Indiranagar, Bengaluru</small></span></button>
      <nav class="links"><a href="#">Offers</a><a href="#">Corporate tiffins</a><a href="#">Help</a></nav>
      <button class="nav-cart" id="navCart">${I.bag}<span>Cart</span><b class="badge" id="badge">0</b></button>
      <button class="avatar" aria-label="Profile">AK</button>
    </header>
    <section class="hero">
      <div class="hero-copy">
        <p class="kicker"><span class="kdot"></span>Lunch is on in Indiranagar</p>
        <h1>Ghar ka khana, <em>hot</em> at your door.</h1>
        <p class="lede">Home-style thalis, dum biryani and crisp dosas from neighbourhood kitchens, packed in steel-lidded tiffins and delivered in about 30 minutes.</p>
        <label class="search">${I.search}<input id="q" placeholder="Search biryani, dosa, chai…" aria-label="Search dishes and kitchens"/><kbd>/</kbd></label>
        <ul class="stats"><li><b>28 min</b><span>avg. delivery</span></li><li><b>4.6 ★</b><span>avg. kitchen rating</span></li><li><b>₹0</b><span>delivery on first 3 orders</span></li></ul>
      </div>
      <div class="promo">
        <div class="promo-copy"><p class="pk">TIFFINLY LUNCH CLUB</p><p class="pt">Flat ₹75 off your first tiffin</p><p class="pc">Use <b>TIFFIN75</b> · above ₹299</p></div>
        <div class="tray" id="tray">
          <div class="tray-ring"></div>
          <div class="tray-main">${art('thali')}</div>
          <div class="tray-sat s1">${art('biryani')}</div>
          <div class="tray-sat s2">${art('dosa')}</div>
          <div class="tray-sat s3">${art('chai')}</div>
          <div class="tray-sat s4">${art('rolls')}</div>
        </div>
        <span class="float-chip c1">${I.clock}<b>Lunch in 28 min</b></span>
      </div>
    </section>
    <div class="chiprow">
      <nav class="chips" id="chips" aria-label="Cuisines">${CHIPS.map((c) => `<button class="chip${c.id === 'all' ? ' on' : ''}" data-chip="${c.id}" aria-pressed="${c.id === 'all'}"><span class="chip-art">${art(c.art)}</span><span>${c.label}</span></button>`).join('')}</nav>
      <div class="filters" id="filters" aria-label="Filters">
        <button class="fpill" data-f="veg" aria-pressed="false"><span class="sw"><i></i></span>Pure veg</button>
        <button class="fpill" data-f="fast" aria-pressed="false">${I.clock}Under 25 min</button>
        <button class="fpill" data-f="top" aria-pressed="false">${I.star}Rated 4.6+</button>
      </div>
    </div>
    <div class="sec-head"><h2>Kitchens near you</h2><span id="count">${RESTAURANTS.length} open now · sorted by distance</span></div>
    <div class="grid" id="grid">${RESTAURANTS.map(card).join('')}</div>
    <p class="empty-list" id="emptyList" hidden>No kitchens match that yet. Try “dosa” or “chai”.</p>
    <footer class="foot">
      <div class="foot-brand">${logoMark(28)}<span class="word">tiffin<em>ly</em></span><p>Neighbourhood kitchens, packed like home.</p></div>
      <div class="foot-cols"><div><b>Company</b><a href="#">About</a><a href="#">Kitchens</a><a href="#">Careers</a></div><div><b>Help</b><a href="#">Support</a><a href="#">Refunds</a><a href="#">Allergens</a></div></div>
      <p class="demo-line">Demo · fictional brand · built with EditorBro</p>
    </footer>
  </div>
  <div class="scrim" id="scrim"></div>
  <section class="sheet rest" id="rest" aria-label="Kitchen menu" aria-hidden="true"><div class="sheet-scroll" id="restScroll">${restView(shownRest)}</div></section>
  <div class="cartbar" id="cartbar" aria-hidden="true"><button id="cartbarBtn"><span class="cb-l"><b id="cbCount">1 item</b><span id="cbTotal">₹0</span></span><span class="cb-r">View cart ${I.bag}</span></button></div>
  <section class="sheet cart" id="cart" aria-label="Cart" aria-hidden="true">${cartView()}</section>
  <section class="sheet status" id="status" aria-label="Order status" aria-hidden="true">${statusView()}</section>
  <div class="fly" id="fly"></div>
  <div class="toast" id="toast" role="status"></div>
  <div class="tap" id="tap"></div>`;
}

const app = document.getElementById('app')!;
app.innerHTML = shell();

// ---------- rendering helpers shared with the reel ----------
export function itemTotal() { let s = 0; cart.forEach((q, id) => { s += DISHES.get(id)!.price * q; }); return s; }
export function itemCount() { let s = 0; cart.forEach((q) => { s += q; }); return s; }

export function renderCartBar(totalOverride?: number) {
  const n = itemCount();
  $('#cbCount').textContent = `${n} item${n === 1 ? '' : 's'}`;
  $('#cbTotal').textContent = `${inr(totalOverride ?? itemTotal())} plus taxes`;
  $('#badge').textContent = String(n);
  $('#badge').classList.toggle('on', n > 0);
}

export function renderSteppers() {
  for (const host of $$('.mctl')) {
    const id = (host.firstElementChild as HTMLElement | null)?.dataset.dish;
    if (!id) continue;
    host.innerHTML = stepper(DISHES.get(id)!, cart.get(id) ?? 0);
  }
}

export function renderCart() { $('#cart').innerHTML = cartView(); }

// Scrollspy: the menu tab follows the section under the sticky tab bar.
export function syncTabs() {
  const sc = $('#restScroll');
  const secs = $$('.menu section', sc);
  let on = 0;
  secs.forEach((s, i) => { if (s.offsetTop - 90 <= sc.scrollTop) on = i; });
  $$('.mtabs a', sc).forEach((a, i) => a.classList.toggle('on', i === on));
}

export function setRest(r: Restaurant) {
  shownRest = r;
  $('#restScroll').innerHTML = restView(r);
}

export function setCart(entries: Array<[string, number]>) {
  cart.clear();
  for (const [id, q] of entries) if (q > 0) cart.set(id, q);
  cartRest = cart.size ? restOf([...cart.keys()][0]) : null;
}

export interface StatusState { k: number; check: number; time: number }
export function drawStatus(s: StatusState) {
  const k = Math.max(0, Math.min(2, s.k));
  const ph = Math.round(k);
  const titles = ['Order confirmed', 'Your food is cooking', 'Out for delivery'];
  const subs = ['Saffron Handi has your order.', 'Fresh off the dum, packing in steel tiffins.', 'Ravi is 2.3 km away on an e-bike.'];
  const name = (cartRest ?? shownRest).name;
  $('#stTitle').textContent = titles[ph];
  $('#stSub').textContent = subs[ph].replace('Saffron Handi', name);
  $('#stEta').textContent = String(Math.round(29 - k * 5.5));
  $$('#steps li').forEach((li, i) => { li.classList.toggle('on', k >= i - 0.02); li.classList.toggle('now', ph === i); });
  $('#stT1').textContent = k >= 0.98 ? '1:06 PM' : 'Next';
  $('#stT2').textContent = k >= 1.98 ? '1:19 PM' : 'Then';
  ($('#stFill') as HTMLElement).style.transform = `scaleX(${k / 2})`;
  const c01 = (x: number) => Math.max(0, Math.min(1, x));
  // one layer at a time: seal out, then pot in; pot out, then the ride in
  const sealK = 1 - c01(k / 0.45);
  const potK = k <= 1 ? c01((k - 0.4) / 0.6) : 1 - c01((k - 1) / 0.4);
  const rk = c01((k - 1.35) / 0.65);
  const found = k >= 1.5;
  $('#rider').classList.toggle('found', found);
  $('#rTitle').textContent = found ? 'Ravi is on the way' : 'Finding a delivery partner';
  $('#rSub').textContent = found ? 'Tiffinly partner · e-bike · 4.9 ★' : 'Assigned while your food is packed';
  const pop = found ? c01((k - 1.5) / 0.4) : 0;
  $('#rav').style.transform = `scale(${0.85 + 0.15 * pop})`;
  $('#rCall').style.opacity = String(pop);
  // scene layers
  const seal = document.getElementById('sc-seal')!;
  seal.setAttribute('opacity', String(sealK));
  seal.setAttribute('transform', `translate(200 104) scale(${0.9 + 0.1 * sealK + 0.06 * Math.sin(s.check * Math.PI)})`);
  document.getElementById('sc-check')!.setAttribute('stroke-dashoffset', String(1 - s.check));
  $$('#sc-seal .ray').forEach((r, i) => r.setAttribute('opacity', String(c01(s.check * 3 - i * 0.12))));
  $$('#sc-seal .spark').forEach((r, i) => {
    const p = c01(s.check * 1.6 - i * 0.05);
    r.setAttribute('transform', `translate(${Number(r.dataset.x) * (0.6 + 0.4 * p)} ${Number(r.dataset.y) * (0.6 + 0.4 * p)}) scale(${p})`);
  });
  const pot = document.getElementById('sc-pot')!;
  pot.setAttribute('opacity', String(potK));
  pot.setAttribute('transform', `translate(200 ${120 + (1 - potK) * 16})`);
  document.getElementById('sc-flame')!.setAttribute('transform', `translate(0 52) scale(1 ${1 + 0.1 * Math.sin(s.time * 13)}) translate(0 -52)`);
  $$('#sc-steam .sw').forEach((w, i) => {
    const c = ((s.time * 0.9 + i * 0.33) % 1);
    w.setAttribute('transform', `translate(0 ${-c * 26})`);
    w.setAttribute('opacity', String(0.75 * Math.sin(c * Math.PI)));
  });
  const ride = document.getElementById('sc-ride')!;
  ride.setAttribute('opacity', String(Math.min(1, rk * 1.6)));
  ride.setAttribute('transform', `translate(${200 - (1 - rk) ** 2 * 260} 0)`);
  document.getElementById('sc-bob')!.setAttribute('transform', `translate(0 ${Math.sin(s.time * 18) * 1.4})`);
  for (const [id, cx] of [['sc-w1', -44], ['sc-w2', 46]] as const) document.getElementById(id)!.setAttribute('transform', `rotate(${(s.time * 540) % 360} ${cx} 170)`);
  document.getElementById('sc-road')!.setAttribute('stroke-dashoffset', String((s.time * 140) % 34));
  document.getElementById('sc-city')!.setAttribute('opacity', String(rk));
  document.getElementById('sc-city')!.setAttribute('transform', `translate(${-((s.time * 18) % 60) * rk} 0)`);
  document.getElementById('sc-sun')!.setAttribute('opacity', String(0.9 * rk));
}

export function fillOrderSummary() {
  const lines = [...cart.entries()].map(([id, q]) => `${q} × ${DISHES.get(id)!.name}`);
  const b = bill(itemTotal());
  $('#osum').innerHTML = `<div><b>${(cartRest ?? shownRest).name}</b><span>${lines.join(' · ') || '—'}</span></div><b>${inr(b.total)}<small>Paid by UPI</small></b>`;
}

// ---------- normal-mode interactions ----------
type SheetId = 'rest' | 'cart' | 'status';
const stack: SheetId[] = [];

function layoutStack() {
  const home = $('#home');
  const n = stack.length;
  if (!desk.matches) {
    home.style.transformOrigin = `50% ${scrollY + innerHeight / 2}px`;
    gsap.to(home, { scale: n ? 0.94 : 1, borderRadius: n ? 22 : 0, duration: D(0.6), ease: 'expo.out' });
    stack.forEach((id, i) => {
      if (id === 'status') return;
      const under = n - 1 - i;
      gsap.to(`#${id}`, { scale: under ? 0.95 : 1, duration: D(0.6), ease: 'expo.out' });
    });
  }
  gsap.to('#scrim', { autoAlpha: n ? 1 : 0, duration: D(0.4), ease: n ? 'power3.out' : 'power2.in' });
  document.body.classList.toggle('locked', n > 0);
  syncCartBar();
}

function openSheet(id: SheetId) {
  if (stack.includes(id)) return;
  stack.push(id);
  const el = $(`#${id}`);
  el.setAttribute('aria-hidden', 'false');
  el.style.zIndex = String(30 + stack.length * 10);
  const from = desk.matches && id !== 'status' ? { xPercent: 100, yPercent: 0 } : { yPercent: 100, xPercent: 0 };
  gsap.fromTo(el, { ...from, autoAlpha: 1 }, { xPercent: 0, yPercent: 0, duration: D(0.65), ease: 'expo.out' });
  layoutStack();
}

function closeSheet(id: SheetId) {
  const i = stack.indexOf(id);
  if (i < 0) return;
  stack.splice(i, 1);
  const el = $(`#${id}`);
  el.setAttribute('aria-hidden', 'true');
  const to = desk.matches && id !== 'status' ? { xPercent: 100 } : { yPercent: 100 };
  gsap.to(el, { ...to, duration: D(0.38), ease: 'power2.in', onComplete: () => { gsap.set(el, { autoAlpha: 0 }); } });
  layoutStack();
}

let barShown = false;
function syncCartBar() {
  const want = itemCount() > 0 && stack.includes('rest') && !stack.includes('cart') && !stack.includes('status');
  if (want === barShown) return;
  barShown = want;
  const bar = $('#cartbar');
  bar.setAttribute('aria-hidden', String(!want));
  gsap.to(bar, want
    ? { yPercent: 0, autoAlpha: 1, duration: D(0.6), ease: 'expo.out' }
    : { yPercent: 120, autoAlpha: 0, duration: D(0.3), ease: 'power2.in' });
}

function toast(msg: string) {
  const t = $('#toast');
  t.textContent = msg;
  gsap.killTweensOf(t);
  gsap.fromTo(t, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: D(0.5), ease: 'power3.out' });
  gsap.to(t, { y: 10, autoAlpha: 0, duration: D(0.3), ease: 'power2.in', delay: 2.4 });
}

function flyFrom(btn: HTMLElement, d: Dish) {
  if (RM) return;
  const fly = $('#fly');
  const a = btn.getBoundingClientRect();
  const target = (barShown || stack.includes('rest')) ? $('#cartbar').getBoundingClientRect() : $('#navCart').getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
  const x1 = target.left + 40, y1 = target.top + target.height / 2;
  fly.innerHTML = art(d.art);
  const o = { p: 0 };
  gsap.fromTo(o, { p: 0 }, {
    p: 1, duration: 0.55, ease: 'power2.in',
    onStart: () => { fly.style.opacity = '1'; },
    onUpdate: () => {
      const p = o.p, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p - Math.sin(p * Math.PI) * 90;
      fly.style.transform = `translate(${x - 26}px, ${y - 26}px) scale(${1 - p * 0.55}) rotate(${p * 160}deg)`;
    },
    onComplete: () => { fly.style.opacity = '0'; gsap.fromTo('#cartbar button', { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'expo.out' }); },
  });
}

function changeQty(id: string, delta: number, from?: HTMLElement) {
  const d = DISHES.get(id)!;
  const owner = restOf(id);
  if (delta > 0 && cartRest && cartRest.id !== owner.id && itemCount() > 0) {
    cart.clear();
    toast(`Started a new cart from ${owner.name}`);
  }
  const q = Math.max(0, (cart.get(id) ?? 0) + delta);
  if (q) cart.set(id, q); else cart.delete(id);
  cartRest = cart.size ? owner : null;
  renderSteppers();
  renderCartBar();
  if (stack.includes('cart')) { renderCart(); if (!cart.size) closeSheet('cart'); }
  const fresh = $(`.mctl [data-dish="${id}"] .q`) ?? $(`.cart [data-dish="${id}"] .q`);
  if (fresh && !RM) gsap.fromTo(fresh, { yPercent: delta > 0 ? 60 : -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'expo.out' });
  if (delta > 0 && from) flyFrom(from, d);
  syncCartBar();
}

function applyFilter() {
  const ql = query.trim().toLowerCase();
  let shown = 0;
  $$('.rcard').forEach((el) => {
    const r = RESTAURANTS.find((x) => x.id === el.dataset.rest)!;
    const hay = `${r.name} ${r.cuisines} ${r.dishes.map((x) => x.name).join(' ')}`.toLowerCase();
    const ok = (chip === 'all' || r.chip === chip) && (!ql || hay.includes(ql))
      && (!flags.has('veg') || r.veg) && (!flags.has('fast') || parseInt(r.time, 10) < 25) && (!flags.has('top') || r.rating >= 4.6);
    if (ok) shown++;
    if (ok !== !el.hidden) {
      el.hidden = !ok;
      if (ok) gsap.fromTo(el, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: D(0.6), ease: 'expo.out' });
    }
  });
  $('#emptyList').hidden = shown > 0;
  $('#count').textContent = `${shown} open now · sorted by distance`;
}

let statusTl: gsap.core.Timeline | null = null;
let statusTicker: (() => void) | null = null;
function placeOrder() {
  const btn = $('#place');
  if (btn.classList.contains('busy')) return;
  btn.classList.add('busy');
  $('#placeLabel').textContent = 'Placing order…';
  gsap.fromTo('#place .fill', { scaleX: 0 }, {
    scaleX: 1, duration: D(0.9), ease: 'power2.inOut', onComplete: () => {
      fillOrderSummary();
      const st: StatusState = { k: 0, check: 0, time: 0 };
      drawStatus(st);
      openSheet('status');
      for (const id of ['cart', 'rest'] as SheetId[]) { const i = stack.indexOf(id); if (i >= 0) { stack.splice(i, 1); gsap.set(`#${id}`, { autoAlpha: 0, yPercent: 100, xPercent: 0, scale: 1 }); } }
      layoutStack();
      statusTl?.kill();
      statusTl = gsap.timeline()
        .to(st, { check: 1, duration: D(0.6), ease: 'power3.out' }, 0.35)
        .to(st, { k: 1, duration: D(0.8), ease: 'power3.inOut' }, 3.2)
        .to(st, { k: 2, duration: D(0.9), ease: 'power3.inOut' }, 8);
      const t0 = gsap.ticker.time;
      if (statusTicker) gsap.ticker.remove(statusTicker);
      statusTicker = () => { st.time = RM ? 0 : gsap.ticker.time - t0; drawStatus(st); };
      gsap.ticker.add(statusTicker);
    },
  });
}

function wire() {
  $('#grid').addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.fav')) { t.closest('.fav')!.classList.toggle('on'); return; }
    const c = t.closest<HTMLElement>('.rcard');
    if (!c) return;
    setRest(RESTAURANTS.find((x) => x.id === c.dataset.rest)!);
    $('#restScroll').scrollTop = 0;
    openSheet('rest');
  });
  $('#grid').addEventListener('keydown', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.rcard');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); }
  });
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const close = t.closest<HTMLElement>('[data-close]');
    if (close) { closeSheet(close.dataset.close as SheetId); if (close.dataset.close === 'status') resetOrder(); return; }
    const add = t.closest<HTMLElement>('.add');
    if (add) { changeQty(add.dataset.dish!, 1, add); return; }
    const step = t.closest<HTMLElement>('.step');
    if (step && t.closest('button')) { changeQty(step.dataset.dish!, t.closest('.plus') ? 1 : -1, t.closest('.plus') ? (t.closest('button') as HTMLElement) : undefined); return; }
    if (t.closest('#place')) { placeOrder(); return; }
    const tab = t.closest<HTMLAnchorElement>('.mtabs a');
    if (tab) {
      e.preventDefault();
      $$('.mtabs a').forEach((a) => a.classList.toggle('on', a === tab));
      const sec = $(tab.getAttribute('href')!);
      gsap.to('#restScroll', { scrollTop: sec.offsetTop - 64, duration: D(0.6), ease: 'power3.inOut' });
    }
  });
  $('#restScroll').addEventListener('scroll', () => syncTabs(), { passive: true });
  $('#cartbarBtn').addEventListener('click', () => { renderCart(); openSheet('cart'); });
  $('#navCart').addEventListener('click', () => { renderCart(); openSheet('cart'); });
  $('#scrim').addEventListener('click', () => { const top = stack[stack.length - 1]; if (top && top !== 'status') closeSheet(top); });
  $('#chips').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.chip');
    if (!b) return;
    chip = b.dataset.chip!;
    $$('.chip').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    applyFilter();
  });
  $('#filters').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.fpill');
    if (!b) return;
    const f = b.dataset.f!;
    if (flags.has(f)) flags.delete(f); else flags.add(f);
    b.classList.toggle('on', flags.has(f));
    b.setAttribute('aria-pressed', String(flags.has(f)));
    applyFilter();
  });
  const q = $<HTMLInputElement>('#q');
  q.addEventListener('input', () => { query = q.value; applyFilter(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { const top = stack[stack.length - 1]; if (top) { closeSheet(top); if (top === 'status') resetOrder(); } }
    if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); }
  });
  desk.addEventListener('change', () => { gsap.set('#home', { scale: 1, borderRadius: 0 }); layoutStack(); });
}

function resetOrder() {
  statusTl?.kill();
  if (statusTicker) gsap.ticker.remove(statusTicker);
  statusTicker = null;
  cart.clear();
  cartRest = null;
  renderSteppers();
  renderCartBar();
  renderCart();
  toast('Order saved to your history');
}

function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: D(0.8) } });
  tl.from('.nav > *', { y: -14, opacity: 0, stagger: 0.05 }, 0)
    .from('.hero-copy > *', { y: 26, opacity: 0, stagger: 0.06 }, 0.1)
    .from('.promo', { y: 30, opacity: 0, scale: 0.98 }, 0.15)
    .from('.tray-sat', { scale: 0.6, opacity: 0, stagger: 0.07 }, 0.35)
    .from('.chip', { y: 18, opacity: 0, stagger: 0.05 }, 0.3)
    .from('.sec-head', { y: 18, opacity: 0 }, 0.4)
    .from('.rcard', { y: 34, opacity: 0, stagger: 0.07 }, 0.45);
  return tl;
}

// ---------- boot ----------
renderCartBar();
gsap.set('.sheet', { autoAlpha: 0, yPercent: 100 });
gsap.set('#cartbar', { autoAlpha: 0, yPercent: 120 });
gsap.set('#scrim', { autoAlpha: 0 });

await document.fonts.ready;
if (REEL) {
  startReel({ setCart, setRest, renderSteppers, renderCartBar, renderCart, drawStatus, fillOrderSummary, itemTotal, syncTabs });
} else {
  wire();
  const tl = intro();
  win.seek = () => { tl.progress(1); window.scrollTo(0, 0); };
  await new Promise<void>((r) => tl.eventCallback('onComplete', () => r()));
  win.__ready = true;
}
