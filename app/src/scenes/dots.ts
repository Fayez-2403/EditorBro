// DOTS: The Great To-Do List Heist (96.000 s, 9:16, 60 fps, 120 BPM). Fan-made explainer starring the five Dots
// mascots (OpenAI's designs; projects/dots-heist/FACTS.md): the five are the faces of ONE dot's skills. Ten scenes on one
// white felt studio (a toy diorama with the grey ring motif). 3D: Three.js into its own 4x MSAA target the size of the
// 9:16 column; 2D: big Hinglish type, mascot speech bubbles, narrator captions and labels on a Layer2D over it.
// Everything is a pure function of t; the story is data/dots/cues.json (events from the voice's words on the 0.25 s grid).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT, PH } from '../engine/gl';
import { mulberry32 } from '../engine/util';
import { COL, FXW, FXH, ax, mono, alpha, fillRR, sat, loadImg } from './_vo';
import {
  DOT_IDS, DOTS, buildDot, applyDot, restDot, idleDot, hop, tremble, talk, springK, feltMat, blackFelt, glossBlack, blobTex,
  buildMonster, drawMonster, poseMonster, type DotId, type DotRig, type DotPose, type Monster,
} from './_dots';

const INK = '#1B1B20', BONE = '#FFFFFF', WARM = '#FFF4E6';
const span = (t: number, a: number, b: number) => sat((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (x: number) => { x = sat(x); return x * x * (3 - 2 * x); };
const inOut = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * sat(x));
const outCubic = (x: number) => 1 - (1 - sat(x)) ** 3;
const outBack = (x: number) => { x = sat(x); const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const hit = (t: number, t0: number, d = 0.25) => (t < t0 ? 0 : Math.exp(-(t - t0) / d));
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

type SceneId = 'monster' | 'legends' | 'workshop' | 'bughunt' | 'meltdown' | 'launch' | 'connected' | 'sleeping' | 'boss' | 'gift';
interface Cues { events: Record<string, number | number[]>; scenes: [number, number, SceneId][]; speak: Record<string, [number, number][]> }
interface LyLine { i: number; who: string; text: string; start: number; end: number; words: { w: string; start: number; end: number }[] }
/** Camera key: time, position, target, vertical fov. */
type Key = [number, [number, number, number], [number, number, number], number];

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

const SHOTS: Record<SceneId, Key[]> = {
  // [time, camera position, look-at target, vertical fov]. Characters are framed in y 300-740 of the 1080 column, titles above,
  // captions below (Reels safe zone); close-ups look over the front row.
  monster: [[0, [0, 1.55, 6.1], [0, 0.5, -0.25], 34], [1.99, [0, 1.45, 5.35], [0, 0.5, -0.25], 34], [2.0, [0, 0.8, 2.5], [0, 0.85, 0], 42],
    [3.45, [0, 0.95, 2.75], [0, 0.95, 0], 42], [4.2, [0, 1.6, 3.9], [0, 1.65, 0], 44],
    [7.6, [0.2, 1.55, 3.6], [0, 1.6, 0], 42], [8.25, [-0.25, 0.85, 3.4], [-0.3, 0.95, 0.3], 44], [9.3, [-0.25, 0.8, 3.2], [-0.3, 0.95, 0.3], 44], [10, [-0.1, 1.2, 1.5], [0, 1.3, 0.3], 40]],
  legends: [[10, [0, 2.0, 8.0], [0, 0.55, -0.25], 32], [12.4, [0, 1.7, 6.6], [0, 0.5, -0.25], 34], [15.0, [0, 1.65, 6.3], [0, 0.5, -0.25], 34],
    [15.25, [-0.34, 0.7, 2.5], [-0.34, 0.38, 0.42], 36], [16.15, [-0.3, 0.72, 2.4], [-0.34, 0.38, 0.42], 36],
    [16.25, [-0.36, 1.25, 1.75], [-0.36, 0.8, -0.3], 36], [17.15, [-0.33, 1.25, 1.7], [-0.36, 0.8, -0.3], 36],
    [17.25, [0, 1.7, 1.35], [0, 1.28, -0.9], 36], [17.9, [0.03, 1.7, 1.3], [0, 1.28, -0.9], 36],
    [18.0, [0.36, 1.25, 1.75], [0.36, 0.8, -0.3], 36], [19.15, [0.33, 1.25, 1.7], [0.36, 0.8, -0.3], 36],
    [19.25, [0.34, 0.7, 2.5], [0.34, 0.38, 0.42], 36], [20, [0.3, 0.72, 2.4], [0.34, 0.38, 0.42], 36]],
  workshop: [[20, [0, 1.25, 8.0], [0, 1.45, 0], 38], [21.0, [0, 1.3, 5.0], [0, 1.35, 0], 36], [21.001, [0, 0.85, 3.6], [0, 0.47, -0.4], 42],
    [25.0, [0.2, 0.82, 3.35], [0.05, 0.47, -0.5], 42], [27.9, [0.1, 0.8, 3.15], [0, 0.47, -0.5], 42], [28.0, [0, 0.7, 2.4], [0.1, 0.4, 0.2], 40], [30, [0, 0.68, 2.25], [0.1, 0.4, 0.2], 40]],
  bughunt: [[30, [0, 1.6, 3.0], [0, 0.25, 0], 42], [32.5, [0.3, 0.95, 2.3], [0.1, 0.32, 0], 42], [34.4, [0.25, 0.85, 2.2], [0.05, 0.32, 0], 42],
    [34.5, [0, 1.15, 3.2], [-0.1, 0.3, 0], 44], [36.4, [0, 1.05, 3.0], [-0.1, 0.3, 0], 44], [40, [0.1, 0.95, 2.6], [0, 0.35, 0], 42]],
  meltdown: [[40, [0, 0.8, 3.2], [0, 0.55, 0], 42], [43.4, [0, 0.78, 3.0], [0, 0.55, 0], 42], [43.5, [0.12, 0.72, 2.9], [0.05, 0.52, 0.1], 42], [50, [0.05, 0.75, 3.1], [0, 0.55, 0], 42]],
  launch: [[50, [0, 1.35, 5.2], [0, 1.05, 0], 44], [51.7, [0, 1.3, 4.9], [0, 1.05, 0], 44], [53.0, [-0.15, 1.25, 4.6], [0, 1.05, 0], 46], [54.0, [-0.15, 1.25, 4.6], [0, 1.05, 0], 46],
    [54.01, [0, 0.6, 2.4], [0, 0.42, 0.6], 40], [55.4, [0, 0.62, 2.6], [0, 0.45, 0.6], 40], [55.5, [0, 1.2, 4.6], [0, 0.72, 0], 44], [58.8, [0, 1.2, 4.8], [0, 0.78, 0], 44], [60, [0, 1.3, 5.6], [0, 1.45, 0], 46]],
  connected: [[60, [0, 0.85, 3.9], [0, 0.55, 0], 40], [64.4, [0, 0.9, 4.1], [0, 0.57, 0], 40], [64.5, [0, 1.2, 5.4], [0, 0.65, 0], 44], [68.4, [0, 1.1, 4.8], [0, 0.6, 0], 42],
    [68.5, [0.1, 0.6, 2.1], [0, 0.36, 0], 38], [70, [0.15, 0.6, 2.0], [0, 0.36, 0], 38]],
  sleeping: [[70, [0.3, 1.35, 4.0], [0.1, 0.65, -0.3], 42], [71.9, [0.2, 1.3, 3.8], [0.1, 0.65, -0.3], 42], [72.0, [-0.2, 0.95, 3.0], [-0.55, 0.5, -0.1], 42],
    [76.0, [-0.3, 1.0, 3.0], [-0.65, 0.6, -0.3], 42], [79.2, [-0.1, 1.2, 3.7], [-0.25, 0.65, -0.3], 42], [80, [0, 1.25, 3.9], [-0.2, 0.65, -0.3], 42]],
  boss: [[80, [0, 1.35, 4.4], [0, 0.62, 0], 40], [81.8, [0, 1.25, 4.0], [0, 0.62, 0], 40], [82.4, [0.4, 1.05, 3.4], [0.05, 0.55, 0], 40], [85.9, [0.35, 1.1, 3.5], [0.05, 0.55, 0], 40],
    [86.0, [0, 1.3, 4.3], [0, 0.6, 0], 42], [90, [0, 1.35, 4.6], [0, 0.6, 0], 42]],
  gift: [[90, [0, 0.85, 2.6], [0, 0.5, 0], 40], [92.7, [0, 0.9, 2.8], [0, 0.52, 0], 40], [92.75, [0, 1.7, 6.8], [0, 0.42, -0.25], 34], [96, [0, 1.65, 6.5], [0, 0.42, -0.25], 34]],
};

/** Hero staging (9:16): a 2-1-2 pyramid on felt risers. [x, z, base height] */
const HERO: Record<DotId, [number, number, number]> = { pink: [-0.34, 0.42, 0], purple: [0.34, 0.42, 0], blue: [-0.36, -0.3, 0.46], green: [0.36, -0.3, 0.46], yellow: [0, -0.9, 0.92] };

const CAPS = new Set(['heist', 'target?', 'to-do', 'list!', 'zinda', 'monster', 'Dots', 'Dot', 'ek', 'OpenAI', 'always-on', 'cloud', 'computer', 'browser,', 'non-stop!', 'bug', 'hunt!',
  'fix', 'review', 'meltdown!', 'zero!', 'plan,', 'minutes', 'crash!', 'sambhaal', 'ChatGPT,', 'Slack', 'Teams', 'Hazaaron', 'apps',
  'read-only.', 'boss', 'Aap!', 'approval', 'control.', 'khatam.', 'Time...', 'DOTS,', 'Tech', 'Trek']);

export default class Dots extends Scene {
  private layer = new Layer2D();
  private rt!: THREE.WebGLRenderTarget;
  private s3 = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(40, COL.w / FXH, 0.02, 80);
  private px = 1;
  private cues!: Cues;
  private ly: LyLine[] = [];
  dots = {} as Record<DotId, DotRig>;
  private mon!: Monster;
  private sets = {} as Record<string, THREE.Group>;
  private lights!: { key: THREE.DirectionalLight; fill: THREE.HemisphereLight; rim: THREE.DirectionalLight; lamp: THREE.PointLight; spot: THREE.SpotLight };
  private cove!: THREE.Mesh; private coveMat!: THREE.MeshStandardMaterial; private rings: THREE.Mesh[] = []; private onePad!: THREE.Mesh;
  // props
  private laptopScr!: CanvasPlane; private sky!: CanvasPlane; private monitor!: CanvasPlane; private plan!: CanvasPlane;
  private codeTiles: CanvasPlane[] = []; private bugs: THREE.Group[] = []; private bigBug!: THREE.Group; private stampG!: THREE.Group;
  private phoneScr!: CanvasPlane; private smiley!: THREE.Mesh; private smileyRest!: Float32Array; private smileyFace!: THREE.Group; private cards: CanvasPlane[] = [];
  private rocket!: THREE.Group; private popups: CanvasPlane[] = []; private alarms: THREE.Mesh[] = []; private flame!: THREE.Mesh;
  private tiles: THREE.Group[] = []; private miniTiles!: THREE.InstancedMesh; private bubble!: CanvasPlane;
  private moon!: THREE.Mesh; private books: THREE.Mesh[] = []; private lantern!: THREE.PointLight; private lanternBall!: THREE.Mesh; private windowPane!: CanvasPlane; private blanket!: THREE.Mesh;
  private sendBtn!: THREE.Group; private sendCap!: THREE.Mesh; private crown!: THREE.Group;
  private gift!: THREE.Group; private lid!: THREE.Group; private clock!: CanvasPlane; private confetti!: THREE.InstancedMesh; private confettiSeed: number[][] = [];
  private shake = 0;
  private monFace = new THREE.Vector3();
  /** The official OpenAI logo, only if the user put the file in app/public/brand/openai-logo.png (never redrawn by us). */
  private oaLogo: ImageBitmap | null = null;

  ev(n: string): number { const v = this.cues.events[n]; if (typeof v !== 'number') throw new Error(`dots cue missing: ${n}`); return v; }
  evs(n: string): number[] { const v = this.cues.events[n]; if (!Array.isArray(v)) throw new Error(`dots cue list missing: ${n}`); return v; }
  sceneAt(t: number): SceneId { for (const [a, b, id] of this.cues.scenes) if (t >= a && t < b) return id; return 'gift'; }
  /** Word timings of the mascot (or narrator) line i, for mouth flaps. */
  private words(i: number): [number, number][] { return this.cues.speak[String(i)] ?? []; }
  private linesOf(who: string) { return this.ly.filter(l => l.who === who); }

  override async init() {
    const { renderer } = this.ctx;
    this.px = PH / FXH;
    this.cues = await (await fetch('/data/dots/cues.json')).json();
    try { this.ly = (await (await fetch('/data/lyrics.json')).json()).lines; } catch { /* captions optional */ }
    this.rt = new THREE.WebGLRenderTarget(Math.round(COL.w * this.px), PH, { type: THREE.HalfFloatType, samples: 4 });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    const pm = new THREE.PMREMGenerator(renderer); this.s3.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.s3.environmentIntensity = 0.45;
    this.buildStudio();
    for (const id of DOT_IDS) { const r = buildDot(id); this.dots[id] = r; this.s3.add(r.root, r.shadow); }
    this.mon = buildMonster(); this.s3.add(this.mon.root);
    try { this.oaLogo = await loadImg('brand/openai-logo.png'); } catch { this.oaLogo = null; }   // optional; else the credit is set in our own type
    this.buildSets();
  }

  // ------------------------------------------------------------------------------------------------ studio
  private box(parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, r = 0.02) {
    const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) * 0.49)), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o;
  }
  private group(name: string) { const g = new THREE.Group(); g.name = name; this.s3.add(g); this.sets[name] = g; return g; }
  private buildStudio() {
    const s = this.s3;
    s.background = new THREE.Color('#E9E8E6');
    // cyclorama: floor running into a curved back wall (no visible seam), soft white felt-paper
    const prof: [number, number][] = [];
    for (let i = 0; i <= 12; i++) prof.push([0, 8 - i * (8 / 12)]);
    for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push([1.6 - 1.6 * Math.cos(a), -1.6 * Math.sin(a)]); }
    for (let i = 1; i <= 10; i++) prof.push([1.6 + i * 0.8, -1.6]);
    const W = 30, cols = 2, pos: number[] = [], idx: number[] = [];
    prof.forEach(([y, z]) => { for (let c = 0; c <= cols; c++) pos.push(-W / 2 + (W * c) / cols, y, z - 1.4); });
    for (let r = 0; r < prof.length - 1; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + cols + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    this.coveMat = new THREE.MeshStandardMaterial({ color: '#F2F1EE', roughness: 0.95, side: THREE.DoubleSide });
    this.cove = new THREE.Mesh(g, this.coveMat); this.cove.receiveShadow = true; s.add(this.cove);
    // the grey ring motif behind the group
    const ringMat = new THREE.MeshStandardMaterial({ color: '#C9C8CC', roughness: 0.9 });
    for (let k = 0; k < 7; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.62 + k * 0.32, 0.011 + k * 0.0015, 8, 160), ringMat); r.position.set(0, 0.62, -1.45); s.add(r); this.rings.push(r); }
    // ONE dot: the felt pad all five stand on
    this.onePad = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.08, 0.05, 96), feltMat('#FFFFFF', '#ffffff', 0.97)); this.onePad.position.set(0, 0.025, -0.2); this.onePad.receiveShadow = true; s.add(this.onePad);
    for (const id of ['blue', 'green', 'yellow'] as DotId[]) { const [x, z, h] = HERO[id]; const r = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, h, 64), feltMat('#FFFFFF', '#ffffff', 0.95));
      r.position.set(x, h / 2 + 0.05, z); r.castShadow = r.receiveShadow = true; this.onePad.add(r); r.position.y -= 0.025; r.position.z -= -0.2; }
    // lights: warm key 45 deg (3:1 over fill), cool rim, hemisphere fill; a practical lamp and a spot for the button
    const key = new THREE.DirectionalLight('#FFF0DE', 1.9); key.position.set(-2.4, 4.2, 3.6); key.target.position.set(0, 0.4, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 6;
    Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 14 }); s.add(key, key.target);
    const rim = new THREE.DirectionalLight('#E4ECFF', 0.9); rim.position.set(2.5, 3.0, -3.5); s.add(rim);
    const fill = new THREE.HemisphereLight('#FFFFFF', '#E6DED4', 0.72); s.add(fill);
    const lamp = new THREE.PointLight('#FFC27A', 0, 6, 1.6); s.add(lamp);
    const spot = new THREE.SpotLight('#FFFFFF', 0, 9, 0.42, 0.6, 1.2); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); s.add(spot, spot.target);
    this.lights = { key, fill, rim, lamp, spot };
  }

  private buildSets() {
    const white = feltMat('#FFFFFF', '#ffffff', 0.96), grey = feltMat('#BFC2C8'), dark = feltMat('#2D3038'), ink = blackFelt();
    // 1 monster: a giant laptop on the studio floor (toy scale), screen glow
    { const g = this.group('monster');
      this.box(g, 1.5, 0.07, 0.95, feltMat('#C9CCD3'), 0, 0.035, 0.25, 0.03);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) this.box(g, 0.1, 0.02, 0.1, dark, -0.58 + c * 0.13, 0.08, 0.02 + r * 0.13, 0.01);
      const lid = new THREE.Group(); lid.position.set(0, 0.07, -0.2); lid.rotation.x = -0.18; g.add(lid);
      this.box(lid, 1.5, 0.95, 0.05, feltMat('#C9CCD3'), 0, 0.475, 0, 0.03);
      this.laptopScr = new CanvasPlane(1.36, 0.82, 640, 386, 1.0, false); this.laptopScr.mesh.position.set(0, 0.475, 0.027); lid.add(this.laptopScr.mesh);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.24, 32), feltMat('#F27FA3')); mug.position.set(1.05, 0.12, 0.35); mug.castShadow = true; g.add(mug);
      for (let k = 0; k < 5; k++) { const n = this.box(g, 0.16, 0.005, 0.16, feltMat(['#F5C63E', '#F6B3C6', '#9FD7A9', '#9CC0F7', '#F5C63E'][k]!), -1.0 + (k % 3) * 0.12, 0.004 + k * 0.004, 0.6 + Math.floor(k / 3) * 0.1, 0.002); n.rotation.y = k * 0.4; }
    }
    // 3 workshop: a felt cloud house in the sky (exterior) + the inside (bench, monitor, pegboard, blueprint)
    { const g = this.group('workshop');
      const ext = new THREE.Group(); ext.name = 'ext'; g.add(ext);
      this.sky = new CanvasPlane(14, 9, 256, 160, 1.0, false); this.sky.mesh.position.set(0, 2.5, -3.5); ext.add(this.sky.mesh);
      this.sky.draw((c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9EC4F5'); gr.addColorStop(1, '#E6F0FB'); c.fillStyle = gr; c.fillRect(0, 0, W, H); });
      const cl = feltMat('#FFFFFF', '#ffffff', 0.98);
      for (const [x, y, r] of [[0, 1.5, 1.0], [-0.9, 1.2, 0.75], [0.9, 1.2, 0.75], [-0.45, 2.1, 0.7], [0.5, 2.05, 0.65], [-1.5, 1.0, 0.5], [1.5, 1.0, 0.5]] as const) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), cl); m.position.set(x, y, -0.5); m.scale.z = 0.7; m.castShadow = m.receiveShadow = true; ext.add(m); }
      const door = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), feltMat('#3B74E6')); door.position.set(0, 1.25, 0.21); ext.add(door);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#F5C63E', metalness: 0.6, roughness: 0.3 })); knob.position.set(0.28, 1.2, 0.24); ext.add(knob);
      const sign = new CanvasPlane(0.9, 0.22, 512, 126, 1.0); sign.mesh.position.set(0, 1.85, 0.22); ext.add(sign.mesh);
      sign.draw((c, W, H) => { fillRR(c, 0, 0, W, H, 30, '#1B1B20'); c.font = ax(38, 112, 900); c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SECRET WORKSHOP', W / 2, H / 2 + 3); });
      const int = new THREE.Group(); int.name = 'int'; g.add(int);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), feltMat('#DCE6F7', '#ffffff')); wall.position.set(0, 1.6, -1.4); wall.receiveShadow = true; int.add(wall);
      this.box(int, 1.8, 0.06, 0.7, feltMat('#E8B67A'), 0, 0.5, -0.85, 0.02);
      for (const x of [-0.8, 0.8]) this.box(int, 0.06, 0.5, 0.6, feltMat('#D49A58'), x, 0.25, -0.85, 0.02);
      this.box(int, 1.1, 0.7, 0.05, dark, 0, 1.0, -1.05, 0.03);
      this.monitor = new CanvasPlane(1.02, 0.62, 832, 506, 1.0, false); this.monitor.mesh.position.set(0, 1.0, -1.02); int.add(this.monitor.mesh);
      this.box(int, 0.1, 0.25, 0.08, dark, 0, 0.62, -1.06, 0.02);
      const peg = this.box(int, 1.2, 0.8, 0.03, feltMat('#F2E6D2'), -1.5, 1.4, -1.35, 0.02); void peg;
      for (let k = 0; k < 6; k++) { const tl = this.box(int, 0.06, 0.3, 0.03, feltMat(['#F27FA3', '#4F86EE', '#F5C63E', '#55BE69', '#DD3E95', '#BFC2C8'][k]!), -1.95 + k * 0.18, 1.45 + (k % 2) * 0.1, -1.31, 0.015); tl.rotation.z = (k - 2.5) * 0.12; }
      this.plan = new CanvasPlane(0.62, 0.44, 620, 440, 1.0, false); int.add(this.plan.mesh);
      this.plan.draw((c, W, H) => { c.fillStyle = '#2E5FB8'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2;
        for (let x = 0; x < W; x += 31) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 31) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.fillStyle = '#FFFFFF'; c.font = ax(64, 125, 900); c.fillText('THE PLAN', 34, 90); c.font = mono(30, 600);
        ['1. to-do list ko pakdo', '2. bugs fix karo', '3. post ready karo', '4. approval lo'].forEach((r, k) => c.fillText(r, 40, 170 + k * 62));
        c.strokeStyle = '#FFFFFF'; c.lineWidth = 6; c.beginPath(); c.arc(W - 110, H - 100, 60, 0, Math.PI * 2); c.stroke(); c.font = ax(36, 100, 900); c.fillText('X', W - 122, H - 88); });
    }
    // 4 bug hunt: floor and walls of giant code tiles; little felt bugs; the big bug; the FIX stamp
    { const g = this.group('bughunt'); const r = mulberry32(31);
      const code = ['if (todo.length > 99) {', '  panic();', '}', 'const plan = dot.read(apps);', 'for (const b of bugs) fix(b);', 'await review(you);', 'return draft;', '// TODO: kal', 'let time = 0;', 'ship(it);'];
      for (let k = 0; k < 6; k++) {
        const cp = new CanvasPlane(1.3, 0.9, 512, 354, 1.0, false); const ox = (k % 3) - 1, oz = Math.floor(k / 3);
        cp.mesh.rotation.x = -Math.PI / 2; cp.mesh.position.set(ox * 1.32, 0.004, -0.5 + oz * 0.92); g.add(cp.mesh); this.codeTiles.push(cp);
        cp.draw((c, W, H) => { c.fillStyle = '#1E2230'; c.fillRect(0, 0, W, H); c.strokeStyle = '#2E3446'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6); c.font = mono(30, 600);
          for (let i = 0; i < 8; i++) { const s2 = code[(i + k * 3) % code.length]!; c.fillStyle = ['#8AB4FF', '#F5C63E', '#9FE3A8', '#F6B3C6', '#D5D9E3'][(i + k) % 5]!; c.fillText(s2, 24, 46 + i * 40); } });
      }
      for (let k = 0; k < 3; k++) { const cp = new CanvasPlane(1.3, 1.1, 512, 434, 1.0, false); cp.mesh.position.set((k - 1) * 1.32, 0.56, -0.98); g.add(cp.mesh); this.codeTiles.push(cp);
        cp.draw((c, W, H) => { c.fillStyle = '#262B3B'; c.fillRect(0, 0, W, H); c.font = mono(28, 600); for (let i = 0; i < 10; i++) { c.fillStyle = ['#8AB4FF', '#F5C63E', '#9FE3A8', '#D5D9E3'][(i + k) % 4]!; c.fillText(code[(i * 3 + k) % code.length]!, 20, 40 + i * 40); } }); }
      const mkBug = (sz: number, eye = '#FFFFFF') => {
        const b = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.06 * sz, 24, 16), feltMat('#2A2430')); body.scale.set(1, 0.6, 1.3); body.position.y = 0.05 * sz; body.castShadow = true; b.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.035 * sz, 16, 12), feltMat('#2A2430')); head.position.set(0, 0.055 * sz, 0.08 * sz); b.add(head);
        for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012 * sz, 10, 8), new THREE.MeshBasicMaterial({ color: eye })); e.position.set(sx * 0.015 * sz, 0.068 * sz, 0.108 * sz); b.add(e);
          const an = new THREE.Mesh(new THREE.CylinderGeometry(0.003 * sz, 0.003 * sz, 0.06 * sz, 6), ink); an.position.set(sx * 0.018 * sz, 0.095 * sz, 0.1 * sz); an.rotation.set(0.5, 0, -sx * 0.4); b.add(an);
          for (let l = 0; l < 3; l++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * sz, 0.004 * sz, 0.07 * sz, 6), ink); lg.position.set(sx * 0.055 * sz, 0.03 * sz, (l - 1) * 0.045 * sz); lg.rotation.z = sx * 1.1; lg.name = 'leg'; b.add(lg); } }
        const spot = new THREE.Mesh(new THREE.CircleGeometry(0.02 * sz, 16), new THREE.MeshBasicMaterial({ color: '#E8483C' })); spot.position.set(0, 0.087 * sz, 0); spot.rotation.x = -Math.PI / 2; b.add(spot);
        g.add(b); return b; };
      for (let k = 0; k < 9; k++) { const b = mkBug(1); b.userData.seed = [r() * 2.4 - 1.2, r() * 1.2 - 0.6, r() * 6.28, 0.6 + r()]; this.bugs.push(b); }
      this.bigBug = mkBug(3.2, '#FF5A4E');
      this.stampG = new THREE.Group(); g.add(this.stampG);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 40), feltMat('#2FA548')); st.castShadow = true; this.stampG.add(st);
      const hnd = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 20), feltMat('#E8B67A')); hnd.position.y = 0.2; hnd.castShadow = true; this.stampG.add(hnd);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), feltMat('#E8B67A')); knob.position.y = 0.38; knob.castShadow = true; this.stampG.add(knob);
      const lab = new CanvasPlane(0.3, 0.08, 256, 68, 1.0); lab.mesh.position.set(0, 0, 0.245); this.stampG.add(lab.mesh);
      lab.draw((c, W, H) => { c.font = ax(56, 125, 900); c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FIX', W / 2, H / 2 + 2); });
    }
    // 5 meltdown: the creator's phone on a stand, a ring light, the melting smiley, content cards
    { const g = this.group('meltdown');
      this.box(g, 0.52, 1.0, 0.06, feltMat('#2D3038'), 0, 0.8, -0.25, 0.07);
      this.phoneScr = new CanvasPlane(0.47, 0.94, 448, 896, 1.0, false); this.phoneScr.mesh.position.set(0, 0.8, -0.215); g.add(this.phoneScr.mesh);
      this.box(g, 0.08, 0.3, 0.08, grey, 0, 0.15, -0.3, 0.03); this.box(g, 0.5, 0.04, 0.4, grey, 0, 0.02, -0.3, 0.02);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 16, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF6E8').multiplyScalar(1.1), toneMapped: false })); ring.position.set(0, 0.8, -0.4); g.add(ring);
      const sg = new THREE.SphereGeometry(0.2, 64, 48); this.smiley = new THREE.Mesh(sg, feltMat('#F5C63E', '#FFF0B8')); this.smiley.castShadow = true;
      this.smileyRest = (sg.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array;
      const sm = new THREE.Group(); sm.position.set(-0.3, 0.0, 0.45); g.add(sm); sm.add(this.smiley); sm.name = 'smiley';
      this.smileyFace = new THREE.Group(); sm.add(this.smileyFace);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), glossBlack()); e.position.set(sx * 0.065, 0.24, 0.17); e.scale.z = 0.5; this.smileyFace.add(e); }
      const mo = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 24, Math.PI), ink); mo.position.set(0, 0.16, 0.185); mo.name = 'mouth'; this.smileyFace.add(mo);
      const sweat = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#BFE3FF', transmission: 0.5, roughness: 0.1, transparent: true, opacity: 0.85 })); sweat.position.set(0.15, 0.27, 0.12); sweat.name = 'sweat'; this.smileyFace.add(sweat);
      for (let k = 0; k < 4; k++) { const cp = new CanvasPlane(0.42, 0.17, 420, 170, 1.0); g.add(cp.mesh); this.cards.push(cp);
        const [tt, sub, col] = ([['HOOK', '“Aapki to-do list zinda hai!”', '#F27FA3'], ['CAPTIONS', 'Hinglish · 3 options', '#4F86EE'], ['THUMBNAIL IDEAS', '3 concepts', '#F5C63E'], ['CONTENT PLAN', '7 din · 7 posts', '#55BE69']] as const)[k]!;
        cp.draw((c, W, H) => { fillRR(c, 4, 4, W - 8, H - 8, 26, '#FFFFFF'); c.strokeStyle = col; c.lineWidth = 8; c.beginPath(); c.roundRect(4, 4, W - 8, H - 8, 26); c.stroke();
          fillRR(c, 26, 30, 26, 26, 6, col); c.fillStyle = INK; c.font = ax(42, 112, 900); c.fillText(tt, 66, 58); c.fillStyle = '#5A5F6B'; c.font = mono(24, 600); c.fillText(sub, 28, 120); c.fillStyle = col; c.font = mono(16, 700); c.fillText('DRAFT', W - 92, 150); }); }
    }
    // 6 launch: pad, rocket, gantry, alarm lights, error popups
    { const g = this.group('launch');
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.12, 64), grey); pad.position.y = 0.06; pad.receiveShadow = pad.castShadow = true; g.add(pad);
      this.rocket = new THREE.Group(); this.rocket.position.y = 0.12; g.add(this.rocket);
      const pts: THREE.Vector2[] = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(new THREE.Vector2(0.001 + 0.26 * Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 0.7 * (u < 0.15 ? 0.75 + u * 1.6 : 1), u * 1.5)); }
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), feltMat('#FFFFFF', '#ffffff', 0.98)); body.castShadow = true; this.rocket.add(body);
      const nose = new THREE.Mesh(new THREE.LatheGeometry(pts.filter(p => p.y > 1.05), 48), feltMat('#E8483C')); nose.castShadow = true; this.rocket.add(nose);
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), new THREE.MeshPhysicalMaterial({ color: '#9CC0F7', roughness: 0.1, clearcoat: 1 })); win.position.set(0, 0.85, 0.26); this.rocket.add(win);
      const winR = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 10, 32), grey); winR.position.copy(win.position); this.rocket.add(winR);
      for (let k = 0; k < 3; k++) { const f = this.box(this.rocket, 0.04, 0.32, 0.22, feltMat('#E8483C'), 0, 0.16, 0, 0.015); const a = (k / 3) * Math.PI * 2; f.position.set(Math.sin(a) * 0.24, 0.17, Math.cos(a) * 0.24); f.rotation.y = a; }
      const lab = new CanvasPlane(0.34, 0.1, 340, 100, 1.0); lab.mesh.position.set(0, 0.5, 0.262); this.rocket.add(lab.mesh);
      lab.draw((c, W, H) => { c.font = ax(66, 125, 900); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LAUNCH', W / 2, H / 2 + 3); });
      this.flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFB347').multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.9 }));
      this.flame.rotation.x = Math.PI; this.flame.position.y = -0.2; this.rocket.add(this.flame);
      for (const x of [-1.25, 1.25]) { this.box(g, 0.12, 2.0, 0.12, dark, x, 1.0, -0.3, 0.02); for (let k = 0; k < 5; k++) this.box(g, 0.5, 0.03, 0.03, dark, x * 0.85, 0.3 + k * 0.4, -0.3, 0.01);
        const al = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), new THREE.MeshBasicMaterial({ color: '#ff3b30', toneMapped: false })); al.position.set(x, 2.1, -0.3); g.add(al); this.alarms.push(al); }
      const msgs: [string, string][] = [['ERROR 500', 'server ne haar maan li'], ['CRASH!', 'checkout down'], ['!!!', '48 Slack pings'], ['BUG #404', 'button gayab']];
      msgs.forEach(([a, b], k) => { const cp = new CanvasPlane(0.62, 0.3, 496, 240, 1.0); g.add(cp.mesh); this.popups.push(cp);
        cp.draw((c, W, H) => { fillRR(c, 4, 4, W - 8, H - 8, 22, '#FFFFFF'); c.strokeStyle = '#E8483C'; c.lineWidth = 8; c.beginPath(); c.roundRect(4, 4, W - 8, H - 8, 22); c.stroke();
          fillRR(c, 4, 4, W - 8, 58, 22, '#E8483C'); c.fillStyle = '#FFFFFF'; c.font = mono(22, 700); c.fillText('● ● ●', 24, 42);
          c.fillStyle = INK; c.font = ax(56, 112, 900); c.fillText(a, 26, 132); c.fillStyle = '#5A5F6B'; c.font = mono(26, 600); c.fillText(b, 28, 190); }); });
    }
    // 7 connected: three big app tiles in our own type (no logos) + a swarm of small generic tiles + a chat bubble
    { const g = this.group('connected');
      (['ChatGPT', 'Slack', 'Teams'] as const).forEach((n, k) => {
        const tg = new THREE.Group(); g.add(tg); this.tiles.push(tg);
        this.box(tg, 0.5, 0.5, 0.12, white, 0, 0, 0, 0.1);
        const face = new CanvasPlane(0.44, 0.44, 352, 352, 1.0); face.mesh.position.z = 0.062; tg.add(face.mesh);
        face.draw((c, W, H) => { const col = ['#1B1B20', '#4F86EE', '#DD3E95'][k]!; fillRR(c, W / 2 - 46, 70, 92, 92, 46, col); c.fillStyle = '#FFFFFF'; c.font = ax(56, 100, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n[0]!, W / 2, 118);
          c.fillStyle = INK; c.font = ax(n.length > 5 ? 58 : 66, 112, 900); c.fillText(n, W / 2, 232); c.font = mono(20, 600); c.fillStyle = '#7A7F8B'; c.fillText('connected', W / 2, 290); });
      });
      const mt = new THREE.InstancedMesh(new RoundedBoxGeometry(0.12, 0.12, 0.03, 2, 0.025), feltMat('#FFFFFF', '#ffffff', 0.98), 48);
      const cols = ['#F6B3C6', '#4F86EE', '#F5C63E', '#55BE69', '#DD3E95', '#BFC2C8']; for (let i = 0; i < 48; i++) mt.setColorAt(i, new THREE.Color(cols[i % 6]!));
      mt.castShadow = true; g.add(mt); this.miniTiles = mt;
      this.bubble = new CanvasPlane(0.78, 0.3, 624, 240, 1.0); g.add(this.bubble.mesh);
      this.bubble.draw((c, W, H) => { fillRR(c, 4, 4, W - 8, H - 50, 40, '#FFFFFF'); c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(80, H - 50); c.lineTo(60, H - 6); c.lineTo(130, H - 50); c.fill();
        c.strokeStyle = '#DD3E95'; c.lineWidth = 6; c.beginPath(); c.roundRect(4, 4, W - 8, H - 50, 40); c.stroke();
        c.fillStyle = '#7A7F8B'; c.font = mono(24, 600); c.fillText('YOU · Slack', 34, 50); c.fillStyle = INK; c.font = ax(40, 105, 800); c.fillText('Launch report bana do?', 34, 118); });
    }
    // 8 sleeping: night bedroom (moon window, bed with a sleeping human under the blanket, a shelf of glowing app books)
    { const g = this.group('sleeping');
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), feltMat('#2B3566', '#5566aa')); wall.position.set(0, 2, -1.3); wall.receiveShadow = true; g.add(wall);
      this.windowPane = new CanvasPlane(0.9, 1.0, 256, 284, 1.0, false); this.windowPane.mesh.position.set(0.7, 1.55, -1.28); g.add(this.windowPane.mesh);
      this.moon = new THREE.Mesh(new THREE.CircleGeometry(0.13, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF3C8').multiplyScalar(1.4), toneMapped: false })); this.moon.position.set(0.88, 1.78, -1.27); g.add(this.moon);
      for (const [w, h, x, y] of [[0.98, 0.05, 0.7, 2.05], [0.98, 0.05, 0.7, 1.05], [0.05, 1.05, 0.25, 1.55], [0.05, 1.05, 1.15, 1.55], [0.03, 1.0, 0.7, 1.55]] as const) this.box(g, w, h, 0.04, feltMat('#E8E2D6'), x, y, -1.26, 0.01);
      this.box(g, 1.3, 0.3, 1.0, feltMat('#E8B67A'), 0.7, 0.15, -0.6, 0.05);
      this.box(g, 1.3, 0.5, 0.08, feltMat('#D49A58'), 0.7, 0.45, -1.1, 0.04);
      this.box(g, 0.5, 0.14, 0.32, white, 0.45, 0.37, -0.9, 0.06);
      const head = new THREE.Group(); head.position.set(0.42, 0.5, -0.86); g.add(head);
      const skin = new THREE.Mesh(new THREE.SphereGeometry(0.13, 40, 28), feltMat('#E8B38F', '#FFE0CC')); skin.castShadow = true; head.add(skin);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.135, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.5), feltMat('#3A2A22')); hair.rotation.x = -0.5; head.add(hair);
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 16, Math.PI), blackFelt()); e.position.set(sx * 0.045, -0.005, 0.125); e.rotation.z = Math.PI; head.add(e); }
      head.rotation.set(0.25, 0, 0.35); head.name = 'sleeper';
      const bg = new THREE.SphereGeometry(0.5, 48, 32); this.blanket = new THREE.Mesh(bg, feltMat('#7FA6E8', '#C9DAFF')); this.blanket.scale.set(1.2, 0.42, 0.85); this.blanket.position.set(0.75, 0.33, -0.5); this.blanket.castShadow = this.blanket.receiveShadow = true; g.add(this.blanket);
      this.box(g, 0.9, 1.3, 0.3, feltMat('#8C6A4A'), -1.0, 0.65, -1.0, 0.03);
      const names = ['MAIL', 'DOCS', 'CAL', 'SLACK', 'DRIVE', 'CRM', 'SHEET', 'NOTES'];
      for (let k = 0; k < 12; k++) { const row = Math.floor(k / 4), col = k % 4;
        const bk = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.3, 0.2, 2, 0.02), new THREE.MeshPhysicalMaterial({ color: ['#F6B3C6', '#9CC0F7', '#F5C63E', '#9FD7A9'][k % 4]!, roughness: 0.8, emissive: ['#F27FA3', '#4F86EE', '#E8AE10', '#2FA548'][k % 4]!, emissiveIntensity: 0 }));
        bk.position.set(-1.3 + col * 0.2, 0.3 + row * 0.42, -0.85); bk.castShadow = true; bk.userData.name = names[k % names.length]; g.add(bk); this.books.push(bk); }
      this.lantern = new THREE.PointLight('#FFD58A', 0, 3, 1.6); g.add(this.lantern);
      this.lanternBall = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE2A0').multiplyScalar(2), toneMapped: false })); g.add(this.lanternBall);
    }
    // 9 boss: the big red SEND button on a pedestal (spotlit) + a felt crown
    { const g = this.group('boss');
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.55, 48), white); ped.position.set(0, 0.275, -0.1); ped.castShadow = ped.receiveShadow = true; g.add(ped);
      this.sendBtn = new THREE.Group(); this.sendBtn.position.set(0, 0.55, -0.1); g.add(this.sendBtn);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.05, 48), dark); base.position.y = 0.025; this.sendBtn.add(base);
      this.sendCap = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.22, 0.1, 48), new THREE.MeshPhysicalMaterial({ color: '#ff2a1f', emissive: '#ff1a0f', emissiveIntensity: 0.25, roughness: 0.3, clearcoat: 1 }));
      this.sendCap.position.y = 0.1; this.sendCap.castShadow = true; this.sendBtn.add(this.sendCap);
      const lab = new CanvasPlane(0.34, 0.1, 340, 100, 1.0); lab.mesh.rotation.x = -Math.PI / 2; lab.mesh.position.set(0, 0.153, 0); this.sendCap.add(lab.mesh); lab.mesh.position.y = 0.051;
      lab.draw((c, W, H) => { c.font = ax(72, 125, 900); c.fillStyle = '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SEND', W / 2, H / 2 + 3); });
      this.crown = new THREE.Group(); g.add(this.crown);
      const gold = new THREE.MeshPhysicalMaterial({ color: '#F5C63E', metalness: 0.5, roughness: 0.35, clearcoat: 0.6 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 40, 1, true), gold); band.castShadow = true; this.crown.add(band);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 12), gold); sp.position.set(Math.sin(a) * 0.16, 0.09, Math.cos(a) * 0.16); this.crown.add(sp);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), new THREE.MeshBasicMaterial({ color: ['#F27FA3', '#4F86EE', '#55BE69', '#DD3E95', '#FFFFFF'][k]! })); gem.position.set(Math.sin(a) * 0.162, 0.0, Math.cos(a) * 0.162); this.crown.add(gem); }
    }
    // 10 gift: the to-do list folded into a gift box; a clock pops out
    { const g = this.group('gift');
      this.gift = new THREE.Group(); g.add(this.gift);
      this.box(this.gift, 0.5, 0.4, 0.5, feltMat('#4F86EE'), 0, 0.2, 0, 0.04);
      this.box(this.gift, 0.08, 0.405, 0.505, feltMat('#F5C63E'), 0, 0.2, 0, 0.02); this.box(this.gift, 0.505, 0.405, 0.08, feltMat('#F5C63E'), 0, 0.2, 0, 0.02);
      this.lid = new THREE.Group(); this.lid.position.set(0, 0.4, -0.27); this.gift.add(this.lid);
      this.box(this.lid, 0.56, 0.1, 0.56, feltMat('#4F86EE'), 0, 0.05, 0.27, 0.04); this.box(this.lid, 0.09, 0.105, 0.565, feltMat('#F5C63E'), 0, 0.05, 0.27, 0.02);
      for (const sx of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 10, 24), feltMat('#F5C63E')); loop.position.set(sx * 0.08, 0.15, 0.27); loop.rotation.y = sx * 0.6; loop.castShadow = true; this.lid.add(loop); }
      this.clock = new CanvasPlane(0.42, 0.42, 384, 384, 1.0); g.add(this.clock.mesh);
      const cf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.035, 0.06), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), 160);
      const r = mulberry32(9), cc = ['#F27FA3', '#4F86EE', '#F5C63E', '#55BE69', '#DD3E95'];
      for (let i = 0; i < 160; i++) { cf.setColorAt(i, new THREE.Color(cc[i % 5]!)); this.confettiSeed.push([r() * 2 - 1, r() * 2 - 1, 1.2 + r() * 1.8, r() * 6.28, r() * 6.28, 0.6 + r() * 0.8]); }
      this.confetti = cf; this.s3.add(cf); cf.visible = false;
    }
  }

  // ------------------------------------------------------------------------------------------------ camera
  private camera(t: number, sc: SceneId) {
    const ks = SHOTS[sc]; let i = 0; while (i < ks.length - 1 && t >= ks[i + 1]![0]) i++;
    const a = ks[i]!, b = ks[Math.min(i + 1, ks.length - 1)]!, u = b[0] > a[0] ? inOut((t - a[0]) / (b[0] - a[0])) : 0;
    const p = V(lerp(a[1][0], b[1][0], u), lerp(a[1][1], b[1][1], u), lerp(a[1][2], b[1][2], u));
    const q = V(lerp(a[2][0], b[2][0], u), lerp(a[2][1], b[2][1], u), lerp(a[2][2], b[2][2], u));
    const sh = this.shake; if (sh > 0) { p.x += sh * 0.03 * Math.sin(t * 71); p.y += sh * 0.025 * Math.sin(t * 89 + 1); }
    this.cam.position.copy(p); this.cam.fov = lerp(a[3], b[3], u); this.cam.aspect = COL.w / FXH; this.cam.updateProjectionMatrix(); this.cam.lookAt(q);
  }
  private proj(p: THREE.Vector3) { const v = p.clone().project(this.cam); return { x: (v.x * 0.5 + 0.5) * FXW, y: (-v.y * 0.5 + 0.5) * FXH, vis: v.z < 1 && v.z > -1 }; }
  private headOf(id: DotId) { const r = this.dots[id]; r.root.updateMatrixWorld(true); return r.root.localToWorld(V(0, r.spec.h * 1.05, 0)); }

  // ------------------------------------------------------------------------------------------------ direction
  private hideAll() {
    for (const g of Object.values(this.sets)) g.visible = false;
    for (const id of DOT_IDS) { this.dots[id].root.visible = false; this.dots[id].shadow.visible = false; }
    this.mon.root.visible = false; this.onePad.visible = false; this.rings.forEach(r => (r.visible = false)); this.confetti.visible = false;
    const L = this.lights; L.key.intensity = 1.9; L.key.color.set('#FFF0DE'); L.fill.intensity = 0.72; L.fill.color.set('#FFFFFF'); L.rim.intensity = 0.9; L.lamp.intensity = 0; L.spot.intensity = 0;
    this.s3.background = new THREE.Color('#E9E8E6'); this.coveMat.color.set('#F2F1EE'); this.cove.visible = true; this.shake = 0;
  }
  private show(id: DotId, p: DotPose) { const r = this.dots[id]; r.root.visible = true; r.shadow.visible = true; applyDot(r, p); }
  /** Rest pose at (x, z), facing the camera-ish, idling. */
  private at(id: DotId, t: number, x: number, z: number, rotY = 0) { const p = restDot(); p.x = x; p.z = z; p.rotY = rotY; return idleDot(p, t, DOT_IDS.indexOf(id) * 3 + 1); }
  /** Mouth flaps for every line this mascot says. */
  private speakAll(id: DotId, p: DotPose, t: number) { const who = { pink: 'P', blue: 'B', yellow: 'Y', green: 'G', purple: 'U' }[id]; for (const l of this.linesOf(who)) talk(p, t, this.words(l.i)); return p; }

  private direct(t: number, sc: SceneId) {
    this.hideAll(); this.sets[sc] && (this.sets[sc].visible = true);
    const e = (n: string) => this.ev(n), es = (n: string) => this.evs(n);
    const L = this.lights;
    if (sc === 'monster') {
      // night: dark navy studio
      this.s3.background = new THREE.Color('#141A33'); this.coveMat.color.set('#283160'); L.key.intensity = 0.35; L.key.color.set('#9DB0FF'); L.fill.intensity = 0.22; L.fill.color.set('#8090D0'); L.rim.intensity = 1.2;
      const cut = e('h.cut'), lock = e('h.lock');
      if (t < cut) {   // COLD OPEN: a spotlight slams on the heist crew (frame-0 pattern interrupt), they look into the lens, then glance off at the target
        this.sets.monster!.visible = false; this.rings.forEach(r => (r.visible = true)); this.onePad.visible = true;
        L.spot.intensity = 30; L.spot.position.set(0, 3.4, 2.2); L.spot.target.position.set(0, 0.55, -0.25); L.key.intensity = 0.25;
        this.shake = 0.8 * hit(t, 0, 0.18);
        const glance = outCubic(span(t, cut - 0.3, cut - 0.08));
        DOT_IDS.forEach((id, k) => {
          const [x, z, hb] = HERO[id]; const p = this.at(id, t, x, z, -x * 0.25); p.y += hb + 0.05; p.ex.floor = hb + 0.05;
          p.lookY = 0.15; p.lookX = glance; p.rotY += 0.35 * glance; p.sq += 0.25 * hit(t, 0.04, 0.12) * (k % 2 ? 1 : -1);
          if (id === 'blue') { p.lean += 0.18 * Math.sin(span(t, 0.55, 1.0) * Math.PI); p.ex.beret = 0.35 * Math.sin(span(t, 0.55, 1.0) * Math.PI * 2); }   // "shh"
          if (id === 'purple') { p.ex.glint = hit(t, e('h.heist') + 0.05, 0.35); p.tilt -= 0.12 * Math.sin(span(t, 0.95, 1.6) * Math.PI); }
          if (id === 'pink') { hop(p, t, 1.3, 0.4, 0.18); p.happy = 1; }
          if (id === 'yellow') p.ex.glassesUp = Math.sin(span(t, 1.45, 1.85) * Math.PI);
          if (id === 'green') p.ex.pupil = lerp(1, 1.25, span(t, 0.7, 0.9));
          this.show(id, p);
        });
        return;
      }
      L.lamp.intensity = 2.2 + 0.4 * Math.sin(t * 2.3); L.lamp.position.set(-1.0, 1.4, 0.8);
      const rise = t < e('m.roar') ? lerp(0.12, 0.52, outBack(span(t, cut, cut + 0.7))) + 0.04 * Math.sin(t * 9) * span(t, cut + 0.3, e('m.roar')) : lerp(0.52, 1, outBack(span(t, e('m.roar'), e('m.roar') + 0.55)));
      const lunge = span(t, e('m.lunge'), e('m.chomp'));
      const mouth = Math.max(hit(t, e('m.roar'), 0.6) * 1.0, ...es('m.count').map(x => 0.6 * hit(t, x, 0.25)), 0.4 * hit(t, e('m.kal'), 0.3), outCubic(lunge) * (t < e('m.chomp') ? 1 : 0)) + 0.15;
      this.mon.root.visible = true; this.mon.root.position.set(0, 0.08, 0.1); this.mon.root.rotation.set(0, 0, 0);
      const at = poseMonster(this.mon, t, { rise, lean: 0.15 + 0.6 * outCubic(lunge) + 0.25 * hit(t, e('m.roar'), 0.5), curl: 0.6 + 0.9 * hit(t, e('m.roar'), 0.5) - 0.9 * outCubic(lunge), sway: 0.12 + 0.08 * hit(t, e('m.roar'), 0.6), wobble: 1 + 2 * hit(t, e('m.roar'), 0.6) });
      drawMonster(this.mon, 0, Math.min(1, mouth), 1);
      const top = at(0.95); this.mon.eyes.position.set(top.x, top.y, top.z + 0.02); this.mon.eyes.rotation.x = -top.a;
      this.mon.eyes.scale.setScalar(t < lock ? 0.001 : outBack(span(t, lock, lock + 0.3)));   // it wakes when the crosshair locks on
      this.monFace = this.mon.eyes.getWorldPosition(new THREE.Vector3());
      this.mon.pupils.forEach((pu, i) => { pu.position.x = (i ? 1 : -1) * 0.17 + (t > e('m.pink') ? -0.05 : 0.02 * Math.sin(t * 3)); pu.position.y = -0.01 - (t > e('m.pink') ? 0.04 : 0); });
      this.shake = 1.2 * hit(t, e('m.roar'), 0.35) + 0.8 * hit(t, e('m.kal'), 0.2) + 1.2 * hit(t, e('m.chomp'), 0.2);
      this.laptopScr.draw((c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#DCE8FF'); gr.addColorStop(1, '#AFC6FF'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(20,26,51,0.7)'; c.font = mono(26, 700); for (let k = 0; k < 8; k++) c.fillText(['INBOX (100)', 'Meeting 9:00', 'Meeting 10:00', 'Meeting 11:30', 'DEADLINE!!!', 'Meeting 2:00', 'Meeting 4:00', 'Meeting 6:00'][k]!, 30, 50 + k * 42); });
      if (t >= e('m.pink')) {   // PINK peeks in, trembling: "Bachao!"
        const p = this.at('pink', t, -0.55, 0.85, 0.45); p.ex.worried = 1;
        p.y += 0.22 * outBack(span(t, e('m.pink'), e('m.pink') + 0.3)) - 0.22; p.sq += 0.35 * hit(t, e('m.scream'), 0.25) * -1; tremble(p, t, 1.5);
        if (t > e('m.lunge')) { p.x -= 0.4 * outCubic(span(t, e('m.lunge'), e('m.lunge') + 0.35)); p.tilt += 0.4; }
        this.show('pink', this.speakAll('pink', p, t));
      }
    } else if (sc === 'legends') {
      this.rings.forEach((r, k) => { r.visible = true; r.scale.setScalar(1 + 0.02 * Math.sin(t * 1.2 + k)); }); this.onePad.visible = true;
      const pos = HERO;
      const order: DotId[] = ['pink', 'blue', 'yellow', 'green', 'purple'], drops = es('l.drops'), roll = es('l.roll');
      const one = e('l.one');
      (this.onePad.material as THREE.MeshPhysicalMaterial).color.set(new THREE.Color('#FFFFFF').multiplyScalar(0.97 + 0.12 * hit(t, one, 0.6)));
      order.forEach((id, k) => {
        const [x, z, hb] = pos[id]; const p = this.at(id, t, x, z, -x * 0.25); p.y += hb + 0.05; p.ex.floor = hb + 0.05;
        const land = drops[k]!; if (t < land - 0.45) return;
        p.y += Math.max(0, 2.2 * (1 - span(t, land - 0.45, land)) ** 2);   // falls in from above and lands with a squash
        if (t >= land && t < land + 0.4) { const v = (t - land) / 0.4; p.sq += 0.42 * Math.exp(-v * 4) * Math.cos(v * Math.PI * 2.2); }
        if (t < land) p.sq -= 0.25;
        const rt = roll[k]!; if (t > rt - 0.3 && t < rt + 1.0) {   // roll call: each one's signature move
          if (id === 'pink') { hop(p, t, rt, 0.45, 0.22); p.happy = 1; }
          if (id === 'blue') { p.ex.beret = 0.5 * Math.sin(span(t, rt, rt + 0.6) * Math.PI); p.rotY += 0.4 * Math.sin(span(t, rt, rt + 0.6) * Math.PI * 2); p.lookX = 0.8; }
          if (id === 'yellow') { p.ex.glassesUp = Math.sin(span(t, rt, rt + 0.5) * Math.PI); p.tilt += 0.08; }
          if (id === 'green') { hop(p, t, rt, 0.5, 0.3); p.ex.pupil = 1.2; }
          if (id === 'purple') { p.tilt -= 0.12 * Math.sin(span(t, rt, rt + 0.7) * Math.PI); p.ex.glint = hit(t, rt + 0.15, 0.35); }
        }
        if (t > one && t < one + 0.8) p.happy = Math.max(p.happy, 0.6);
        this.show(id, this.speakAll(id, p, t));
      });
    } else if (sc === 'workshop') {
      const inside = t >= e('w.inside'), g = this.sets.workshop!;
      g.getObjectByName('ext')!.visible = !inside; g.getObjectByName('int')!.visible = inside; this.cove.visible = !inside ? false : false;
      if (!inside) { this.s3.background = new THREE.Color('#BCD6F7'); L.key.intensity = 1.3; }
      else {
        this.s3.background = new THREE.Color('#DCE6F7'); L.lamp.intensity = 1.2; L.lamp.position.set(0.6, 1.6, 0.4);
        const boot = span(t, e('w.inside') + 0.2, e('w.inside') + 0.7), br = span(t, e('w.browser'), e('w.browser') + 0.35), nonstop = t >= e('w.nonstop');
        this.monitor.draw((c, W, H) => {
          c.fillStyle = '#10131C'; c.fillRect(0, 0, W, H);
          if (boot > 0) { c.globalAlpha = boot; c.fillStyle = '#F4F6FB'; c.fillRect(0, 0, W, H); c.fillStyle = '#7A7F8B'; c.font = mono(26, 700); c.fillText('DOT · CLOUD COMPUTER', 30, 46);
            if (br <= 0) { ['#F27FA3', '#4F86EE', '#F5C63E', '#55BE69', '#DD3E95'].forEach((cc, i) => { const yy = H / 2 - 30 - 18 * Math.abs(Math.sin(t * 5 + i * 0.7)); c.fillStyle = cc; c.beginPath(); c.arc(W / 2 - 120 + i * 60, yy, 20, 0, Math.PI * 2); c.fill(); });
              c.fillStyle = '#1B1B20'; c.font = ax(40, 112, 900); c.textAlign = 'center'; c.fillText('ONLINE · ALWAYS-ON', W / 2, H / 2 + 60); c.textAlign = 'left';
              fillRR(c, W / 2 - 180, H / 2 + 100, 360, 16, 8, '#E3E8EF'); fillRR(c, W / 2 - 180, H / 2 + 100, 360 * sat((t - e('w.inside')) / 3), 16, 8, '#3B74E6'); }
            c.globalAlpha = 1; }
          if (br > 0) { const k = outBack(br); c.save(); c.translate(W / 2, H / 2 + 20); c.scale(k, k); c.translate(-W / 2, -H / 2 - 20);
            fillRR(c, 40, 80, W - 80, H - 120, 18, '#FFFFFF'); fillRR(c, 40, 80, W - 80, 52, 18, '#E7EAF1'); ['#F27FA3', '#F5C63E', '#55BE69'].forEach((cc, i) => fillRR(c, 62 + i * 30, 98, 16, 16, 8, cc));
            fillRR(c, 170, 92, W - 260, 28, 14, '#FFFFFF'); c.fillStyle = '#7A7F8B'; c.font = mono(18, 600); c.fillText('dot.browser / research', 186, 112);
            for (let i = 0; i < 6; i++) fillRR(c, 70, 170 + i * 44, (W - 200) * (0.5 + 0.5 * ((i * 37) % 10) / 10), 18, 9, i === 0 ? '#3B74E6' : '#DDE2EC');
            if (nonstop) { const a = t * 6; c.strokeStyle = '#3B74E6'; c.lineWidth = 8; c.beginPath(); c.arc(W - 120, H - 110, 34, a, a + 4.2); c.stroke(); }
            c.restore(); }
        });
        // BLUE sneaks to the bench with the plan, YELLOW and GREEN at the bench working
        const sh = e('w.shh');
        const y = this.at('yellow', t, -0.55, -0.3, 0.3); y.lookX = 0.6; y.lookY = 0.4; if (t > e('w.screen')) y.ex.glassesUp = 0.3 * Math.sin(t * 3); this.show('yellow', y);
        const gr = this.at('green', t, 0.55, -0.3, -0.3); gr.lookX = -0.6; gr.lookY = 0.4; if (t > e('w.nonstop')) hop(gr, t, e('w.nonstop'), 0.4, 0.12); this.show('green', gr);
        const b = this.at('blue', t, lerp(-0.9, 0, inOut(span(t, sh - 1.4, sh))), lerp(0.1, 0.25, span(t, sh - 1.4, sh)), 0);
        if (t < sh) { b.y += 0.04 * Math.abs(Math.sin(t * 7)); b.lean -= 0.1; }   // tiptoe
        b.ex.beret = t > sh ? 0.15 * Math.sin(t * 4) : 0; b.lookX = t > sh ? -0.2 : 0.7;
        this.show('blue', this.speakAll('blue', b, t));
        this.plan.mesh.visible = t > e('w.plan') - 0.25; const pk = outBack(span(t, e('w.plan') - 0.25, e('w.plan') + 0.2));
        this.plan.mesh.position.set(0.42, 0.42, 0.12); this.plan.mesh.scale.set(pk * 0.62, pk * 0.62, 1); this.plan.mesh.rotation.set(-0.1, -0.35, 0.05);
      }
    } else if (sc === 'bughunt') {
      this.s3.background = new THREE.Color('#1A1E2B'); this.coveMat.color.set('#20253A'); L.key.intensity = 1.1; L.fill.intensity = 0.4; L.rim.intensity = 1.2;
      this.codeTiles.forEach((cp, k) => { cp.mat.color.setScalar(0.85 + 0.15 * Math.sin(t * 2 + k)); });
      this.bugs.forEach((b, k) => { const [x0, z0, ph, sp] = b.userData.seed as number[]; const a = ph + t * sp; const squashed = t > e('b.squash') && k < 5;
        b.visible = !squashed; b.position.set(x0! + 0.15 * Math.cos(a), 0.0, z0! + 0.15 * Math.sin(a * 1.3)); b.rotation.y = -a + Math.PI / 2;
        b.children.forEach(ch => { if (ch.name === 'leg') ch.rotation.x = 0.4 * Math.sin(t * 30 + k); }); });
      // the big bug: hidden, pops up on "Bug mil gaya", chases BLUE, gets stamped
      const found = e('b.found'), chase = e('b.chase'), sq = e('b.squash');
      const bb = this.bigBug; bb.visible = t >= found - 0.1 && t < sq + 0.05;
      const cx = (u: number) => lerp(0.35, -0.75, u) + 0.35 * Math.sin(u * 5);
      if (t < chase) { bb.position.set(0.35, 0.0 - 0.15 * (1 - outBack(span(t, found, found + 0.3))), 0.15); bb.rotation.y = -0.6; }
      else { const u = span(t, chase, sq); bb.position.set(cx(u) + 0.25, 0, 0.2 + 0.15 * Math.sin(u * 6)); bb.rotation.y = -Math.PI / 2 + 0.5 * Math.cos(u * 5); }
      bb.children.forEach(ch => { if (ch.name === 'leg') ch.rotation.x = 0.6 * Math.sin(t * 34); });
      const y = this.at('yellow', t, 0.15, -0.25, 0); y.lookY = -0.6; y.lean = 0.25; y.ex.glassesUp = t < found ? 0 : 0.6 * hit(t, found, 0.4);
      if (t >= e('b.scan') && t < found) { y.rotY = 0.5 * Math.sin((t - e('b.scan')) * 3); y.lookX = Math.sin((t - e('b.scan')) * 3); }
      if (t > found && t < found + 0.4) { y.sq -= 0.25 * hit(t, found, 0.2); }
      this.show('yellow', this.speakAll('yellow', y, t));
      const b = this.at('blue', t, -0.45, 0.15, 0.3);
      if (t >= chase && t < sq + 0.4) { const u = span(t, chase, sq); b.x = cx(u) - 0.3 * Math.sign(Math.cos(u * 5) + 0.01) * 0 - 0.15; b.z = 0.25; b.rotY = -Math.PI / 2; b.y += 0.12 * Math.abs(Math.sin(t * 14)); b.lean = 0.25; b.sq -= 0.15; b.ex.beret = 0.4 * Math.sin(t * 20); b.lookX = 1; }
      if (t >= sq + 0.4) { b.x = -0.45; b.happy = 0.8; hop(b, t, sq + 0.6, 0.35, 0.1); }
      if (t >= found && t < chase) { b.sq -= 0.4 * hit(t, chase - 0.3, 0.2); }   // the take before running
      this.show('blue', this.speakAll('blue', b, t));
      // the FIX stamp drops on the bug (anticipation 0.5 s up, slam, 0.3 s hold, recover)
      const sx = cx(1) + 0.25; this.stampG.visible = t > sq - 0.6 && t < sq + 1.6;
      const sy = t < sq ? lerp(1.4, 0.9, outCubic(span(t, sq - 0.6, sq - 0.2))) - 0.84 * (span(t, sq - 0.08, sq) ** 2) : 0.06 + (t > sq + 0.5 ? 1.5 * inOut(span(t, sq + 0.5, sq + 1.4)) : 0);
      this.stampG.position.set(sx, sy, 0.38); this.stampG.scale.set(1 + 0.3 * hit(t, sq, 0.12), 1 - 0.25 * hit(t, sq, 0.12), 1 + 0.3 * hit(t, sq, 0.12));
      this.shake = 1.4 * hit(t, sq, 0.25);
    } else if (sc === 'meltdown') {
      this.s3.background = new THREE.Color('#F7E9EE'); this.coveMat.color.set('#FBEFF3');
      const melt = outCubic(span(t, e('c.melt'), e('c.melt') + 1.6)) * (1 - outBack(span(t, e('c.done'), e('c.done') + 0.5)));
      const pa = this.smiley.geometry.attributes.position as THREE.BufferAttribute, R0 = this.smileyRest;
      for (let i = 0; i < pa.count; i++) { const x = R0[i * 3]!, y = R0[i * 3 + 1]!, z = R0[i * 3 + 2]!, drop = melt * (0.2 + y) * 0.55;
        const spread = 1 + melt * Math.max(0, 0.05 - y) * 9; const ny = Math.max(-0.2 + 0.015, y - drop * (1 + 0.5 * Math.sin(x * 40 + z * 30) * 0.3));
        pa.setXYZ(i, x * spread, ny, z * spread); }
      pa.needsUpdate = true; this.smiley.geometry.computeVertexNormals(); this.smiley.position.y = 0.2;
      this.smileyFace.position.y = -0.17 * melt; this.smileyFace.rotation.z = 0.25 * melt;
      const mo = this.smileyFace.getObjectByName('mouth')!; mo.rotation.z = melt > 0.3 || t < e('c.melt') - 0.2 ? (t > e('c.done') ? Math.PI : 0) : Math.PI;
      if (t < e('c.melt')) mo.rotation.z = 0; if (t > e('c.done') + 0.2) mo.rotation.z = Math.PI;
      const sw = this.smileyFace.getObjectByName('sweat')!; sw.visible = t > e('c.post') && t < e('c.done'); sw.position.y = 0.27 - ((t * 0.6) % 0.2);
      const cards = es('c.cards');
      this.phoneScr.draw((c, W, H) => {
        c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H); c.fillStyle = '#1B1B20'; c.font = ax(40, 112, 900); c.fillText('NEW POST', 30, 70);
        const empty = cards.filter(x => t >= x).length;
        fillRR(c, 30, 100, W - 60, 300, 22, empty > 2 ? '#FDF1C9' : '#F1F2F5'); if (empty <= 2) { c.fillStyle = '#B4B8C2'; c.font = ax(120, 100, 900); c.textAlign = 'center'; c.fillText('?', W / 2, 300); c.textAlign = 'left'; }
        else { c.fillStyle = '#1B1B20'; c.font = ax(46, 112, 900); c.fillText('THUMBNAIL', 54, 230); c.font = mono(22, 600); c.fillText('3 concepts ready', 56, 280); }
        c.fillStyle = '#E8483C'; c.font = ax(34, 112, 900); c.fillText('POST: KAL!', 30, 460);
        c.fillStyle = '#1B1B20'; c.font = mono(26, 700); c.fillText('IDEAS:', 30, 530);
        const ideas = Math.min(4, empty); c.fillStyle = ideas ? '#2FA548' : '#E8483C'; c.font = ax(60, 112, 900); c.fillText(String(ideas), 160, 538);
        ['hook', 'captions', 'thumbnail', 'plan'].forEach((n, k) => { const on = t >= cards[k]!; fillRR(c, 30, 580 + k * 66, W - 60, 52, 14, on ? '#E9F7EC' : '#F1F2F5'); c.fillStyle = on ? '#2FA548' : '#B4B8C2'; c.font = mono(24, 700); c.fillText((on ? '✓ ' : '○ ') + n, 50, 614 + k * 66); });
      });
      this.cards.forEach((cp, k) => { const t0 = cards[k]!; const u = outCubic(span(t, t0 - 0.35, t0 + 0.1)); cp.mesh.visible = t > t0 - 0.35 && t < t0 + 0.9;
        cp.mesh.position.set(lerp(0.75, 0.02, u), lerp(0.45 + k * 0.05, 0.8 + (k - 1.5) * 0.2, u), lerp(0.55, -0.15, u)); cp.mesh.rotation.set(0, lerp(-0.6, 0, u), lerp(0.25, 0, u));
        const sc2 = lerp(1, 0.7, span(t, t0 + 0.2, t0 + 0.9)); cp.mesh.scale.setScalar(sc2); (cp.mat as THREE.MeshBasicMaterial).opacity = 1 - span(t, t0 + 0.6, t0 + 0.9); });
      if (t >= e('c.pink') - 0.4) {   // PINK slides in, DJ style, headphones on
        const p = this.at('pink', t, lerp(1.3, 0.34, outBack(span(t, e('c.pink') - 0.4, e('c.pink') + 0.1))), 0.45, -0.3);
        p.lean = -0.15 * hit(t, e('c.pink') + 0.1, 0.3); p.tilt = 0.25 * hit(t, e('c.pink') + 0.1, 0.25); p.happy = 1;
        cards.forEach(x => { if (t > x - 0.2 && t < x + 0.3) p.sq -= 0.15 * Math.sin(span(t, x - 0.2, x + 0.3) * Math.PI); });
        p.y += 0.03 * Math.abs(Math.sin(t * Math.PI * 2)) * (t > cards[0]! ? 1 : 0);   // bobbing to the beat
        this.show('pink', this.speakAll('pink', p, t));
      }
    } else if (sc === 'launch') {
      const crash = e('x.crash'), fr = e('x.freeze'), drop = e('x.drop'), lift = e('x.liftoff');
      const frozen = t >= fr && t < drop, tt = frozen ? fr : t;   // the freeze holds every pose at 53.00
      const bad = tt >= crash && tt < drop + 0.3;
      if (bad) { L.key.color.set('#FFB0A8'); this.coveMat.color.set('#F7E3E1'); }
      if (frozen) { L.key.intensity = 0.7; L.fill.intensity = 0.3; this.coveMat.color.set('#CFCFD2'); this.s3.background = new THREE.Color('#BDBDC2'); }
      this.alarms.forEach((a, k) => { a.visible = bad; (a.material as THREE.MeshBasicMaterial).color.set(new THREE.Color('#ff3b30').multiplyScalar(Math.sin(tt * 12 + k * 3) > 0 ? 2.2 : 0.3)); });
      const wob = bad ? 0.18 * Math.sin(tt * 9) * span(tt, crash, crash + 0.4) : 0;
      const up = t > lift ? 3.5 * span(t, lift, lift + 1.0) ** 2 : 0;
      this.rocket.rotation.set(0, 0, wob); this.rocket.position.set(0.03 * Math.sin(tt * 40) * (bad ? 1 : 0), 0.12 + up, 0);
      this.flame.visible = t > lift - 0.4; this.flame.scale.set(1, 0.8 + 0.3 * Math.sin(t * 40), 1);
      this.popups.forEach((cp, k) => { const t0 = crash + k * 0.18; const k2 = outBack(span(tt, t0, t0 + 0.3)); const gone = span(t, drop + 0.2 + k * 0.12, drop + 0.45 + k * 0.12);
        cp.mesh.visible = tt >= t0 && gone < 1; cp.mesh.position.set([-0.62, 0.6, -0.5, 0.55][k]!, [1.75, 1.45, 1.05, 0.8][k]! + gone * 0.3, 0.6 + k * 0.05);
        cp.mesh.rotation.z = [0.12, -0.1, -0.06, 0.1][k]! + gone * 2; cp.mesh.scale.setScalar(Math.max(0.001, k2 * (1 - gone))); });
      this.shake = (bad && !frozen ? 0.6 * hit(tt, crash, 0.5) + 0.15 : 0) + 1.0 * hit(t, drop, 0.3);
      if (t >= drop - 0.01) {   // PURPLE slides in on the drop: "Relax, yaar."
        const p = this.at('purple', t, lerp(-1.4, 0, outBack(span(t, drop, drop + 0.45))), 0.6, 0.15);
        p.tilt = -0.2 * (1 - span(t, drop + 0.3, drop + 0.9)); p.lean = -0.08; p.ex.glint = hit(t, drop + 0.5, 0.4); this.show('purple', this.speakAll('purple', p, t));
        const st = es('x.status'); (['yellow', 'blue', 'pink'] as DotId[]).forEach((id, k) => { if (t < st[k]! - 0.4) return;
          const q = this.at(id, t, [-0.75, 0.75, -0.45][k]!, [0.3, 0.3, 0.9][k]!, [0.4, -0.4, 0.3][k]!); hop(q, t, st[k]! - 0.25, 0.35, 0.15); q.happy = 0.5; this.show(id, q); });
      }
    } else if (sc === 'connected') {
      this.rings.forEach((r, k) => { r.visible = true; r.rotation.z = t * 0.05 * (k % 2 ? 1 : -1); r.scale.setScalar(1 + 0.03 * hit(t, this.evs('k.apps')[Math.min(2, k % 3)]!, 0.5)); });
      const p = this.at('purple', t, 0, 0.1, 0); p.ex.glint = hit(t, e('k.boss') - 0.2, 0.35); p.lookY = 0.3;
      es('k.apps').forEach(x => { if (t > x && t < x + 0.35) p.sq += 0.2 * hit(t, x, 0.15); });
      if (t > e('k.go')) { p.happy = 0.6; }
      this.show('purple', this.speakAll('purple', p, t));
      const apps = es('k.apps'), slots = [[-0.6, 0.98], [0, 1.18], [0.6, 0.98]];
      this.tiles.forEach((tg, k) => { const t0 = apps[k]!; tg.visible = t > t0 - 0.45; const u = outBack(span(t, t0 - 0.45, t0)); const [x, y] = slots[k]!;
        tg.position.set(lerp(x * 3.2, x, u), lerp(y + 1.2, y, u) + 0.02 * Math.sin(t * 2 + k), lerp(-1.2, 0.0, u)); tg.rotation.set(0, lerp(1.2, -x * 0.3, u), 0);
        const sc2 = t > e('k.many') ? lerp(1, 0.78, outCubic(span(t, e('k.many'), e('k.many') + 0.6))) : 1; tg.scale.setScalar(sc2); });
      const many = e('k.many'), m = new THREE.Matrix4(), q = new THREE.Quaternion(), sv = new THREE.Vector3();
      this.miniTiles.visible = t > many - 0.2;
      for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2 + t * 0.35, ring = i % 2 ? 1.25 : 1.0, u = outCubic(span(t, many + (i % 12) * 0.04, many + 0.5 + (i % 12) * 0.04));
        const pp = V(Math.cos(a) * ring * 0.85 * lerp(3.5, 1, u), 0.8 + Math.sin(a) * ring * 0.5 * lerp(3.5, 1, u), -0.4 + Math.sin(a * 2) * 0.2);
        q.setFromEuler(new THREE.Euler(0, 0, Math.sin(a + i) * 0.3)); sv.setScalar(u); m.compose(pp, q, sv); this.miniTiles.setMatrixAt(i, m); }
      this.miniTiles.instanceMatrix.needsUpdate = true;
      const msg = e('k.msg'); this.bubble.mesh.visible = t > msg - 0.1 && t < msg + 2.3; const bk = outBack(span(t, msg - 0.1, msg + 0.2));
      this.bubble.mesh.position.set(-0.3, 0.62, 0.5); this.bubble.mesh.scale.setScalar(Math.max(0.001, bk * (1 - span(t, msg + 2.0, msg + 2.3))));
    } else if (sc === 'sleeping') {
      const morning = span(t, e('s.morning'), 80);
      this.s3.background = new THREE.Color('#141A33'); this.cove.visible = false;
      L.key.intensity = lerp(0.25, 1.0, morning); L.key.color.set(morning > 0 ? '#FFD9B0' : '#9DB0FF'); L.fill.intensity = lerp(0.18, 0.4, morning); L.fill.color.set('#7080C0'); L.rim.intensity = 0.8;
      this.windowPane.draw((c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, morning > 0 ? '#F7B98A' : '#0E1430'); gr.addColorStop(1, morning > 0 ? '#FFE3B8' : '#24306A'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
        c.fillStyle = '#FFFFFF'; for (let k = 0; k < 14; k++) { const x = (k * 73) % W, y = (k * 41) % (H * 0.7); c.globalAlpha = (1 - morning) * (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + k))); c.fillRect(x, y, 3, 3); } c.globalAlpha = 1; });
      this.moon.visible = morning < 0.5;
      this.blanket.scale.set(1.2, 0.42 + 0.02 * Math.sin(t * 1.6), 0.85);   // slow breathing
      const gr0 = e('s.green'), read = e('s.read');
      const gx = lerp(0.2, -0.95, inOut(span(t, gr0 - 0.6, read))), gz = lerp(0.6, -0.4, inOut(span(t, gr0 - 0.6, read)));
      const g = this.at('green', t, gx, gz, t < read ? -0.9 : Math.PI * 0.85);
      if (t < read) { g.y += 0.05 * Math.abs(Math.sin(t * 6)); g.lean = -0.08; g.lookX = -0.8; }   // sneaky tiptoe
      else { g.lookY = 0.5; g.ex.pupil = 1.15; }
      this.show('green', this.speakAll('green', g, t));
      this.lantern.intensity = 1.6 * (1 - morning); const lp = this.headOf('green').add(V(0.15, -0.05, 0.1)); this.lantern.position.copy(lp); this.lanternBall.position.copy(lp); this.lanternBall.visible = morning < 1;
      this.books.forEach((bk, k) => { const on = t > read + k * 0.12; ((bk.material) as THREE.MeshPhysicalMaterial).emissiveIntensity = on ? 0.55 + 0.2 * Math.sin(t * 3 + k) : 0; });
    } else if (sc === 'boss') {
      this.s3.background = new THREE.Color('#D9D8DC'); this.coveMat.color.set('#E2E1E4'); L.key.intensity = 0.7; L.fill.intensity = 0.35;
      L.spot.intensity = 30; L.spot.position.set(0, 3.2, 1.2); L.spot.target.position.set(0, 0.5, -0.1);
      this.rings.forEach(r => (r.visible = true));
      const ap = e('o.approve'), sneak = e('o.sneak'), yank = e('o.yank');
      this.sendCap.position.y = 0.1 - 0.05 * Math.sin(span(t, ap, ap + 0.35) * Math.PI);
      (this.sendCap.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.25 + 0.25 * Math.sin(t * 4) + 1.5 * hit(t, ap, 0.4);
      this.crown.visible = t > e('o.aap') - 0.1 && t < sneak + 0.4; const ck = outBack(span(t, e('o.aap') - 0.1, e('o.aap') + 0.3));
      this.crown.position.set(0, 0.98, 0.9); this.crown.scale.setScalar(Math.max(0.001, ck * (1 - span(t, sneak, sneak + 0.4)))); this.crown.rotation.y = t * 1.5;
      // BLUE sneaks up to the button and hovers over it; YELLOW yanks BLUE back by the beret (gag); all wait for YOU
      const b = this.at('blue', t, 0.62, 0.5, -0.6);
      if (t >= sneak) { const u = inOut(span(t, sneak, e('o.ask'))); b.x = lerp(0.62, 0.22, u); b.z = lerp(0.5, 0.15, u); b.y += 0.04 * Math.abs(Math.sin(t * 7)) * (u < 1 ? 1 : 0); b.lookX = -0.8; b.lookY = -0.4; }
      if (t >= e('o.ask') && t < yank) { b.y += 0.32 * outCubic(span(t, e('o.ask'), e('o.ask') + 0.4)) + 0.02 * Math.sin(t * 9); b.lean = 0.3; b.x = 0.12; }
      if (t >= yank) { const u = outCubic(span(t, yank, yank + 0.35)); b.x = lerp(0.12, 0.6, u); b.z = lerp(0.15, 0.55, u); b.y += Math.max(0, 0.34 * (1 - u) + 0.2 * Math.sin(u * Math.PI)); b.tilt = -2 * Math.PI * u * (1 - span(t, yank + 0.35, yank + 0.6)); b.sq += 0.4 * hit(t, yank + 0.35, 0.15); b.ex.beret = 0.6 * hit(t, yank, 0.3); }
      if (t > yank + 0.7) { b.happy = 0; b.lookY = 0.3; b.mouth = 0; b.tilt = 0.12; }
      if (t > ap) { b.happy = 1; hop(b, t, ap + 0.25, 0.4, 0.15); }
      this.show('blue', this.speakAll('blue', b, t));
      const y = this.at('yellow', t, -0.48, 0.45, 0.4); if (t > yank - 0.4 && t < yank + 0.4) { y.x = lerp(-0.48, 0.0, Math.sin(span(t, yank - 0.4, yank + 0.4) * Math.PI)); y.lean = 0.2; }
      if (t > ap) { y.happy = 1; hop(y, t, ap + 0.35, 0.4, 0.12); } this.show('yellow', y);
      if (t > ap - 0.2) { this.confetti.visible = true; this.updateConfetti(t, ap, V(0, 0.9, 0.2)); }
    } else if (sc === 'gift') {
      this.rings.forEach((r, k) => { r.visible = true; r.scale.setScalar(1 + 0.04 * hit(t, e('g.end'), 0.6) * (k + 1) / 7); });
      L.key.color.set('#FFE9CC'); L.fill.intensity = 0.7;   // warm high-key finale
      const fold = e('g.fold'), open = e('g.open'), hero = e('g.hero');
      // the to-do list (now fully checked) shrinks and folds into the gift box
      if (t < fold + 0.2) { this.mon.root.visible = true; this.mon.root.position.set(0, 0, 0); this.mon.root.scale.setScalar(lerp(0.45, 0.05, inOut(span(t, fold - 0.2, fold + 0.2))));
        poseMonster(this.mon, t, { rise: 1, lean: 0, curl: 0.3, sway: 0.03, wobble: 0.2 }); drawMonster(this.mon, span(t, 90.0, fold - 0.1), 0, 0); this.mon.eyes.visible = false; }
      else { this.mon.root.scale.setScalar(1); this.mon.eyes.visible = true; }
      const gk = outBack(span(t, fold - 0.05, fold + 0.3)); this.gift.visible = t > fold - 0.05 && t < hero;
      this.gift.position.set(0, 0, 0); this.gift.scale.set(gk * (1 + 0.2 * hit(t, open, 0.15)), gk * (1 - 0.2 * hit(t, open, 0.15)), gk * (1 + 0.2 * hit(t, open, 0.15)));
      this.lid.rotation.x = -2.0 * outBack(span(t, open, open + 0.35)); this.lid.position.y = 0.4 + 0.1 * span(t, open, open + 0.2);
      this.clock.mesh.visible = t > open && t < hero; const ck = outBack(span(t, open, open + 0.45));
      this.clock.mesh.position.set(0, lerp(0.3, 0.85, ck), 0.05); this.clock.mesh.scale.setScalar(Math.max(0.001, ck));
      this.clock.draw((c, W, H) => { const cx = W / 2, cy = H / 2, R = W * 0.46; c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#F5C63E'; c.lineWidth = 18; c.stroke();
        c.fillStyle = INK; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.beginPath(); c.arc(cx + Math.sin(a) * R * 0.8, cy - Math.cos(a) * R * 0.8, 7, 0, Math.PI * 2); c.fill(); }
        const hA = -1.2 + t * 0.6, mA = t * 4.5; c.strokeStyle = INK; c.lineCap = 'round'; c.lineWidth = 14; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(hA) * R * 0.45, cy - Math.cos(hA) * R * 0.45); c.stroke();
        c.lineWidth = 9; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(mA) * R * 0.68, cy - Math.cos(mA) * R * 0.68); c.stroke(); c.fillStyle = '#F27FA3'; c.beginPath(); c.arc(cx, cy, 14, 0, Math.PI * 2); c.fill(); });
      if (t >= hero - 0.5) {   // hero: all five hop onto the ONE dot pad in front of the rings
        this.onePad.visible = true;
        const pos = HERO;
        DOT_IDS.forEach((id, k) => { const [x, z, hb] = pos[id]; const t0 = hero - 0.35 + k * 0.08; const p = this.at(id, t, x, z, -x * 0.25); p.y += hb + 0.05; p.ex.floor = hb + 0.05;
          p.y += Math.max(0, 1.6 * (1 - span(t, t0, t0 + 0.4)) ** 2); if (t < t0) return; hop(p, t, e('g.end') + k * 0.06, 0.4, 0.18); p.happy = 1;
          if (t > e('g.cta') + 0.4) hop(p, t, 95.0 + k * 0.05, 0.35, 0.1); this.show(id, p); });
      }
      if (t > e('g.end') - 0.1) { this.confetti.visible = true; this.updateConfetti(t, e('g.end'), V(0, 1.2, 0)); }
    }
  }
  private updateConfetti(t: number, t0: number, o: THREE.Vector3) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), d = Math.max(0, t - t0);
    this.confettiSeed.forEach(([dx, dz, v, a, b, sp], i) => {
      const p = V(o.x + dx! * (0.9 * d + 0.1), o.y + v! * d - 2.4 * d * d + 0.0, o.z + dz! * 0.6 * d + 0.2);
      if (p.y < 0.01) p.y = 0.01;
      q.setFromEuler(new THREE.Euler(a! + d * sp! * 6, b! + d * 5, 0)); m.compose(p, q, d > 0 ? s : new THREE.Vector3(0.001, 0.001, 0.001)); this.confetti.setMatrixAt(i, m);
    });
    this.confetti.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------------------------------------ 2D overlay
  /** Big title: springs in, holds, optional exit. */
  private big(c: CanvasRenderingContext2D, s: string, y: number, t0: number, t: number, col: string, size: number, t1 = 1e9, rot = -0.03) {
    if (t < t0 || t > t1 + 0.25) return;
    const k = springK(t, t0, 0.32, 0.45), out = span(t, t1, t1 + 0.25);
    c.save(); c.translate(FXW / 2, y); c.rotate(rot * (1 - out)); const sc = Math.max(0.001, k * (1 - out)); c.scale(sc, sc);
    c.font = ax(size, 125, 900); c.textAlign = 'center'; c.textBaseline = 'middle';
    const fit = Math.min(1, (FXW - 64) / (c.measureText(s).width + size * 0.3)); c.scale(fit, fit);
    c.lineJoin = 'round'; c.lineWidth = size * 0.22; c.strokeStyle = INK; c.strokeText(s, 0, 4); c.lineWidth = size * 0.14; c.strokeStyle = '#FFFFFF'; c.strokeText(s, 0, 0);
    c.fillStyle = col; c.fillText(s, 0, 0); c.restore();
  }
  private pill(c: CanvasRenderingContext2D, s: string, x: number, y: number, col: string, k: number, size = 20, fg = '#FFFFFF') {
    if (k <= 0.001) return; c.save(); c.font = ax(size, 112, 900); const w = c.measureText(s).width + size * 1.5;
    c.translate(x, y); c.scale(Math.min(1.15, k), Math.min(1.15, k)); fillRR(c, -w / 2, -size * 0.95, w, size * 1.9, size * 0.95, col);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 1); c.restore();
  }
  /** Speech bubble for a mascot line, anchored above its head. */
  private bubble2(c: CanvasRenderingContext2D, line: LyLine, t: number, id: DotId) {
    if (t < line.start - 0.08 || t > line.end + 0.3) return;
    const q = this.proj(this.headOf(id)); if (!q.vis) return;
    const k = springK(t, line.start - 0.08, 0.25, 0.5) * (1 - span(t, line.end + 0.15, line.end + 0.3)), col = DOTS[id].accent;
    const text = line.text, size = 26; c.save(); c.font = ax(size, 108, 900);
    const w = Math.min(FXW - 40, c.measureText(text).width + 44), h = 58, x = Math.max(20 + w / 2, Math.min(FXW - 20 - w / 2, q.x)), y = Math.max(220, q.y - 64);
    c.translate(x, y); c.scale(Math.max(0.001, k), Math.max(0.001, k));
    c.fillStyle = 'rgba(27,27,32,0.25)'; c.beginPath(); c.roundRect(-w / 2 + 3, -h / 2 + 5, w, h, 29); c.fill();
    fillRR(c, -w / 2, -h / 2, w, h, 29, '#FFFFFF'); c.lineWidth = 5; c.strokeStyle = col; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 29); c.stroke();
    const tx = Math.max(-w / 2 + 30, Math.min(w / 2 - 30, q.x - x)); c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(tx - 12, h / 2 - 3); c.lineTo(tx, h / 2 + 18); c.lineTo(tx + 12, h / 2 - 3); c.fill();
    c.strokeStyle = col; c.beginPath(); c.moveTo(tx - 12, h / 2); c.lineTo(tx, h / 2 + 18); c.lineTo(tx + 12, h / 2); c.stroke();
    // words appear as they are said
    c.fillStyle = INK; c.textAlign = 'left'; c.textBaseline = 'middle'; const full = c.measureText(text).width; let xx = -full / 2;
    for (const wd of line.words) { const on = t >= wd.start - 0.04; c.globalAlpha = on ? 1 : 0.18; c.fillText(wd.w, xx, 2); xx += c.measureText(wd.w + ' ').width; }
    c.restore();
  }
  /** Narrator captions (Roman Hinglish, karaoke), inside the Reels safe zone. */
  private captions(c: CanvasRenderingContext2D, t: number) {
    const line = this.ly.find(l => (l.who === 'N' || l.who === 'H') && t >= l.start - 0.05 && t <= l.end + 0.35); if (!line) return;
    const chunks: LyLine['words'][] = []; let cur: LyLine['words'] = [], len = 0;
    for (const w of line.words) { if (len + w.w.length > 22 && cur.length) { chunks.push(cur); cur = []; len = 0; } cur.push(w); len += w.w.length + 1; }
    if (cur.length) chunks.push(cur);
    let ci = chunks.findIndex(ch => t < ch[ch.length - 1]!.end + 0.05); if (ci < 0) ci = chunks.length - 1;
    const words = chunks[ci]!, y = 795;
    c.save(); c.font = ax(34, 100, 900); c.textBaseline = 'middle';
    const sp = c.measureText(' ').width * 1.5, widths = words.map(w => c.measureText(w.w.toUpperCase()).width + sp), total = widths.reduce((a, b) => a + b, 0) - sp;
    const fit = Math.min(1, (FXW - 64) / total); let x = FXW / 2 - (total * fit) / 2;
    const fade = sat((t - line.start + 0.1) / 0.12) * (1 - span(t, line.end + 0.2, line.end + 0.35));
    c.save(); c.globalAlpha = 0.82 * fade; fillRR(c, x - 18, y - 30, total * fit + 36, 60, 30, 'rgba(18,18,24,0.86)'); c.restore();
    words.forEach((w, j) => {
      const on = t >= w.start - 0.03, k = springK(t, w.start - 0.03, 0.22, 0.5), emph = CAPS.has(w.w);
      const s = (on ? lerp(1.15, 1, sat(k)) : 1) * fit, word = w.w.toUpperCase(), ww = (widths[j]! - sp) * fit;
      c.save(); c.translate(x + ww / 2, y); c.scale(s, s); c.textAlign = 'center';
      c.lineWidth = 7; c.strokeStyle = INK; c.lineJoin = 'round'; c.globalAlpha = (on ? 1 : 0.28) * fade;
      c.strokeText(word, 0, 0); c.fillStyle = emph ? '#F5C63E' : '#FFFFFF'; c.fillText(word, 0, 0); c.restore();
      x += widths[j]! * fit;
    });
    c.restore();
  }
  private overlay(c: CanvasRenderingContext2D, t: number, sc: SceneId) {
    const e = (n: string) => this.ev(n), es = (n: string) => this.evs(n);
    if (sc === 'monster') {
      const cut = e('h.cut'), lock = e('h.lock');
      this.big(c, 'AAJ RAAT…', 215, e('h.raat') - 0.2, t, '#FFFFFF', 58, e('h.heist') - 0.05);
      this.big(c, 'EK HEIST!', 215, e('h.heist'), t, '#F5C63E', 124, cut - 0.25, -0.05);
      if (t >= cut && t < e('m.roar') + 0.15) {   // the crosshair hunts, then locks on the list's face
        const q = this.proj(this.monFace), u = outCubic(span(t, cut, lock)), locked = t >= lock;
        const x = lerp(q.x + 150 * Math.sin(t * 7), q.x, u), y = lerp(q.y + 110 * Math.cos(t * 5), q.y, u), r = lerp(150, 92, u) * (1 + 0.15 * hit(t, lock, 0.15));
        c.save(); c.globalAlpha = 1 - span(t, e('m.roar') - 0.15, e('m.roar')); c.strokeStyle = '#E8483C'; c.lineWidth = locked ? 6 : 4; c.translate(x, y); c.rotate(locked ? 0 : t * 2);
        c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.12, 0, Math.PI * 2); c.stroke();
        for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(r * 0.55, 0); c.lineTo(r * 1.25, 0); c.stroke(); }
        c.restore();
      }
      this.big(c, 'TARGET:', 215, e('h.target'), t, '#E8483C', 80, e('m.roar') - 0.25);
      this.big(c, 'TO-DO LIST', 300, lock, t, '#FFFFFF', 80, e('m.roar') - 0.25, 0.03);
      const stats: [string, string][] = [['100 EMAILS', '#9CC0F7'], ['7 MEETINGS', '#F6B3C6'], ['DEADLINE: KAL', '#F5C63E']];
      es('m.count').forEach((t0, k) => this.pill(c, stats[k]![0], FXW / 2 + [-110, 110, 0][k]!, 236 + [0, 0, 66][k]!, stats[k]![1], springK(t, t0, 0.28, 0.5) * (1 - span(t, e('m.pink'), e('m.pink') + 0.2)), 24, INK));
      if (t > e('m.kal') && t < e('m.pink')) this.big(c, 'KAL THI!', 400, e('m.kal'), t, '#E8483C', 70, e('m.pink'), -0.08);
      if (t >= e('m.chomp')) { c.fillStyle = INK; c.globalAlpha = span(t, e('m.chomp'), e('m.chomp') + 0.08); c.fillRect(0, 0, FXW, FXH); c.globalAlpha = 1; }
    }
    if (sc === 'legends') {
      this.big(c, 'DOTS', 215, e('l.title'), t, '#FFFFFF', 150, e('l.one') - 0.05);
      this.byOpenAI(c, FXW / 2, 290, springK(t, e('l.title') + 0.25, 0.3, 0.55) * (1 - span(t, e('l.one') - 0.25, e('l.one') - 0.05)));
      if (t > e('l.one')) this.big(c, '5 CHEHRE · 1 DOT', 215, e('l.one'), t, '#F5C63E', 56, es('l.roll')[0]! - 0.2, 0.02);
      const roll = es('l.roll');
      DOT_IDS.forEach((id, k) => { const t0 = roll[k]!, t1 = (roll[k + 1] ?? 20.25) - 0.05; if (t < t0 - 0.05 || t > t1) return;
        this.big(c, DOTS[id].skill, 215, t0, t, DOTS[id].accent, 96, t1 - 0.2, k % 2 ? 0.03 : -0.03); this.pill(c, DOTS[id].name, FXW / 2, 292, INK, springK(t, t0 + 0.1, 0.3, 0.6), 18); });
      if (t > e('l.one') && t < roll[0]! - 0.1) this.pill(c, 'ONE DOT · 5 SKILLS', FXW / 2, 285, INK, springK(t, e('l.one') + 0.25, 0.3, 0.6), 17);
    }
    if (sc === 'workshop') {
      if (t < e('w.inside')) this.big(c, 'SECRET WORKSHOP', 215, 20.25, t, INK, 64, e('w.inside') - 0.05);
      this.pill(c, 'OPENAI KA ALWAYS-ON AGENT', FXW / 2, 290, INK, springK(t, e('w.openai'), 0.3, 0.55) * (1 - span(t, e('w.cloud') - 0.2, e('w.cloud'))), 19);
      if (t > e('w.cloud') - 0.05) this.big(c, 'APNA CLOUD COMPUTER', 215, e('w.cloud'), t, '#4F86EE', 52, e('w.browser') - 0.1);
      if (t > e('w.browser') - 0.05) this.big(c, 'APNA BROWSER', 215, e('w.browser'), t, INK, 64, e('w.nonstop') - 0.1);
      if (t > e('w.nonstop') - 0.05) this.big(c, 'NON-STOP', 215, e('w.nonstop'), t, '#F5C63E', 84, e('w.shh') - 0.1);
    }
    if (sc === 'bughunt') {
      this.big(c, 'BUG HUNT', 250, e('b.title'), t, '#F5C63E', 100, e('b.found') - 0.1);
      if (t > e('b.squash') - 0.02 && t < e('b.squash') + 0.25) { c.save(); c.globalAlpha = 0.85 * (1 - span(t, e('b.squash'), e('b.squash') + 0.25)); c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, FXW, FXH); c.restore(); }   // impact flash
      if (t > e('b.squash')) this.big(c, 'SPLAT!', 300, e('b.squash'), t, '#55BE69', 90, e('b.fix') - 0.1, 0.08);
      this.pill(c, '✓ FIX READY', FXW / 2, 250, '#2FA548', springK(t, e('b.fix'), 0.3, 0.5), 30);
      this.pill(c, 'REVIEW: AAPKA', FXW / 2, 330, INK, springK(t, e('b.review'), 0.3, 0.5), 24);
      this.label(c, 'ILLUSTRATIVE');
    }
    if (sc === 'meltdown') {
      this.big(c, 'CREATOR MELTDOWN', 215, e('c.melt'), t, '#E8483C', 58, e('c.pink') - 0.1, 0.03);
      if (t > e('c.zero')) this.big(c, 'IDEA: ZERO', 290, e('c.zero'), t, INK, 60, e('c.pink') - 0.1, -0.04);
      if (t > e('c.done') - 0.05) this.big(c, 'MINUTES MEIN', 215, e('c.done'), t, '#55BE69', 70, 49.9);
      this.label(c, 'ILLUSTRATIVE');
    }
    if (sc === 'launch') {
      const fr = e('x.freeze'), drop = e('x.drop');
      this.big(c, 'LAUNCH DAY', 230, e('x.launch'), t, INK, 84, e('x.crash') - 0.05);
      if (t > e('x.crash') && t < drop) this.big(c, 'CRASH!', 260, e('x.crash'), t < fr ? t : fr, '#E8483C', 120, drop, -0.1);
      if (t > fr && t < drop) { c.save(); c.fillStyle = 'rgba(20,20,26,0.15)'; c.fillRect(0, 0, FXW, FXH); c.font = mono(22, 700); c.fillStyle = INK; c.textAlign = 'center'; c.fillText('❚❚  PAUSED', FXW / 2, 420); c.restore(); }
      if (t > drop + 1.2) {
        const st = es('x.status'), items = ['STATUS CHECK', 'FIX LIST', 'TEAM UPDATE (DRAFT)'];
        this.big(c, 'SAMBHAAL LIYA', 230, drop + 1.25, t, '#55BE69', 62, 59.9);
        items.forEach((s, k) => this.pill(c, '✓ ' + s, FXW / 2, 300 + k * 56, k === 2 ? '#4F86EE' : '#2FA548', springK(t, st[k]!, 0.3, 0.5), 21));
      }
      this.label(c, 'ILLUSTRATIVE');
    }
    if (sc === 'connected') {
      const apps = es('k.apps');
      if (t < e('k.many')) this.big(c, 'WAHIN JAHAN AAP HO', 205, 60.25, t, INK, 50, e('k.many') - 0.05);
      if (t > e('k.many') - 0.05) this.big(c, '4,000+ APPS', 205, e('k.many'), t, '#DD3E95', 92, e('k.boss') - 0.3);
      void apps;
      if (t > e('k.go') - 0.05 && t < e('k.boss') - 0.3) this.pill(c, 'KAAM SHURU ▶', FXW / 2, 282, '#2FA548', springK(t, e('k.go'), 0.3, 0.5), 22);
    }
    if (sc === 'sleeping') {
      this.big(c, 'JAB AAP SO RAHE THE…', 230, 70.25, t, '#FFFFFF', 46, e('s.read') - 0.1);
      if (t < e('s.morning')) { const z = (k: number) => { const u = ((t * 0.6 + k / 3) % 1); c.save(); c.globalAlpha = Math.sin(u * Math.PI) * 0.9; c.font = ax(28 + 18 * u, 112, 900); c.fillStyle = '#C9DAFF'; c.fillText('Z', FXW * 0.72 + 30 * u + k * 6, 520 - 120 * u); c.restore(); }; [0, 1, 2].forEach(z); }
      if (t > e('s.read') - 0.05) this.big(c, 'PROACTIVE RESEARCH', 230, e('s.read'), t, '#F5C63E', 50, 79.9);
      if (t > e('s.lock') - 0.05) { const k = springK(t, e('s.lock'), 0.3, 0.5);   // glass focus: READ-ONLY
        c.save(); c.translate(FXW / 2, 330); c.scale(Math.max(0.001, k), Math.max(0.001, k)); c.fillStyle = 'rgba(255,255,255,0.86)'; c.beginPath(); c.roundRect(-190, -42, 380, 84, 42); c.fill();
        c.strokeStyle = '#55BE69'; c.lineWidth = 5; c.stroke(); c.fillStyle = INK; c.font = ax(36, 112, 900); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🔒 READ-ONLY', 0, 2); c.restore(); }
      this.pill(c, '✗ SEND NAHI', FXW / 2 - 100, 410, '#E8483C', springK(t, e('s.nosend'), 0.3, 0.5), 20);
      this.pill(c, '✗ EDIT NAHI', FXW / 2 + 100, 410, '#E8483C', springK(t, e('s.noedit'), 0.3, 0.5), 20);
      if (t > e('s.morning')) this.pill(c, '☀ MORNING BRIEF READY', FXW / 2, 480, '#F5C63E', springK(t, e('s.morning') + 0.2, 0.3, 0.5), 20, INK);
    }
    if (sc === 'boss') {
      this.big(c, 'BOSS KAUN?', 225, 80.25, t, INK, 84, e('o.aap') - 0.05);
      if (t > e('o.aap') - 0.05) this.big(c, 'AAP.', 225, e('o.aap'), t, '#F5C63E', 150, e('o.sneak') + 0.3);
      this.approval(c, t);
      if (t > e('o.rules') - 0.05) this.big(c, 'AAPKE RULES · AAPKA CONTROL', 230, e('o.rules'), t, '#55BE69', 40, 89.9);
    }
    if (sc === 'gift') {
      if (t < e('g.hero')) this.big(c, 'TIME WAPAS AAPKA', 240, e('g.open'), t, '#F5C63E', 64, e('g.hero') - 0.05);
      if (t > e('g.hero') - 0.05) {
        this.big(c, 'DOTS', 190, e('g.hero'), t, '#FFFFFF', 120);
        this.pill(c, 'COMMENT  “DOTS”', FXW / 2, 735, '#DD3E95', springK(t, e('g.cta'), 0.3, 0.45), 30);
        this.byOpenAI(c, FXW / 2, 262, springK(t, e('g.hero') + 0.25, 0.3, 0.55) * (1 - span(t, e('g.brand') - 0.25, e('g.brand') - 0.05)));
        this.pill(c, 'FOLLOW · TECH PE TREK', FXW / 2, 262, INK, springK(t, e('g.brand'), 0.3, 0.5), 18);
      }
    }
    // standing labels: fan-made (always), captions, mascot bubbles
    c.save(); c.font = mono(11, 700); c.fillStyle = sc === 'monster' || sc === 'bughunt' || sc === 'sleeping' ? 'rgba(255,255,255,0.6)' : 'rgba(27,27,32,0.5)'; c.textAlign = 'right'; c.fillText('FAN-MADE · UNOFFICIAL · NOT AN OPENAI VIDEO', FXW - 18, 64); c.restore();
    const roll0 = this.evs('l.roll')[0]! - 0.1, roll1 = 20.25;
    for (const l of this.ly) { if (l.who === 'N' || l.who === 'H' || (l.start >= roll0 && l.start < roll1)) continue; const id = ({ P: 'pink', B: 'blue', Y: 'yellow', G: 'green', U: 'purple' } as Record<string, DotId>)[l.who]!; if (this.dots[id].root.visible) this.bubble2(c, l, t, id); }
    this.captions(c, t);
  }
  /** "BY OPENAI" credit: the official logo file when present, else our own type. */
  private byOpenAI(c: CanvasRenderingContext2D, x: number, y: number, k: number) {
    if (k <= 0.001) return; const size = 18; c.save(); c.translate(x, y); c.scale(Math.min(1.15, k), Math.min(1.15, k)); c.font = ax(size, 112, 900);
    const lg = this.oaLogo, lh = 26, lw = lg ? (lg.width / lg.height) * lh : 0, by = c.measureText('BY ').width;
    const w = (lg ? by + lw : c.measureText('BY OPENAI').width) + size * 1.6, h = size * 2.0;
    fillRR(c, -w / 2, -h / 2, w, h, h / 2, '#FFFFFF'); c.lineWidth = 2.5; c.strokeStyle = INK; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.stroke();
    c.fillStyle = INK; c.textBaseline = 'middle'; c.textAlign = 'left';
    if (lg) { const x0 = -(by + lw) / 2; c.fillText('BY', x0, 1); c.drawImage(lg, x0 + by, -lh / 2, lw, lh); }
    else { c.textAlign = 'center'; c.fillText('BY OPENAI', 0, 1); }
    c.restore();
  }
  private label(c: CanvasRenderingContext2D, s: string) { c.save(); c.font = mono(11, 700); c.fillStyle = 'rgba(27,27,32,0.55)'; c.textAlign = 'left'; c.fillText(s, 18, 64); c.restore(); }
  private approval(c: CanvasRenderingContext2D, t: number) {
    const card = this.ev('o.card'), ap = this.ev('o.approve'); if (t < card - 0.1) return;
    const k = springK(t, card - 0.1, 0.3, 0.55), done = t >= ap, x = 70, y = 300, w = FXW - 140, h = 210;
    c.save(); c.globalAlpha = sat(k * 2) * (1 - span(t, ap + 1.5, ap + 1.9));
    fillRR(c, x, y + 6, w, h, 28, 'rgba(27,27,32,0.25)'); fillRR(c, x, y, w, h, 28, '#FFFFFF'); c.lineWidth = 5; c.strokeStyle = done ? '#2FA548' : '#F5C63E'; c.beginPath(); c.roundRect(x, y, w, h, 28); c.stroke();
    c.fillStyle = done ? '#2FA548' : INK; c.font = ax(28, 112, 900); c.textBaseline = 'alphabetic'; c.fillText(done ? '✓ APPROVED' : 'DOT POOCHH RAHA HAI', x + 26, y + 48);
    c.fillStyle = '#5A5F6B'; c.font = mono(17, 600); c.fillText('Launch email team ko bhejun?', x + 26, y + 86);
    c.fillStyle = '#9A9FAB'; c.font = mono(12, 600); c.fillText('illustrative · aapke approval rules', x + 26, y + 110);
    const by = y + 132; fillRR(c, x + 26, by, 196, 56, 16, '#2FA548'); fillRR(c, x + 240, by, 160, 56, 16, '#EEF0F3');
    c.fillStyle = '#FFFFFF'; c.font = ax(22, 112, 900); c.textAlign = 'center'; c.fillText('APPROVE', x + 124, by + 36); c.fillStyle = INK; c.fillText('HOLD', x + 320, by + 36); c.textAlign = 'left';
    if (t > ap - 0.7 && t < ap + 0.7) {   // YOUR tap
      const u = outCubic(span(t, ap - 0.7, ap)), fx = lerp(FXW * 0.75, x + 124, u), fy = lerp(FXH * 0.85, by + 30, u);
      c.globalAlpha = 0.95; c.fillStyle = '#F2C9A8'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(fx + 18, fy + 60, 26, 62, -0.35, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = alpha('#2FA548', 0.9 * hit(t, ap, 0.3)); c.lineWidth = 4; c.beginPath(); c.arc(fx, fy, 18 + 60 * (1 - hit(t, ap, 0.3)), 0, Math.PI * 2); c.stroke();
      this.pill(c, 'YOU', fx + 58, fy + 120, INK, 1 - span(t, ap + 0.3, ap + 0.7), 14);
    }
    c.restore();
  }

  // ------------------------------------------------------------------------------------------------ sheet (variant dots_sheet)
  private sheet(t: number) {
    this.hideAll(); this.rings.forEach(r => (r.visible = true)); this.onePad.visible = true;
    const pos = HERO;
    DOT_IDS.forEach((id, k) => { const [x, z, hb] = pos[id]; const p = this.at(id, t, x, z, 0.3 * Math.sin(t * 0.8 + k)); p.y += hb + 0.05; p.ex.floor = hb + 0.05; if (t > 1) hop(p, t, 1.5 + k * 0.4, 0.45, 0.2); this.show(id, p); });
    const c0: Key = [0, [0, 1.55, 4.5], [0, 0.7, -0.25], 34]; this.cam.position.set(...c0[1]); this.cam.fov = c0[3]; this.cam.aspect = COL.w / FXH; this.cam.updateProjectionMatrix(); this.cam.lookAt(V(...c0[2]));
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx, t = f.t, H = out.height, sheet = !!this.ctx.params.sheet;
    const sc = this.sceneAt(t);
    if (sheet) this.sheet(t); else { this.direct(t, sc); this.camera(t, sc); }
    renderer.setRenderTarget(this.rt); renderer.setClearColor(this.s3.background as THREE.Color, 1); renderer.clear(); renderer.render(this.s3, this.cam);
    clearRT(renderer, out);
    const cx = Math.round(COL.x * this.px);
    out.viewport.set(cx, 0, this.rt.width, H); out.scissor.set(cx, 0, this.rt.width, H); out.scissorTest = true;
    comp.draw(renderer, this.rt.texture, out, { mode: 'replace', premult: false });
    out.viewport.set(0, 0, out.width, out.height); out.scissorTest = false;
    const c = this.layer.ctx; this.layer.clear();
    c.save(); c.translate(COL.x, 0); c.beginPath(); c.rect(0, 0, FXW, FXH); c.clip();
    if (!sheet) this.overlay(c, t, sc);
    else { c.font = ax(40, 125, 900); c.fillStyle = INK; c.fillText('THE DOTS', 32, 230); c.font = mono(12, 600); c.fillStyle = 'rgba(27,27,32,0.6)'; c.fillText('5 skills · 1 dot · fan-made character sheet', 32, 258); }
    c.restore();
    comp.draw(renderer, this.layer.upload(), out);
    return { hud: 0, frame: 0, pdoom: 0, bloom: 0, halation: 0, grain: 0, ca: 0, vignette: 0, shake: [0, 0], zoom: 1 };
  }
  override dispose() { this.layer.texture.dispose(); this.rt?.dispose(); }
}
void [WARM, BONE, blobTex, ease, glossBlack];
