// Brewpoint Rewards. Normal mode: a scripted helper (no AI API) that answers a few intents with rich cards,
// a redeem sheet with a deterministic QR-style code, and a stamp-burst confirmation.
// Reel mode (?reel=1): window.seek(t) rebuilds the exact state for t in [0, 6].
import './style.css';
import gsap from 'gsap';
import { ILLO, INK, beanStamp, bigStamp, fnv, inkDefs, mulberry32, qrSVG, setQrReveal } from './art';

const REEL = new URLSearchParams(location.search).has('reel');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = window as unknown as { seek: (t: number) => void; __ready?: boolean };
const root = document.documentElement;
root.classList.toggle('reel', REEL);

// ---------- helpers ----------
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
const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const dur = (s: number) => (REDUCED ? 0 : s);

// ---------- data (sample values for a fictional café) ----------
interface Reward { id: keyof typeof ILLO; name: string; cost: number; note: string }
const REWARDS: Reward[] = [
  { id: 'cappuccino', name: 'Cappuccino', cost: 450, note: 'any size' },
  { id: 'croissant', name: 'Almond croissant', cost: 300, note: 'baked this morning' },
  { id: 'coldbrew', name: 'Cold brew bottle', cost: 600, note: '330 ml' },
  { id: 'beans', name: 'House beans 250 g', cost: 1200, note: 'whole or ground' },
];
const TIERS = [{ name: 'Bean', at: 0 }, { name: 'Roast', at: 1000 }, { name: 'Reserve', at: 2500 }];
const state = { points: 1240, life: 1240, stamps: 7, reward: REWARDS[0], busy: false };
const tierPct = (p: number) => (p <= 1000 ? (p / 1000) * 40 : 40 + ((p - 1000) / 1500) * 60);

// ---------- elements ----------
const scroll = $('#scroll');
const log = $('#log');
const ask = $<HTMLInputElement>('#ask');
const fake = $('#fake');
const sheet = $('#sheet');
const sheetScrim = $('#sheetScrim');
const stampLayer = $('#stampLayer');
const burst = $('#burst');
const redeemBtn = $<HTMLButtonElement>('#redeemBtn');
const qrCard = $('#qrCard');
const tap = $('#tap');

// ---------- static render ----------
$('#inkDefs').innerHTML = inkDefs;
function renderStamps(n: number) {
  const cup = '<svg viewBox="0 0 24 24"><path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16 10.5h1.5a2.2 2.2 0 0 1 0 4.4H16" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 6.5q-1-1.6 0-3M12 6.5q-1-1.6 0-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  $('#stamps').innerHTML = Array.from({ length: 10 }, (_, i) => {
    if (i < n) return `<span class="slot">${beanStamp(i)}</span>`;
    if (i === 9) return `<span class="slot free">${cup}Free</span>`;
    return '<span class="slot empty"></span>';
  }).join('');
  $('#stampCount').textContent = String(n);
  $('#scFoot').textContent = `${10 - n} more drink${10 - n === 1 ? '' : 's'} until a free one, on us`;
}
burst.innerHTML = Array.from({ length: 22 }, () => '<i></i>').join('') + '<i class="ring"></i><i class="ring"></i>';
stampLayer.innerHTML = bigStamp();

/** n = spendable balance; life = lifetime points, which set the tier (redeeming never demotes you). */
function setBalance(n: number, life = n) {
  const s = fmt(n);
  $('#ptsPill').textContent = s;
  $('#balance').textContent = s;
  $('#tierFill').style.setProperty('--tier', `${tierPct(life).toFixed(2)}%`);
  const next = TIERS.find((t) => t.at > life);
  $('#tierNote').textContent = next ? `${fmt(next.at - life)} lifetime pts to ${next.name}` : 'You are at the top tier';
}

// ---------- message builders ----------
const me = (text: string, id = '') => `<div class="msg me"${id ? ` id="${id}"` : ''}>${text}</div>`;
const brew = (html: string) => `<div class="msg brew">${html}</div>`;
function rewardCards(points: number) {
  return `<div class="rewards">${REWARDS.map((r) => `<div class="rcard"><span class="illo">${ILLO[r.id]}</span><span class="rc-name">${r.name}</span><span class="rc-cost">${fmt(r.cost)} pts</span><button class="rc-btn" type="button" data-reward="${r.id}" ${r.cost > points ? 'disabled' : ''}>${r.cost > points ? `Need ${fmt(r.cost - points)} more` : 'Redeem'}</button></div>`).join('')}</div>`;
}
type Intent = 'points' | 'redeem' | 'birthday' | 'stamps' | 'hello' | 'unknown';
function intentOf(q: string): Intent {
  const s = q.toLowerCase();
  if (/birthday|bday|b'day/.test(s)) return 'birthday';
  if (/redeem|reward|free|spend|use my/.test(s)) return 'redeem';
  if (/point|balance|how many|tier|level/.test(s)) return 'points';
  if (/stamp|card/.test(s)) return 'stamps';
  if (/^(hi|hey|hello|namaste)\b/.test(s)) return 'hello';
  return 'unknown';
}
function answer(intent: Intent, points: number) {
  const tier = [...TIERS].reverse().find((t) => state.life >= t.at)!;
  const next = TIERS.find((t) => t.at > state.life);
  switch (intent) {
    case 'points':
      return brew(`You have <b>${fmt(points)} pts</b>. Here's where that puts you:`)
        + `<div class="rich"><div class="big">${fmt(points)} <span style="font-family:var(--sans);font-size:13px;color:var(--muted)">pts</span></div><div class="row"><span>${tier.name} member</span><span>${next ? `${fmt(next.at - state.life)} lifetime pts to ${next.name}` : 'Top tier'}</span></div><div class="bar"><span style="width:${tierPct(state.life).toFixed(1)}%"></span></div><div class="row"><span>10 pts per ₹100 · double on Mondays</span></div></div>`;
    case 'redeem':
      return brew(`You have <b>${fmt(points)} pts</b>. These are ready when you are:`) + rewardCards(points);
    case 'birthday':
      return brew('Yes! Your birthday is on your card, so this one is waiting for you:')
        + `<div class="rich bday">${ILLO.cake}<div><h4>A slice on us + double points</h4><p>Any cake slice free, and 2× points all birthday week. Show your card at the counter.</p></div></div>`;
    case 'stamps':
      return brew(`You're on <b>${state.stamps} of 10</b> stamps. ${10 - state.stamps} more handcrafted drinks and the next one is free.`);
    case 'hello':
      return brew('Hi Aanya! Ask me about your points, what you can redeem, or birthday treats.');
    default:
      return brew("I'm a scripted helper, so I only know a few things: your points, rewards, stamp card and birthday treats. Try one of the questions below.");
  }
}
const typingDots = (cls = '') => `<div class="typing ${cls}" aria-label="Brew is typing"><i></i><i></i><i></i></div>`;
function setDots(el: HTMLElement | null, t: number) {
  if (!el) return;
  $$('i', el).forEach((d, i) => {
    const ph = Math.sin(t * 9 - i * 0.9);
    d.style.setProperty('--y', `${(-Math.max(0, ph) * 4).toFixed(2)}px`);
    d.style.setProperty('--o', (0.45 + 0.5 * Math.max(0, ph)).toFixed(2));
  });
}

// ---------- sheet + stamp burst (shared setters) ----------
const PARTS = (() => {
  const r = mulberry32(42);
  return Array.from({ length: 22 }, (_, i) => ({ a: (i / 22) * Math.PI * 2 + (r() - 0.5) * 0.5, d: 80 + r() * 70, s: 3 + r() * 8, lag: r() * 0.08 }));
})();
function setSheet(p: number) {
  sheet.style.visibility = p > 0.001 ? 'visible' : 'hidden';
  sheet.style.transform = `translateY(${((1 - p) * 105).toFixed(3)}%)`;
  sheetScrim.style.opacity = String(p);
  sheetScrim.classList.toggle('on', p > 0.5);
  sheet.setAttribute('aria-hidden', String(p < 0.5));
}
function fillSheet(r: Reward, points: number) {
  const code = `BP-${(fnv(r.id + points).toString(36).toUpperCase() + 'K2Q91').slice(0, 4)}-${String(fnv(r.name) % 90 + 10)}`;
  $('#sheetIllo').innerHTML = ILLO[r.id];
  $('#sheetTitle').textContent = r.name;
  $('#sheetCost').textContent = fmt(r.cost);
  $('.sheet-cost').innerHTML = `<span id="sheetCost">${fmt(r.cost)}</span> pts · ${r.note}`;
  $('#code').textContent = REEL ? 'BP-7K2Q-91' : code;
  $('#qrWrap').innerHTML = qrSVG(REEL ? 'BP-7K2Q-91' : code, 'q');
  $('#balFrom').textContent = fmt(points);
  $('#balTo').textContent = `${fmt(points - r.cost)} pts`;
  $('.rb-a', redeemBtn).textContent = points >= r.cost ? `Redeem ${fmt(r.cost)} pts` : `Need ${fmt(r.cost - points)} more pts`;
  $('.rb-b', redeemBtn).textContent = `Done · enjoy it, Aanya`;
  redeemBtn.disabled = points < r.cost;
}
const qrEl = () => $<SVGSVGElement>('#qrWrap svg');
/** slam: 0 = stamp above the card, 1 = pressed into the card. */
function setSlam(k: number) {
  const fall = E.in(k);
  stampLayer.style.opacity = String(k <= 0 ? 0 : 0.35 + 0.65 * fall);
  stampLayer.style.transform = `rotate(${lerp(-26, -12, fall).toFixed(2)}deg) scale(${lerp(1.9, 1, fall).toFixed(3)})`;
}
/** u = seconds since impact (ink burst, rings, card shake). Negative hides it. */
function setBurst(u: number) {
  const parts = $$('i', burst);
  PARTS.forEach((p, i) => {
    const el = parts[i];
    if (u < p.lag) { el.style.opacity = '0'; return; }
    const k = E.expoOut(clamp((u - p.lag) / 0.55));
    const x = Math.cos(p.a) * p.d * k, y = Math.sin(p.a) * p.d * k + 10 * clamp(u - 0.4);
    const sz = p.s * (1 - 0.35 * k);
    el.style.width = el.style.height = `${sz.toFixed(2)}px`;
    el.style.transform = `translate(${(x - sz / 2).toFixed(2)}px, ${(y - sz / 2).toFixed(2)}px)`;
    el.style.opacity = String(0.9 * (1 - clamp((u - 0.35) / 1.0)));
  });
  [parts[22], parts[23]].forEach((ring, j) => {
    const v = u - j * 0.08;
    const k = E.out(clamp(v / 0.5));
    const size = 120 + 200 * k;
    ring.style.width = ring.style.height = `${size}px`;
    ring.style.transform = `translate(${-size / 2}px, ${-size / 2}px)`;
    ring.style.opacity = String(v < 0 ? 0 : 0.7 * (1 - k));
  });
  const s = u < 0 ? 0 : 7 * Math.exp(-u * 11) * Math.sin(u * 62);
  qrCard.style.transform = `translate(${s.toFixed(2)}px, ${(u < 0 ? 0 : 3 * Math.exp(-u * 14)).toFixed(2)}px)`;
}
function setDone(k: number) {
  const a = $('.rb-a', redeemBtn), b = $('.rb-b', redeemBtn);
  a.style.transform = `translateY(${(-100 * k).toFixed(1)}%)`; a.style.opacity = String(1 - k);
  b.style.transform = `translateY(${(100 * (1 - k)).toFixed(1)}%)`; b.style.opacity = String(k);
  redeemBtn.style.background = `color-mix(in srgb, var(--espresso) ${(k * 100).toFixed(1)}%, ${INK})`;
}

function setTap(t: number, taps: { t: number; el: () => HTMLElement }[]) {
  const live = taps.filter((tp) => t - tp.t >= -0.3 && t - tp.t <= 0.34).sort((a, b) => Math.abs(t - a.t) - Math.abs(t - b.t));
  const tp = live[0];
  if (!tp) { tap.style.opacity = '0'; return; }
  const u = t - tp.t;
  const b = tp.el().getBoundingClientRect();
  tap.style.transform = `translate(${(b.left + b.width / 2).toFixed(1)}px, ${(b.top + b.height / 2).toFixed(1)}px)`;
  tap.style.opacity = String(clamp((u + 0.3) / 0.14) * clamp((0.34 - u) / 0.16));
  tap.style.setProperty('--press', (u < 0 ? 1 - 0.16 * E.in(clamp((u + 0.08) / 0.08)) : 0.84 + 0.16 * E.out(clamp(u / 0.16))).toFixed(3));
  const rk = clamp(u / 0.32);
  tap.style.setProperty('--ring', (1 + 1.2 * E.out(rk)).toFixed(3));
  tap.style.setProperty('--ring-o', (u >= 0 ? 0.9 * (1 - rk) : 0).toFixed(3));
}
function setSteam(t: number) {
  $$('.steam').forEach((s, i) => {
    const k = (t * 0.9 + i * 0.5) % 1;
    s.style.transform = `translateY(${(-3 * k).toFixed(2)}px)`;
    s.style.opacity = String(Math.sin(k * Math.PI).toFixed(3));
  });
}

// =====================================================================================
// Reel mode
// =====================================================================================
const Q = 'What can I redeem?';
const T = {
  count: [0.05, 0.85] as const, tapInput: 0.72, type: [0.86, 1.72] as const, tapSend: 1.88, me: [1.92, 2.25] as const,
  dots: [2.12, 2.9] as const, answer: 2.88, tapRedeem: 3.55, sheet: [3.6, 4.0] as const, qr: [3.78, 4.3] as const,
  tapConfirm: 4.36, slam: [4.42, 4.56] as const, count2: [4.66, 5.25] as const, done: [5.2, 5.5] as const,
};
const S = { q: 0, dots: 0, a: 0 };

function reelSeek(tIn: number) {
  const t = clamp(tIn, 0, 6);
  // header numbers
  const before = t < T.slam[1] ? lerp(1180, 1240, E.out(seg(t, T.count[0], T.count[1]))) : lerp(1240, 790, E.out(seg(t, T.count2[0], T.count2[1])));
  const life = t < T.slam[1] ? before : 1240;
  setBalance(before, life);
  $('#tierFill').style.setProperty('--tier', `${(tierPct(life) * (t < 1 ? E.out(seg(t, 0, 0.9)) : 1)).toFixed(2)}%`);
  $('#balFrom').textContent = '1,240';
  setSteam(t);

  // typing into the composer
  const n = Math.floor(Q.length * seg(t, T.type[0], T.type[1]));
  const typed = t >= T.tapSend + 0.02 ? '' : Q.slice(0, n);
  const focus = t >= T.tapInput && t < T.tapSend + 0.02;
  $('.field').classList.toggle('focus', focus);
  ask.placeholder = focus || typed ? '' : 'Ask about points, rewards, offers…';
  const caretOn = focus && (t < T.type[1] + 0.02 || Math.floor(t * 3) % 2 === 0);
  fake.classList.toggle('on', focus);
  fake.innerHTML = `${typed}<span class="caret" style="opacity:${caretOn ? 1 : 0}"></span>`;

  // messages
  const qEl = $('#reelQ'), grp = $('#reelA');
  const mk = E.out(seg(t, T.me[0], T.me[1]));
  qEl.style.opacity = String(mk);
  qEl.style.transform = `translateY(${((1 - mk) * 14).toFixed(2)}px)`;
  const dots = $('.typing', grp);
  const dk = seg(t, T.dots[0], T.dots[0] + 0.14) * (1 - seg(t, T.dots[1] - 0.05, T.dots[1] + 0.05));
  dots.style.opacity = String(dk);
  setDots(dots, t);
  const ans = $$(':scope > :not(.typing)', grp);
  const txt = ans[0];
  const ak = E.out(seg(t, T.answer, T.answer + 0.4));
  txt.style.opacity = String(ak);
  txt.style.transform = `translateY(${((1 - ak) * 12).toFixed(2)}px)`;
  $$('.rcard', grp).forEach((c, i) => {
    const k = E.out(seg(t, T.answer + 0.12 + i * 0.07, T.answer + 0.62 + i * 0.07));
    c.style.opacity = String(k);
    c.style.transform = `translateX(${((1 - k) * 36).toFixed(2)}px)`;
  });
  const sc = S.q * E.inOut(seg(t, T.me[0], T.me[0] + 0.4)) + (S.dots - S.q) * E.inOut(seg(t, T.dots[0], T.dots[0] + 0.35)) + (S.a - S.dots) * E.inOut(seg(t, T.answer, T.answer + 0.5));
  scroll.scrollTop = Math.round(sc);

  // redeem sheet
  setSheet(E.expoOut(seg(t, T.sheet[0], T.sheet[1])));
  setQrReveal(qrEl(), E.out(seg(t, T.qr[0], T.qr[1])));
  setSlam(seg(t, T.slam[0], T.slam[1]));
  setBurst(t - T.slam[1] < 0 ? -1 : t - T.slam[1]);
  setDone(E.expoOut(seg(t, T.done[0], T.done[1])));
  $('.pts-pill').style.transform = `scale(${(1 + 0.12 * Math.sin(Math.PI * seg(t, T.count2[0], T.count2[0] + 0.3))).toFixed(3)})`;

  setTap(t, [
    { t: T.tapInput, el: () => ask },
    { t: T.tapSend, el: () => $('#send') },
    { t: T.tapRedeem, el: () => $('#reelA .rc-btn') },
    { t: T.tapConfirm, el: () => redeemBtn },
  ]);
}

function setupReel() {
  renderStamps(state.stamps);
  log.innerHTML = brew('Hi Aanya, I\'m Brew. I can check your points, rewards and birthday treats.')
    + me(Q, 'reelQ')
    + `<div class="group" id="reelA">${typingDots()}${answer('redeem', 1240)}</div>`;
  fillSheet(REWARDS[0], 1240);
  // measure where each message ends, with the scroll at the top
  scroll.scrollTop = 0;
  const top = scroll.getBoundingClientRect().top, h = scroll.clientHeight;
  const end = (el: Element, extra = 0) => Math.max(0, el.getBoundingClientRect().top - top + extra + 16 - h);
  const grp = $('#reelA');
  S.q = end($('#reelQ'), $('#reelQ').getBoundingClientRect().height);
  S.dots = Math.max(S.q, end(grp, 42));
  S.a = Math.max(S.dots, end(grp, grp.getBoundingClientRect().height));
  W.seek = reelSeek;
  reelSeek(0);
}

// =====================================================================================
// Normal mode
// =====================================================================================
function scrollToEnd() {
  const target = scroll.scrollHeight - scroll.clientHeight;
  gsap.to(scroll, { scrollTop: target, duration: dur(0.6), ease: 'power3.out', overwrite: true });
}
function askBrew(q: string) {
  const text = q.trim();
  if (!text || state.busy) return;
  state.busy = true;
  ask.value = '';
  log.insertAdjacentHTML('beforeend', me(text.replace(/</g, '&lt;')));
  const mine = log.lastElementChild as HTMLElement;
  gsap.from(mine, { y: 14, opacity: 0, duration: dur(0.5), ease: 'power3.out' });
  log.insertAdjacentHTML('beforeend', typingDots('live'));
  const dots = log.lastElementChild as HTMLElement;
  gsap.from(dots, { opacity: 0, duration: dur(0.25), delay: dur(0.15) });
  const tick = (time: number) => setDots(dots, time);
  gsap.ticker.add(tick);
  scrollToEnd();
  window.setTimeout(() => {
    gsap.ticker.remove(tick);
    dots.remove();
    const g = document.createElement('div');
    g.className = 'group';
    g.innerHTML = answer(intentOf(text), state.points);
    log.appendChild(g);
    gsap.from(g.children, { y: 12, opacity: 0, duration: dur(0.55), stagger: 0.06, ease: 'power3.out' });
    const cards = $$('.rcard', g);
    if (cards.length) gsap.from(cards, { x: 36, opacity: 0, duration: dur(0.6), stagger: 0.07, ease: 'power3.out', delay: dur(0.1) });
    scrollToEnd();
    state.busy = false;
  }, REDUCED ? 150 : 950);
}

let sheetOpen = false;
function openSheet(r: Reward) {
  state.reward = r;
  fillSheet(r, state.points);
  setSlam(0); setBurst(-1); setDone(0); redeemBtn.classList.remove('done');
  redeemBtn.style.background = '';
  sheetOpen = true;
  const o = { p: 0, q: 0 };
  gsap.to(o, { p: 1, duration: dur(0.6), ease: 'expo.out', onUpdate: () => setSheet(o.p) });
  gsap.to(o, { q: 1, duration: dur(0.6), delay: dur(0.2), ease: 'power3.out', onUpdate: () => setQrReveal(qrEl(), o.q) });
  window.setTimeout(() => redeemBtn.focus({ preventScroll: true }), 300);
}
function closeSheet() {
  if (!sheetOpen) return;
  sheetOpen = false;
  const o = { p: 1 };
  gsap.to(o, { p: 0, duration: dur(0.35), ease: 'power2.in', onUpdate: () => setSheet(o.p) });
}
function redeem() {
  const r = state.reward;
  if (redeemBtn.classList.contains('done')) { closeSheet(); return; }
  if (state.points < r.cost) return;
  const from = state.points;
  state.points -= r.cost;
  const tl = gsap.timeline();
  const o = { s: 0, u: -1, n: from, d: 0 };
  tl.to(o, { s: 1, duration: dur(0.16), ease: 'none', onUpdate: () => setSlam(o.s) })
    .fromTo(o, { u: 0 }, { u: 1.4, duration: dur(1.4), ease: 'none', onUpdate: () => setBurst(o.u) })
    .to(o, { n: state.points, duration: dur(0.6), ease: 'power3.out', onUpdate: () => setBalance(o.n, state.life) }, '<0.1')
    .to(o, { d: 1, duration: dur(0.45), ease: 'expo.out', onUpdate: () => setDone(o.d), onComplete: () => { redeemBtn.classList.add('done'); redeemBtn.style.background = ''; } }, '<0.45');
  log.insertAdjacentHTML('beforeend', brew(`Stamped. Enjoy your <b>${r.name.toLowerCase()}</b>, Aanya. New balance: <b>${fmt(state.points)} pts</b>.`));
  $$('.rc-btn').forEach((b) => {
    const rr = REWARDS.find((x) => x.id === b.dataset.reward)!;
    const ok = rr.cost <= state.points;
    b.toggleAttribute('disabled', !ok);
    b.textContent = ok ? 'Redeem' : `Need ${fmt(rr.cost - state.points)} more`;
  });
  window.setTimeout(scrollToEnd, 400);
}

let introTl: gsap.core.Timeline | null = null;
function setupNormal() {
  renderStamps(state.stamps);
  setBalance(state.points, state.life);
  log.innerHTML = brew('Hi Aanya, I\'m Brew. I can check your points, rewards and birthday treats. Pick a question below or type your own.');
  setSheet(0);
  $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); askBrew(ask.value); });
  $('#chips').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.qchip');
    if (b) askBrew(b.dataset.q!);
  });
  log.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.rc-btn');
    if (b && !b.disabled) openSheet(REWARDS.find((r) => r.id === b.dataset.reward)!);
  });
  redeemBtn.addEventListener('click', redeem);
  $('#sheetClose').addEventListener('click', closeSheet);
  sheetScrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  if (!REDUCED) gsap.ticker.add((time) => setSteam(time));
  else setSteam(0.25);

  introTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (!REDUCED) {
    const o = { n: state.points - 60, k: 0 };
    introTl
      .from('.pitch > *', { y: 18, opacity: 0, duration: 0.8, stagger: 0.06 }, 0)
      .from('.stampcard, .tier, .chat', { y: 20, opacity: 0, duration: 0.7, stagger: 0.07 }, 0.1)
      .from('.slot', { scale: 0.6, opacity: 0, duration: 0.5, stagger: 0.04 }, 0.3)
      .to(o, { n: state.points, k: 1, duration: 0.9, onUpdate: () => { setBalance(o.n); $('#tierFill').style.setProperty('--tier', `${(tierPct(o.n) * o.k).toFixed(2)}%`); } }, 0.3)
      .from('.composer', { y: 20, opacity: 0, duration: 0.6 }, 0.4);
  }
}

async function boot() {
  const faces = ['400 21px "Young Serif"', '400 15px Figtree', '600 15px Figtree', '700 15px Figtree', '500 12px "DM Mono"', '400 12px "DM Mono"'];
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
