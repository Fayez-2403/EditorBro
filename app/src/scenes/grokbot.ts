// Grok Bot reel (58.000 s, 9:16, 60 fps): six original robot coworkers run a miniature AI production studio.
// Illustrative concept animation, not the Grok Bot product UI (claims: projects/grok-bot-reel/FACTS.md).
// 3D: a Three.js studio rendered into its own 4x MSAA target the size of the 9:16 column; 2D: type, captions, role tags
// and illustrated UI on a Layer2D over it. Everything is a pure function of t: the story is data (data/grokbot/cues.json,
// 120 BPM grid), each chapter sets the camera, the bots' blocking and poses (via _grokbots.ts) and the props.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT, PH } from '../engine/gl';
import { COL, FXW, FXH, ax, mono, txt, alpha, fillRR, spring, sat } from './_vo';
import {
  BOT_IDS, SPECS, buildBot, applyPose, restPose, mixPose, idle, walk, typing, blinkAt, type BotId, type Rig, type Pose,
  shellMat, darkMat, glowMat,
} from './_grokbots';

export const GB = {
  obsidian: '#080B10', graphite: '#151C26', bone: '#F6F8FB', cyan: '#38D8F4', lime: '#BBF447', amber: '#F8C14C', coral: '#FF695E',
  violet: '#B07CFF', green: '#3DF59A', orange: '#FF9A3D', slate: '#8A97AA',
};

// ---------------------------------------------------------------- layout (metres; desks face the camera, +z)
export const DESKS: Record<BotId, { x: number; z: number; rot: number }> = {
  scout: { x: -1.25, z: -1.3, rot: 0.18 }, archive: { x: 0, z: -1.5, rot: 0 }, forge: { x: 1.25, z: -1.3, rot: -0.18 },
  sentinel: { x: -0.95, z: -0.05, rot: 0.12 }, relay: { x: 0.95, z: -0.05, rot: -0.12 }, helm: { x: 0, z: 1.05, rot: 0 },
};
const TRAY = new THREE.Vector3(1.75, 0, 1.75);
const INK = '#121821', MUTED = '#7A8494';   // light-office UI ink
const CORE = new THREE.Vector3(0, 0, -3.0);
const ROUTINE_SPOT = { x: -2.0, z: 1.2 };   // open floor, front left: the routine demo is staged here
const BUTTON = new THREE.Vector3(-0.22, 0.365, 0.86);   // on HELM's (lower) console, within his right-hand reach   // the red STOP SCROLL button on HELM's console
/** Where a bot stands at its desk (behind it, facing +z). */
function deskSpot(id: BotId) { const d = DESKS[id], lz = -0.44; return { x: d.x + Math.sin(d.rot) * lz, z: d.z + Math.cos(d.rot) * lz, rot: d.rot }; }

// ---------------------------------------------------------------- timing helpers (120 BPM: beat 0.5 s, bar 2 s)
export const BEAT = 0.5, BAR = 2;
export const beatIndex = (t: number) => Math.floor(t / BEAT + 1e-6);
export const barIndex = (t: number) => Math.floor(t / BAR + 1e-6);
export const nearestBeat = (t: number) => Math.round(t / BEAT) * BEAT;
const span = (t: number, a: number, b: number) => sat((t - a) / (b - a));
const ease = (x: number) => x * x * (3 - 2 * x);
const outCubic = (x: number) => 1 - (1 - sat(x)) ** 3;
const inCubic = (x: number) => sat(x) ** 3;
const outExpo = (x: number) => (x >= 1 ? 1 : 1 - 2 ** (-10 * sat(x)));
/** Spring 0 -> 1 starting at t0 (response = period s, zeta = damping ratio; <1 overshoots), clamped. */
const springAt = (t: number, t0: number, response = 0.35, zeta = 0.55) => Math.max(-0.2, Math.min(1.25, spring(t - t0, response, zeta)));
const hit = (t: number, t0: number, d = 0.25) => (t < t0 ? 0 : Math.exp(-(t - t0) / d));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const hash1 = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

interface Cues { events: Record<string, number | number[]>; chapters: [number, number, string][] }

/** A plane whose face is a 2D canvas, redrawn on demand (screens, cards, signs). */
class CanvasPlane {
  canvas = document.createElement('canvas'); c: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial;
  constructor(public w: number, public h: number, public pw: number, public ph: number, glow = 1.0, transparent = true) {
    this.canvas.width = pw; this.canvas.height = ph; this.c = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent, toneMapped: false, side: THREE.DoubleSide });
    this.mat.color.setScalar(glow);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
  }
  draw(fn: (c: CanvasRenderingContext2D, W: number, H: number) => void) { const c = this.c; c.save(); c.clearRect(0, 0, this.pw, this.ph); fn(c, this.pw, this.ph); c.restore(); this.tex.needsUpdate = true; }
}

const CAP_EMPH = new Set(['chhe', 'bots,', 'team!', 'kaam', 'Grok', 'Bot.', 'teammate', 'zinda', 'research', 'context', 'content', 'daudte', 'team',
  'parallel', 'drafts,', 'visuals', 'brief.', 'workflow', 'routine', 'save', 'apps', 'websites', 'shared', 'cloud', 'computer', 'approval', 'rukti',
  'copy-paste.', 'crew', 'finished', 'BOT!', 'Build']);

export default class GrokBot extends Scene {
  private layer = new Layer2D();
  private rt!: THREE.WebGLRenderTarget;
  private scene3 = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(36, COL.w / FXH, 0.03, 80);
  bots = {} as Record<BotId, Rig>;
  private px = 1;
  private cues!: Cues;
  private lyrics: { lines: { i: number; start: number; end: number; words: { w: string; start: number; end: number }[] }[] } = { lines: [] };
  // props
  private screens = {} as Record<BotId, CanvasPlane>;
  private chat!: CanvasPlane; private mission!: CanvasPlane; private cards: CanvasPlane[] = []; private citation!: CanvasPlane; private notes!: CanvasPlane;
  private capsule!: THREE.Group; private wallR!: CanvasPlane; private apps: CanvasPlane[] = []; private routineScr!: CanvasPlane; private routineCard!: CanvasPlane;
  private crystal!: THREE.Mesh; private phone!: THREE.Group; private phoneScr!: CanvasPlane; private sign!: CanvasPlane;
  private button!: THREE.Group; private buttonCap!: THREE.Mesh; private beams: THREE.Mesh[] = []; private coreRings: THREE.Mesh[] = [];
  private chair!: THREE.Group; private trayGlow!: THREE.Mesh; private flash!: THREE.PointLight; private shipped: THREE.Mesh[] = [];
  /** Per-frame 2D overlay jobs (role tags etc. need the camera of this frame). */
  private tags: { id: BotId; k: number }[] = [];
  private status: { k: number; label: string; color: string; at: THREE.Vector3 } | null = null;
  private deskGroups = {} as Record<BotId, THREE.Group>;
  private halos = {} as Record<BotId, THREE.Mesh>;
  /** Bots that act in the current shot (never culled as foreground blockers). */
  private cast = new Set<BotId>();

  ev(n: string): number { const v = this.cues.events[n]; if (typeof v !== 'number') throw new Error(`grokbot cue missing: ${n}`); return v; }
  evs(n: string): number[] { const v = this.cues.events[n]; if (!Array.isArray(v)) throw new Error(`grokbot cue list missing: ${n}`); return v; }

  override async init() {
    const { renderer } = this.ctx;
    this.px = PH / FXH;   // real pixels per logical px (the engine's render targets are SCALE x the logical 1920x1080)
    this.cues = await (await fetch('/data/grokbot/cues.json')).json();
    try { this.lyrics = await (await fetch('/data/lyrics.json')).json(); } catch { /* captions optional */ }
    this.rt = new THREE.WebGLRenderTarget(Math.round(COL.w * this.px), PH, { type: THREE.HalfFloatType, samples: 4 });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    const s = this.scene3;
    s.background = new THREE.Color('#E6E8EB');
    s.fog = new THREE.Fog('#EEEFF1', 10, 22);
    const pm = new THREE.PMREMGenerator(renderer);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; s.environmentIntensity = 0.32;
    this.buildSet(); this.buildProps();
    for (const id of BOT_IDS) { const r = buildBot(id); this.bots[id] = r; s.add(r.root); }
  }

  // ------------------------------------------------------------------------------------------------ set
  private box(parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, r = 0.02) {
    const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  private buildSet() {
    const s = this.scene3;
    // bright office daylight: soft sun through the windows, sky fill, warm bounce; no neon
    const sun = new THREE.DirectionalLight('#fff4e4', 1.15); sun.position.set(-3.2, 6.5, 4.5); sun.target.position.set(0, 0, -0.6);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
    Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 0.5, far: 20 }); s.add(sun, sun.target);
    const fill = new THREE.DirectionalLight('#e3ecff', 0.25); fill.position.set(4, 3, 3); s.add(fill);
    s.add(new THREE.HemisphereLight('#ffffff', '#d8d0c4', 0.42));
    this.flash = new THREE.PointLight('#ffffff', 0, 6, 2); s.add(this.flash);
    // light floor (soft stone tiles)
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
    g.fillStyle = '#E9E5DE'; g.fillRect(0, 0, 512, 512); g.strokeStyle = 'rgba(80,70,60,0.08)'; g.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8, 8); tex.anisotropy = 8;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: '#F6F6F4', roughness: 0.9 });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat); wall.position.set(0, 3, -3.9); wall.receiveShadow = true; s.add(wall);
    // window wall: three tall panes of soft daylight with slim frames
    for (const x of [-2.3, 0, 2.3]) {
      const pane = new CanvasPlane(1.7, 2.1, 128, 160, 1.15, false); pane.mesh.position.set(x, 1.95, -3.88); s.add(pane.mesh);
      pane.draw((cc, W, H) => { const gr = cc.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d9ecff'); gr.addColorStop(1, '#f4f8fc'); cc.fillStyle = gr; cc.fillRect(0, 0, W, H); });
      const fr = new THREE.MeshStandardMaterial({ color: '#C9CED6', roughness: 0.5 });
      for (const [w, h, xx, yy] of [[1.78, 0.05, 0, 1.05], [1.78, 0.05, 0, -1.05], [0.05, 2.15, 0.87, 0], [0.05, 2.15, -0.87, 0], [0.04, 2.1, 0, 0]] as const) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), fr); m.position.set(x + xx, 1.95 + yy, -3.86); s.add(m); }
    }
    // studio sign (our own type; not a logo)
    this.sign = new CanvasPlane(2.2, 0.36, 1024, 168, 1.0); this.sign.mesh.position.set(0, 3.35, -3.85); s.add(this.sign.mesh);
    this.sign.draw((c2, W, Hh) => { c2.font = ax(110, 125, 900); c2.fillStyle = '#121821'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('GROK BOT', W / 2, Hh * 0.45);
      c2.font = mono(24, 600); c2.fillStyle = '#7A8494'; c2.fillText('OFFICE · ILLUSTRATIVE', W / 2, Hh * 0.88); });
    // plants
    const pot = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }), leaf = new THREE.MeshStandardMaterial({ color: '#5FA96A', roughness: 0.8 });
    for (const [x, z] of [[-2.7, -2.9], [2.7, -2.9], [-2.6, 2.2]] as const) {
      const pp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.36, 24), pot); pp.position.set(x, 0.18, z); pp.castShadow = pp.receiveShadow = true; s.add(pp);
      for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2 - k * 0.02, 16, 12), leaf); l.position.set(x + Math.sin(k * 2.1) * 0.12, 0.5 + k * 0.14, z + Math.cos(k * 2.1) * 0.12); l.castShadow = true; s.add(l); }
    }
    // desks: white tops, light legs, a monitor on a stand beside the bot, a soft-colour nameplate
    for (const id of BOT_IDS) {
      const d = DESKS[id], grp = new THREE.Group(); grp.position.set(d.x, 0, d.z); grp.rotation.y = d.rot; s.add(grp); this.deskGroups[id] = grp;
      const top = shellMat('#FFFFFF', 0.5), leg = shellMat('#D5DAE1', 0.5), acc = SPECS[id].accent;
      if (id === 'helm') { this.box(grp, 1.2, 0.34, 0.44, top, 0, 0.17, 0, 0.05); this.box(grp, 1.1, 0.02, 0.38, shellMat(acc, 0.45), 0, 0.345, 0, 0.008); }
      else {
        this.box(grp, 0.9, 0.04, 0.46, top, 0, 0.38, 0); this.box(grp, 0.04, 0.36, 0.4, leg, -0.4, 0.18, 0); this.box(grp, 0.04, 0.36, 0.4, leg, 0.4, 0.18, 0);
        this.box(grp, 0.32, 0.018, 0.1, shellMat('#E7EAEE', 0.5), 0.1, 0.41, 0.06, 0.006);
      }
      this.box(grp, 0.3, 0.045, 0.012, shellMat(acc, 0.45), 0, id === 'helm' ? 0.26 : 0.32, 0.236, 0.006);
      const mx = id === 'helm' ? -0.82 : -0.5, my = id === 'helm' ? 0.62 : 0.68;
      const mon = new THREE.Group(); mon.position.set(mx, 0, 0.0); mon.rotation.y = 0.42; grp.add(mon);
      this.box(mon, 0.6, 0.38, 0.03, shellMat('#2A2F37', 0.4), 0, my, -0.02, 0.012);
      this.box(mon, 0.04, my - 0.36, 0.04, leg, 0, (my - 0.2) / 2 + 0.2, -0.04, 0.01);
      if (id !== 'helm') this.box(mon, 0.2, 0.012, 0.14, leg, 0, 0.405, -0.04, 0.005);
      const scr = new CanvasPlane(0.56, 0.34, 640, 388, 1.0); scr.mesh.position.set(0, my, -0.003); mon.add(scr.mesh); this.screens[id] = scr;
    }
    // the shared cloud computer: one white server pillar behind all six desks (soft status lights)
    const core = new THREE.Group(); core.position.copy(CORE); s.add(core);
    const coreBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 2.6, 48), shellMat('#FBFBFA', 0.35)); coreBody.position.y = 1.3; coreBody.castShadow = coreBody.receiveShadow = true; core.add(coreBody);
    for (let k = 0; k < 5; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.535, 0.012, 8, 64), glowMat('#9fb4cc', 0.5)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.45 + k * 0.45; core.add(ring); this.coreRings.push(ring); }
    for (let k = 0; k < 6; k++) { const led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), glowMat(SPECS[BOT_IDS[k]!].accent, 1.2)); led.position.set(-0.2 + k * 0.08, 1.9, 0.53); core.add(led); }
    for (const id of BOT_IDS) {   // soft data lines desk -> core on the floor (lit in the apps chapter)
      const d = DESKS[id], a = V(d.x, 0.012, d.z), b = V(CORE.x, 0.012, CORE.z + 0.55), len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, len), glowMat(SPECS[id].accent, 1.0)); m.position.copy(a).add(b).multiplyScalar(0.5);
      m.lookAt(b.x, 0.012, b.z); (m.material as THREE.MeshBasicMaterial).transparent = true; m.visible = false; s.add(m); this.beams.push(m);
    }
    // SHIPPED tray (front right)
    const tray = new THREE.Group(); tray.position.copy(TRAY); tray.rotation.y = -0.55; s.add(tray);
    const tmat = shellMat('#D9DEE5', 0.55);
    for (const [w, h, dd, x, y, z] of [[0.9, 0.06, 0.6, 0, 0.03, 0], [0.9, 0.26, 0.05, 0, 0.16, -0.28], [0.9, 0.26, 0.05, 0, 0.16, 0.28], [0.05, 0.26, 0.6, -0.43, 0.16, 0], [0.05, 0.26, 0.6, 0.43, 0.16, 0]] as const)
      this.box(tray, w, h, dd, tmat, x, y, z, 0.015);
    const lab = new CanvasPlane(0.8, 0.13, 512, 84, 1.0); lab.mesh.position.set(0, 0.17, 0.31); tray.add(lab.mesh);
    lab.draw((c2, W, Hh) => { fillRR(c2, 0, 0, W, Hh, 10, '#121821'); c2.font = ax(56, 125, 900); c2.fillStyle = '#B7F04A'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('SHIPPED', W / 2, Hh / 2 + 2); });
    this.trayGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), glowMat(GB.lime, 0)); this.trayGlow.rotation.x = -Math.PI / 2; this.trayGlow.position.set(0, 0.065, 0); tray.add(this.trayGlow);
    for (let k = 0; k < 3; k++) { const pkt = this.box(tray, 0.3, 0.05, 0.22, shellMat('#F2B14A', 0.4), -0.2 + k * 0.2, 0.09 + k * 0.05, 0, 0.012); pkt.visible = false; this.shipped.push(pkt); }
    // floor halos: a soft disc of the bot's colour under whoever is acting (guides the eye)
    for (const id of BOT_IDS) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ color: SPECS[id].accent, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.004; s.add(m); this.halos[id] = m;
    }
  }

  private buildProps() {
    const s = this.scene3;
    // STOP SCROLL button on HELM's console
    this.button = new THREE.Group(); this.button.position.copy(BUTTON); s.add(this.button);
    this.box(this.button, 0.28, 0.045, 0.28, shellMat('#2A2F37', 0.4), 0, 0, 0, 0.02);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.115, 0.03, 48), shellMat('#5B1612', 0.4)); base.position.y = 0.035; this.button.add(base);
    this.buttonCap = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.093, 0.05, 48), new THREE.MeshPhysicalMaterial({ color: '#ff2a1f', emissive: '#ff1a0f', emissiveIntensity: 0.5, roughness: 0.3, clearcoat: 1 }));
    this.buttonCap.position.y = 0.07; this.buttonCap.castShadow = true; this.button.add(this.buttonCap);
    const plate = new CanvasPlane(0.24, 0.065, 400, 108, 1.0); plate.mesh.rotation.x = -Math.PI / 2; plate.mesh.position.set(0, 0.025, 0.11); this.button.add(plate.mesh);
    plate.draw((c, W, Hh) => { c.font = ax(64, 125, 900); c.fillStyle = '#E2261C'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP SCROLL', W / 2, Hh / 2 + 3); });
    this.chat = new CanvasPlane(0.95, 0.62, 880, 576, 1.0, true); s.add(this.chat.mesh);
    this.mission = new CanvasPlane(0.5, 0.3, 500, 300, 1.0); s.add(this.mission.mesh);
    const tasks: [string, string, string][] = [['RESEARCH', 'Find launch facts', SPECS.scout.accent], ['CONTEXT', 'Pull brand notes', SPECS.archive.accent], ['CONTENT', 'Draft post + boards', SPECS.forge.accent]];
    for (const [a, b, col] of tasks) { const cp = new CanvasPlane(0.3, 0.19, 360, 228, 1.0); cp.draw((c, W, Hh) => this.cardFace(c, W, Hh, a, b, col)); s.add(cp.mesh); this.cards.push(cp); }
    this.citation = new CanvasPlane(0.26, 0.17, 312, 204, 1.0); this.citation.draw((c, W, Hh) => this.cardFace(c, W, Hh, '3 SOURCES', 'cited · checked', SPECS.scout.accent)); s.add(this.citation.mesh);
    this.notes = new CanvasPlane(0.26, 0.17, 312, 204, 1.0); this.notes.draw((c, W, Hh) => this.cardFace(c, W, Hh, 'BRAND NOTES', 'tone · audience', SPECS.archive.accent)); s.add(this.notes.mesh);
    // task capsule: a bright card-capsule (no neon light)
    this.capsule = new THREE.Group(); s.add(this.capsule);
    const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.14, 8, 20), new THREE.MeshPhysicalMaterial({ color: '#ffffff', emissive: '#7fd8f0', emissiveIntensity: 0.6, roughness: 0.2, clearcoat: 1 }));
    cap.rotation.z = Math.PI / 2; cap.castShadow = true; this.capsule.add(cap);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 24), shellMat(SPECS.helm.accent, 0.4)); band.rotation.y = Math.PI / 2; this.capsule.add(band);
    this.wallR = new CanvasPlane(1.2, 0.74, 832, 512, 1.0); this.wallR.mesh.position.set(-2.1, 1.2, -3.0); this.wallR.mesh.rotation.y = 0.5; s.add(this.wallR.mesh);
    const appNames = ['MAIL', 'SHEET', 'BROWSER', 'EDITOR'];
    appNames.forEach((n, k) => { const ap = new CanvasPlane(0.95, 0.6, 704, 448, 1.0); ap.mesh.position.set(k % 2 ? 0.52 : -0.52, k < 2 ? 2.2 : 1.5, -2.35); s.add(ap.mesh); this.apps.push(ap); ap.mesh.userData.app = n; });
    this.routineScr = new CanvasPlane(0.92, 0.58, 1040, 656, 1.0); s.add(this.routineScr.mesh);
    this.routineCard = new CanvasPlane(0.28, 0.17, 336, 204, 1.0); this.routineCard.draw((c, W, Hh) => this.cardFace(c, W, Hh, 'ROUTINE SAVED', 'weekly report · 3 steps', SPECS.archive.accent)); s.add(this.routineCard.mesh);
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshPhysicalMaterial({ color: '#d8e4ff', emissive: '#6f8fff', emissiveIntensity: 0.6, roughness: 0.1, clearcoat: 1 }));
    s.add(this.crystal);
    this.phone = new THREE.Group(); s.add(this.phone);
    this.box(this.phone, 0.92, 1.86, 0.08, shellMat('#1E232B', 0.35), 0, 0.93, 0, 0.1);
    this.phoneScr = new CanvasPlane(0.84, 1.76, 540, 1132, 1.0, false); this.phoneScr.mesh.position.set(0, 0.93, 0.042); this.phone.add(this.phoneScr.mesh);
    this.chair = new THREE.Group(); s.add(this.chair);
    this.box(this.chair, 0.38, 0.05, 0.36, shellMat('#FFFFFF', 0.5), 0, 0.3, 0, 0.02);
    this.box(this.chair, 0.38, 0.32, 0.05, shellMat(SPECS.forge.accent, 0.45), 0, 0.5, -0.18, 0.02);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 12), shellMat('#C9CED6', 0.4)); stem.position.y = 0.15; this.chair.add(stem);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const w = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), shellMat('#2A2F37', 0.4)); w.position.set(Math.cos(a) * 0.18, 0.03, Math.sin(a) * 0.18); this.chair.add(w); }
  }

  private cardFace(c: CanvasRenderingContext2D, W: number, H: number, title: string, sub: string, col: string) {
    fillRR(c, 4, 4, W - 8, H - 8, 22, '#FFFFFF'); c.strokeStyle = col; c.lineWidth = 7; c.beginPath(); c.roundRect(4, 4, W - 8, H - 8, 22); c.stroke();
    fillRR(c, 26, 28, 22, 22, 5, col);
    c.textBaseline = 'alphabetic'; c.fillStyle = INK; c.font = ax(Math.round(H * 0.2), 112, 900); c.fillText(title, 26, H * 0.56);
    c.fillStyle = col; c.font = mono(Math.round(H * 0.11), 700); c.fillText(sub, 26, H * 0.8);
  }

  // ------------------------------------------------------------------------------------------------ screens (legible, light UI)
  private drawScreen(id: BotId, t: number) {
    const acc = SPECS[id].accent, ch = this.chapterAt(t);
    this.screens[id].draw((c, W, H) => {
      c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H); c.fillStyle = alpha(acc, 0.16); c.fillRect(0, 0, W, 54);
      c.fillStyle = acc; c.font = mono(24, 700); c.textBaseline = 'middle'; c.fillText(SPECS[id].name + ' · ' + SPECS[id].role, 24, 28);
      c.textBaseline = 'alphabetic';
      const line = (s: string, y: number, col = INK, f = mono(26, 600)) => { c.font = f; c.fillStyle = col; c.fillText(s, 26, y); };
      const bar = (y: number, w: number, col = '#E3E8EF') => fillRR(c, 26, y, w, 14, 7, col);
      const blink = Math.floor(t * 4) % 2 === 0;
      if (id === 'helm') {
        line('MISSION BOARD', 96, INK, ax(30, 112, 900));
        const rows: [string, BotId][] = [['research', 'scout'], ['context', 'archive'], ['content', 'forge'], ['review', 'sentinel'], ['ship', 'relay']];
        rows.forEach(([r, b], k) => { fillRR(c, 26, 120 + k * 52, 14, 14, 3, SPECS[b].accent); line(`   ${r.padEnd(9)} → ${SPECS[b].name}`, 134 + k * 52, INK, mono(25, 600)); });
      } else if (id === 'scout') {
        line('search: product launch', 100, acc, mono(26, 700));
        ['launch date + pricing', 'competitor posts', 'audience questions', 'top 3 sources ✓'].forEach((r, k) => line(`• ${r}`, 150 + k * 48));
        bar(350, 200 + 300 * ((t * 0.37) % 1), alpha(acc, 0.6));
      } else if (id === 'archive') {
        line('CONTEXT · brand notes', 100, acc, mono(26, 700));
        ['voice: bold, friendly', 'audience: creators', 'past launch: +38% saves*', 'do not: hype claims'].forEach((r, k) => line(`› ${r}`, 150 + k * 48));
        line('*sample data', 360, MUTED, mono(18, 600));
      } else if (id === 'forge') {
        const st = ch === 'mission' ? (t >= this.evs('artifact.steps')[2]! ? 3 : t >= this.evs('artifact.steps')[1]! ? 2 : t >= this.evs('artifact.steps')[0]! ? 1 : 0) : 3;
        line('DRAFT · launch post', 96, acc, mono(25, 700));
        if (st === 0) { bar(130, 420); bar(160, 360); bar(190, 400); line('typing' + (blink ? '_' : ''), 260, MUTED); }
        else {
          line(st >= 2 ? 'Meet the crew that ships.' : 'meet the crew that ships', 146, INK, st >= 2 ? ax(34, 100, 900) : mono(26, 600));
          line(st >= 3 ? 'Research → Draft → Review → Ship' : 'research, draft, review', 196, st >= 3 ? acc : INK, mono(24, 700));
          const cols = [SPECS.scout.accent, SPECS.archive.accent, SPECS.forge.accent, SPECS.sentinel.accent];
          for (let k = 0; k < 4; k++) fillRR(c, 26 + k * 148, 228, 132, 96, 12, st >= 3 ? cols[k]! : '#E3E8EF');
          if (st >= 3) ['RESEARCH', 'DRAFT', 'REVIEW', 'SHIP'].forEach((s, k) => { c.font = mono(18, 700); c.fillStyle = '#FFFFFF'; c.fillText(s, 34 + k * 148, 314); });
          line(st >= 3 ? 'storyboard · 4 frames ✓' : 'storyboard…', 368, st >= 3 ? acc : MUTED, mono(22, 700));
        }
      } else if (id === 'sentinel') {
        line('REVIEW · claims check', 100, acc, mono(26, 700));
        const ok = t >= this.ev('pay.badge') || (t >= this.ev('appr.approve') && t < 48);
        ([['source cited', true], ['numbers match', true], ['no hype claims', true], ['publish: needs approval', ok]] as [string, boolean][]).forEach(([r, v], k) =>
          line(`${v ? '✓' : '!'} ${r}`, 150 + k * 50, v ? '#1A9E5C' : '#D9640F', mono(26, 700)));
      } else {
        line('DELIVERY QUEUE', 100, acc, mono(26, 700));
        ['launch post', 'storyboard', 'sources sheet'].forEach((r, k) => line(`${t > this.ev('pay.shipped') ? '✓' : '○'} ${r}`, 150 + k * 50));
        bar(320, t > this.ev('pay.shipped') ? 560 : 120 + 200 * sat((t - 48) / 4), alpha(acc, 0.6));
      }
      c.strokeStyle = '#D5DAE1'; c.lineWidth = 4; c.strokeRect(2, 2, W - 4, H - 4);
    });
  }

  private chapterAt(t: number): string { for (const [a, b, n] of this.cues.chapters) if (t >= a && t < b) return n; return 'hero'; }

  // ------------------------------------------------------------------------------------------------ blocking helpers
  private atDesk(id: BotId, t: number, seed: number): Pose {
    const p = restPose(), d = deskSpot(id); p.x = d.x; p.z = d.z; p.rotY = d.rot; idle(p, t, seed); return p;
  }
  /** Walk/run between two ground points over [t0, t1] (eased), with a gait cycle tied to distance travelled. */
  private travel(p: Pose, id: BotId, from: { x: number; z: number }, to: { x: number; z: number }, t0: number, t1: number, t: number, run = 0) {
    const k = ease(span(t, t0, t1)), dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz);
    p.x = lerp(from.x, to.x, k); p.z = lerp(from.z, to.z, k);
    if (t > t0 && t < t1 && dist > 0.01) {
      p.rotY = Math.atan2(dx, dz);
      const stride = SPECS[id].stride * (1 + run * 0.6), ph = (k * dist) / stride;
      const w = Math.min(span(t, t0, t0 + 0.12), 1 - span(t, t1 - 0.12, t1));
      const moving = walk(restPose(), ph, run, SPECS[id]);
      const blended = mixPose(p, { ...moving, x: p.x, z: p.z, rotY: p.rotY, y: p.y + moving.y, ex: p.ex, eyeColor: p.eyeColor }, w);
      Object.assign(p, blended);
    }
    return p;
  }
  private faceTo(p: Pose, x: number, z: number, k = 1) { const a = Math.atan2(x - p.x, z - p.z); let d = a - p.rotY; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; p.rotY += d * k; return p; }
  private lookCam(p: Pose, k = 1) {
    const a = Math.atan2(this.cam.position.x - p.x, this.cam.position.z - p.z); let d = a - p.rotY;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    p.headYaw = lerp(p.headYaw, Math.max(-1.1, Math.min(1.1, d)), k); p.headPitch = lerp(p.headPitch, -0.12, k); return p;
  }
  private drop(p: Pose, t: number, tLand: number) {   // fall from above, land with squash and a spring settle
    if (t < tLand - 0.35) { p.y = 9; return p; }
    if (t < tLand) { const k = (t - (tLand - 0.35)) / 0.35; p.y = 3.2 * (1 - k * k); p.ex.squash = -0.08; p.armL = [0.2, 1.2, 0.3]; p.armR = [0.2, 1.2, 0.3]; return p; }
    const s = Math.exp(-(t - tLand) / 0.09) * Math.cos((t - tLand) * 26); p.ex.squash = 0.22 * s; p.legL[1] += 0.6 * Math.max(0, s); p.legR[1] += 0.6 * Math.max(0, s); return p;
  }
  private point(p: Pose, k: number) { p.armR = [lerp(p.armR[0], 1.55, k), lerp(p.armR[1], 0.25, k), lerp(p.armR[2], 0.05, k)]; return p; }
  private carry(p: Pose, k = 1) { p.armL = [lerp(p.armL[0], 1.0, k), lerp(p.armL[1], 0.05, k), lerp(p.armL[2], 0.9, k)]; p.armR = [lerp(p.armR[0], 1.0, k), lerp(p.armR[1], 0.05, k), lerp(p.armR[2], 0.9, k)]; return p; }
  private cheer(p: Pose, t: number, seed: number) {
    const b = Math.sin((t / BEAT) * Math.PI + seed), up = 0.5 + 0.5 * b;
    p.armL = [2.6 * up + 0.2, 0.4, 0.3]; p.armR = [2.6 * (1 - up) + 0.2, 0.4, 0.3]; p.y += 0.05 * Math.abs(b); p.side = 0.12 * b; p.headRoll = 0.15 * b; return p;
  }
  private seated(p: Pose) { p.legL = [1.45, 1.5]; p.legR = [1.45, 1.5]; p.lean -= 0.05; return p; }
  private handPos(id: BotId, side: 'L' | 'R' = 'R') { const v = new THREE.Vector3(); (side === 'R' ? this.bots[id].handR : this.bots[id].handL).getWorldPosition(v); return v; }
  private headPos(id: BotId) { const v = new THREE.Vector3(); this.bots[id].head.getWorldPosition(v); return v; }
  /** Hand world position for a pose that was just computed (applies the pose to read it). */
  private prevHand(id: BotId, p: Pose) { applyPose(this.bots[id], p); this.bots[id].root.updateMatrixWorld(true); return this.handPos(id, 'R'); }
  private lookAt3(p: Pose, v: THREE.Vector3) { const a = Math.atan2(v.x - p.x, v.z - p.z); let d = a - p.rotY; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; p.headYaw = Math.max(-1.1, Math.min(1.1, d)); return p; }

  // ------------------------------------------------------------------------------------------------ chapters
  /** Sets every bot pose and every prop for time t. */
  private direct(t: number) {
    const ch = this.chapterAt(t);
    const P = {} as Record<BotId, Pose>;
    BOT_IDS.forEach((id, i) => { P[id] = this.atDesk(id, t, i * 1.7); if (ch !== 'hook' && ch !== 'routine' && id !== 'helm') typing(P[id], t, i); });
    const hideAll = [this.chat.mesh, this.mission.mesh, ...this.cards.map(c => c.mesh), this.citation.mesh, this.notes.mesh, this.capsule, this.routineScr.mesh,
      this.routineCard.mesh, this.crystal, this.phone, this.chair];
    for (const o of hideAll) o.visible = false;
    for (const a of this.apps) a.mesh.visible = false;
    for (const b of this.beams) b.visible = false;
    for (const m of this.shipped) m.visible = false;
    (this.trayGlow.material as THREE.MeshBasicMaterial).color.setScalar(0);
    this.wallR.mesh.visible = false; this.flash.intensity = 0; this.tags = []; this.status = null; this.sign.mesh.visible = ch !== 'hero' && ch !== 'apps';
    this.button.visible = ch === 'hook' || ch === 'notchat' || (ch === 'hero' && t > 57.2);
    this.buttonCap.position.y = 0.07 - 0.03 * Math.max(0, 1 - Math.abs(t) / 0.12) - 0.03 * Math.max(0, 1 - Math.abs(t - 58) / 0.12);
    const e = (n: string) => this.ev(n), es = (n: string) => this.evs(n);

    if (ch === 'hook') {
      const drops = es('hook.drop'), order: BotId[] = ['scout', 'archive', 'forge', 'sentinel', 'relay'];
      order.forEach((id, k) => this.drop(P[id], t, drops[k]!));
      // HELM smashes the button at 0, then the whole team lands on the last drop
      const h = P.helm; h.armR = [lerp(1.15, 0.6, span(t, 0.1, 0.45)), 0.1, lerp(0.35, 0.8, span(t, 0.1, 0.45))]; h.lean = 0.22 - 0.2 * span(t, 0.1, 0.5);
      const last = drops[5]!;
      if (t > last) { const k = span(t, last, last + 0.25) * (1 - span(t, 1.85, 2)); for (const id of BOT_IDS) { P[id].armL[0] += 2.2 * k; P[id].armR[0] += 2.2 * k; P[id].ex.squash = (P[id].ex.squash ?? 0) + 0.12 * hit(t, last, 0.1); } }
      this.flash.position.copy(BUTTON).add(V(0, 0.25, 0.2)); this.flash.intensity = 4 * hit(t, 0, 0.12); this.flash.color.set('#ff5a3c');
    }
    if (ch === 'notchat') {
      const h = P.helm, d = deskSpot('helm'), side = { x: 0.78, z: 1.95 };
      this.travel(h, 'helm', d, side, e('chat.in'), e('chat.title') + 0.2, t);
      if (t > e('chat.title') + 0.2) this.faceTo(h, -0.2, 1.95, 1);
      const push = sat(springAt(t, e('helm.shove') - 0.15, 0.3, 0.7));
      h.armL = [lerp(h.armL[0], 1.5, push), 0.05, lerp(h.armL[2], 0.1, push)]; h.armR = [lerp(h.armR[0], 1.5, push), 0.05, lerp(h.armR[2], 0.1, push)]; h.lean += 0.25 * push;
      h.ex.squash = 0.1 * hit(t, e('helm.shove') - 0.3, 0.12);
      const out = outCubic(span(t, e('helm.shove'), e('helm.shove') + 0.45));
      this.chat.mesh.visible = out < 1; this.chat.mesh.position.set(-0.05 - 3.2 * out, 1.08 + 0.3 * out, 1.95); this.chat.mesh.rotation.set(0, 0.6 * out, 0.5 * out);
      this.chat.draw((c, W, H) => this.chatFace(c, W, H, t));
      if (t <= e('room.reveal')) BOT_IDS.forEach((id) => { if (id !== 'helm') { P[id] = this.atDesk(id, t, 1); P[id].eye = 0.25; P[id].headPitch = 0.35; } });
    }
    if (ch === 'team') {
      const tags = es('team.tags');
      BOT_IDS.forEach((id, k) => { this.tags.push({ id, k: sat(springAt(t, tags[k]!, 0.4, 0.6)) }); });
      this.point(P.helm, sat(springAt(t, tags[0]!, 0.35, 0.6))); P.helm.headYaw = -0.3;
      P.scout = this.atDesk('scout', t, 2); const sc = span(t, tags[1]!, tags[1]! + 2); P.scout.headYaw = 0.7 * Math.sin(sc * Math.PI * 2); P.scout.eye = 1 + 1.5 * sat(sc * 4);
      P.archive.ex.panels = sat(springAt(t, tags[2]!, 0.4, 0.5));
      typing(P.forge, t, 3);
      P.sentinel = this.atDesk('sentinel', t, 4); const mg = sat(springAt(t, tags[4]!, 0.4, 0.6)); P.sentinel.armR = [lerp(0.6, 1.25, mg), lerp(0.1, -0.2, mg), lerp(0.4, 1.9, mg)];
      P.relay = this.atDesk('relay', t, 5); const rl = sat(springAt(t, tags[5]!, 0.4, 0.6)); this.faceTo(P.relay, TRAY.x, TRAY.z, rl); P.relay.armR = [lerp(0.1, 1.3, rl), 0.4, lerp(0.3, 1.9, rl)];
    }
    if (ch === 'mission') {
      const drop = e('mission.drop'), split = e('mission.split');
      const h = P.helm; this.carry(h, sat(springAt(t, drop - 0.2, 0.3, 0.7)) * (1 - span(t, split + 0.1, split + 0.4))); h.lean = 0.1;
      this.point(h, span(t, split, split + 0.2) * (1 - span(t, split + 1, split + 1.4)));
      const hp = deskSpot('helm'), cardTarget = V(hp.x, 1.02, hp.z + 0.3);
      if (t < split) {
        const k = outCubic(span(t, drop - 0.5, drop)); this.mission.mesh.visible = true;
        this.mission.mesh.position.lerpVectors(V(0, 0.7, 4.2), cardTarget, k); this.mission.mesh.rotation.set(-0.3 * (1 - k), 0, 0.2 * (1 - k));
        this.mission.draw((c, W, H) => this.cardFace(c, W, H, 'MAKE MY LAUNCH REEL', 'mission from you', GB.bone));
      }
      const targets: BotId[] = ['scout', 'archive', 'forge'];
      targets.forEach((id, k) => {
        const cp = this.cards[k]!; if (t < split || t > split + 1.6) return; cp.mesh.visible = true;
        const d = deskSpot(id), end = V(d.x, 1.3, d.z + 0.25), u = outCubic(span(t, split, split + 0.7 + k * 0.1));
        const pos = new THREE.Vector3().lerpVectors(cardTarget, end, u); pos.y += Math.sin(u * Math.PI) * 0.6; cp.mesh.position.copy(pos);
        cp.mesh.rotation.set(0, 0, 0.4 * Math.sin(u * Math.PI)); cp.mesh.scale.setScalar(1 - 0.35 * span(t, split + 1.2, split + 1.6));
      });
      // SCOUT: runs to the research wall, scans, brings citations to FORGE
      const sp = deskSpot('scout'), wall = { x: -2.0, z: -2.35 }, fg = deskSpot('forge'), fgSide = { x: fg.x + 0.62, z: fg.z + 0.3 }, fc = e('forge.content');
      const r0 = e('scout.research'), sc = P.scout = this.atDesk('scout', t, 2);
      this.travel(sc, 'scout', sp, wall, r0, r0 + 0.75, t, 1);
      if (t >= r0 + 0.75 && t < r0 + 1.6) { this.faceTo(sc, -2.15, -3.0); sc.headYaw = 0.4 * Math.sin((t - r0) * 7); sc.eye = 2.5; }
      this.wallR.mesh.visible = t >= r0 + 0.4 && t < fc + 0.5;
      this.wallR.draw((c, W, H) => this.researchWall(c, W, H, t - r0));
      if (t >= r0 + 1.6) { this.travel(sc, 'scout', wall, fgSide, r0 + 1.6, fc, t, 1); this.carry(sc, 1 - span(t, fc, fc + 0.25)); }
      if (t >= fc) this.faceTo(sc, fg.x, fg.z, 1);
      if (t >= r0 + 1.6 && t < fc + 0.25) { this.citation.mesh.visible = true; this.citation.mesh.position.copy(this.prevHand('scout', sc)).add(V(0, 0.12, 0.1)); }
      // ARCHIVE: opens panels, pulls brand notes, tosses them to FORGE
      const a0 = e('archive.context'), ar = P.archive; ar.ex.panels = sat(springAt(t, a0, 0.4, 0.5)) * (1 - span(t, a0 + 2.2, a0 + 2.6)); ar.headYaw = 0.5 * span(t, a0, a0 + 0.4);
      if (t >= a0 + 0.3 && t < fc + 0.2) {
        this.notes.mesh.visible = true; const ad = deskSpot('archive');
        const u = outCubic(span(t, a0 + 0.6, fc - 0.1)); const pos = new THREE.Vector3().lerpVectors(V(ad.x + 0.25, 1.15, ad.z + 0.2), V(fg.x - 0.2, 1.1, fg.z + 0.3), u); pos.y += Math.sin(u * Math.PI) * 0.4;
        this.notes.mesh.position.copy(pos);
      }
      // FORGE: catches both and builds the post in three steps
      P.forge.armR[0] += 0.5 * hit(t, fc, 0.3); P.forge.headYaw = -0.2 * hit(t, fc, 0.6);
      for (const [k, st] of es('artifact.steps').entries()) P.forge.ex.squash = (P.forge.ex.squash ?? 0) + 0.05 * hit(t, st, 0.1) * (k + 1) / 3;
    }
    if (ch === 'choreo') {
      const s0 = e('choreo.sprint'), toss = e('choreo.toss'), miss = e('choreo.nearmiss'), catchT = e('choreo.catch'), chairT = e('choreo.chair');
      // anticipation on "now watch my version"
      BOT_IDS.forEach((id) => { const a = span(t, 18.0, 18.5) * (1 - span(t, 19.2, 19.5)); P[id].legL[1] += 0.5 * a; P[id].legR[1] += 0.5 * a; P[id].ex.squash = 0.06 * a; P[id].headPitch -= 0.2 * a; });
      const from = { x: -2.6, z: 0.9 }, to = { x: -0.45, z: -0.55 }, sc = P.scout = restPose();
      if (t < s0) { sc.x = from.x; sc.z = from.z; this.faceTo(sc, to.x, to.z); this.carry(sc); idle(sc, t, 2); sc.legL[1] += 0.4 * span(t, s0 - 0.4, s0); sc.legR[1] += 0.4 * span(t, s0 - 0.4, s0); sc.lean += 0.3 * span(t, s0 - 0.4, s0); }
      else { this.travel(sc, 'scout', from, to, s0, toss - 0.05, t, 1); this.carry(sc, 1 - span(t, toss - 0.1, toss + 0.1)); }
      if (t >= toss) { sc.armR = [lerp(1.0, 2.2, span(t, toss - 0.1, toss + 0.1)), 0.1, 0.2]; this.faceTo(sc, 0, -1.2); }
      const ar = P.archive, ad = deskSpot('archive'); this.faceTo(ar, to.x, to.z, span(t, s0, s0 + 0.5));
      const reach = span(t, toss, miss); ar.armL = [lerp(ar.armL[0], 1.3, reach), 0.2, 0.4]; ar.armR = [lerp(ar.armR[0], 1.3, reach), 0.2, 0.4];
      const wob = hit(t, miss, 0.25) * Math.sin((t - miss) * 30); ar.side = 0.25 * wob; ar.headRoll = 0.3 * wob; ar.x = ad.x + 0.06 * wob; if (t > miss && t < miss + 0.15) ar.blink = 1;
      // capsule: SCOUT's hands -> arc -> bounces off ARCHIVE's hands -> up -> caught -> handed to FORGE
      this.capsule.visible = true;
      const handA = V(ad.x, 0.95, ad.z + 0.35), fg = deskSpot('forge');
      if (t < toss) this.capsule.position.copy(this.prevHand('scout', sc)).add(V(0, 0.08, 0.1));
      else if (t < miss) { const u = span(t, toss, miss); this.capsule.position.lerpVectors(this.prevHand('scout', sc), handA, u); this.capsule.position.y += 0.5 * Math.sin(u * Math.PI); }
      else if (t < catchT) { const u = span(t, miss, catchT); this.capsule.position.set(handA.x + 0.25 * u, handA.y + 0.7 * Math.sin(u * Math.PI) + 0.05, handA.z + 0.1 * u); }
      else if (t < chairT + 0.25) this.capsule.position.copy(handA).add(V(0.25, 0.05, 0.1));
      else { const u = outCubic(span(t, chairT + 0.25, chairT + 0.6)); this.capsule.position.lerpVectors(handA.clone().add(V(0.25, 0.05, 0.1)), V(fg.x - 0.15, 0.92, fg.z + 0.35), u); }
      this.capsule.rotation.set(0, 0, t * 9);
      if (t > catchT && t < chairT + 0.3) this.carry(ar, 1);
      // FORGE rolls in on a chair from the right and starts working
      const fo = P.forge = restPose(), roll = outCubic(span(t, chairT - 0.6, chairT + 0.25));
      fo.x = lerp(2.7, fg.x, roll); fo.z = lerp(fg.z + 0.2, fg.z + 0.05, roll); fo.rotY = fg.rot + 2.2 * (1 - roll) + 0.15 * Math.sin(roll * Math.PI * 2);
      idle(fo, t, 3); this.seated(fo); fo.y = 0.07; this.chair.visible = true; this.chair.position.set(fo.x, 0, fo.z); this.chair.rotation.y = fo.rotY;
      if (t > chairT + 0.3) typing(fo, t, 3);
      const stT = es('choreo.status');
      if (t >= stT[0]!) { const k = t >= stT[2]! ? 2 : t >= stT[1]! ? 1 : 0; this.status = { k: sat(springAt(t, stT[k]!, 0.3, 0.55)), label: ['TASKED', 'WORKING', 'REVIEW'][k]!, color: [GB.amber, GB.cyan, GB.coral][k]!, at: this.headPos('forge').add(V(0, 0.42, 0)) }; }
      if (t > s0 + 0.2 && t < toss + 0.6) for (const id of ['helm', 'sentinel', 'relay'] as BotId[]) this.lookAt3(P[id], this.capsule.position);
    }
    if (ch === 'parallel') P.helm.headYaw = 0.5 * Math.sin(t * 1.3);
    if (ch === 'routine') {
      const ad = ROUTINE_SPOT, h0 = e('routine.hand'), sv = e('routine.save'), rp = es('routine.replay');
      const ar = P.archive = restPose(); idle(ar, t, 2);
      const scrP = V(ad.x, 1.22, ad.z); this.routineScr.mesh.visible = true; this.routineScr.mesh.position.copy(scrP); this.routineScr.mesh.rotation.set(-0.08, 0.1, 0);
      this.routineScr.draw((c, W, H) => this.routineFace(c, W, H, t));
      ar.x = ad.x + 0.42; ar.z = ad.z + 0.35; this.faceTo(ar, ad.x, ad.z + 2.5); ar.rotY -= 0.35; ar.headYaw = -0.55 + 0.12 * Math.sin((t - h0) * 2.4); ar.headPitch = -0.38;
      const save = sat(springAt(t, sv, 0.35, 0.55));
      if (t >= sv) { this.routineCard.mesh.visible = t < rp[0]!; this.routineCard.mesh.position.lerpVectors(scrP.clone().add(V(0, -0.2, 0.08)), this.prevHand('archive', ar).add(V(0, 0.1, 0.12)), save); ar.ex.panels = sat(springAt(t, sv + 0.3, 0.35, 0.6)) * (1 - span(t, sv + 1.0, sv + 1.3)); }
      if (t >= sv + 0.4) { this.crystal.visible = true; const u = outCubic(span(t, sv + 0.4, sv + 1.0)); this.crystal.position.lerpVectors(scrP.clone().add(V(0.3, -0.2, 0.1)), this.headPos('archive').add(V(0.2, -0.25, 0)), u); this.crystal.rotation.y = t * 3; this.crystal.scale.setScalar(1 - 0.5 * span(t, sv + 0.9, sv + 1.1)); }
      if (t >= rp[0]!) { const loop = (t - rp[0]!) % 1; ar.armR = [lerp(0.4, 1.4, ease(sat(loop * 3))), 0.2, 0.6]; ar.headYaw = -0.55; ar.eye = 1.3; }
      P.helm.headYaw = -0.3; P.scout = this.atDesk('scout', t, 2); P.scout.headYaw = 0.6; P.forge = this.atDesk('forge', t, 3); P.forge.headYaw = -0.6;
    }
    if (ch === 'apps') {
      const w0 = e('apps.windows'), cross = es('apps.cross'), core = e('apps.core');
      const gone = outCubic(span(t, core + 0.2, core + 0.8));
      this.apps.forEach((ap, k) => { ap.mesh.visible = gone < 1; const u = sat(springAt(t, w0 + k * 0.12, 0.4, 0.6)) * (1 - gone); ap.mesh.scale.set(u + 0.001, u + 0.001, 1); ap.draw((c, W, H) => this.appFace(c, W, H, ap.mesh.userData.app as string, t, k)); });
      const goers: [BotId, number][] = [['scout', 2], ['forge', 3], ['relay', 0], ['archive', 1]];
      goers.forEach(([id, k], j) => {
        const d = deskSpot(id), ap = this.apps[k]!.mesh.position, to = { x: ap.x * 1.15 + (j % 2 ? 0.12 : -0.12), z: -2.0 }, tt = cross[Math.min(j, 2)]!;
        const p = P[id] = this.atDesk(id, t, j); this.travel(p, id, d, to, tt, tt + 0.9, t, 0.4);
        if (t > tt + 0.9) { this.faceTo(p, ap.x, ap.z); this.point(p, sat(springAt(t, tt + 0.9, 0.35, 0.6))); p.headPitch = -0.35; }
        else this.carry(p, span(t, tt, tt + 0.1));
      });
      const lit = span(t, core, core + 0.6);
      this.beams.forEach((b, k) => { b.visible = lit > 0; (b.material as THREE.MeshBasicMaterial).opacity = lit * (0.55 + 0.45 * Math.sin(t * 6 + k)); });
      this.coreRings.forEach((r, k) => { r.scale.setScalar(1 + 0.08 * lit * Math.sin(t * 5 + k)); });
    }
    if (ch === 'approval') {
      // everyone was mid-motion (FORGE reaching for PUBLISH, RELAY carrying to the tray); the pose holds from the freeze
      const fz = e('appr.freeze'), tf = Math.min(t, fz), look = e('appr.look'), ap = e('appr.approve'), greens = es('appr.green');
      const rl = P.relay = this.atDesk('relay', tf, 5), rd = deskSpot('relay'); this.travel(rl, 'relay', rd, { x: 1.45, z: 1.05 }, 42.0, 43.4, tf, 0.2); this.carry(rl, 1);
      this.capsule.visible = true; this.capsule.position.copy(this.prevHand('relay', rl)).add(V(0, 0.08, 0.1));
      P.forge = this.atDesk('forge', tf, 3); this.point(P.forge, span(tf, 42.0, 42.4)); P.scout = typing(this.atDesk('scout', tf, 1), tf, 1); P.archive = typing(this.atDesk('archive', tf, 2), tf, 2);
      const se = P.sentinel = this.atDesk('sentinel', tf, 4); se.armR = [1.25, -0.2, 1.9]; this.faceTo(se, 1.2, -1.0, span(t, 42.25, 42.6));
      se.eyeColor = t < ap ? GB.orange : GB.green; se.eye = 1 + 1.5 * (t < ap ? 0.5 + 0.5 * Math.sin(t * 12) : 0);
      P.helm = this.atDesk('helm', tf, 0);
      BOT_IDS.forEach((id, i) => {
        const p = P[id]; if (t > fz) p.blink = t < look ? 0 : blinkAt(t, i);
        if (t > look) this.lookCam(p, sat(springAt(t, look + i * 0.08, 0.35, 0.6)));
        const g = greens[i]!; if (t >= g) { p.eyeColor = GB.green; p.eye = 1 + 1.2 * hit(t, g, 0.25); }
      });
    }
    if (ch === 'payoff') {
      const tiles = e('pay.tiles'), badge = e('pay.badge'), run = e('pay.run'), shipT = e('pay.shipped'), dance = e('pay.dance');
      P.forge.ex.squash = 0.08 * hit(t, tiles, 0.15);
      const se = P.sentinel = this.atDesk('sentinel', t, 4), sd = deskSpot('sentinel'); this.travel(se, 'sentinel', sd, { x: 0.55, z: -0.85 }, tiles, badge - 0.3, t, 0.3);
      if (t > badge - 0.3) { this.faceTo(se, 1.25, -1.3); se.armR = [lerp(1.2, 2.0, sat(springAt(t, badge - 0.2, 0.25, 0.5))), -0.1, lerp(1.6, 0.4, sat(springAt(t, badge, 0.25, 0.5)))]; se.eyeColor = GB.green; }
      const rl = P.relay = this.atDesk('relay', t, 5), fg = deskSpot('forge'), pick = { x: fg.x - 0.5, z: fg.z + 0.55 }, tray = { x: TRAY.x - 0.55, z: TRAY.z - 0.2 };
      this.travel(rl, 'relay', deskSpot('relay'), pick, tiles, run, t, 0.3);
      if (t >= run) { this.travel(rl, 'relay', pick, tray, run, shipT - 0.1, t, 1); this.carry(rl, 1 - span(t, shipT - 0.15, shipT)); }
      if (t >= shipT - 0.15) { this.faceTo(rl, TRAY.x, TRAY.z); rl.armR = [lerp(1.0, 2.4, span(t, shipT - 0.3, shipT - 0.1)) - 1.6 * span(t, shipT - 0.1, shipT), 0.1, 0.2]; rl.ex.squash = 0.2 * hit(t, shipT, 0.12); }
      if (t >= run - 0.2 && t < shipT) { this.capsule.visible = true; const hp = this.prevHand('relay', rl); this.capsule.position.copy(hp).add(V(0, 0.08, 0.12)); if (t > shipT - 0.12) this.capsule.position.lerp(V(TRAY.x, 0.2, TRAY.z), span(t, shipT - 0.12, shipT)); }
      this.shipped.forEach((m, k) => { m.visible = t >= shipT + k * 0.08; });
      (this.trayGlow.material as THREE.MeshBasicMaterial).color.set(GB.lime).multiplyScalar(3 * hit(t, shipT, 0.5));
      this.flash.position.set(TRAY.x, 0.8, TRAY.z); this.flash.color.set(GB.lime); this.flash.intensity = 6 * hit(t, shipT, 0.2);
      if (t >= dance) BOT_IDS.forEach((id, i) => { if (id !== 'relay' || t > shipT + 0.6) this.cheer(P[id], t, i * 0.9); });
      if (t >= e('pay.phone') - 0.1) { this.phone.visible = true; const u = sat(springAt(t, e('pay.phone') - 0.1, 0.45, 0.6)); this.phone.position.set(0.35, -1.9 + 1.9 * u, 1.6); this.phone.rotation.set(0, -0.15, 0); this.phone.scale.setScalar(0.62); this.phoneScr.draw((c, W, H) => this.phoneFace(c, W, H, t, false)); }
    }
    if (ch === 'hero') {
      // all six around the giant phone; then HELM returns to the STOP SCROLL button (the loop back to frame 0)
      this.phone.visible = t < 57.4; this.phone.position.set(0, 0, 0); this.phone.rotation.set(0, 0, 0); this.phone.scale.setScalar(1.15);
      this.phoneScr.draw((c, W, H) => this.phoneFace(c, W, H, t, true));
      const ring: [BotId, number, number][] = [['scout', -0.72, 0.35], ['relay', 0.72, 0.35], ['archive', -0.82, 1.05], ['sentinel', 0.82, 1.05], ['helm', -0.5, 1.75], ['forge', 0.5, 1.75]];
      ring.forEach(([id, x, z], i) => {
        const p = P[id] = restPose(), u = outCubic(span(t, 54.0, 54.5)), d = deskSpot(id); p.x = lerp(d.x, x, u); p.z = lerp(d.z, z, u); idle(p, t, i);
        if (t > 54.5) this.cheer(p, t, i * 1.1);
        if (t > 56.0) { const k = sat(springAt(t, 56.0, 0.3, 0.55)); p.armL[0] = lerp(p.armL[0], 2.7, k); p.armR[0] = lerp(p.armR[0], 2.7, k); p.ex.squash = 0.12 * hit(t, 56.0, 0.12); }
        if (t > 57.0) this.lookCam(p, span(t, 57.0, 57.3));
      });
      if (t > 57.2) { const h = P.helm, hs = deskSpot('helm'), k = ease(span(t, 57.2, 57.7)); h.x = lerp(h.x, hs.x, k); h.z = lerp(h.z, hs.z, k); h.rotY = 0; h.armR = [lerp(h.armR[0], 1.15, ease(span(t, 57.5, 58))), 0.1, 0.35]; h.armL = [0.05, 0.12, 0.25]; h.lean = 0.22 * span(t, 57.5, 58); }
    }
    for (const id of BOT_IDS) applyPose(this.bots[id], P[id]);
    for (const id of BOT_IDS) this.drawScreen(id, t);
    const HALO: Record<string, BotId[]> = { notchat: ['helm'], mission: ['helm', 'scout', 'archive', 'forge'], choreo: ['scout', 'archive', 'forge'],
      routine: ['archive'], apps: ['scout', 'forge', 'relay', 'archive'], approval: ['sentinel'], payoff: ['forge', 'sentinel', 'relay'] };
    const on = new Set<BotId>(HALO[ch] ?? []);
    if (ch === 'team') { const tg = this.evs('team.tags'); BOT_IDS.forEach((id, k) => { if (t >= tg[k]! && t < tg[k]! + 1.2) on.add(id); }); }
    for (const id of BOT_IDS) { const m = this.halos[id], r = this.bots[id].root; m.position.set(r.position.x, 0.004, r.position.z);
      (m.material as THREE.MeshBasicMaterial).opacity = on.has(id) && r.position.y < 1 ? 0.2 + 0.06 * Math.sin(t * 4) : 0; }
  }

  // ------------------------------------------------------------------------------------------------ faces of props
  private chatFace(c: CanvasRenderingContext2D, W: number, H: number, t: number) {
    fillRR(c, 0, 0, W, H, 28, '#dfe3e8'); fillRR(c, 0, 0, W, 70, 28, '#c9ced6');
    c.fillStyle = '#5b6573'; c.font = mono(28, 600); c.textBaseline = 'middle'; c.fillText('chat', 30, 36);
    fillRR(c, 30, 100, 520, 70, 18, '#ffffff'); c.fillStyle = '#3b4552'; c.font = mono(26, 500); c.fillText('write my launch post', 54, 136);
    fillRR(c, W - 600, 200, 570, 120, 18, '#c9ced6'); c.fillStyle = '#3b4552';
    const reply = 'Sure! Here is a draft for your launch post...'; const n = Math.floor(sat((t - 2.2) / 1.2) * reply.length);
    c.fillText(reply.slice(0, Math.min(n, 26)), W - 576, 238); c.fillText(reply.slice(26, Math.max(26, n)), W - 576, 284);
    fillRR(c, 30, H - 100, W - 60, 70, 35, '#ffffff'); c.fillStyle = '#9aa3ae'; c.fillText('Message...', 64, H - 64);
    for (let k = 0; k < 3; k++) { const on = Math.floor(t * 6) % 3 === k; fillRR(c, 40 + k * 26, 360, 16, 16, 8, on ? '#5b6573' : '#a8b0ba'); }
  }
  private researchWall(c: CanvasRenderingContext2D, W: number, H: number, lt: number) {
    const acc = SPECS.scout.accent;
    fillRR(c, 0, 0, W, H, 26, '#FFFFFF'); c.strokeStyle = acc; c.lineWidth = 6; c.beginPath(); c.roundRect(3, 3, W - 6, H - 6, 24); c.stroke();
    c.fillStyle = acc; c.font = mono(30, 700); c.textBaseline = 'alphabetic'; c.fillText('SEARCH · launch reel research', 30, 56);
    const rows = ['official launch post', 'product page · features', 'audience questions', 'competitor reels · 3 refs'];
    rows.forEach((r, k) => { const on = lt > 0.9 + k * 0.18; fillRR(c, 30, 90 + k * 92, W - 60, 74, 14, on ? alpha(acc, 0.16) : '#F1F3F6');
      c.fillStyle = on ? INK : MUTED; c.font = mono(28, 600); c.fillText(`${on ? '✓' : '·'}  ${r}`, 52, 136 + k * 92); });
  }
  private routineFace(c: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const h0 = this.ev('routine.hand'), sv = this.ev('routine.save'), rp = this.evs('routine.replay');
    const acc = SPECS.archive.accent;
    fillRR(c, 0, 0, W, H, 30, '#FFFFFF'); c.strokeStyle = acc; c.lineWidth = 7; c.beginPath(); c.roundRect(3, 3, W - 6, H - 6, 28); c.stroke();
    c.fillStyle = acc; c.font = mono(30, 700); c.textBaseline = 'alphabetic'; c.fillText('WORKFLOW · weekly report (sample)', 36, 60);
    const steps = ['1  Open the tracker sheet', '2  Tag new rows "ready"', '3  Send the summary to the team'];
    const replay = t >= rp[0]!, loop = replay ? (t - rp[0]!) % 1 : 0;
    steps.forEach((s, k) => {
      const on = replay ? loop > 0.18 + k * 0.25 : t > h0 + 0.5 + k * 0.55;
      fillRR(c, 36, 110 + k * 120, W - 72, 96, 18, on ? alpha(acc, 0.14) : '#F1F3F6');
      c.fillStyle = on ? INK : MUTED; c.font = ax(40, 100, 800); c.fillText(s, 70, 172 + k * 120);
      if (on) { c.fillStyle = '#1A9E5C'; c.font = ax(40, 100, 900); c.fillText('✓', W - 110, 172 + k * 120); }
    });
    if (t >= sv) { const k = sat((t - sv) / 0.3); c.globalAlpha = k; fillRR(c, 36, H - 112, W - 72, 80, 18, acc); c.fillStyle = '#FFFFFF'; c.font = ax(38, 112, 900);
      c.fillText(replay ? `RUNNING ROUTINE · ${Math.min(3, 1 + Math.floor(t - rp[0]!))}x` : 'SAVED AS ROUTINE', 70, H - 58); c.globalAlpha = 1; }
  }
  private appFace(c: CanvasRenderingContext2D, W: number, H: number, app: string, t: number, k: number) {
    const col = [SPECS.relay.accent, '#1A9E5C', SPECS.scout.accent, SPECS.forge.accent][k]!;
    fillRR(c, 0, 0, W, H, 26, '#FFFFFF'); c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.roundRect(3, 3, W - 6, H - 6, 24); c.stroke();
    fillRR(c, 0, 0, W, 64, 24, alpha(col, 0.16)); for (let d = 0; d < 3; d++) fillRR(c, 22 + d * 26, 24, 14, 14, 7, '#C9CED6');
    c.fillStyle = col; c.font = ax(34, 112, 900); c.textBaseline = 'alphabetic'; c.fillText(app, 120, 46);
    c.font = mono(26, 600); c.fillStyle = INK;
    const rows = app === 'MAIL' ? ['Inbox · 3 new', 'Re: launch timing', 'Draft: team update'] : app === 'SHEET' ? ['A  launch | owner | status', 'B  post   | FORGE | ✓', 'C  review | SENTINEL | …'] :
      app === 'BROWSER' ? ['research tab · sources', 'product page', 'competitor reel'] : ['storyboard · 4 frames', 'caption v3', 'export 9:16'];
    rows.forEach((r, j) => { const on = t > 36.3 + j * 0.25 + k * 0.1; c.fillStyle = on ? INK : '#B8C0CC'; c.fillText(r, 30, 120 + j * 64); });
    fillRR(c, 30, H - 80, Math.max(1, (W - 60) * sat((t - 37 - k * 0.3) / 2)), 16, 8, alpha(col, 0.7));
  }
  private phoneFace(c: CanvasRenderingContext2D, W: number, H: number, t: number, hero: boolean) {
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
    c.textBaseline = 'alphabetic';
    if (hero) {
      c.textAlign = 'center'; c.fillStyle = SPECS.helm.accent; c.font = mono(30, 700); c.fillText('YOUR CREW', W / 2, 150);
      c.fillStyle = INK; c.font = ax(54, 112, 900); c.fillText('SIX TEAMMATES', W / 2, 230); c.fillText('ONE JOB DONE', W / 2, 296);
      c.fillStyle = MUTED; c.font = mono(22, 600); c.fillText('illustrative crew', W / 2, 352);
      BOT_IDS.forEach((id, j) => { const sp = SPECS[id], y = 640 + j * 70; fillRR(c, 70, y, W - 140, 54, 27, sp.accent); c.fillStyle = '#FFFFFF'; c.font = ax(28, 112, 900); c.fillText(sp.name + ' · ' + sp.role, W / 2, y + 38); });
      c.textAlign = 'left';
      return;
    }
    const k = sat((t - 52.5) / 1.0);
    c.fillStyle = '#1A9E5C'; c.font = mono(24, 700); c.fillText('DELIVERED · launch package', 30, 64);
    const parts: [string, string, number][] = [['COVER', 'Meet the crew that ships.', 0], ['SCRIPT', '15 s · 4 beats', 0.25], ['STORYBOARD', '4 frames', 0.5], ['SOURCES', '3 checked ✓', 0.75]];
    parts.forEach(([a, b, d], j) => {
      const on = sat((k - d) * 4); c.globalAlpha = on; const y = 110 + j * 250 - 30 * (1 - on);
      fillRR(c, 26, y, W - 52, 220, 22, [alpha(SPECS.forge.accent, 0.18), alpha(SPECS.helm.accent, 0.16), alpha(SPECS.relay.accent, 0.16), alpha('#1A9E5C', 0.16)][j]!);
      c.fillStyle = INK; c.font = ax(40, 112, 900); c.fillText(a, 52, y + 76); c.fillStyle = MUTED; c.font = mono(28, 600); c.fillText(b, 52, y + 128);
      if (j === 2) for (let f = 0; f < 4; f++) fillRR(c, 52 + f * 112, y + 150, 96, 54, 8, '#D5DAE1');
    });
    c.globalAlpha = 1;
  }

  // ------------------------------------------------------------------------------------------------ camera
  /** Cast per chapter: the bots acting in the shot. Any other bot standing between the camera and its target is hidden for
   *  this frame (a standard animation cheat for a crowded set). */
  private CAST: Record<string, BotId[]> = { hook: [...BOT_IDS], notchat: ['helm'], team: [...BOT_IDS], mission: ['helm', 'scout', 'archive', 'forge'],
    choreo: ['scout', 'archive', 'forge'], parallel: [...BOT_IDS], routine: ['archive'], apps: ['scout', 'forge', 'relay', 'archive'], approval: [...BOT_IDS],
    payoff: ['forge', 'sentinel', 'relay'], hero: [...BOT_IDS] };
  private NEAR_CULL: Record<string, number> = { apps: 3.0, routine: 2.2 };
  private cullOccluders(t: number, tgt: THREE.Vector3) {
    let castList: BotId[] = t > 57.2 ? ['helm'] : this.CAST[this.chapterAt(t)] ?? [];
    if (this.chapterAt(t) === 'team') { const cl = this.evs('team.close'); if (t >= cl[0]!) castList = [t < cl[1]! ? 'forge' : t < cl[2]! ? 'sentinel' : 'scout']; }
    const cast = new Set(castList), cam = this.cam.position;
    const d = new THREE.Vector3().subVectors(tgt, cam), L2 = d.lengthSq();
    for (const id of BOT_IDS) {
      const r = this.bots[id]; if (r.root.position.y > 5) continue;
      r.root.visible = true;
      if (cast.has(id)) continue;
      const nearCut = this.NEAR_CULL[this.chapterAt(t)] ?? 1.1;
      if (Math.hypot(r.root.position.x - cam.x, r.root.position.z - cam.z) < nearCut) { r.root.visible = false; continue; }
      for (const y of [0.35, 0.7 * r.spec.h, r.spec.h - 0.12]) {
        const c = new THREE.Vector3(r.root.position.x, y, r.root.position.z), u = new THREE.Vector3().subVectors(c, cam).dot(d) / L2;
        if (u <= 0.02 || u >= 0.9) continue;
        if (cam.clone().addScaledVector(d, u).distanceTo(c) < 0.32 + 0.32 * (1 - u)) { r.root.visible = false; break; }
      }
    }
    for (const id of BOT_IDS) {
      const m = this.screens[id].mesh; m.visible = true;
      if (cast.has(id)) continue;
      const c = new THREE.Vector3(); m.getWorldPosition(c); const u = new THREE.Vector3().subVectors(c, cam).dot(d) / L2;
      if (u > 0.02 && u < 0.85 && cam.clone().addScaledVector(d, u).distanceTo(c) < 0.38 + 0.3 * (1 - u)) m.visible = false;
    }
  }

  private camera(t: number) {
    const cam = this.cam, ch = this.chapterAt(t); let pos = V(0, 4.4, 6.6), tgt = V(0, 0.6, -0.3), fov = 36;
    const wide = { pos: V(0, 4.5, 6.4), tgt: V(0, 0.55, -0.45), fov: 38 };
    const L = (a: THREE.Vector3, b: THREE.Vector3, k: number) => new THREE.Vector3().lerpVectors(a, b, k);
    const macro = { pos: BUTTON.clone().add(V(0.42, 0.42, 0.78)), tgt: BUTTON.clone().add(V(-0.06, 0.16, -0.18)), fov: 36 };
    if (ch === 'hook') {
      const k = outExpo(span(t, 0.18, 0.75));
      pos = L(macro.pos, wide.pos, k); tgt = L(macro.tgt, wide.tgt, k); fov = lerp(macro.fov, wide.fov, k);
      pos.z -= 0.6 * span(t, 0.75, 2.0); pos.y -= 0.3 * span(t, 0.75, 2.0);
    } else if (ch === 'notchat') {
      const med = { pos: V(0.2, 1.45, 4.9), tgt: V(0.2, 1.0, 1.6), fov: 34 };
      const k = outCubic(span(t, this.ev('room.reveal'), this.ev('room.reveal') + 1.0));
      pos = L(med.pos, V(0, 3.7, 6.2), k); tgt = L(med.tgt, V(0, 0.7, -0.5), k); fov = lerp(med.fov, 38, k);
    } else if (ch === 'team') {
      const close = this.evs('team.close');
      if (t < close[0]!) { const a = lerp(-0.75, 0.55, ease(span(t, 6, close[0]!))); pos = V(Math.sin(a) * 5.6, lerp(5.2, 3.4, span(t, 6, close[0]!)), Math.cos(a) * 5.6 - 0.4); tgt = V(0, 0.6, -0.45); fov = 38; }
      else if (t < close[1]!) { const f = deskSpot('forge'); pos = V(f.x + 0.5, 1.55, f.z + 2.05); tgt = V(f.x - 0.1, 0.85, f.z); fov = 36; }
      else if (t < close[2]!) { const s = deskSpot('sentinel'); pos = V(s.x + 0.4, 1.5, s.z + 1.95); tgt = V(s.x + 0.05, 1.0, s.z); fov = 34; }
      else { const s = deskSpot('scout'); pos = V(s.x + 0.35, 1.3, s.z + 1.6 - 0.2 * span(t, close[2]!, 12)); tgt = V(s.x, 0.98, s.z); fov = 32; }
    } else if (ch === 'mission') {
      const fc = this.ev('forge.content');
      if (t < fc + 0.6) { pos = V(lerp(-0.4, 0.2, span(t, 12, fc)), 3.3, 4.9 - 0.4 * span(t, 12, fc)); tgt = V(-0.4 * (1 - span(t, 12, fc)) + 0.3 * span(t, 12, fc), 0.85, -0.9); fov = 40; }
      else { const f = deskSpot('forge'); const k = outCubic(span(t, fc + 0.6, fc + 1.2)); pos = L(V(0.2, 3.3, 4.5), V(f.x - 0.25, 1.55, f.z + 2.05), k); tgt = L(V(0.3, 0.85, -0.9), V(f.x - 0.4, 1.0, f.z + 0.1), k); fov = lerp(40, 36, k); }
    } else if (ch === 'choreo') {
      const s0 = this.ev('choreo.sprint'), toss = this.ev('choreo.toss'), chairT = this.ev('choreo.chair');
      if (t < s0) { const k = ease(span(t, 18, s0)); pos = V(lerp(-1.2, -3.0, k), lerp(5.0, 1.3, k), lerp(4.6, 2.6, k)); tgt = V(lerp(0, -1.6, k), lerp(0.5, 0.7, k), lerp(-0.6, 0.3, k)); fov = 38; }
      else if (t < toss + 0.1) { const sc = this.bots.scout.root.position; pos = V(sc.x + 0.4, 0.95, sc.z + 2.0); tgt = V(sc.x + 0.35, 0.65, sc.z - 0.2); fov = 34; }
      else if (t < chairT) { const ad = deskSpot('archive'); pos = V(ad.x + 0.95, 1.45, ad.z + 2.3); tgt = V(ad.x - 0.2, 1.0, ad.z + 0.25); fov = 36; }
      else { const f = deskSpot('forge'); const k = ease(span(t, chairT, 24)); pos = V(f.x + 0.9 - 0.3 * k, 1.8 + 0.4 * k, f.z + 2.1 + 0.4 * k); tgt = V(f.x - 0.1, 1.0, f.z); fov = 36; }
    } else if (ch === 'parallel') {
      pos = wide.pos.clone(); tgt = wide.tgt.clone(); fov = 38;   // after the merge; the split view sets its own cameras
    } else if (ch === 'routine') {
      const ad = ROUTINE_SPOT; pos = V(ad.x + 0.1, 1.5, ad.z + 3.0 - 0.3 * span(t, 30, 36)); tgt = V(ad.x + 0.12, 1.2, ad.z + 0.15); fov = 40;
    } else if (ch === 'apps') {
      const core = this.ev('apps.core'); const k = ease(span(t, core - 0.3, core + 0.9));
      pos = L(V(0.15, 2.2, 2.9), V(0.3, 6.6, 7.6), k); tgt = L(V(0, 1.85, -2.35), V(0, 0.8, -1.5), k); fov = lerp(44, 40, k);
      pos.x += 0.4 * Math.sin(t * 0.6);
    } else if (ch === 'approval') {
      const look = this.ev('appr.look');
      if (t < look) { const s = deskSpot('sentinel'); pos = V(s.x - 0.6, 1.55, s.z + 2.1); tgt = V(s.x + 0.45, 0.95, s.z - 0.2); fov = 38; }
      else { const k = ease(span(t, look, look + 0.8)); pos = L(V(0.4, 1.6, 3.2), V(0, 2.7, 4.8), k); tgt = V(0.05, 0.8, -0.4); fov = 42; }
    } else if (ch === 'payoff') {
      const run = this.ev('pay.run'), shipT = this.ev('pay.shipped'), dance = this.ev('pay.dance');
      if (t < run) { const f = deskSpot('forge'); pos = V(f.x + 0.85, 1.75, f.z + 2.1); tgt = V(f.x - 0.25, 0.95, f.z + 0.2); fov = 38; }
      else if (t < shipT + 0.1) { const r = this.bots.relay.root.position; pos = V(r.x - 1.9, 1.05, r.z + 1.9); tgt = V(r.x + 0.25, 0.6, r.z); fov = 38; }
      else if (t < dance) { pos = V(TRAY.x - 0.8, 1.25, TRAY.z + 1.7); tgt = V(TRAY.x - 0.5, 0.65, TRAY.z - 0.2); fov = 36; }
      else { const a = 1.2 * ease(span(t, dance, 54)); pos = V(Math.sin(a) * 4.2 + 0.5, 2.0 + 2.2 * span(t, dance, 54), Math.cos(a) * 4.2 + 0.4); tgt = V(0.3, 0.8, 0.2); fov = 40; }
    } else {
      const k = ease(span(t, 54, 55)); pos = L(V(0, 3.4, 6.4), V(0, 1.9, 5.4), k); tgt = L(V(0, 1.0, 0.4), V(0, 1.0, 0.4), k); fov = 40;
      const d = ease(span(t, 57.4, 58)); pos = L(pos, macro.pos, d); tgt = L(tgt, macro.tgt, d); fov = lerp(fov, macro.fov, d);
    }
    // micro drift (deterministic handheld feel) + impact shake
    if (pos.y < 2.6) pos.y = 0.3 + (pos.y - 0.3) * 0.8;   // the cute crew + desks are lower than the first cast
    tgt.y = 0.12 + (tgt.y - 0.12) * 0.74;
    const sh = 0.025 * hit(t, 0, 0.12) + 0.03 * hit(t, this.ev('pay.shipped'), 0.15) + 0.015 * hit(t, 56, 0.12);
    pos.x += sh * (hash1(Math.floor(t * 60)) - 0.5); pos.y += sh * (hash1(Math.floor(t * 60) + 7) - 0.5);
    cam.position.copy(pos); cam.lookAt(tgt); cam.fov = fov; cam.aspect = COL.w / FXH; cam.updateProjectionMatrix();
    this.cullOccluders(t, tgt);
  }

  // ------------------------------------------------------------------------------------------------ 2D overlay
  private proj(v: THREE.Vector3) { const p = v.clone().project(this.cam); return { x: (p.x + 1) / 2 * FXW, y: (1 - p.y) / 2 * FXH, vis: p.z < 1 }; }
  private bigType(c: CanvasRenderingContext2D, text: string, y: number, t0: number, t: number, col = GB.bone, size = 74, t1 = 1e9) {
    if (t < Math.max(0, t0) || t > t1) return;
    const k = springAt(t, t0, 0.32, 0.5), out = span(t, t1 - 0.12, t1);
    c.save(); c.globalAlpha = sat(k * 3) * (1 - out); c.translate(FXW / 2, y); const sc = lerp(1.35, 1, sat(k)) * (1 + 0.04 * (k - 1)); c.scale(sc, sc);
    c.font = ax(size, 125, 900); c.textAlign = 'center'; c.textBaseline = 'middle';
    const fit = Math.min(1, (FXW - 40) / c.measureText(text).width); c.scale(fit, fit);
    const inkFill = col === GB.bone, fill = inkFill ? INK : col;
    c.lineWidth = size * 0.17; c.strokeStyle = inkFill ? '#FFFFFF' : 'rgba(10,14,20,0.9)'; c.lineJoin = 'round'; c.strokeText(text, 0, 0); c.fillStyle = fill; c.fillText(text, 0, 0); c.restore();
  }
  private pill(c: CanvasRenderingContext2D, text: string, x: number, y: number, col: string, k: number, size = 18, dark = false) {
    if (k <= 0) return; c.save(); c.globalAlpha = sat(k * 2); c.font = ax(size, 112, 900); const w = c.measureText(text).width + size * 1.4;
    c.translate(x, y); c.scale(lerp(0.6, 1, sat(k)), lerp(0.6, 1, sat(k))); fillRR(c, -w / 2, -size * 0.9, w, size * 1.8, size * 0.9, dark ? 'rgba(8,12,18,0.85)' : col);
    if (dark) { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.roundRect(-w / 2, -size * 0.9, w, size * 1.8, size * 0.9); c.stroke(); }
    c.fillStyle = dark ? col : '#071018'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 1); c.restore();
  }
  private captions(c: CanvasRenderingContext2D, t: number) {
    const line = this.lyrics.lines.find(l => t >= l.start - 0.05 && t <= l.end + 0.35); if (!line) return;
    const chunks: { w: string; start: number; end: number }[][] = []; let cur: { w: string; start: number; end: number }[] = [], len = 0;
    for (const w of line.words) { if (len + w.w.length > 24 && cur.length) { chunks.push(cur); cur = []; len = 0; } cur.push(w); len += w.w.length + 1; }
    if (cur.length) chunks.push(cur);
    let ci = chunks.findIndex(ch => t < ch[ch.length - 1]!.end + 0.05); if (ci < 0) ci = chunks.length - 1;
    const words = chunks[ci]!; const y = 905;
    c.save(); c.font = ax(36, 100, 900); c.textBaseline = 'middle';
    const sp = c.measureText(' ').width * 1.6, widths = words.map(w => c.measureText(w.w.toUpperCase()).width + sp), total = widths.reduce((a, b) => a + b, 0) - sp;
    const fit = Math.min(1, (FXW - 48) / total); let x = FXW / 2 - (total * fit) / 2;
    words.forEach((w, j) => {
      const on = t >= w.start - 0.03, k = springAt(t, w.start - 0.03, 0.22, 0.5), emph = CAP_EMPH.has(w.w);
      const s = (on ? lerp(1.12, 1, sat(k)) : 1) * fit, word = w.w.toUpperCase(), ww = (widths[j]! - sp) * fit;
      c.save(); c.translate(x + ww / 2, y); c.scale(s, s); c.textAlign = 'center';
      c.lineWidth = 9; c.strokeStyle = 'rgba(5,8,12,0.9)'; c.lineJoin = 'round'; c.globalAlpha = on ? 1 : 0;
      c.strokeText(word, 0, 0); c.fillStyle = on ? (emph ? GB.lime : GB.bone) : alpha(GB.bone, 0.75); c.fillText(word, 0, 0); c.restore();
      x += widths[j]! * fit;
    });
    c.restore();
  }
  private overlay(c: CanvasRenderingContext2D, t: number) {
    const ch = this.chapterAt(t), e = (n: string) => this.ev(n);
    if (ch === 'hook') { this.bigType(c, '6 AI BOTS', 190, -0.25, t, GB.bone, 92, 2.0); this.bigType(c, '1 TEAM', 290, e('hook.type2'), t, GB.cyan, 92, 2.4); }
    if (ch === 'notchat') {
      if (t < 2.4) this.bigType(c, '1 TEAM', 290, e('hook.type2'), t, GB.cyan, 92, 2.4);
      this.bigType(c, 'NOT JUST CHAT', 180, e('chat.title'), t, GB.slate, 58, e('chat.work'));
      this.bigType(c, 'REAL WORK', 180, e('chat.work'), t, GB.lime, 88);
    }
    for (const tg of this.tags) { const q = this.proj(this.headPos(tg.id).add(V(0, 0.42, 0))); if (!q.vis) continue;
      this.pill(c, SPECS[tg.id].name, q.x, q.y, SPECS[tg.id].accent, tg.k, 15, true); this.pill(c, SPECS[tg.id].role.toLowerCase(), q.x, q.y + 30, SPECS[tg.id].accent, tg.k * 0.9, 11, false); }
    if (this.status) { const q = this.proj(this.status.at); this.pill(c, this.status.label, q.x, q.y, this.status.color, this.status.k, 20); }
    if (ch === 'mission' && t > 11.9 && t < e('mission.split')) {
      const q = this.proj(this.mission.mesh.position), a = 0.9 * (1 - span(t, 12.1, 12.4));
      c.save(); c.globalAlpha = a; c.fillStyle = GB.bone; c.translate(q.x + 34, q.y + 20); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 38); c.lineTo(10, 28); c.lineTo(22, 46); c.lineTo(28, 42); c.lineTo(17, 25); c.lineTo(30, 25); c.closePath(); c.fill(); c.restore();
      this.pill(c, 'YOU', q.x + 64, q.y + 84, GB.bone, 1 - span(t, 12.1, 12.4), 12, true);
    }
    if (ch === 'mission' && t > e('mission.split') && t < 15.6) {
      const labels: [BotId, string][] = [['scout', 'RESEARCH'], ['archive', 'CONTEXT'], ['forge', 'CONTENT']];
      labels.forEach(([id, l], k) => { const q = this.proj(this.headPos(id).add(V(0, 0.4, 0))); if (q.vis) this.pill(c, l, q.x, q.y, SPECS[id].accent, springAt(t, e('mission.split') + 0.5 + k * 0.1, 0.3, 0.6), 14); });
    }
    if (ch === 'choreo' && t > 19.0 && t < e('choreo.toss') + 0.2) this.pill(c, 'TASK CAPSULE', FXW / 2, 210, GB.cyan, springAt(t, 19.2, 0.3, 0.6), 16, true);
    if (ch === 'parallel') this.bigType(c, 'PARALLEL', 520, e('par.word'), t, GB.bone, 104, e('par.merge') + 0.4);
    if (ch === 'routine') { this.pill(c, 'SHOW IT ONCE', FXW / 2, 118, GB.bone, springAt(t, 30.0, 0.3, 0.6), 18, true); if (t > e('routine.save')) this.pill(c, 'SAVED AS A ROUTINE', FXW / 2, 162, GB.cyan, springAt(t, e('routine.save'), 0.3, 0.55), 18); }
    if (ch === 'apps') { this.bigType(c, 'REAL APPS', 128, e('apps.word'), t, GB.bone, 70, e('apps.core')); this.bigType(c, 'SHARED COMPUTER', 128, e('apps.core'), t, GB.cyan, 56, e('apps.context')); this.bigType(c, '+ CONTEXT', 128, e('apps.context'), t, GB.lime, 72); }
    if (ch === 'approval') this.approvalUI(c, t);
    if (ch === 'payoff') { this.bigType(c, 'SHIPPED', 250, e('pay.shipped'), t, GB.lime, 110); if (t > e('pay.badge') && t < e('pay.shipped')) this.pill(c, '✓ REVIEWED', FXW / 2, 200, GB.green, springAt(t, e('pay.badge'), 0.3, 0.55), 22); }
    if (ch === 'hero') {
      this.bigType(c, 'GROK BOT', 150, e('hero.title'), t, GB.bone, 96, 57.45);
      if (t > e('hero.take') && t < 57.45) this.pill(c, 'AI TEAMMATES THAT GET WORK DONE', FXW / 2, 222, GB.cyan, springAt(t, e('hero.take'), 0.3, 0.6), 15, true);
      if (t > e('hero.cta')) this.pill(c, 'COMMENT  “BOT”', FXW / 2, 800, GB.lime, springAt(t, e('hero.cta'), 0.3, 0.45) * (1 - span(t, 57.6, 57.9)), 34);
    }
    if (['mission', 'choreo', 'parallel', 'routine', 'apps', 'approval', 'payoff'].includes(ch)) { c.font = mono(10.5, 600); c.fillStyle = alpha(GB.bone, 0.55); c.textAlign = 'right'; c.textBaseline = 'alphabetic'; c.fillText('ILLUSTRATIVE WORKFLOW', FXW - 20, 92); c.textAlign = 'left'; }
    this.captions(c, t);
  }
  private approvalUI(c: CanvasRenderingContext2D, t: number) {
    const flag = this.ev('appr.flag'), ap = this.ev('appr.approve');
    if (t < flag) return;
    const k = springAt(t, flag, 0.3, 0.55), pulse = 0.5 + 0.5 * Math.sin(t * 10), done = t >= ap;
    c.save(); c.globalAlpha = sat(k * 2) * (1 - span(t, ap + 1.6, ap + 2.0));
    const x = 64, y = 230, w = FXW - 128, h = 230;
    fillRR(c, x, y, w, h, 26, 'rgba(10,14,20,0.94)'); c.lineWidth = 4; c.strokeStyle = done ? GB.green : alpha(GB.orange, 0.6 + 0.4 * pulse); c.beginPath(); c.roundRect(x, y, w, h, 26); c.stroke();
    c.fillStyle = done ? GB.green : GB.orange; c.font = ax(30, 112, 900); c.textBaseline = 'alphabetic'; c.fillText(done ? '✓ APPROVED' : '! APPROVAL NEEDED', x + 26, y + 52);
    c.fillStyle = GB.bone; c.font = mono(17, 600); c.fillText('SENTINEL · Publish the launch post?', x + 26, y + 92);
    c.fillStyle = alpha(GB.bone, 0.6); c.font = mono(13, 500); c.fillText('illustrative demo · nothing is posted', x + 26, y + 118);
    const by = y + 146; fillRR(c, x + 26, by, 190, 58, 16, done ? GB.green : alpha(GB.green, 0.85)); fillRR(c, x + 236, by, 190, 58, 16, 'rgba(255,255,255,0.08)');
    c.fillStyle = '#06110b'; c.font = ax(22, 112, 900); c.textAlign = 'center'; c.fillText('APPROVE', x + 121, by + 37); c.fillStyle = GB.bone; c.fillText('HOLD', x + 331, by + 37); c.textAlign = 'left';
    if (t > ap - 0.6 && t < ap + 0.6) {   // the human's tap
      const u = outCubic(span(t, ap - 0.6, ap)), fx = lerp(FXW * 0.7, x + 121, u), fy = lerp(FXH * 0.8, by + 40, u);
      c.globalAlpha = 0.9; c.fillStyle = GB.bone; c.beginPath(); c.arc(fx, fy, 22 - 8 * hit(t, ap, 0.15), 0, Math.PI * 2); c.fill();
      c.strokeStyle = alpha(GB.bone, 0.8 * hit(t, ap, 0.3)); c.lineWidth = 3; c.beginPath(); c.arc(fx, fy, 22 + 60 * (1 - hit(t, ap, 0.3)), 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    if (t >= this.ev('appr.control')) this.bigType(c, 'YOU STAY IN CONTROL', 560, this.ev('appr.control'), t, GB.green, 48);
  }

  // ------------------------------------------------------------------------------------------------ split view (parallel)
  private renderParallel(t: number) {
    const { renderer } = this.ctx, rt = this.rt, px = this.px;
    const split = this.ev('par.split'), merge = this.ev('par.merge');
    const lanes: BotId[] = ['scout', 'forge', 'archive'];
    const inK = outCubic(span(t, split, split + 0.5)), outK = outCubic(span(t, merge, merge + 0.6));
    renderer.setRenderTarget(rt); renderer.setClearColor('#EEEFF1', 1); renderer.clear();
    if (outK >= 1) { renderer.render(this.scene3, this.cam); return; }
    if (outK > 0) { renderer.render(this.scene3, this.cam); }
    const bandH = FXH / 3, cam = this.cam.clone();
    lanes.forEach((id, k) => {
      const d = deskSpot(id);
      cam.aspect = COL.w / bandH; cam.fov = 32; cam.position.set(d.x + 0.4 + 0.08 * Math.sin(t + k), 1.15, d.z + 1.75); cam.lookAt(d.x - 0.25, 0.72, d.z); cam.updateProjectionMatrix();
      for (const o of BOT_IDS) { this.bots[o].root.visible = o === id; this.deskGroups[o].visible = o === id; }
      const slide = (1 - inK) * (k % 2 ? 1 : -1) * COL.w, h = bandH * (1 - outK);
      if (h < 1) return;
      const top = k * bandH + (bandH - h) / 2, y = Math.round((FXH - top - h) * px), x = Math.round(slide * px);
      rt.viewport.set(x, y, rt.width, Math.round(h * px)); rt.scissor.set(Math.max(0, x), y, rt.width, Math.round(h * px)); rt.scissorTest = true;
      renderer.setRenderTarget(rt); renderer.render(this.scene3, cam);
    });
    rt.viewport.set(0, 0, rt.width, rt.height); rt.scissorTest = false;
    for (const o of BOT_IDS) { this.bots[o].root.visible = true; this.deskGroups[o].visible = true; }
  }
  private parallelOverlay(c: CanvasRenderingContext2D, t: number) {
    const split = this.ev('par.split'), merge = this.ev('par.merge'), outs = this.evs('par.out'), stack = this.ev('par.stack');
    if (t >= merge + 0.6) return;
    const bandH = FXH / 3, labels: [string, string][] = [['RESEARCH NOTES', GB.lime], ['SCRIPT', GB.amber], ['STORYBOARD', GB.cyan]];
    const fade = 1 - span(t, merge, merge + 0.4);
    labels.forEach(([l, col], k) => {
      c.save(); c.globalAlpha = fade; c.strokeStyle = alpha(col, 0.9); c.lineWidth = 3; c.strokeRect(1.5, k * bandH + 1.5, FXW - 3, bandH - 3); c.restore();
      this.pill(c, `LANE ${k + 1} · ${l}`, 120, k * bandH + 34, col, springAt(t, split + 0.2 + k * 0.1, 0.3, 0.6) * fade, 13, true);
      const ot = outs[k]!; if (t >= ot && t < stack + 0.5) {
        const u = outCubic(span(t, stack, stack + 0.5)), x0 = FXW - 260, y0 = k * bandH + bandH - 74, x1 = FXW / 2 - 120, y1 = 400 + k * 18;
        const x = lerp(x0, x1, u), y = lerp(y0, y1, u), sk = sat(springAt(t, ot, 0.3, 0.5));
        c.save(); c.globalAlpha = fade; c.translate(x, y); c.scale(sk, sk); fillRR(c, 0, 0, 240, 60, 14, alpha(col, 0.95)); c.fillStyle = '#071018'; c.font = ax(19, 112, 900); c.textBaseline = 'middle';
        c.fillText(['✓ 4 sources noted', '✓ 15 s script', '✓ 4 frames'][k]!, 18, 31); c.restore();
      }
    });
    if (t >= stack + 0.5) { const k = sat(springAt(t, stack + 0.5, 0.3, 0.55)); c.save(); c.globalAlpha = fade; c.translate(FXW / 2, 430); c.scale(k, k); fillRR(c, -150, -46, 300, 92, 20, GB.bone);
      c.fillStyle = '#071018'; c.font = ax(26, 112, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LAUNCH PACKAGE', 0, -10); c.font = mono(14, 600); c.fillText('notes · script · storyboard', 0, 22); c.restore(); }
  }

  // ------------------------------------------------------------------------------------------------ sheet (variant grokbot_sheet)
  private SHEET_BANDS = [150, 410, 670];
  private sheetRender(t: number) {
    const { renderer } = this.ctx, px = this.px, rt = this.rt, bandH = 250;
    renderer.setRenderTarget(rt); renderer.setClearColor('#EEEFF1', 1); renderer.clear();
    for (const id of BOT_IDS) this.bots[id].root.visible = false;
    this.SHEET_BANDS.forEach((top, k) => {
      const pair = [BOT_IDS[k * 2]!, BOT_IDS[k * 2 + 1]!];
      pair.forEach((id, j) => {
        const p = restPose(); p.x = (j ? 0.62 : -0.62); p.z = 3.0; p.rotY = 0.5 * Math.sin(t * 0.7 + k + j * 2);
        idle(p, t, k * 2 + j); applyPose(this.bots[id], p); this.bots[id].root.visible = true;
      });
      this.cam.aspect = COL.w / bandH; this.cam.fov = 24; this.cam.position.set(0, 1.3, 7.6); this.cam.lookAt(0, 0.72, 3.0); this.cam.updateProjectionMatrix();
      const y = Math.round((FXH - top - bandH) * px), h = Math.round(bandH * px);
      rt.viewport.set(0, y, rt.width, h); rt.scissor.set(0, y, rt.width, h); rt.scissorTest = true;
      renderer.setRenderTarget(rt); renderer.render(this.scene3, this.cam);
      for (const id of pair) this.bots[id].root.visible = false;
    });
    rt.viewport.set(0, 0, rt.width, rt.height); rt.scissorTest = false;
    for (const id of BOT_IDS) this.bots[id].root.visible = true;
    this.cam.aspect = COL.w / FXH; this.cam.updateProjectionMatrix();
  }
  private sheetLabels(c: CanvasRenderingContext2D) {
    txt(c, 'THE CREW', 32, 70, ax(40, 125, 900), INK);
    txt(c, 'Illustrative characters · not official Grok Bot avatars', 32, 100, mono(12, 500), alpha(INK, 0.6));
    this.SHEET_BANDS.forEach((top, k) => {
      [0, 1].forEach(j => {
        const s = SPECS[BOT_IDS[k * 2 + j]!], x = j ? 330 : 32, y = top + 232;
        fillRR(c, x, y - 12, 10, 10, 2, s.accent);
        txt(c, s.name, x + 16, y - 2, ax(17, 112, 900), INK);
        txt(c, s.role, x + 16, y + 18, mono(11, 600), s.accent);
      });
    });
    txt(c, 'SAME RIG · 6 SILHOUETTES · 6 ACCENTS', 32, 1000, mono(12, 600), alpha(INK, 0.55));
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx, t = f.t, H = out.height;
    const sheet = !!this.ctx.params.sheet;
    if (sheet) this.sheetRender(t);
    else {
      this.direct(t); this.camera(t);
      if (this.chapterAt(t) === 'parallel') this.renderParallel(t);
      else { renderer.setRenderTarget(this.rt); renderer.setClearColor('#EEEFF1', 1); renderer.clear(); renderer.render(this.scene3, this.cam); }
    }
    clearRT(renderer, out);
    const cx = Math.round(COL.x * this.px);
    out.viewport.set(cx, 0, this.rt.width, H); out.scissor.set(cx, 0, this.rt.width, H); out.scissorTest = true;
    comp.draw(renderer, this.rt.texture, out, { mode: 'replace', premult: false });
    out.viewport.set(0, 0, out.width, out.height); out.scissorTest = false;
    const c = this.layer.ctx; this.layer.clear();
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    if (sheet) this.sheetLabels(c);
    else { if (this.chapterAt(t) === 'parallel') this.parallelOverlay(c, t); this.overlay(c, t); }
    c.restore();
    comp.draw(renderer, this.layer.upload(), out);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0, ca: 0, vignette: 0, shake: [0, 0], zoom: 1 };
  }
  override dispose() { this.layer.texture.dispose(); this.rt?.dispose(); }
}
void [nearestBeat, beatIndex, barIndex, inCubic];
