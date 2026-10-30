// Vaultline: real end-to-end encryption between two in-page "devices".
// Normal mode: fresh keys per session, fresh IV per message. ?reel=1: fixed demo keys + fixed IV,
// every ciphertext precomputed at load, and window.seek(t) only shows precomputed states.
import './style.css';
import gsap from 'gsap';
import { b64, decrypt, deriveShared, encrypt, fingerprint, freshIv, hex, importParty, newParty, safetyNumber, type Party } from './crypto';

const REEL = new URLSearchParams(location.search).get('reel') === '1';
if (REEL) document.documentElement.classList.add('reel');

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const out3 = gsap.parseEase('power3.out');
const inOut3 = gsap.parseEase('power3.inOut');
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fixed demo identities for filming only (generated once with WebCrypto, P-256).
const DEMO_KEYS = {
  asha: { x: 'y8EeZrg864hDDibnuyoQ4Tb9eBi20m3L_-8A9lGIZZ0', y: '592cvXVJfIryIu6q4UJhP-QvJvrTu3Tubx1O5AsT9NU', d: '0NRrFJ83ZgJXIdPNdOUQSE8kBGADFVQ0JYBgy32WWhE' },
  ben: { x: 'N43KndJO-ocrKfpWB-pys6mUFqZ1UgbR0nabhO4b_Mc', y: '6N9LeKskM5nez5xz98ZA_txrgQYNRtiwRPvYqrfyXaE', d: 'K3CTIkiDjQDKOKczYju4eiKFtK9eJBggFToEZaHsG3E' },
};
const DEMO_IV = new Uint8Array([0x5f, 0x0c, 0x91, 0x7e, 0x22, 0xd4, 0x08, 0x6b, 0x19, 0xf0, 0x3c, 0xa3]);
const DEMO_IV_HISTORY = new Uint8Array([0x0a, 0x61, 0xe2, 0x3b, 0x97, 0x14, 0xc8, 0x5d, 0x70, 0x2f, 0xb6, 0x09]);
const REEL_MSG = 'Landing 7:40. Meet me at gate B?';

type Side = 'asha' | 'ben';
interface Flight {
  n: number; from: Side; to: Side; text: string; iv: Uint8Array; wire: Uint8Array; delivered: string | null; tampered: boolean;
  els: { out: HTMLElement; outBody: HTMLElement; outMeta: HTMLElement; inn: HTMLElement; innBody: HTMLElement; innMeta: HTMLElement; row: HTMLElement; rowCt: HTMLElement };
}

const phones = { asha: $('#asha'), ben: $('#ben') };
const threads = { asha: $('.thread', phones.asha), ben: $('.thread', phones.ben) };
const inputs = { asha: $<HTMLInputElement>('input', phones.asha), ben: $<HTMLInputElement>('input', phones.ben) };
const sends = { asha: $('.send', phones.asha), ben: $('.send', phones.ben) };
const stage = $('.stage');
const log = $('.log');
const packet = $('.packet');
const packetLabel = $('span', packet);
const snGrid = $('.sn__grid');
const snMatch = $('.sn__match');

const LOCK = (cls: string) => `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="2" fill="currentColor"/><path class="${cls}" d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;

let state: { A: Party; B: Party; keys: Record<Side, CryptoKey>; sn: string[]; snBen: string[] };

async function setupKeys(fixed: boolean) {
  const A = fixed ? await importParty('asha', DEMO_KEYS.asha) : await newParty('asha');
  const B = fixed ? await importParty('ben', DEMO_KEYS.ben) : await newParty('ben');
  // Each side derives the shared key on its own: its private key + the other's public key.
  const keys = { asha: await deriveShared(A, B), ben: await deriveShared(B, A) };
  const sn = await safetyNumber(A.raw, B.raw);
  const snBen = await safetyNumber(B.raw, A.raw);
  state = { A, B, keys, sn, snBen };
  $('[data-fp="asha"]').textContent = `key ${await fingerprint(A.raw)}`;
  $('[data-fp="ben"]').textContent = `key ${await fingerprint(B.raw)}`;
  snGrid.innerHTML = sn.map(() => '<li><span></span><i></i></li>').join('');
}

/** Seal on the sender's key, carry the wire bytes, open on the receiver's key. Everything here is real WebCrypto. */
async function makeFlight(n: number, from: Side, text: string, iv: Uint8Array, tamper: boolean): Promise<Flight> {
  const to: Side = from === 'asha' ? 'ben' : 'asha';
  const ct = await encrypt(state.keys[from], iv, text);
  const wire = ct.slice();
  if (tamper) wire[Math.floor(wire.length / 2)] ^= 0x01;
  let delivered: string | null = null;
  try { delivered = await decrypt(state.keys[to], iv, wire); } catch { delivered = null; }
  return { n, from, to, text, iv, wire, delivered, tampered: tamper, els: buildEls(n, from, to, iv, wire, tamper) };
}

function buildEls(n: number, from: Side, to: Side, iv: Uint8Array, wire: Uint8Array, tamper: boolean) {
  const out = document.createElement('div');
  out.className = 'msg msg--out';
  out.innerHTML = `<div class="msg__body"></div><span class="meta">${LOCK('shackle')}<span></span></span>`;
  threads[from].appendChild(out);
  const inn = document.createElement('div');
  inn.className = 'msg msg--in';
  inn.innerHTML = `<div class="msg__body is-cipher"></div><span class="meta">${LOCK('shackle')}<span></span></span>`;
  threads[to].appendChild(inn);
  const row = document.createElement('li');
  row.className = `pkt${tamper ? ' pkt--tampered' : ''}`;
  row.innerHTML = `<div class="pkt__top"><span>#${n} ${from} → ${to}</span><span>${wire.length} B${tamper ? ' · bit flipped' : ''}</span></div>
    <div class="pkt__row"><b>iv</b><span>${hex(iv).replace(/(.{4})/g, '$1 ').trim()}</span></div>
    <div class="pkt__row"><b>ct</b><span class="pkt__ct"></span></div>`;
  log.prepend(row);
  return { out, outBody: $('.msg__body', out), outMeta: $('.meta', out), inn, innBody: $('.msg__body', inn), innMeta: $('.meta', inn), row, rowCt: $('.pkt__ct', row) };
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
/** Deterministic scramble from `a` to `b`: character i flips once q passes its own threshold. */
function morph(a: string, b: string, q: number, seed: number) {
  const len = Math.round(lerp(a.length, b.length, q));
  let s = '';
  for (let i = 0; i < len; i++) {
    const th = hash(i * 7.3 + seed);
    if (q >= 1 || (q > 0 && th < q)) s += b[i] ?? '';
    else if (q > 0 && th < q + 0.18) s += GLYPHS[Math.floor(hash(i + seed + Math.floor(q * 24)) * GLYPHS.length)];
    else s += a[i] ?? GLYPHS[Math.floor(hash(i + seed) * GLYPHS.length)];
  }
  return s;
}

function setLock(meta: HTMLElement, closed: number, cls: string, label: string) {
  const sh = $<SVGPathElement>('.shackle', meta);
  sh.style.transform = `translateY(${(-2.6 * (1 - closed)).toFixed(2)}px)`;
  meta.className = `meta ${cls}`;
  ($('span', meta) as HTMLElement).textContent = label;
}

function centerIn(el: Element, sx: number, sy: number) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - sx, y: r.top + r.height / 2 - sy };
}

/** The whole life of one message as a pure function of p (0..1). */
function renderFlight(f: Flight, p: number) {
  const e = f.els;
  const ct = b64(f.wire);
  const names = { asha: 'Asha', ben: 'Ben' };
  // 1. sealed on the sender's device
  e.out.style.display = p > 0.01 ? '' : 'none';
  const a = out3(seg(p, 0.01, 0.12));
  e.out.style.opacity = String(a);
  e.out.style.transform = `translateY(${(1 - a) * 12}px)`;
  e.outBody.textContent = f.text;
  const lockK = out3(seg(p, 0.06, 0.18));
  setLock(e.outMeta, lockK, lockK >= 1 ? 'is-locked' : '', lockK >= 1 ? `Sealed · ${f.wire.length} B` : 'Sealing…');
  // 2. on the wire: only ciphertext reaches the server
  e.row.style.display = p > 0.34 ? '' : 'none';
  const r = out3(seg(p, 0.34, 0.44));
  e.row.style.opacity = String(r);
  e.row.style.transform = `translateY(${(1 - r) * -10}px)`;
  e.rowCt.textContent = ct.slice(0, Math.ceil(ct.length * seg(p, 0.36, 0.56)));
  // 3. opened on the receiver's device
  e.inn.style.display = p > 0.72 ? '' : 'none';
  const b = out3(seg(p, 0.72, 0.8));
  e.inn.style.opacity = String(b);
  e.inn.style.transform = `translateY(${(1 - b) * 12}px)`;
  const cipherView = ct.slice(0, Math.min(ct.length, Math.max(f.text.length, 24)));
  const open = out3(seg(p, 0.78, 0.86));
  if (f.delivered === null) {
    const bad = p > 0.86;
    e.innBody.className = `msg__body ${bad ? 'is-bad' : 'is-cipher'}`;
    e.innBody.textContent = bad ? 'Rejected: the authentication tag did not match, so this message was changed in transit.' : cipherView;
    setLock(e.innMeta, 1, bad ? 'is-bad' : 'is-locked', bad ? 'Not decrypted' : 'Checking tag…');
  } else {
    const q = seg(p, 0.84, 1);
    e.innBody.className = `msg__body${q < 1 ? ' is-cipher' : ''}`;
    e.innBody.textContent = q <= 0 ? cipherView : morph(cipherView, f.delivered, q, f.n * 13);
    setLock(e.innMeta, 1 - open, open >= 1 ? 'is-open' : 'is-locked', open >= 1 ? `Decrypted with ${names[f.to]}'s key` : 'Locked');
  }
  // the packet pill travels sender -> server -> receiver
  const vis = p > 0.15 && p < 0.76;
  packet.style.opacity = vis ? String(Math.min(1, seg(p, 0.15, 0.2) * (1 - seg(p, 0.7, 0.76)) * 1)) : '0';
  if (vis) {
    const s = stage.getBoundingClientRect();
    const A = centerIn(e.out, s.left, s.top);
    const S = centerIn(e.row, s.left, s.top);
    const rowShown = p > 0.34;
    const B = centerIn(threads[f.to], s.left, s.top);
    const S2 = rowShown ? S : centerIn(log, s.left, s.top);
    let x: number, y: number;
    if (p < 0.4) { const k = inOut3(seg(p, 0.15, 0.4)); x = lerp(A.x, S2.x, k); y = lerp(A.y, S2.y, k); }
    else if (p < 0.52) { x = S2.x; y = S2.y + Math.sin(seg(p, 0.4, 0.52) * Math.PI) * -4; }
    else { const k = inOut3(seg(p, 0.52, 0.74)); x = lerp(S2.x, B.x, k); y = lerp(S2.y, B.y + 20, k); }
    packet.classList.toggle('is-bad', f.tampered && p > 0.46);
    packetLabel.textContent = `${f.wire.length} B · ${ct.slice(0, 10)}…`;
    packet.style.transform = `translate(${(x - packet.offsetWidth / 2).toFixed(1)}px, ${(y - 16).toFixed(1)}px)`;
  }
}

/** Safety-number reveal: each group settles in turn, then the cross-check against Ben's own computation. */
function renderSafety(k: number) {
  const items = $$('li', snGrid);
  items.forEach((li, i) => {
    const q = seg(k, i * 0.055, i * 0.055 + 0.28);
    const real = state.sn[i];
    ($('span', li) as HTMLElement).textContent = q >= 1 ? real : morph('00000', real, q, i * 5 + 3).replace(/[^0-9]/g, (c) => String(c.charCodeAt(0) % 10));
    li.classList.toggle('is-ok', q >= 1 && k > 0.86 && state.snBen[i] === real);
  });
  const all = state.sn.every((g, i) => g === state.snBen[i]);
  snMatch.style.opacity = String(all ? seg(k, 0.88, 1) : 0);
}

const ready = async () => {
  await document.fonts.ready;
  await Promise.all(['600 40px Geist', '400 16px Geist', '500 16px Geist', '400 12px "Geist Mono"', '500 12px "Geist Mono"'].map((f) => document.fonts.load(f)));
};

if (REEL) initReel();
else initNormal();

// ================================================================= normal mode
async function initNormal() {
  await setupKeys(false);
  let n = 1;
  const history = await makeFlight(n++, 'ben', 'Boarding now. Text me when you land.', freshIv(), false);
  renderFlight(history, 1);
  packet.style.opacity = '0';
  let busy = false;
  const safety = { k: 0 };
  const playSafety = () => {
    safety.k = 0;
    gsap.to(safety, { k: 1, duration: rm ? 0.01 : 1.8, ease: 'none', onUpdate: () => renderSafety(safety.k) });
  };
  renderSafety(0);
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); playSafety(); } }, { threshold: 0.4 }).observe($('.sn'));

  (Object.keys(phones) as Side[]).forEach((side) => {
    const input = inputs[side];
    input.addEventListener('input', () => sends[side].classList.toggle('is-ready', input.value.trim().length > 0));
    $<HTMLFormElement>('form', phones[side]).addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      busy = true;
      input.value = '';
      sends[side].classList.remove('is-ready');
      const f = await makeFlight(n++, side, text, freshIv(), $<HTMLInputElement>('#tamper').checked);
      const pr = { p: 0 };
      gsap.to(pr, {
        p: 1, duration: rm ? 0.01 : 2.8, ease: 'none', onUpdate: () => renderFlight(f, pr.p),
        onComplete: () => { renderFlight(f, 1); packet.style.opacity = '0'; busy = false; },
      });
    });
  });

  $('#rotate').addEventListener('click', async () => {
    if (busy) return;
    await setupKeys(false);
    threads.asha.innerHTML = '';
    threads.ben.innerHTML = '';
    const sys = document.createElement('li');
    sys.className = 'pkt pkt--sys';
    sys.textContent = 'New key pairs generated. Old messages cannot be opened with them.';
    log.prepend(sys);
    playSafety();
  });

  window.seek = () => { packet.style.opacity = '0'; };
  await ready();
  window.__ready = true;
}

// ================================================================= reel mode
async function initReel() {
  await setupKeys(true);
  const history = await makeFlight(1, 'ben', 'Boarding now. Text me when you land.', DEMO_IV_HISTORY, false);
  const flight = await makeFlight(2, 'asha', REEL_MSG, DEMO_IV, false);
  renderFlight(history, 1);
  const tap = document.createElement('div');
  tap.className = 'tap';
  document.body.appendChild(tap);
  const hdr = $('.hdr');
  let Y = { stage: 0, verify: 0 };
  const measure = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const h = hdr.offsetHeight;
    const top = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
    Y = { stage: top(stage) - h - 10, verify: top($('#verify')) - h - 12 };
  };
  type Key = [number, number, (x: number) => number];
  const lin = (x: number) => x;
  const scrollAt = (t: number) => {
    const K: Key[] = [[0, 0, lin], [1.5, 0, lin], [2.1, Y.stage, inOut3], [4.45, Y.stage + 8, lin], [4.95, Y.verify, inOut3], [6, Y.verify + 16, lin]];
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) return lerp(K[i - 1][1], K[i][1], K[i][2](seg(t, K[i - 1][0], K[i][0])));
    return K[K.length - 1][1];
  };

  const seek = (t: number) => {
    t = clamp(t, 0, 6);
    window.scrollTo({ top: scrollAt(t), behavior: 'instant' });
    // typing 0.1-1.35 s, tap on send at 1.4 s
    const p = seg(t, 1.5, 4.4);
    const typed = p > 0 ? '' : REEL_MSG.slice(0, Math.round(REEL_MSG.length * seg(t, 0.1, 1.35)));
    inputs.asha.value = typed;
    inputs.asha.style.boxShadow = p > 0 ? '' : 'inset 0 0 0 1.5px #9DAAFF';
    sends.asha.classList.toggle('is-ready', typed.length > 0);
    renderFlight(flight, p);
    if (p <= 0.15 || p >= 0.76) packet.style.opacity = '0';
    renderSafety(seg(t, 4.75, 5.8));
    const k = seg(t, 1.36, 1.7);
    if (k > 0 && k < 1) {
      const r = sends.asha.getBoundingClientRect();
      tap.style.opacity = String(Math.sin(k * Math.PI));
      tap.style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height / 2}px) scale(${lerp(0.6, 1, out3(k))})`;
    } else tap.style.opacity = '0';
  };
  window.seek = seek;
  await ready();
  measure();
  seek(0);
  window.__ready = true;
}
