// Dashr: live parcel tracking. One render function draws the whole page from a FrameState, so the live
// simulation (normal mode) and the reel's seek(t) share every pixel of logic.
import gsap from 'gsap';
import './style.css';
import { buildCity, ROUTE_D, PICKUP, DROP, GEOFENCE, TRAFFIC, WORLD } from './map';
import { logo, I, avatar, signatureSvg, doorPhoto } from './art';
import { startReel } from './reel';

type Win = Window & { seek?: (t: number) => void; __ready?: boolean };
const win = window as Win;
const REEL = new URLSearchParams(location.search).get('reel') === '1';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const desk = matchMedia('(min-width: 900px)');
document.documentElement.classList.toggle('reel', REEL);

export const TRIP_MIN = 21;
const START = { h: 2, m: 41 };
const clock = (min: number) => {
  const tot = START.h * 60 + START.m + Math.round(min);
  const h = Math.floor(tot / 60), m = tot % 60;
  return `${((h - 1) % 12) + 1}:${String(m).padStart(2, '0')} PM`;
};

const STEPS = [
  { t: 'Picked up', d: 'Scanned at Kiln & Co. Ceramics, Old Quarter', i: I.box },
  { t: 'In transit', d: 'Over the river on Indigo Avenue', i: I.truck },
  { t: 'Nearby', d: 'Inside the 500 m zone around your door', i: I.near },
  { t: 'Delivered', d: 'Handed over and signed for', i: I.check },
];

function shell() {
  return `
  <div class="app">
    <main class="mapwrap" id="mapwrap">
      <svg id="map" aria-label="Live map of the courier route" role="img">
        <g id="world">
          <g id="city">${buildCity()}</g>
          <g id="traffic">${TRAFFIC.map(() => '<rect width="9" height="5" rx="2" fill="#5d6b80"/>').join('')}</g>
          <circle id="fence" cx="${DROP[0]}" cy="${DROP[1]}" r="${GEOFENCE}" fill="rgba(255,181,71,.06)" stroke="#ffb547" stroke-dasharray="10 9" opacity="0"/>
          <path id="rCase" d="${ROUTE_D}" fill="none" stroke="#0b0e13" stroke-linecap="round" stroke-linejoin="round"/>
          <path id="rRest" d="${ROUTE_D}" fill="none" stroke="#c8f542" stroke-opacity=".34" stroke-linecap="round" stroke-linejoin="round"/>
          <path id="rGlow" d="${ROUTE_D}" fill="none" stroke="#c8f542" stroke-opacity=".22" stroke-linecap="round" stroke-linejoin="round"/>
          <path id="rDone" d="${ROUTE_D}" fill="none" stroke="#c8f542" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <g id="overlay">
          <g id="pickup"><rect x="-16" y="-16" width="32" height="32" rx="10" fill="#151a22" stroke="#c8f542" stroke-width="2"/><g transform="translate(-9 -9) scale(.75)" color="#c8f542">${I.store.replace('class="ic "', 'width="24" height="24"')}</g>
            <g transform="translate(-42 24)"><rect width="84" height="22" rx="11" fill="#151a22" stroke="#2a313c"/><text x="42" y="15" text-anchor="middle" class="mtext">Kiln &amp; Co.</text></g></g>
          <g id="drop"><circle id="dropPulse" r="20" fill="none" stroke="#eef2f6" stroke-width="2"/><circle id="burst" r="20" fill="none" stroke="#c8f542" stroke-width="3" opacity="0"/>
            <path d="M0 0 C-4 -9 -15 -14 -15 -26 A15 15 0 0 1 15 -26 C15 -14 4 -9 0 0Z" fill="#eef2f6"/><g transform="translate(-8 -34) scale(.68)" color="#0b0e13">${I.home.replace('class="ic "', 'width="24" height="24"')}</g>
            <g transform="translate(20 -38)"><rect width="56" height="22" rx="11" fill="#eef2f6"/><text x="28" y="15" text-anchor="middle" class="mtext dark">Home</text></g></g>
          <g id="courier"><circle id="halo" r="30" fill="#c8f542" opacity=".16"/><circle r="18" fill="#c8f542" stroke="#0b0e13" stroke-width="3"/><path id="cArrow" d="M0 -8.5 L6.5 6.5 L0 3 L-6.5 6.5Z" fill="#0b0e13"/>
            <g id="cTag" transform="translate(-40 -56)"><rect width="80" height="26" rx="13" fill="#0b0e13" stroke="#c8f542" stroke-opacity=".5"/><text id="cTagT" x="40" y="17.5" text-anchor="middle" class="mtext lime">Arjun · 14m</text></g></g>
        </g>
      </svg>
      <div class="topbar">
        <button class="round" aria-label="Back">${I.back}</button>
        <div class="idpill"><i class="live"></i><span>DSH-4821-KX</span><b>Live</b></div>
        <button class="round" aria-label="Help">${I.help}</button>
      </div>
      <div class="toast" id="toast" role="status"><span class="ti">${I.near}</span><span><b id="toastT">Arjun is nearby</b><small id="toastS">About 2 min away · keep your phone handy</small></span></div>
      <div class="mapctl">
        <button class="round sm" id="zin" aria-label="Zoom in">${I.plus}</button>
        <button class="round sm" id="zout" aria-label="Zoom out">${I.minus}</button>
        <button class="round sm on" id="follow" aria-label="Follow courier" aria-pressed="true">${I.target}</button>
      </div>
      <div class="playback" id="playback">
        <button class="pbtn" id="play" aria-label="Pause simulation">${I.pause}</button>
        <input id="scrub" type="range" min="0" max="1000" value="300" aria-label="Trip progress"/>
        <button class="pbtn txt" id="speed" aria-label="Playback speed">1×</button>
        <button class="pbtn" id="replay" aria-label="Replay trip">${I.replay}</button>
        <span class="demo-tag">Demo playback</span>
      </div>
      <div class="legend"><span><i class="lg done"></i>Travelled</span><span><i class="lg rest"></i>Remaining</span><span><i class="lg zone"></i>Nearby zone</span></div>
    </main>
    <aside class="panel" id="panel">
      <button class="grab" id="grab" aria-label="Expand details"><i></i></button>
      <div class="pscroll" id="pscroll">
        <header class="phead">
          <a class="brand" href="#">${logo(34)}<span>dashr</span></a>
          <nav class="pnav"><a href="#" class="on">Track</a><a href="#">Send</a><a href="#">Business</a></nav>
        </header>
        <div class="tid"><span>Tracking ID</span><b>DSH-4821-KX</b><button class="copy" id="copy" aria-label="Copy tracking ID">${I.copy}</button></div>
        <div class="eta-row">
          <div class="eta-l"><small id="etaLabel">Arriving in</small><div class="eta"><b id="eta">14:42</b><span id="etaUnit">min</span></div></div>
          <span class="pill" id="pill"><i></i><span id="pillT">In transit</span></span>
        </div>
        <div class="pod" id="pod">
          <div class="pod-h"><span class="pod-ic">${I.shield}</span><div><b>Proof of delivery</b><small>3:02 PM · Flat 1204, Tower B</small></div></div>
          <div class="pod-b"><div class="sigbox">${signatureSvg()}<span class="sigline"></span><small>Signed by Neha R.</small></div><div class="photo">${doorPhoto()}<small>Photo</small></div></div>
          <div class="rate"><span>Rate Arjun</span><span class="stars" id="stars">${I.star.repeat(5)}</span></div>
        </div>
        <div class="steps-wrap">
          <div class="srail"><i id="sfill"></i></div>
          <ol class="steps" id="steps">${STEPS.map((s, i) => `<li data-i="${i}"><span class="sdot">${s.i}</span><div class="stx"><b>${s.t}</b><small id="st${i}">—</small><p>${s.d}</p></div></li>`).join('')}</ol>
        </div>
        <div class="driver">
          ${avatar(54)}
          <div class="dinfo"><b>Arjun Mehra</b><span>${I.star}4.9 · 1,240 drops · EV scooter</span></div>
          <button class="round dark" id="call" aria-label="Call Arjun">${I.phone}</button>
          <button class="round lime" id="chat" aria-label="Chat with Arjun">${I.chat}</button>
        </div>
        <div class="chatbox" id="chatbox" hidden>
          <p class="cb-h">Quick message to Arjun</p>
          <div class="cb-msgs" id="msgs"></div>
          <div class="cb-q">${['Leave it at the door', 'Call me when you arrive', 'I’m coming down'].map((m) => `<button class="qr">${m}</button>`).join('')}</div>
        </div>
        <div class="parcel">
          <div class="prow"><span>From</span><b>Kiln &amp; Co. Ceramics</b><small>14 Potter’s Lane, Old Quarter</small></div>
          <div class="prow"><span>To</span><b>Neha R.</b><small>Flat 1204, Tower B, Riverside Heights</small></div>
          <div class="pgrid"><div><span>Contents</span><b>Dinner set</b></div><div><span>Weight</span><b>2.4 kg</b></div><div><span>Service</span><b>Same-day</b></div></div>
          <p class="fragile">${I.box}Fragile · handled upright, padded crate</p>
        </div>
        <p class="demo-line">Demo · fictional brand · built with EditorBro</p>
      </div>
    </aside>
  </div>`;
}

document.getElementById('app')!.innerHTML = shell();
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as unknown as T;

// ---------- geometry ----------
const routeEl = $<SVGPathElement>('#rDone');
export const L = routeEl.getTotalLength();
export const pointAt = (p: number) => { const q = routeEl.getPointAtLength(Math.max(0, Math.min(1, p)) * L); return { x: q.x, y: q.y }; };
export const headingAt = (p: number) => {
  const a = pointAt(p - 0.004), b = pointAt(p + 0.004);
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
};
// first progress where the courier is inside the nearby zone
export const P_NEAR = (() => { for (let i = 0; i <= 2000; i++) { const q = pointAt(i / 2000); if (Math.hypot(q.x - DROP[0], q.y - DROP[1]) <= GEOFENCE) return i / 2000; } return 0.85; })();

export interface Cam { x: number; y: number; z: number }
export interface FrameState {
  p: number; time: number; cam: Cam; reveal: number; pinA: number; pinB: number; courierIn: number;
  sig: number; toast: number; burst: number; stars: number; pod: number; sheet?: number;
}

const view = { w: 0, h: 0, fx: 0, fy: 0 };
export function measure(sheetH?: number) {
  const r = $('#mapwrap').getBoundingClientRect();
  view.w = r.width; view.h = r.height;
  $('#map').setAttribute('viewBox', `0 0 ${view.w} ${view.h}`);
  view.fx = view.w / 2;
  if (desk.matches) view.fy = view.h / 2;
  else view.fy = (72 + (view.h - (sheetH ?? $('#panel').getBoundingClientRect().height) + 8)) / 2;
  return view;
}
export const overviewCam = (sheetH?: number): Cam => {
  measure(sheetH);
  const xs = [PICKUP[0], DROP[0]], ys = [PICKUP[1], DROP[1]];
  const bw = Math.max(...xs) - Math.min(...xs) + 120, bh = Math.max(...ys) - Math.min(...ys) + 120;
  const availH = desk.matches ? view.h : (view.fy - 72) * 2;
  const z = Math.min(view.w / bw, availH / bh);
  return { x: (xs[0] + xs[1]) / 2, y: (ys[0] + ys[1]) / 2, z };
};

const statusIdx = (p: number) => (p >= 0.999 ? 3 : p >= P_NEAR ? 2 : p >= 0.02 ? 1 : 0);
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

let lastIdx = -1;
export function render(s: FrameState) {
  const { cam } = s;
  if (s.sheet !== undefined) $('#panel').style.height = `${s.sheet}px`;
  // camera
  $('#world').setAttribute('transform', `translate(${view.fx} ${view.fy}) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`);
  const sx = (x: number) => view.fx + (x - cam.x) * cam.z, sy = (y: number) => view.fy + (y - cam.y) * cam.z;
  // route: constant screen width at any zoom
  const w = 6 / cam.z;
  const set = (id: string, a: Record<string, string | number>) => { const el = document.getElementById(id)!; for (const k in a) el.setAttribute(k, String(a[k])); };
  set('rCase', { 'stroke-width': w + 5 / cam.z, 'stroke-dasharray': `${L * s.reveal} ${L + 10}` });
  set('rRest', { 'stroke-width': w, 'stroke-dasharray': `${L * s.reveal} ${L + 10}` });
  const done = Math.min(s.p, s.reveal);
  set('rDone', { 'stroke-width': w, 'stroke-dasharray': `${L * done} ${L + 10}` });
  set('rGlow', { 'stroke-width': w * 3.2, 'stroke-dasharray': `${L * done} ${L + 10}` });
  // ambient: river flow, traffic
  set('riverFlow', { 'stroke-dashoffset': -s.time * 22 });
  set('riverFlow2', { 'stroke-dashoffset': -s.time * 14 });
  const cars = document.getElementById('traffic')!.children;
  TRAFFIC.forEach((c, i) => {
    const span = c.vertical ? WORLD.h + 200 : WORLD.w + 200;
    const pos = ((((c.off + s.time * c.speed * c.dir) % span) + span) % span) - 100;
    const x = c.vertical ? c.line + c.lane : pos, y = c.vertical ? pos : c.line + c.lane;
    cars[i].setAttribute('transform', `translate(${x} ${y}) rotate(${c.vertical ? 90 : 0}) translate(-4.5 -2.5)`);
  });
  // nearby zone
  const near = s.p >= P_NEAR;
  const fenceK = Math.max(0, Math.min(1, (s.p - P_NEAR + 0.05) / 0.05));
  set('fence', { opacity: fenceK * (s.p >= 0.999 ? 0.4 : 1), 'stroke-width': 2 / cam.z, 'stroke-dasharray': `${10 / cam.z} ${9 / cam.z}`, r: GEOFENCE * (1 + 0.02 * Math.sin(s.time * 3)) });
  // markers in screen space
  const c = pointAt(s.p);
  set('pickup', { transform: `translate(${sx(PICKUP[0])} ${sy(PICKUP[1])}) scale(${s.pinA})` });
  set('drop', { transform: `translate(${sx(DROP[0])} ${sy(DROP[1])}) scale(${s.pinB})` });
  const pr = (s.time * 0.8) % 1;
  set('dropPulse', { r: 12 + pr * 26, opacity: (1 - pr) * 0.7 * (near ? 1 : 0.5) });
  set('burst', { r: 14 + s.burst * 90, opacity: s.burst > 0 && s.burst < 1 ? (1 - s.burst) : 0, 'stroke-width': 3 + (1 - s.burst) * 4 });
  set('courier', { transform: `translate(${sx(c.x)} ${sy(c.y)}) scale(${s.courierIn})`, opacity: s.p >= 0.999 ? Math.max(0, 1 - s.burst * 2) : 1 });
  set('cArrow', { transform: `rotate(${headingAt(s.p)})` });
  set('cTag', { opacity: 1 - Math.max(0, Math.min(1, (s.p - 0.93) / 0.05)) });
  const hp = (s.time * 1.1) % 1;
  set('halo', { r: 20 + hp * 22, opacity: 0.28 * (1 - hp) });
  const remainSec = (1 - s.p) * TRIP_MIN * 60;
  $('#cTagT').textContent = `Arjun · ${Math.max(1, Math.ceil(remainSec / 60))} min`;

  // panel text
  const idx = statusIdx(s.p);
  const delivered = idx === 3;
  $('#eta').textContent = delivered ? '3:02' : mmss(remainSec);
  $('#etaUnit').textContent = delivered ? 'PM' : 'min';
  $('#etaLabel').textContent = delivered ? 'Delivered at' : idx === 2 ? 'Almost there' : 'Arriving in';
  if (idx !== lastIdx) {
    lastIdx = idx;
    $('#pillT').textContent = STEPS[idx].t;
    $('#pill').className = `pill s${idx}`;
    document.documentElement.dataset.status = String(idx);
    document.querySelectorAll('#steps li').forEach((li, i) => { li.classList.toggle('on', i <= idx); li.classList.toggle('now', i === idx); });
  }
  const times = [clock(0), clock(1), clock(P_NEAR * TRIP_MIN), clock(TRIP_MIN)];
  times.forEach((tt, i) => { $(`#st${i}`).innerHTML = i <= idx ? tt : `<span class="exp">Expected </span>${tt}`; });
  // rail fill: step-space progress
  const seg = idx === 0 ? s.p / 0.02 : idx === 1 ? (s.p - 0.02) / (P_NEAR - 0.02) : idx === 2 ? (s.p - P_NEAR) / (1 - P_NEAR) : 0;
  const fill = Math.min(1, (idx + Math.max(0, Math.min(1, seg))) / 3);
  $('#sfill').style.transform = desk.matches ? `scaleY(${fill})` : `scaleX(${fill})`;
  // proof of delivery
  const pod = $('#pod');
  pod.style.display = s.pod > 0 ? '' : 'none';
  pod.style.opacity = String(s.pod);
  pod.style.transform = `translateY(${(1 - s.pod) * 18}px)`;
  document.getElementById('sigPath')!.setAttribute('stroke-dashoffset', String(1 - s.sig));
  document.querySelectorAll('#stars .star').forEach((st, i) => st.classList.toggle('on', s.stars * 5 > i + 0.5));
  // toast
  const tEl = $('#toast');
  tEl.style.opacity = String(Math.min(1, s.toast * 1.4));
  tEl.style.transform = `translate(-50%, ${(1 - s.toast) * -24}px)`;
}

// ---------- normal mode: live simulation ----------
const DUR = 40; // seconds for the whole trip at 1x
const sim = { p: 0.3, playing: !RM, speed: 1, follow: true, sig: 1, burst: 1, time: 0, toast: 0, stars: 0, pod: 0 };
const st: FrameState = { p: sim.p, time: 0, cam: { x: 0, y: 0, z: 1 }, reveal: 1, pinA: 1, pinB: 1, courierIn: 1, sig: 0, toast: 0, burst: 0, stars: 0, pod: 0 };
let sheetOpen = false;
const sheetH = () => (desk.matches ? undefined : sheetOpen || sim.p >= 0.999 ? Math.min(innerHeight - 90, 600) : 318);

function followZoom() { return desk.matches ? 1.05 : 1.15; }

function toast(title: string, sub: string, ms = 2600) {
  $('#toastT').textContent = title; $('#toastS').textContent = sub;
  gsap.killTweensOf(sim, 'toast');
  gsap.to(sim, { toast: 1, duration: 0.6, ease: 'expo.out' });
  gsap.to(sim, { toast: 0, duration: 0.35, ease: 'power2.in', delay: ms / 1000 });
}

function wire() {
  const mapEl = $('#mapwrap');
  let drag: { x: number; y: number } | null = null;
  mapEl.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button, input, .toast')) return;
    drag = { x: e.clientX, y: e.clientY }; mapEl.setPointerCapture(e.pointerId); mapEl.classList.add('grabbing');
  });
  mapEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    st.cam.x -= (e.clientX - drag.x) / st.cam.z; st.cam.y -= (e.clientY - drag.y) / st.cam.z;
    drag = { x: e.clientX, y: e.clientY };
    setFollow(false);
  });
  const end = () => { drag = null; mapEl.classList.remove('grabbing'); };
  mapEl.addEventListener('pointerup', end); mapEl.addEventListener('pointercancel', end);
  mapEl.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  $('#zin').addEventListener('click', () => zoomBy(1.3));
  $('#zout').addEventListener('click', () => zoomBy(1 / 1.3));
  $('#follow').addEventListener('click', () => setFollow(!sim.follow));
  $('#play').addEventListener('click', () => setPlaying(!sim.playing));
  $('#speed').addEventListener('click', () => {
    sim.speed = sim.speed === 1 ? 3 : sim.speed === 3 ? 6 : 1;
    $('#speed').textContent = `${sim.speed}×`;
  });
  $('#replay').addEventListener('click', () => {
    sim.p = 0; sim.sig = 0; sim.burst = 0; sim.stars = 0; sim.pod = 0; nearShown = false;
    gsap.fromTo(st, { reveal: 0 }, { reveal: 1, duration: 1.1, ease: 'power2.inOut' });
    setFollow(true); setPlaying(true);
  });
  const scrub = $<HTMLInputElement>('#scrub');
  scrub.addEventListener('input', () => {
    sim.p = Number(scrub.value) / 1000; setPlaying(false);
    if (sim.p < 0.999) { sim.sig = 0; sim.burst = 0; sim.stars = 0; sim.pod = 0; } else { sim.sig = 1; sim.burst = 1; sim.pod = 1; }
  });
  $('#grab').addEventListener('click', () => { sheetOpen = !sheetOpen; animateSheet(); });
  $('#copy').addEventListener('click', () => { navigator.clipboard?.writeText('DSH-4821-KX').catch(() => undefined); toast('Tracking ID copied', 'DSH-4821-KX is on your clipboard', 1600); });
  $('#call').addEventListener('click', () => toast('Calling Arjun', 'Through a masked number, your own stays private', 2000));
  $('#chat').addEventListener('click', () => {
    const box = $('#chatbox');
    box.hidden = !box.hidden;
    if (!box.hidden) { gsap.fromTo(box, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }); if (!desk.matches && !sheetOpen) { sheetOpen = true; animateSheet(); } }
  });
  $('#chatbox').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.qr');
    if (!b) return;
    const m = document.createElement('p'); m.className = 'msg'; m.textContent = b.textContent; $('#msgs').append(m);
    gsap.from(m, { y: 10, opacity: 0, duration: 0.45, ease: 'power3.out' });
    toast('Message sent', `Arjun will see “${b.textContent}”`, 1800);
  });
  $('#stars').addEventListener('click', (e) => {
    const s = (e.target as Element).closest('.star');
    if (!s) return;
    const i = [...$('#stars').children].indexOf(s);
    gsap.to(sim, { stars: (i + 1) / 5, duration: 0.4, ease: 'power3.out' });
  });
  addEventListener('resize', () => measure(sheetH()));
  desk.addEventListener('change', () => { $('#panel').style.height = ''; measure(sheetH()); });
}

function animateSheet() {
  if (desk.matches) return;
  const p = $('#panel');
  const to = sheetH()!;
  gsap.to(p, { height: to, duration: 0.6, ease: 'expo.out', onUpdate: () => measure(p.getBoundingClientRect().height) });
}
function setFollow(on: boolean) { sim.follow = on; $('#follow').classList.toggle('on', on); $('#follow').setAttribute('aria-pressed', String(on)); }
function setPlaying(on: boolean) { sim.playing = on; $('#play').innerHTML = on ? I.pause : I.play; $('#play').setAttribute('aria-label', on ? 'Pause simulation' : 'Play simulation'); }
function zoomBy(k: number) { gsap.to(st.cam, { z: Math.max(0.3, Math.min(2.4, st.cam.z * k)), duration: 0.45, ease: 'power3.out' }); }

let nearShown = false;
function tick(_t: number, dtMs: number) {
  const dt = Math.min(0.05, dtMs / 1000);
  sim.time += dt;
  if (sim.playing && sim.p < 1) {
    sim.p = Math.min(1, sim.p + (dt * sim.speed) / DUR);
    $<HTMLInputElement>('#scrub').value = String(Math.round(sim.p * 1000));
    if (sim.p >= P_NEAR && !nearShown) { nearShown = true; toast('Arjun is nearby', 'About 2 min away · keep your phone handy', 3000); }
    if (sim.p >= 1) {
      setPlaying(false);
      gsap.fromTo(sim, { burst: 0 }, { burst: 1, duration: 0.9, ease: 'power2.out' });
      gsap.fromTo(sim, { pod: 0 }, { pod: 1, duration: 0.7, ease: 'expo.out', delay: 0.2 });
      gsap.fromTo(sim, { sig: 0 }, { sig: 1, duration: 1.6, ease: 'power1.inOut', delay: 0.6 });
      toast('Delivered', 'Signed by Neha R. at 3:02 PM', 2600);
      animateSheet();
    }
  }
  if (sim.follow) {
    const c = pointAt(sim.p);
    const target = sim.p >= 0.999 ? { x: DROP[0], y: DROP[1] - 40 } : c;
    const k = 1 - Math.exp(-dt * 3.2);
    st.cam.x += (target.x - st.cam.x) * k; st.cam.y += (target.y - st.cam.y) * k;
    st.cam.z += (followZoom() - st.cam.z) * k * 0.6;
  }
  Object.assign(st, { p: sim.p, time: RM ? 0 : sim.time, sig: sim.sig, toast: sim.toast, burst: sim.burst, stars: sim.stars, pod: sim.pod });
  render(st);
}

// ---------- boot ----------
await document.fonts.ready;
if (REEL) {
  startReel({ render, measure, overviewCam, pointAt, P_NEAR });
} else {
  measure(sheetH());
  const c0 = pointAt(sim.p);
  st.cam = { x: c0.x, y: c0.y, z: followZoom() };
  wire();
  render(st);
  gsap.ticker.add(tick);
  const tl = gsap.timeline();
  if (!RM) {
    tl.fromTo(st, { reveal: 0 }, { reveal: 1, duration: 1.1, ease: 'power2.inOut' }, 0)
      .fromTo(st, { pinA: 0 }, { pinA: 1, duration: 0.6, ease: 'expo.out' }, 0.05)
      .fromTo(st, { pinB: 0 }, { pinB: 1, duration: 0.6, ease: 'expo.out' }, 0.8)
      .fromTo(st, { courierIn: 0 }, { courierIn: 1, duration: 0.6, ease: 'expo.out' }, 0.4)
      .from('.pscroll > *', { y: 22, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.05 }, 0.1)
      .from('.topbar, .mapctl, .playback, .legend', { y: -10, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 }, 0.2);
  }
  win.seek = () => { tl.progress(1); };
  await new Promise<void>((r) => { if (tl.duration() === 0) r(); else tl.eventCallback('onComplete', () => r()); });
  win.__ready = true;
}
