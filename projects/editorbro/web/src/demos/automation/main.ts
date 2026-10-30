// Flowsmith: a no-code automation builder. The graph is real (drag nodes, connect ports, delete edges),
// and Run computes a schedule from the current edges. drawRun(rt) renders any instant of a run, so the live
// run (normal mode) and the reel's seek(t) share every pixel of logic.
import gsap from 'gsap';
import './style.css';
import { logo, I } from './icons';
import { startReel } from './reel';

type Win = Window & { seek?: (t: number) => void; __ready?: boolean };
const win = window as Win;
const REEL = new URLSearchParams(location.search).get('reel') === '1';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const desk = matchMedia('(min-width: 900px)');
document.documentElement.classList.toggle('reel', REEL);

// ---------- model ----------
export interface FNode {
  id: string; title: string; kind: string; sub: string; color: string; icon: string; x: number; y: number; w: number;
  outs: string[]; dur: number; ms: number; out: string; log: string; inspector: Array<[string, string]>;
}
export interface FEdge { id: string; from: string; port: string; to: string }
export const H = 64;
const EDGE_T = 0.4;

export const nodes: FNode[] = [
  { id: 'trigger', title: 'New form submission', kind: 'Trigger', sub: 'Contact form · on submit', color: '#6e56cf', icon: I.form, x: -140, y: 0, w: 280, outs: ['out'], dur: 0.32, ms: 0,
    out: 'Riya K. · “UPI checkout fails after OTP”', log: 'payload received · 4 fields', inspector: [['Form', 'Contact us'], ['Fields', 'name, email, order_id, message'], ['Sample', 'riya.k@example.com']] },
  { id: 'filter', title: 'Filter', kind: 'Logic', sub: 'Only if message is 20+ chars', color: '#c98400', icon: I.filter, x: -140, y: 108, w: 280, outs: ['out'], dur: 0.24, ms: 18,
    out: 'Passed · 2 of 2 rules', log: 'passed · 2 of 2 rules', inspector: [['Rule 1', 'message length ≥ 20'], ['Rule 2', 'email is not empty'], ['Match', 'all rules']] },
  { id: 'ai', title: 'Summarize', kind: 'AI step', sub: 'One sentence · neutral tone', color: '#ff5a1f', icon: I.spark, x: -140, y: 216, w: 280, outs: ['out'], dur: 0.62, ms: 724,
    out: '“Can’t finish UPI checkout; wants a fix today.”', log: '212 tokens · 1 sentence', inspector: [['Input', '{{trigger.message}}'], ['Length', 'one sentence'], ['Tone', 'neutral']] },
  { id: 'branch', title: 'Branch', kind: 'Logic', sub: 'Route by urgency', color: '#0e9384', icon: I.branch, x: -140, y: 324, w: 280, outs: ['urgent', 'all'], dur: 0.2, ms: 7,
    out: 'urgent (0.91) · all', log: 'took urgent + all', inspector: [['Path A', 'urgent: score ≥ 0.8'], ['Path B', 'all: always'], ['Mode', 'run every matching path']] },
  { id: 'chat', title: 'Team chat', kind: 'Action', sub: 'Message · #support-urgent', color: '#2f6feb', icon: I.chat, x: -214, y: 446, w: 208, outs: ['out'], dur: 0.22, ms: 119,
    out: 'Posted · 1 message', log: 'posted to #support-urgent', inspector: [['Channel', '#support-urgent'], ['Message', 'Urgent: {{ai.summary}}'], ['Mention', '@on-call']] },
  { id: 'table', title: 'Add row to table', kind: 'Action', sub: 'Support tickets', color: '#17a169', icon: I.table, x: 6, y: 446, w: 208, outs: ['out'], dur: 0.26, ms: 124,
    out: 'Row 1,284 added', log: 'row 1,284 · Support tickets', inspector: [['Table', 'Support tickets'], ['Columns', 'name, email, summary, urgency'], ['Mode', 'append']] },
];
export const edges: FEdge[] = [
  { id: 'e1', from: 'trigger', port: 'out', to: 'filter' },
  { id: 'e2', from: 'filter', port: 'out', to: 'ai' },
  { id: 'e3', from: 'ai', port: 'out', to: 'branch' },
  { id: 'e4', from: 'branch', port: 'urgent', to: 'chat' },
  { id: 'e5', from: 'branch', port: 'all', to: 'table' },
];
const byId = (id: string) => nodes.find((n) => n.id === id)!;
export const outPort = (n: FNode, port: string) => {
  const i = n.outs.indexOf(port), k = n.outs.length;
  return { x: n.x + (n.w * (i + 1)) / (k + 1) + (k > 1 ? (i ? 1 : -1) * n.w * 0.08 : 0), y: n.y + H };
};
export const inPort = (n: FNode) => ({ x: n.x + n.w / 2, y: n.y });
const bez = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dy = Math.max(36, Math.abs(b.y - a.y) * 0.5);
  return `M${a.x} ${a.y} C${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`;
};

// ---------- schedule (from the current graph) ----------
export interface Sched { node: Map<string, { s: number; e: number; ms: number }>; edge: Map<string, { s: number; e: number }>; total: number; totalMs: number }
export function schedule(): Sched {
  const node = new Map<string, { s: number; e: number; ms: number }>();
  const edge = new Map<string, { s: number; e: number }>();
  const trig = byId('trigger');
  node.set(trig.id, { s: 0, e: trig.dur, ms: 0 });
  for (let pass = 0; pass < nodes.length + 1; pass++) {
    for (const ed of edges) {
      const a = node.get(ed.from);
      if (!a) continue;
      edge.set(ed.id, { s: a.e, e: a.e + EDGE_T });
      const n = byId(ed.to);
      const s = a.e + EDGE_T, ms = a.ms + n.ms;
      const cur = node.get(n.id);
      if (!cur || s > cur.s) node.set(n.id, { s, e: s + n.dur, ms: Math.max(ms, cur?.ms ?? 0) });
    }
  }
  let total = 0, totalMs = 0;
  node.forEach((v) => { total = Math.max(total, v.e); totalMs = Math.max(totalMs, v.ms); });
  return { node, edge, total, totalMs };
}

// ---------- DOM ----------
function nodeHtml(n: FNode) {
  const outs = n.outs.map((p) => `<span class="port out" data-port="${p}" style="left:${((outPort(n, p).x - n.x) / n.w) * 100}%">${n.outs.length > 1 ? `<em>${p}</em>` : ''}</span>`).join('');
  return `<div class="node${n.w < 260 ? ' leaf' : ''}" id="n-${n.id}" data-id="${n.id}" style="--c:${n.color};width:${n.w}px;transform:translate(${n.x}px,${n.y}px)" tabindex="0">
    ${n.id !== 'trigger' ? '<span class="port in"></span>' : ''}
    <span class="nic">${n.icon}</span>
    <div class="nbody"><span class="nkind">${n.kind}</span><b>${n.title}</b><span class="nsub">${n.sub}</span><span class="nout">${n.out}</span></div>
    <span class="nstat"><i class="st-run">${I.spin}</i><i class="st-done">${I.check}</i></span>
    <div class="prev"><span>Output</span><p>${n.out}</p><small id="pm-${n.id}"></small></div>
    ${outs}
  </div>`;
}

const LIB: Array<[string, Array<[string, string, string, string]>]> = [
  ['Triggers', [['Form submission', I.form, '#6e56cf', 'Trigger'], ['Schedule', I.clock, '#6e56cf', 'Trigger'], ['Webhook', I.hook, '#6e56cf', 'Trigger']]],
  ['Logic', [['Filter', I.filter, '#c98400', 'Logic'], ['Branch', I.branch, '#0e9384', 'Logic'], ['Delay', I.pause, '#c98400', 'Logic']]],
  ['AI', [['Summarize', I.spark, '#ff5a1f', 'AI step'], ['Classify', I.tag, '#ff5a1f', 'AI step'], ['Extract fields', I.spark, '#ff5a1f', 'AI step']]],
  ['Actions', [['Team chat message', I.chat, '#2f6feb', 'Action'], ['Add row to table', I.table, '#17a169', 'Action'], ['Send email', I.mail, '#2f6feb', 'Action'], ['HTTP request', I.globe, '#5d5c66', 'Action']]],
];

function shell() {
  return `
  <div class="app">
    <header class="top">
      <a class="brand" href="#">${logo(30)}<span>Flowsmith</span></a>
      <nav class="crumbs"><span>Acme Support</span><i>/</i><b>Support triage</b><span class="draft">Draft</span></nav>
      <div class="flowname"><b>Support triage</b><span class="draft">Draft</span></div>
      <nav class="tabs"><a class="on">Editor</a><a>Runs</a><a>Settings</a></nav>
      <div class="top-r">
        <div class="faces"><span style="--h:262">RK</span><span style="--h:24">AM</span><span style="--h:160">+2</span></div>
        <button class="btn ghost">Publish</button>
        <button class="btn run" id="run">${I.play}<span id="runLabel">Run</span></button>
      </div>
    </header>
    <aside class="lib">
      <label class="lsearch">${I.search}<input placeholder="Add a step…" aria-label="Search steps" id="libq"/></label>
      ${LIB.map(([g, items]) => `<div class="lgroup"><p>${g}</p>${items.map(([t, ic, c, k]) => `<button class="litem" data-title="${t}" data-kind="${k}" data-c="${c}" style="--c:${c}"><span class="lic">${ic}</span>${t}<span class="ladd">${I.plus}</span></button>`).join('')}</div>`).join('')}
      <div class="lnote"><b>Tip</b> Drag from a port’s dot to another step to connect them. Click a link and press Delete to remove it.</div>
    </aside>
    <main class="canvas" id="canvas">
      <div class="world" id="world">
        <svg class="edges" id="edges" width="1" height="1"><defs><linearGradient id="hotg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a1f"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs><g id="elayer"></g><path id="temp" class="temp" d=""/><g id="packets"></g></svg>
        <div id="nlayer"></div>
      </div>
      <div class="banner" id="banner"><span class="bic">${I.check}</span><b>Run succeeded</b><span id="bannerT">873 ms · 6 of 6 steps</span></div>
      <div class="cctl"><button id="zout" aria-label="Zoom out">${I.minus}</button><span id="zpct">100%</span><button id="zin" aria-label="Zoom in">${I.plus}</button><button id="zfit" aria-label="Fit to screen">${I.fit}</button></div>
    </main>
    <aside class="side" id="side">
      <button class="sgrab" id="sgrab" aria-label="Expand run log"><i></i></button>
      <nav class="stabs"><a class="on" data-tab="log">Run log</a><a data-tab="insp">Inspector</a></nav>
      <div class="spane on" id="pane-log">
        <div class="lhead"><div><h3>Run log</h3><small id="runId">Run #1,027 · test payload</small></div><span class="chip" id="runChip"><i></i><span id="runChipT">Idle</span></span></div>
        <div class="rows" id="rows"></div>
        <div class="sum" id="sum"><span class="sic">${I.check}</span><div><b id="sumT">Succeeded in 873 ms</b><small id="sumS">6 of 6 steps · 0 retries</small></div></div>
        <div class="hist" id="hist">
          <p>Earlier runs</p>
          <div class="hrow"><i class="ok"></i><span>#1,026</span><small>Yesterday 18:04</small><b>912 ms</b></div>
          <div class="hrow"><i class="ok"></i><span>#1,025</span><small>Yesterday 16:41</small><b>884 ms</b></div>
          <div class="hrow"><i class="warn"></i><span>#1,024</span><small>Yesterday 11:20</small><b>Filtered</b></div>
        </div>
        <p class="demo-line">Demo · fictional brand · built with EditorBro</p>
      </div>
      <div class="spane" id="pane-insp"><div id="insp"></div></div>
    </aside>
    <footer class="status"><span><i class="dot"></i>All changes saved</span><span>6 steps · 5 links</span><span class="demo-line">Demo · fictional brand · built with EditorBro</span></footer>
  </div>`;
}

document.getElementById('app')!.innerHTML = shell();
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as unknown as T;

export function buildGraph() {
  $('#nlayer').innerHTML = nodes.map(nodeHtml).join('');
  drawEdges();
}
const edgeLen = new Map<string, number>();
export function drawEdges() {
  $('#elayer').innerHTML = edges.map((e) => {
    const d = bez(outPort(byId(e.from), e.port), inPort(byId(e.to)));
    return `<path class="edge" id="${e.id}" d="${d}"/><path class="edge-hot" id="${e.id}-hot" d="${d}"/><path class="edge-hit" data-edge="${e.id}" d="${d}"/>`;
  }).join('');
  edgeLen.clear();
  for (const e of edges) edgeLen.set(e.id, (document.getElementById(e.id) as unknown as SVGPathElement).getTotalLength());
  $('#packets').innerHTML = edges.map((e) => `<g id="${e.id}-pk" opacity="0"><circle r="11" fill="#ff5a1f" opacity=".25" filter="url(#glow)"/><circle class="trail t3" r="2.6"/><circle class="trail t2" r="3.4"/><circle class="trail t1" r="4.2"/><circle r="6" fill="#ff5a1f" stroke="#fff" stroke-width="2"/></g>`).join('');
  $('.status span:nth-child(2)').textContent = `${nodes.length} steps · ${edges.length} links`;
}
export function moveNode(n: FNode) {
  ($(`#n-${n.id}`) as HTMLElement).style.transform = `translate(${n.x}px,${n.y}px)`;
}

// ---------- camera ----------
export const cam = { x: 0, y: 0, z: 1 };
export function applyCam() {
  ($('#world') as HTMLElement).style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
  const c = $('#canvas') as HTMLElement;
  const g = 22 * cam.z;
  c.style.backgroundSize = `${g}px ${g}px`;
  c.style.backgroundPosition = `${cam.x}px ${cam.y}px`;
  $('#zpct').textContent = `${Math.round(cam.z * 100)}%`;
}
export function fitCam(bottomInset = 0, topInset = 0) {
  const r = ($('#canvas') as HTMLElement).getBoundingClientRect();
  const xs = nodes.flatMap((n) => [n.x, n.x + n.w]), ys = nodes.flatMap((n) => [n.y, n.y + H + (desk.matches && n.w < 260 ? 112 : 0)]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = desk.matches ? 50 : 16, padY = desk.matches ? 70 : 18;
  const extraW = desk.matches ? 260 : 0; // room for output cards to the right
  const availH = r.height - bottomInset - topInset - padY * 2;
  const z = Math.min(1, (r.width - padX * 2) / (maxX - minX + extraW), availH / (maxY - minY));
  return { z, x: r.width / 2 - ((minX + maxX + extraW) / 2) * z, y: topInset + padY + (availH - (maxY - minY) * z) / 2 - minY * z };
}

// ---------- run rendering ----------
export interface RunView { rt: number; sched: Sched; assemble?: number[]; edgeDraw?: number; time: number }
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export function drawRun(v: RunView) {
  const { rt, sched } = v;
  const running = rt >= 0;
  nodes.forEach((n, i) => {
    const el = $(`#n-${n.id}`) as HTMLElement;
    const s = sched.node.get(n.id);
    const st = !running || !s ? 'idle' : rt < s.s ? 'queued' : rt < s.e ? 'run' : 'done';
    el.dataset.st = st;
    const a = v.assemble?.[i];
    if (a !== undefined) {
      el.style.opacity = String(clamp(a * 1.4));
      el.style.transform = `translate(${n.x}px,${n.y - (1 - a) * 26}px) scale(${0.94 + 0.06 * a})`;
    }
    const spin = el.querySelector<HTMLElement>('.st-run svg');
    if (spin) spin.style.transform = `rotate(${(v.time * 540) % 360}deg)`;
    const k = st === 'run' && s ? (rt - s.s) / (s.e - s.s) : 0;
    el.style.setProperty('--k', String(k));
    const pm = document.getElementById(`pm-${n.id}`);
    if (pm && s) pm.textContent = st === 'done' ? `+${s.ms} ms` : '';
  });
  for (const e of edges) {
    const L = edgeLen.get(e.id) ?? 1;
    const base = document.getElementById(e.id)!, hot = document.getElementById(`${e.id}-hot`)!, pk = document.getElementById(`${e.id}-pk`)!;
    const dr = v.edgeDraw ?? 1;
    base.setAttribute('stroke-dasharray', `${L * dr} ${L}`);
    const s = sched.edge.get(e.id);
    const u = running && s ? clamp((rt - s.s) / (s.e - s.s)) : 0;
    hot.setAttribute('stroke-dasharray', `${L * u} ${L}`);
    hot.setAttribute('opacity', u > 0 ? '1' : '0');
    if (u > 0 && u < 1) {
      const P = (q: number) => (base as unknown as SVGPathElement).getPointAtLength(clamp(q) * L);
      const ease = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      const p = P(ease);
      pk.setAttribute('opacity', '1');
      pk.setAttribute('transform', `translate(${p.x} ${p.y})`);
      pk.querySelectorAll<SVGCircleElement>('.trail').forEach((c, j) => {
        const q = P(ease - (j + 1) * 0.045);
        c.setAttribute('cx', String(q.x - p.x)); c.setAttribute('cy', String(q.y - p.y));
      });
    } else pk.setAttribute('opacity', '0');
  }
  // log
  const done = nodes.map((n) => ({ n, s: sched.node.get(n.id) })).filter((x) => x.s && running && rt >= x.s.e).sort((a, b) => a.s!.e - b.s!.e);
  const rows = $('#rows');
  const want = done.map((d) => d.n.id).join(',');
  if (rows.dataset.k !== want) {
    rows.dataset.k = want;
    rows.innerHTML = done.map(({ n, s }) => `<div class="lrow" data-id="${n.id}"><span class="lt">+${s!.ms} ms</span><span class="ln" style="--c:${n.color}"><i></i>${n.title}</span><span class="ld">${n.log}</span></div>`).join('');
  }
  rows.querySelectorAll<HTMLElement>('.lrow').forEach((r) => {
    const s = sched.node.get(r.dataset.id!)!;
    const a = clamp((rt - s.e) / 0.35);
    r.style.opacity = String(a);
    r.style.transform = `translateY(${(1 - (1 - (1 - a) ** 3)) * 10}px)`;
  });
  const ok = running && rt >= sched.total + 0.05;
  const reached = sched.node.size;
  $('#runChipT').textContent = !running ? 'Idle' : ok ? 'Succeeded' : 'Running';
  $('#runChip').className = `chip ${!running ? '' : ok ? 'ok' : 'live'}`;
  $('#sumT').textContent = `Succeeded in ${sched.totalMs} ms`;
  $('#sumS').textContent = `${reached} of ${nodes.length} steps · 0 retries`;
  $('#bannerT').textContent = `${sched.totalMs} ms · ${reached} of ${nodes.length} steps`;
  const sa = ok ? clamp((rt - sched.total - 0.05) / 0.4) : 0;
  const sum = $('#sum') as HTMLElement;
  sum.style.display = ok ? '' : 'none';
  sum.style.opacity = String(sa);
  // grows in, so it never reserves empty space before it appears
  sum.style.maxHeight = `${sa * 80}px`;
  sum.style.paddingTop = sum.style.paddingBottom = `${sa * 10}px`;
  sum.style.marginBottom = desk.matches ? '' : `${sa * 8}px`;
  ($('#hist') as HTMLElement).style.display = running && !ok ? 'none' : '';
  $('#runLabel').textContent = running && !ok ? 'Running' : ok ? 'Run again' : 'Run';
  $('#run').classList.toggle('busy', running && !ok);
  document.documentElement.dataset.run = !running ? 'idle' : ok ? 'ok' : 'live';
}
export function setBanner(k: number) {
  const b = $('#banner') as HTMLElement;
  b.style.opacity = String(clamp(k * 1.5));
  b.style.transform = `translate(-50%, ${(1 - k) * -18}px)`;
}

// ---------- inspector ----------
let selected: string | null = null;
function select(id: string | null) {
  selected = id;
  document.querySelectorAll('.node').forEach((el) => el.classList.toggle('sel', (el as HTMLElement).dataset.id === id));
  const n = id ? byId(id) : null;
  $('#insp').innerHTML = n
    ? `<div class="ihead" style="--c:${n.color}"><span class="nic">${n.icon}</span><div><small>${n.kind}</small><b>${n.title}</b></div></div>${n.inspector.map(([k, v]) => `<label class="ifield"><span>${k}</span><input value="${v.replace(/"/g, '&quot;')}"/></label>`).join('')}<p class="ihint">Changes save automatically. Run the flow to test with the sample payload.</p>`
    : `<p class="iempty">Select a step on the canvas to edit it.</p>`;
}
function tab(name: string) {
  document.querySelectorAll('.stabs a').forEach((a) => a.classList.toggle('on', (a as HTMLElement).dataset.tab === name));
  $('#pane-log').classList.toggle('on', name === 'log');
  $('#pane-insp').classList.toggle('on', name === 'insp');
}

// ---------- normal mode ----------
let runT = -1;
let edgeSeq = 100;
let runNo = 0;
let sched = schedule();
let ticker: ((t: number, d: number) => void) | null = null;
function run() {
  if (runT >= 0 && runT < sched.total) return;
  sched = schedule();
  runT = 0;
  $('#runId').textContent = `Run #1,${String(27 + runNo++).padStart(3, '0')} · test payload`;
  tab('log');
  setBanner(0);
  if (!desk.matches) gsap.to('#side', { height: 300, duration: 0.6, ease: 'expo.out' });
  document.querySelectorAll('.lrow').forEach((r) => r.remove());
  $('#rows').dataset.k = '';
  if (ticker) gsap.ticker.remove(ticker);
  let shown = false;
  ticker = (_t, dt) => {
    runT += (RM ? 1000 : dt) / 1000;
    drawRun({ rt: runT, sched, time: gsap.ticker.time });
    if (runT >= sched.total + 0.05 && !shown) {
      shown = true;
      const o = { k: 0 };
      gsap.to(o, { k: 1, duration: 0.6, ease: 'expo.out', onUpdate: () => setBanner(o.k) });
      gsap.to(o, { k: 0, duration: 0.35, ease: 'power2.in', delay: 3, onUpdate: () => setBanner(o.k) });
    }
    if (runT > sched.total + 4) { gsap.ticker.remove(ticker!); ticker = null; }
  };
  gsap.ticker.add(ticker);
}

function toWorld(e: PointerEvent) {
  const r = ($('#canvas') as HTMLElement).getBoundingClientRect();
  return { x: (e.clientX - r.left - cam.x) / cam.z, y: (e.clientY - r.top - cam.y) / cam.z };
}

function wire() {
  const canvas = $('#canvas') as HTMLElement;
  let mode: null | { kind: 'pan' | 'node' | 'link'; sx: number; sy: number; ox: number; oy: number; id?: string; port?: string } = null;
  let selEdge: string | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    const t = e.target as Element;
    if (t.closest('.cctl, .banner')) return;
    const port = t.closest<HTMLElement>('.port.out');
    const nodeEl = t.closest<HTMLElement>('.node');
    const hit = t.closest<SVGElement>('.edge-hit');
    selEdge = null;
    document.querySelectorAll('.edge.sel').forEach((x) => x.classList.remove('sel'));
    if (hit) { selEdge = hit.dataset.edge!; document.getElementById(selEdge)!.classList.add('sel'); return; }
    canvas.setPointerCapture(e.pointerId);
    if (port && nodeEl) { mode = { kind: 'link', sx: e.clientX, sy: e.clientY, ox: 0, oy: 0, id: nodeEl.dataset.id, port: port.dataset.port }; return; }
    if (nodeEl) { const n = byId(nodeEl.dataset.id!); mode = { kind: 'node', sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, id: n.id }; select(n.id); nodeEl.classList.add('drag'); return; }
    select(null);
    mode = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: cam.x, oy: cam.y };
    canvas.classList.add('panning');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!mode) return;
    if (mode.kind === 'pan') { cam.x = mode.ox + e.clientX - mode.sx; cam.y = mode.oy + e.clientY - mode.sy; applyCam(); }
    else if (mode.kind === 'node') {
      const n = byId(mode.id!);
      n.x = Math.round((mode.ox + (e.clientX - mode.sx) / cam.z) / 2) * 2; n.y = Math.round((mode.oy + (e.clientY - mode.sy) / cam.z) / 2) * 2;
      moveNode(n); drawEdges(); drawRun({ rt: runT, sched, time: 0 });
    } else {
      const a = outPort(byId(mode.id!), mode.port!), b = toWorld(e);
      $('#temp').setAttribute('d', bez(a, b));
      document.querySelectorAll('.port.in').forEach((p) => p.classList.toggle('hot', p.parentElement !== document.getElementById(`n-${mode!.id}`)));
    }
  });
  const end = (e: PointerEvent) => {
    if (mode?.kind === 'link') {
      const el = document.elementsFromPoint(e.clientX, e.clientY).map((x) => x.closest<HTMLElement>('.node')).find(Boolean);
      const to = el?.dataset.id;
      if (to && to !== mode.id && to !== 'trigger' && !edges.some((x) => x.from === mode!.id && x.port === mode!.port && x.to === to)) {
        edges.push({ id: `e${++edgeSeq}`, from: mode.id!, port: mode.port!, to });
        drawEdges(); sched = schedule(); drawRun({ rt: runT, sched, time: 0 });
      }
      $('#temp').setAttribute('d', '');
      document.querySelectorAll('.port.in.hot').forEach((p) => p.classList.remove('hot'));
    }
    document.querySelectorAll('.node.drag').forEach((x) => x.classList.remove('drag'));
    canvas.classList.remove('panning');
    mode = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', (e) => {
    const hit = (e.target as Element).closest<SVGElement>('.edge-hit');
    if (hit) removeEdge(hit.dataset.edge!);
  });
  addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selEdge && !(e.target as HTMLElement).closest('input')) { removeEdge(selEdge); selEdge = null; }
  });
  const removeEdge = (id: string) => { const i = edges.findIndex((x) => x.id === id); if (i >= 0) { edges.splice(i, 1); drawEdges(); sched = schedule(); drawRun({ rt: runT, sched, time: 0 }); } };
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  $('#zin').addEventListener('click', () => zoomAt(1.2));
  $('#zout').addEventListener('click', () => zoomAt(1 / 1.2));
  $('#zfit').addEventListener('click', () => { const f = fitCam(desk.matches ? 0 : ($('#side') as HTMLElement).getBoundingClientRect().height, 0); gsap.to(cam, { ...f, duration: 0.6, ease: 'power3.out', onUpdate: applyCam }); });
  $('#run').addEventListener('click', run);
  document.querySelectorAll('.stabs a').forEach((a) => a.addEventListener('click', () => tab((a as HTMLElement).dataset.tab!)));
  $('#sgrab').addEventListener('click', () => { const h = ($('#side') as HTMLElement).getBoundingClientRect().height; gsap.to('#side', { height: h > 120 ? 96 : 320, duration: 0.6, ease: 'expo.out' }); });
  canvas.addEventListener('click', (e) => { if ((e.target as Element).closest('.node')) tab('insp'); });
  document.querySelectorAll<HTMLElement>('.litem').forEach((b) => b.addEventListener('click', () => {
    const r = canvas.getBoundingClientRect();
    const id = `n${nodes.length + 1}`;
    const n: FNode = { id, title: b.dataset.title!, kind: b.dataset.kind!, sub: 'Not configured yet', color: b.dataset.c!, icon: b.querySelector('.lic')!.innerHTML, w: 220, outs: ['out'], dur: 0.25, ms: 40, out: 'Done', log: 'completed', inspector: [['Name', b.dataset.title!], ['Status', 'needs setup']],
      x: Math.round(((r.width * 0.72 - cam.x) / cam.z) / 2) * 2, y: Math.round(((r.height * 0.3 - cam.y) / cam.z + (nodes.length % 4) * 30) / 2) * 2 };
    nodes.push(n);
    $('#nlayer').insertAdjacentHTML('beforeend', nodeHtml(n));
    drawEdges(); select(id); tab('insp');
    gsap.from(`#n-${id}`, { opacity: 0, scale: 0.92, duration: 0.5, ease: 'expo.out', clearProps: 'scale' });
  }));
  $<HTMLInputElement>('#libq').addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    document.querySelectorAll<HTMLElement>('.litem').forEach((b) => { b.hidden = !!q && !b.dataset.title!.toLowerCase().includes(q); });
  });
  addEventListener('resize', () => { Object.assign(cam, fitCam(desk.matches ? 0 : 96)); applyCam(); });
}
function zoomAt(k: number, cx?: number, cy?: number) {
  const r = ($('#canvas') as HTMLElement).getBoundingClientRect();
  const px = (cx ?? r.left + r.width / 2) - r.left, py = (cy ?? r.top + r.height / 2) - r.top;
  const z = Math.max(0.4, Math.min(2, cam.z * k));
  cam.x = px - ((px - cam.x) / cam.z) * z; cam.y = py - ((py - cam.y) / cam.z) * z; cam.z = z;
  applyCam();
}

// ---------- boot ----------
buildGraph();
select(null);
await document.fonts.ready;
if (REEL) {
  startReel({ nodes, schedule, drawRun, setBanner, fitCam, cam, applyCam });
} else {
  Object.assign(cam, fitCam(desk.matches ? 0 : 96));
  applyCam();
  // open on the last run's data, like a real builder: lit steps, outputs and its log
  runT = 999;
  $('#runId').textContent = 'Run #1,026 · yesterday 18:04';
  drawRun({ rt: runT, sched, time: 0 });
  wire();
  const tl = gsap.timeline();
  if (!RM) {
    tl.from('.node', { top: -18, opacity: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,top' }, 0.05)
      .from('.edge', { opacity: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 0.35)
      .from('.top > *, .lgroup, .side > *', { y: 10, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04 }, 0);
  }
  win.seek = () => { tl.progress(1); };
  await new Promise<void>((r) => { if (tl.duration() === 0) r(); else tl.eventCallback('onComplete', () => r()); });
  nodes.forEach(moveNode);
  win.__ready = true;
}
