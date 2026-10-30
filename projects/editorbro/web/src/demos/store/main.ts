// Threadline store. Normal mode: real filtering, sorting, quick view, bag drawer and a three-step mock checkout.
// Reel mode (?reel=1): window.seek(t) rebuilds the exact state for t in [0, 6] (filter -> quick view -> add -> drawer -> confirmed).
import './style.css';
import gsap from 'gsap';
import { PRODUCTS, CATS, PRICES, SIZES, art, inr, type Product, type Cat } from './products';

const REEL = new URLSearchParams(location.search).has('reel');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = window as unknown as { seek: (t: number) => void; __ready?: boolean };
const root = document.documentElement;
root.classList.toggle('reel', REEL);

// ---------- pure helpers ----------
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const E = {
  out: (x: number) => 1 - Math.pow(1 - x, 4),
  in: (x: number) => x * x * x,
  expoOut: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOut: (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2),
};
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
const byId = (id: string) => PRODUCTS.find((p) => p.id === id)!;
const isDesktop = () => window.innerWidth >= 900;
const dur = (s: number) => (REDUCED ? 0 : s);

// ---------- elements ----------
const tabsEl = $('#tabs');
const thread = $('#thread');
const chipsEl = $('#chips');
const countEl = $('#count');
const sortEl = $<HTMLSelectElement>('#sort');
const grid = $('#grid');
const gridAlt = $('#gridAlt');
const emptyEl = $('#empty');
const scrim = $('#scrim');
const qv = $('#qv');
const drawer = $('#drawer');
const checkout = $('#checkout');
const bagBtn = $('#bagBtn');
const bagCount = $('#bagCount');
const addBtn = $<HTMLButtonElement>('#addBtn');
const tap = $('#tap');

// ---------- state ----------
interface Line { id: string; colour: number; size: string; qty: number }
const state = {
  cat: 'all' as 'all' | Cat,
  size: null as string | null,
  price: null as string | null,
  sort: 'featured',
  cart: [] as Line[],
  qv: { id: 'j01', colour: 0, size: null as string | null },
};
const FREE = 2999, SHIP_FEE = 149;
const subtotal = (cart: Line[]) => cart.reduce((s, l) => s + byId(l.id).price * l.qty, 0);
const units = (cart: Line[]) => cart.reduce((s, l) => s + l.qty, 0);

function visible(cat = state.cat, size = state.size, price = state.price, sort = state.sort) {
  const pr = PRICES.find((p) => p.id === price);
  const list = PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat)
    && (!size || (p.sizes.includes(size) && !p.soldOut.includes(size)))
    && (!pr || pr.test(p.price)));
  if (sort === 'low') list.sort((a, b) => a.price - b.price);
  else if (sort === 'high') list.sort((a, b) => b.price - a.price);
  else if (sort === 'new') list.sort((a, b) => a.newRank - b.newRank);
  return list;
}

// ---------- render ----------
const plus = '<svg viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
function cardHTML(p: Product) {
  const tag = p.tag ? `<span class="tag${p.tag === 'Low stock' ? ' low' : ''}">${p.tag}</span>` : '';
  return `<button class="card" type="button" data-id="${p.id}" aria-label="${p.name}, ${inr(p.price)}. Open quick view">
  <span class="tile" style="--tone:${p.tone}">${art(p.kind, p.colours[0])}${tag}<span class="quick" aria-hidden="true">${plus}</span></span>
  <span class="info"><span class="p-name">${p.name}</span><span class="p-row"><span class="p-price">${inr(p.price)}</span><span class="dots">${p.colours.map((c) => `<i style="background:${c.base}"></i>`).join('')}</span></span></span>
</button>`;
}
function renderGrid(list: Product[], el = grid) {
  el.innerHTML = list.map(cardHTML).join('');
}
function renderTabs() {
  const html = CATS.map((c) => {
    const n = c.id === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.cat === c.id).length;
    return `<button class="tab" role="tab" type="button" data-cat="${c.id}" aria-selected="${state.cat === c.id}">${c.label}<sup>${n}</sup></button>`;
  }).join('');
  $$('.tab', tabsEl).forEach((t) => t.remove());
  tabsEl.insertAdjacentHTML('beforeend', html);
}
function renderChips() {
  chipsEl.innerHTML = `<span class="chip-label">Size</span>`
    + SIZES.map((s) => `<button class="chip size" type="button" data-size="${s}" aria-pressed="${state.size === s}">${s}</button>`).join('')
    + `<span class="chip-sep" aria-hidden="true"></span>`
    + PRICES.map((p) => `<button class="chip" type="button" data-price="${p.id}" aria-pressed="${state.price === p.id}">${p.label}</button>`).join('');
}
function setCount(n: number) { countEl.innerHTML = `<b>${n}</b> piece${n === 1 ? '' : 's'}`; }
function tabEl(cat: string) { return $(`.tab[data-cat="${cat}"]`, tabsEl); }
function placeThread(a: HTMLElement, b: HTMLElement, k: number) {
  const x = lerp(a.offsetLeft, b.offsetLeft, k), w = lerp(a.offsetWidth, b.offsetWidth, k);
  thread.style.setProperty('--tx', `${x.toFixed(2)}px`);
  thread.style.width = `${w.toFixed(2)}px`;
}

// quick view
function renderQV() {
  const p = byId(state.qv.id), c = p.colours[state.qv.colour];
  $('#qvArt').innerHTML = art(p.kind, c);
  $('#qvArt').style.setProperty('--tone', p.tone);
  $('#qvCat').textContent = CATS.find((x) => x.id === p.cat)!.label + (p.tag ? ` · ${p.tag}` : '');
  $('#qvName').textContent = p.name;
  $('#qvPrice').textContent = inr(p.price);
  $('#addPrice').textContent = inr(p.price);
  $('#qvRating').innerHTML = `<span class="stars" aria-hidden="true">★★★★★</span> ${p.rating.toFixed(1)} · ${p.reviews} reviews <span aria-hidden="true">·</span> sample`;
  $('#qvColourName').textContent = c.name;
  $('#qvColours').innerHTML = p.colours.map((cc, i) => `<button class="colour" type="button" role="radio" data-colour="${i}" aria-checked="${i === state.qv.colour}" aria-label="${cc.name}"><i style="background:${cc.base}"></i></button>`).join('');
  renderSizes();
  $('#qvSizeHint').textContent = p.fit.split('.')[0];
  $('#qvMaterial').textContent = `${p.material}. ${p.fit}`;
  $('#qvError').textContent = '';
}
function renderSizes() {
  const p = byId(state.qv.id);
  const sizes = $('#qvSizes');
  sizes.style.gridTemplateColumns = `repeat(${Math.max(4, p.sizes.length)}, 1fr)`;
  sizes.innerHTML = p.sizes.map((s) => {
    const out = p.soldOut.includes(s);
    return `<button class="size-btn" type="button" role="radio" data-size="${s}" aria-checked="${state.qv.size === s}" ${out ? 'disabled aria-label="' + s + ', sold out"' : ''}>${s.replace('UK ', '')}</button>`;
  }).join('');
}

// bag drawer
function lineHTML(l: Line, i: number, editable: boolean) {
  const p = byId(l.id), c = p.colours[l.colour];
  return `<div class="line" data-i="${i}">
  <span class="line-art" style="--tone:${p.tone}">${art(p.kind, c)}</span>
  <div class="line-info"><span class="line-name">${p.name}</span><span class="line-var">${c.name} · ${l.size}</span>
  ${editable ? `<span class="qty"><button type="button" data-dec="${i}" aria-label="Decrease quantity">−</button><span>${l.qty}</span><button type="button" data-inc="${i}" aria-label="Increase quantity">+</button></span>` : `<span class="line-var">Qty ${l.qty}</span>`}</div>
  <div class="line-right"><span class="line-price">${inr(p.price * l.qty)}</span>${editable ? `<button class="remove" type="button" data-rm="${i}">Remove</button>` : ''}</div>
</div>`;
}
const check = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function shipMsg(sub: number) {
  if (sub <= 0) return `<span>Free shipping on orders over <b>${inr(FREE)}</b></span>`;
  if (sub >= FREE) return `${check}<span>You've unlocked <b>free shipping</b></span>`;
  return `<span>Add <b>${inr(FREE - sub)}</b> more for free shipping</span>`;
}
let lastCartKey = '';
function renderCart(cart: Line[]) {
  const key = JSON.stringify(cart);
  if (key === lastCartKey) return;
  lastCartKey = key;
  const sub = subtotal(cart), n = units(cart);
  const ship = sub === 0 ? 0 : sub >= FREE ? 0 : SHIP_FEE;
  $('#drawerCount').textContent = `(${n})`;
  $('#lines').innerHTML = cart.length ? cart.map((l, i) => lineHTML(l, i, true)).join('') : '<p class="empty-bag">Your bag is empty. The jackets are a good place to start.</p>';
  $('#shipMsg').innerHTML = shipMsg(sub);
  delete $('#shipMsg').dataset.state;
  const sugId = cart.some((l) => l.id === 't01') ? 'b01' : 't01';
  const sp = byId(sugId);
  $('#suggest').innerHTML = `<p class="crumb">Pairs well with</p><div class="sug"><span class="sug-art" style="--tone:${sp.tone}">${art(sp.kind, sp.colours[0])}</span><div><div class="sug-name">${sp.name}</div><div class="sug-price">${inr(sp.price)} · ${sp.colours[0].name}</div></div><button class="sug-add" type="button" data-sug="${sp.id}">Add</button></div>`;
  for (const [a, b] of [['#sumSub', '#coSub'], ['#sumShip', '#coShip'], ['#sumTotal', '#coTotal']]) {
    const v = a === '#sumSub' ? inr(sub) : a === '#sumShip' ? (sub === 0 ? '—' : ship === 0 ? 'Free' : inr(ship)) : inr(sub + ship);
    $(a).textContent = v; $(b).textContent = v;
  }
  $('#placeTotal').textContent = inr(sub + ship);
  const cb = $<HTMLButtonElement>('#checkoutBtn');
  cb.disabled = cart.length === 0;
  cb.textContent = cart.length ? `Checkout · ${inr(sub + ship)}` : 'Checkout';
  $('#coLines').innerHTML = cart.map((l, i) => lineHTML(l, i, false)).join('');
  if (cart[0]) {
    const p0 = byId(cart[0].id);
    $('#coMini').innerHTML = `<span class="line-art" style="--tone:${p0.tone}">${art(p0.kind, p0.colours[cart[0].colour])}</span><div><b>${n} item${n === 1 ? '' : 's'} · ${p0.name}${cart.length > 1 ? ' + more' : ''}</b><span>${ship === 0 ? 'Free shipping' : 'Shipping ' + inr(ship)}</span></div><span class="mini-total">${inr(sub + ship)}</span>`;
  }
  if (cart[0]) {
    const p = byId(cart[0].id);
    $('#doneItem').innerHTML = `<span class="line-art" style="--tone:${p.tone}">${art(p.kind, p.colours[cart[0].colour])}</span><div class="line-info"><span class="line-name">${p.name}${cart.length > 1 ? ` + ${cart.length - 1} more` : ''}</span><span class="line-var">${p.colours[cart[0].colour].name} · ${cart[0].size}</span></div><span class="line-price">${inr(sub + ship)}</span>`;
  }
  bagCount.textContent = String(n);
  bagBtn.setAttribute('aria-label', `Bag, ${n} item${n === 1 ? '' : 's'}`);
}
function setShipFill(k: number) {
  const f = `${(clamp(k) * 100).toFixed(2)}%`;
  $('.ship').style.setProperty('--fill', f);
}

// overlay progress setters (shared by both modes)
const prog = { qv: 0, drawer: 0, co: 0 };
function setScrim() {
  const p = Math.max(prog.qv, prog.drawer, prog.co);
  scrim.style.opacity = String(p);
  scrim.classList.toggle('on', p > 0.5);
}
function setQV(p: number) {
  prog.qv = p;
  qv.style.visibility = p > 0.001 ? 'visible' : 'hidden';
  if (isDesktop()) { qv.style.transform = `translate(-50%, calc(-50% + ${((1 - p) * 40).toFixed(2)}px))`; qv.style.opacity = String(p); }
  else { qv.style.transform = `translateY(${((1 - p) * 105).toFixed(3)}%)`; qv.style.opacity = '1'; }
  setScrim();
}
function setDrawer(p: number) {
  prog.drawer = p;
  drawer.style.visibility = p > 0.001 ? 'visible' : 'hidden';
  drawer.style.transform = `translateX(${((1 - p) * 102).toFixed(3)}%)`;
  setScrim();
}
function setCheckout(p: number) {
  prog.co = p;
  checkout.style.visibility = p > 0.001 ? 'visible' : 'hidden';
  if (isDesktop()) { checkout.style.transform = `translate(-50%, calc(-50% + ${((1 - p) * 40).toFixed(2)}px))`; checkout.style.opacity = String(p); }
  else { checkout.style.transform = `translateY(${((1 - p) * 102).toFixed(3)}%)`; checkout.style.opacity = '1'; }
  setScrim();
}
function setStep(s: number) {
  $('#coTrack').style.setProperty('--co', s.toFixed(4));
  $('#stepsFill').style.setProperty('--steps', `${((s / 2) * 100).toFixed(2)}%`);
  $$('#steps li').forEach((li, i) => {
    li.classList.toggle('done', s >= i + 0.6 || (i === 2 && s >= 1.95));
    li.classList.toggle('on', Math.round(s) === i);
    if (Math.round(s) === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
}
function setDone(k: number) {
  const ck = $<SVGPathElement>('.done-check'), ring = $<SVGCircleElement>('.done-ring');
  ck.style.strokeDashoffset = String(1 - E.out(seg(k, 0.25, 1)));
  ring.style.opacity = String(E.out(seg(k, 0, 0.4)));
  ring.style.transform = `rotate(${(-90 + 120 * E.out(k)).toFixed(2)}deg) scale(${(0.82 + 0.18 * E.out(seg(k, 0, 0.6))).toFixed(3)})`;
  $$('#donePanel > :not(.done-mark)').forEach((el, i) => {
    const kk = E.out(seg(k, 0.1 + i * 0.07, 0.55 + i * 0.07));
    el.style.opacity = String(kk);
    el.style.transform = `translateY(${((1 - kk) * 14).toFixed(2)}px)`;
  });
}
function setAddMorph(k: number) {
  const l = $('.add-label', addBtn), d = $('.add-done', addBtn);
  l.style.transform = `translateY(${(-100 * k).toFixed(1)}%)`; l.style.opacity = String(1 - k);
  d.style.transform = `translateY(${(100 * (1 - k)).toFixed(1)}%)`; d.style.opacity = String(k);
}

function setTap(t: number, taps: { t: number; el: () => HTMLElement }[]) {
  const live = taps.filter((tp) => t - tp.t >= -0.3 && t - tp.t <= 0.34).sort((a, b) => Math.abs(t - a.t) - Math.abs(t - b.t));
  for (const tp of live.slice(0, 1)) {
    const u = t - tp.t;
    const b = tp.el().getBoundingClientRect();
    tap.style.transform = `translate(${(b.left + b.width / 2).toFixed(1)}px, ${(b.top + b.height / 2).toFixed(1)}px)`;
    tap.style.opacity = String(clamp((u + 0.3) / 0.14) * clamp((0.34 - u) / 0.16));
    const press = u < 0 ? 1 - 0.16 * E.in(clamp((u + 0.08) / 0.08)) : 0.84 + 0.16 * E.out(clamp(u / 0.16));
    tap.style.setProperty('--press', press.toFixed(3));
    const rk = clamp(u / 0.32);
    tap.style.setProperty('--ring', (1 + 1.2 * E.out(rk)).toFixed(3));
    tap.style.setProperty('--ring-o', (u >= 0 ? 0.9 * (1 - rk) : 0).toFixed(3));
    return;
  }
  tap.style.opacity = '0';
}

// =====================================================================================
// Reel mode
// =====================================================================================
const T = {
  scroll: [0.0, 0.85] as const, tapCat: 0.9, thread: [0.92, 1.4] as const, out: 0.92, in: 1.12,
  tapCard: 1.72, qvOpen: [1.76, 2.22] as const, tapSize: 2.4, tapAdd: 2.7, morph: [2.74, 2.98] as const,
  qvClose: [3.0, 3.26] as const, drawer: [3.04, 3.5] as const, fill: [3.3, 3.86] as const,
  tapCheckout: 3.98, coOpen: [4.02, 4.42] as const, tapContinue: 4.62, step1: [4.66, 5.0] as const,
  tapPlace: 5.16, step2: [5.2, 5.55] as const, done: [5.32, 5.95] as const,
};
const REEL_LINE: Line = { id: 'j01', colour: 0, size: 'M', qty: 1 };

function reelSeek(tIn: number) {
  const t = clamp(tIn, 0, 6);
  // scroll a touch into the grid
  const y = Math.round(84 * E.inOut(seg(t, T.scroll[0], T.scroll[1])));
  (document.scrollingElement || root).scrollTop = y;

  // category: All -> Jackets
  const picked = t >= T.tapCat;
  $$('.tab', tabsEl).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cat === (picked ? 'jackets' : 'all'))));
  placeThread(tabEl('all'), tabEl('jackets'), E.expoOut(seg(t, T.thread[0], T.thread[1])));
  setCount(t >= T.in ? 3 : 12);
  $$('.card', grid).forEach((c, i) => {
    const k = E.in(seg(t, T.out + i * 0.025, T.out + i * 0.025 + 0.2));
    c.style.opacity = String(1 - k);
    c.style.transform = `translateY(${(-10 * k).toFixed(2)}px)`;
    c.style.visibility = k >= 1 ? 'hidden' : 'visible';
  });
  $$('.card', gridAlt).forEach((c, i) => {
    const k = E.out(seg(t, T.in + i * 0.06, T.in + i * 0.06 + 0.55));
    c.style.opacity = String(k);
    c.style.transform = `translateY(${((1 - k) * 22).toFixed(2)}px)`;
    c.style.visibility = k <= 0 ? 'hidden' : 'visible';
  });

  // quick view
  state.qv.size = t >= T.tapSize ? 'M' : null;
  $$('.size-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.size === state.qv.size)));
  const qvP = t < T.qvClose[0] ? E.expoOut(seg(t, T.qvOpen[0], T.qvOpen[1])) : 1 - E.in(seg(t, T.qvClose[0], T.qvClose[1]));
  setQV(qvP);
  setAddMorph(E.expoOut(seg(t, T.morph[0], T.morph[1])));
  addBtn.style.transform = t >= T.tapAdd - 0.05 && t < T.tapAdd + 0.12 ? 'scale(0.985)' : '';

  // bag
  const inBag = t >= T.morph[0] + 0.06;
  renderCart(inBag ? [REEL_LINE] : []);
  const bump = inBag ? 1 + 0.4 * Math.sin(Math.PI * seg(t, T.morph[0] + 0.06, T.morph[0] + 0.4)) : 0;
  bagCount.style.setProperty('--bump', bump.toFixed(3));
  setDrawer(E.expoOut(seg(t, T.drawer[0], T.drawer[1])));
  setShipFill(E.out(seg(t, T.fill[0], T.fill[1])));
  const msg = $('#shipMsg');
  const unlocked = t >= T.fill[1] - 0.12;
  const want = unlocked ? shipMsg(FREE) : `<span>Free shipping on orders over <b>${inr(FREE)}</b></span>`;
  if (msg.dataset.state !== String(unlocked)) { msg.innerHTML = want; msg.dataset.state = String(unlocked); }
  const mk = unlocked ? E.out(seg(t, T.fill[1] - 0.12, T.fill[1] + 0.18)) : 1;
  msg.style.opacity = String(0.2 + 0.8 * mk);
  msg.style.transform = `translateY(${((1 - mk) * 6).toFixed(2)}px)`;

  // checkout
  setCheckout(E.expoOut(seg(t, T.coOpen[0], T.coOpen[1])));
  const s = t < T.step2[0] ? E.inOut(seg(t, T.step1[0], T.step1[1])) : 1 + E.inOut(seg(t, T.step2[0], T.step2[1]));
  setStep(s);
  setDone(seg(t, T.done[0], T.done[1]));

  setTap(t, [
    { t: T.tapCat, el: () => tabEl('jackets') },
    { t: T.tapCard, el: () => $('.card', gridAlt) },
    { t: T.tapSize, el: () => $('.size-btn[data-size="M"]') },
    { t: T.tapAdd, el: () => addBtn },
    { t: T.tapCheckout, el: () => $('#checkoutBtn') },
    { t: T.tapContinue, el: () => $('#toPayment') },
    { t: T.tapPlace, el: () => $('#placeOrder') },
  ]);
}

function setupReel() {
  state.cat = 'all';
  renderTabs(); renderChips();
  renderGrid(visible('all'), grid);
  renderGrid(visible('jackets'), gridAlt);
  state.qv = { id: 'j01', colour: 0, size: null };
  renderQV();
  $('#doneName').textContent = 'Meera';
  $('#orderNo').textContent = 'TL-24817';
  W.seek = reelSeek;
  reelSeek(0);
}

// =====================================================================================
// Normal mode
// =====================================================================================
let opener: HTMLElement | null = null;
const tw: Record<string, gsap.core.Tween | undefined> = {};
function animate(key: 'qv' | 'drawer' | 'co', to: number, set: (p: number) => void) {
  tw[key]?.kill();
  const o = { p: prog[key] };
  const opening = to > o.p;
  tw[key] = gsap.to(o, { p: to, duration: dur(opening ? 0.6 : 0.32), ease: opening ? 'expo.out' : 'power2.in', onUpdate: () => set(o.p) });
}
function lock() { document.body.classList.toggle('lock', Math.max(prog.qv, prog.drawer, prog.co) > 0 || qvOpen || drawerOpen || coOpen); }
let qvOpen = false, drawerOpen = false, coOpen = false;

function openQV(id: string, from: HTMLElement) {
  opener = from;
  state.qv = { id, colour: 0, size: null };
  const p = byId(id);
  if (p.sizes.length === 1) state.qv.size = p.sizes[0];
  renderQV();
  addBtn.dataset.added = '0';
  qvOpen = true; lock();
  qv.setAttribute('aria-hidden', 'false');
  animate('qv', 1, setQV);
  window.setTimeout(() => $<HTMLButtonElement>('.qv-close').focus({ preventScroll: true }), 50);
}
function closeQV(restore = true) {
  qvOpen = false;
  qv.setAttribute('aria-hidden', 'true');
  animate('qv', 0, setQV);
  window.setTimeout(lock, 350);
  if (restore) opener?.focus({ preventScroll: true });
}
function openDrawer() {
  drawerOpen = true; lock();
  drawer.setAttribute('aria-hidden', 'false');
  animate('drawer', 1, setDrawer);
  const o = { k: 0 };
  const target = clamp(subtotal(state.cart) / FREE);
  gsap.fromTo(o, { k: 0 }, { k: target, duration: dur(0.8), delay: dur(0.25), ease: 'power3.out', onUpdate: () => setShipFill(o.k) });
  window.setTimeout(() => $<HTMLButtonElement>('.drawer-head .icon-btn').focus({ preventScroll: true }), 50);
}
function closeDrawer() {
  drawerOpen = false;
  drawer.setAttribute('aria-hidden', 'true');
  animate('drawer', 0, setDrawer);
  window.setTimeout(lock, 350);
}
let step = 0;
function goStep(n: number) {
  const o = { s: step };
  step = n;
  gsap.to(o, { s: n, duration: dur(0.6), ease: 'power3.inOut', onUpdate: () => setStep(o.s) });
  if (n === 2) {
    const d = { k: 0 };
    gsap.to(d, { k: 1, duration: dur(0.9), delay: dur(0.2), ease: 'none', onUpdate: () => setDone(d.k) });
  }
  window.setTimeout(() => {
    const panel = $$('.co-panel')[n];
    $<HTMLElement>('input, button', panel)?.focus({ preventScroll: true });
  }, 650);
}
function openCheckout() {
  if (!state.cart.length) return;
  coOpen = true; lock();
  checkout.setAttribute('aria-hidden', 'false');
  step = 0; setStep(0); setDone(0);
  animate('co', 1, setCheckout);
  if (drawerOpen) closeDrawer();
}
function closeCheckout() {
  coOpen = false;
  checkout.setAttribute('aria-hidden', 'true');
  animate('co', 0, setCheckout);
  window.setTimeout(lock, 350);
  if (step === 2) { state.cart = []; renderCart(state.cart); }
  else openDrawer();
}

function applyFilters(animateGrid = true) {
  const list = visible();
  setCount(list.length);
  emptyEl.hidden = list.length > 0;
  const swap = () => {
    renderGrid(list);
    if (animateGrid && !REDUCED) gsap.from($$('.card', grid), { y: 18, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' });
  };
  const old = $$('.card', grid);
  if (animateGrid && !REDUCED && old.length) gsap.to(old, { y: -8, opacity: 0, duration: 0.18, stagger: 0.02, ease: 'power2.in', onComplete: swap });
  else swap();
}
function selectCat(cat: 'all' | Cat) {
  const from = tabEl(state.cat), to = tabEl(cat);
  state.cat = cat;
  $$('.tab', tabsEl).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cat === cat)));
  const o = { k: 0 };
  gsap.to(o, { k: 1, duration: dur(0.55), ease: 'expo.out', onUpdate: () => placeThread(from, to, o.k) });
  applyFilters();
}

function addToBag() {
  const p = byId(state.qv.id);
  if (!state.qv.size) {
    $('#qvError').textContent = 'Pick a size first.';
    gsap.fromTo('#qvSizes', { x: -4 }, { x: 0, duration: dur(0.4), ease: 'power3.out' });
    return;
  }
  const ex = state.cart.find((l) => l.id === p.id && l.colour === state.qv.colour && l.size === state.qv.size);
  if (ex) ex.qty += 1; else state.cart.push({ id: p.id, colour: state.qv.colour, size: state.qv.size, qty: 1 });
  renderCart(state.cart);
  addBtn.dataset.added = '1';
  gsap.fromTo(bagCount, { '--bump': 1.45 }, { '--bump': 1, duration: dur(0.5), ease: 'power3.out' });
  window.setTimeout(() => { closeQV(false); openDrawer(); }, REDUCED ? 0 : 650);
}

function hashCart(cart: Line[]) {
  let h = 2166136261;
  for (const ch of JSON.stringify(cart)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 90000 + 10000;
}

let introTl: gsap.core.Timeline | null = null;
function setupNormal() {
  renderTabs(); renderChips(); applyFilters(false); renderCart(state.cart);
  placeThread(tabEl('all'), tabEl('all'), 1);
  setQV(0); setDrawer(0); setCheckout(0); setStep(0); setDone(0);

  tabsEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.tab');
    if (b && b.dataset.cat !== state.cat) selectCat(b.dataset.cat as 'all' | Cat);
  });
  chipsEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.chip');
    if (!b) return;
    if (b.dataset.size) state.size = state.size === b.dataset.size ? null : b.dataset.size;
    if (b.dataset.price) state.price = state.price === b.dataset.price ? null : b.dataset.price;
    renderChips();
    applyFilters();
  });
  sortEl.addEventListener('change', () => { state.sort = sortEl.value; applyFilters(); });
  $('#clearAll').addEventListener('click', () => { state.size = null; state.price = null; renderChips(); selectCat('all'); });
  grid.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.card');
    if (c) openQV(c.dataset.id!, c);
  });
  $('#qvColours').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.colour');
    if (!b) return;
    state.qv.colour = Number(b.dataset.colour);
    const p = byId(state.qv.id), c = p.colours[state.qv.colour];
    $$('.colour', qv).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    $('#qvColourName').textContent = c.name;
    const holder = $('#qvArt');
    holder.insertAdjacentHTML('beforeend', art(p.kind, c));
    const arts = $$('.art', holder);
    const next = arts[arts.length - 1];
    gsap.fromTo(next, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: dur(0.45), ease: 'power3.out', onComplete: () => arts.slice(0, -1).forEach((a) => a.remove()) });
  });
  $('#qvSizes').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.size-btn');
    if (!b || b.disabled) return;
    state.qv.size = b.dataset.size!;
    $('#qvError').textContent = '';
    $$('.size-btn').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  });
  addBtn.addEventListener('click', addToBag);
  bagBtn.addEventListener('click', () => { opener = bagBtn; openDrawer(); });
  $('#lines').addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const inc = t.closest<HTMLElement>('[data-inc]'), dec = t.closest<HTMLElement>('[data-dec]'), rm = t.closest<HTMLElement>('[data-rm]');
    if (inc) state.cart[Number(inc.dataset.inc)].qty += 1;
    else if (dec) { const l = state.cart[Number(dec.dataset.dec)]; l.qty -= 1; if (l.qty <= 0) state.cart.splice(Number(dec.dataset.dec), 1); }
    else if (rm) state.cart.splice(Number(rm.dataset.rm), 1);
    else return;
    renderCart(state.cart);
    setShipFill(clamp(subtotal(state.cart) / FREE));
  });
  $('#suggest').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sug]');
    if (!b) return;
    const p = byId(b.dataset.sug!);
    state.cart.push({ id: p.id, colour: 0, size: p.sizes.includes('M') ? 'M' : p.sizes[0], qty: 1 });
    renderCart(state.cart);
    const o = { k: parseFloat($('.ship').style.getPropertyValue('--fill')) / 100 || 0 };
    gsap.to(o, { k: clamp(subtotal(state.cart) / FREE), duration: dur(0.7), ease: 'power3.out', onUpdate: () => setShipFill(o.k) });
    gsap.fromTo(bagCount, { '--bump': 1.45 }, { '--bump': 1, duration: dur(0.5), ease: 'power3.out' });
  });
  $('#checkoutBtn').addEventListener('click', openCheckout);
  $<HTMLFormElement>('#addrForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    let bad = 0;
    $$<HTMLInputElement>('input', form).forEach((i) => { const ok = i.checkValidity() && i.value.trim() !== ''; i.setAttribute('aria-invalid', String(!ok)); if (!ok) bad++; });
    $('#addrError').textContent = bad ? 'Please fill in the highlighted fields (PIN code is 6 digits).' : '';
    if (!bad) {
      const v = (n: string) => $<HTMLInputElement>(`#addrForm input[name="${n}"]`).value.trim();
      $('#deliverTo').textContent = `${v('name')} · ${v('addr')}, ${v('city')} ${v('pin')}`;
      goStep(1);
    }
  });
  $('#backToAddr').addEventListener('click', () => goStep(0));
  $<HTMLFormElement>('#payForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = ($<HTMLInputElement>('#addrForm input[name="name"]').value.trim().split(/\s+/)[0]) || 'friend';
    $('#doneName').textContent = name;
    $('#orderNo').textContent = `TL-${hashCart(state.cart)}`;
    goStep(2);
  });
  $('#keepShopping').addEventListener('click', closeCheckout);
  $('#newsForm').addEventListener('submit', (e) => { e.preventDefault(); const b = $('#newsForm button'); b.textContent = 'Thanks'; });
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => {
    const d = b.closest('[role="dialog"]');
    if (d === qv) closeQV(); else if (d === drawer) closeDrawer(); else closeCheckout();
  }));
  scrim.addEventListener('click', () => { if (coOpen) closeCheckout(); else if (qvOpen) closeQV(); else if (drawerOpen) closeDrawer(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (coOpen) closeCheckout(); else if (qvOpen) closeQV(); else if (drawerOpen) closeDrawer();
  });
  window.addEventListener('resize', () => { placeThread(tabEl(state.cat), tabEl(state.cat), 1); setQV(prog.qv); setDrawer(prog.drawer); setCheckout(prog.co); });

  introTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (!REDUCED) {
    introTl
      .from('.intro > *', { y: 22, opacity: 0, duration: 0.8, stagger: 0.06 }, 0.05)
      .from('.toolbar', { opacity: 0, duration: 0.6 }, 0.2)
      .from('.grid .card', { y: 26, opacity: 0, duration: 0.7, stagger: 0.05, clearProps: 'transform,opacity' }, 0.25)
      .fromTo('.wordmark svg path', { strokeDashoffset: 160 }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.1);
  }
}

async function boot() {
  const faces = ['500 42px "Bodoni Moda"', 'italic 500 42px "Bodoni Moda"', 'italic 600 25px "Bodoni Moda"', '400 15px "Hanken Grotesk"', '600 15px "Hanken Grotesk"', '700 11px "Hanken Grotesk"'];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;
  if (REEL) setupReel();
  else {
    setupNormal();
    W.seek = () => { introTl?.progress(1); };
  }
  W.__ready = true;
}
boot();
