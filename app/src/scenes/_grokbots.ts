// Grok Bot reel: the six-bot crew (character bible as code). Original characters for an illustrative reel, not official
// Grok Bot avatars; role names after monokern's independent agent-council demo (projects/grok-bot-reel/FACTS.md).
// Every bot shares one rig (hips, torso, head, 2-joint arms and legs, eyelids) and differs in silhouette, proportions,
// colours, face and props. Poses are plain data; applyPose() is the only thing that touches the scene graph, so a bot's
// look at time t is a pure function of the Pose computed for t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type BotId = 'helm' | 'scout' | 'archive' | 'forge' | 'sentinel' | 'relay';
export const BOT_IDS: BotId[] = ['helm', 'scout', 'archive', 'forge', 'sentinel', 'relay'];

export interface BotSpec {
  id: BotId; name: string; role: string; accent: string; shell: string; trim: string;
  /** Overall height (m) and proportions. */
  h: number; torsoW: number; torsoD: number; headR: number; legLen: number; armLen: number;
  head: 'dome' | 'round' | 'wedge' | 'helmet' | 'crest';
  eye: 'orbit' | 'monocle' | 'twin' | 'goggles' | 'slit' | 'visor';
  /** Gait: stride (m) and step bounce (m). */
  stride: number; bounce: number;
}

export const SPECS: Record<BotId, BotSpec> = {   // cute redesign (user, 2026-10-19): big heads, chubby bodies, pastel shells
  helm: { id: 'helm', name: 'HELM', role: 'COORDINATOR', accent: '#13A9CF', shell: '#FFFFFF', trim: '#C7D2DE',
    h: 1.06, torsoW: 0.4, torsoD: 0.34, headR: 0.3, legLen: 0.2, armLen: 0.28, head: 'dome', eye: 'orbit', stride: 0.3, bounce: 0.035 },
  scout: { id: 'scout', name: 'SCOUT', role: 'RESEARCH', accent: '#46B82A', shell: '#D9F6DF', trim: '#8ED39E',
    h: 0.9, torsoW: 0.34, torsoD: 0.3, headR: 0.27, legLen: 0.18, armLen: 0.24, head: 'round', eye: 'monocle', stride: 0.34, bounce: 0.05 },
  archive: { id: 'archive', name: 'ARCHIVE', role: 'CONTEXT', accent: '#3F6CF2', shell: '#CCD8FF', trim: '#8199EA',
    h: 0.96, torsoW: 0.44, torsoD: 0.38, headR: 0.29, legLen: 0.16, armLen: 0.26, head: 'helmet', eye: 'twin', stride: 0.24, bounce: 0.03 },
  forge: { id: 'forge', name: 'FORGE', role: 'CREATE', accent: '#E8920E', shell: '#FFEAD4', trim: '#E6A35A',
    h: 0.98, torsoW: 0.4, torsoD: 0.34, headR: 0.29, legLen: 0.18, armLen: 0.27, head: 'round', eye: 'goggles', stride: 0.28, bounce: 0.035 },
  sentinel: { id: 'sentinel', name: 'SENTINEL', role: 'REVIEW', accent: '#E8483C', shell: '#FFFFFF', trim: '#F2A29A',
    h: 1.0, torsoW: 0.38, torsoD: 0.32, headR: 0.28, legLen: 0.2, armLen: 0.27, head: 'wedge', eye: 'slit', stride: 0.29, bounce: 0.03 },
  relay: { id: 'relay', name: 'RELAY', role: 'SHIP', accent: '#8A5CF6', shell: '#E7DDFF', trim: '#B49CF1',
    h: 0.94, torsoW: 0.34, torsoD: 0.3, headR: 0.27, legLen: 0.22, armLen: 0.26, head: 'crest', eye: 'visor', stride: 0.36, bounce: 0.045 },
};

export interface Pose {
  x: number; z: number; rotY: number;
  /** Extra height (jumps, drops) and body bob, metres. */
  y: number;
  lean: number; twist: number; side: number;
  headYaw: number; headPitch: number; headRoll: number;
  /** [shoulder pitch (+ forward), shoulder roll (+ out), elbow bend (+)] */
  armL: [number, number, number]; armR: [number, number, number];
  /** [hip pitch (+ forward), knee bend (+)] */
  legL: [number, number]; legR: [number, number];
  /** 0 open .. 1 closed */
  blink: number;
  /** Eye glow multiplier and colour override (null = accent). */
  eye: number; eyeColor: string | null;
  /** Bot-specific extras: panels (ARCHIVE fold-out), squash, etc. */
  ex: Record<string, number>;
}

export const restPose = (): Pose => ({
  x: 0, z: 0, rotY: 0, y: 0, lean: 0, twist: 0, side: 0, headYaw: 0, headPitch: 0, headRoll: 0,
  armL: [0.05, 0.12, 0.25], armR: [0.05, 0.12, 0.25], legL: [0, 0], legR: [0, 0], blink: 0, eye: 1, eyeColor: null, ex: {},
});

export function mixPose(a: Pose, b: Pose, w: number): Pose {
  const m = (p: number, q: number) => p + (q - p) * w;
  const ang = (p: number, q: number) => { let d = q - p; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return p + d * w; };
  const ex: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a.ex), ...Object.keys(b.ex)])) ex[k] = m(a.ex[k] ?? 0, b.ex[k] ?? 0);
  return {
    x: m(a.x, b.x), z: m(a.z, b.z), rotY: ang(a.rotY, b.rotY), y: m(a.y, b.y), lean: m(a.lean, b.lean), twist: m(a.twist, b.twist), side: m(a.side, b.side),
    headYaw: m(a.headYaw, b.headYaw), headPitch: m(a.headPitch, b.headPitch), headRoll: m(a.headRoll, b.headRoll),
    armL: [m(a.armL[0], b.armL[0]), m(a.armL[1], b.armL[1]), m(a.armL[2], b.armL[2])],
    armR: [m(a.armR[0], b.armR[0]), m(a.armR[1], b.armR[1]), m(a.armR[2], b.armR[2])],
    legL: [m(a.legL[0], b.legL[0]), m(a.legL[1], b.legL[1])], legR: [m(a.legR[0], b.legR[0]), m(a.legR[1], b.legR[1])],
    blink: m(a.blink, b.blink), eye: m(a.eye, b.eye), eyeColor: w < 0.5 ? a.eyeColor : b.eyeColor, ex,
  };
}

interface Limb { a: THREE.Group; b: THREE.Group; end: THREE.Group }
export interface Rig {
  spec: BotSpec; root: THREE.Group; body: THREE.Group; torso: THREE.Group; head: THREE.Group;
  armL: Limb; armR: Limb; legL: Limb; legR: Limb;
  eyeMat: THREE.MeshBasicMaterial; lids: THREE.Object3D[]; panels: THREE.Group[]; hipY: number;
  /** Hand sockets for props (world transform via hand.end). */
  handL: THREE.Group; handR: THREE.Group;
}

const geo = {
  rbox: (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 4, r),
  caps: (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 14),
  sph: (r: number, ws = 28, hs = 20) => new THREE.SphereGeometry(r, ws, hs),
};

export function shellMat(hex: string, rough = 0.32) {
  return new THREE.MeshPhysicalMaterial({ color: hex, roughness: rough, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new THREE.Color('#ffffff') });
}
export function darkMat() { return new THREE.MeshPhysicalMaterial({ color: '#0A0E15', roughness: 0.12, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.05 }); }
export function glowMat(hex: string, k = 3) { const c = new THREE.Color(hex); c.multiplyScalar(k); return new THREE.MeshBasicMaterial({ color: c, toneMapped: false }); }

function mesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}

/** Builds one bot (cute: big round head, chubby body, short limbs). Origin at floor level between the feet, facing +z. */
export function buildBot(id: BotId): Rig {
  const s = SPECS[id];
  const shell = shellMat(s.shell, 0.35), trim = shellMat(s.trim, 0.45), dark = darkMat(), accent = shellMat(s.accent, 0.35);
  const eyeBase = new THREE.Color('#ffffff').lerp(new THREE.Color(s.accent), 0.3);
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeBase.clone().multiplyScalar(2.2), toneMapped: false });
  const root = new THREE.Group(); root.name = s.name; root.userData.eyeBase = eyeBase;
  const body = new THREE.Group(); root.add(body);
  const footH = 0.06, hipY = footH + s.legLen, R = s.headR;
  const torsoH = Math.max(0.24, s.h - hipY - R * 1.84 + 0.06);
  const hips = new THREE.Group(); hips.position.y = hipY; body.add(hips);
  const torso = new THREE.Group(); torso.position.y = 0.0; hips.add(torso);
  // chubby egg body + belly screen
  const tb = mesh(geo.sph(s.torsoW * 0.56, 36, 26), shell, torso, 0, torsoH * 0.5, 0); tb.scale.set(1, torsoH / (s.torsoW * 1.0), s.torsoD / s.torsoW);
  const bz = s.torsoW * 0.56 * (s.torsoD / s.torsoW) + 0.004;   // front of the egg body
  const badge = mesh(new THREE.CircleGeometry(s.torsoW * 0.15, 32), accent, torso, 0, torsoH * 0.5, bz); badge.castShadow = false;
  const belly = mesh(new THREE.CircleGeometry(s.torsoW * 0.06, 24), eyeMat, torso, 0, torsoH * 0.5, bz + 0.002); belly.castShadow = false;
  // big round head
  const head = new THREE.Group(); head.position.y = torsoH + R * 0.82; torso.add(head);
  const lids: THREE.Object3D[] = [];
  const skull = mesh(geo.sph(R, 40, 30), shell, head);
  if (s.head === 'dome') {
    skull.scale.set(1.08, 1.0, 1.0);
    mesh(geo.caps(0.012, 0.11), trim, head, 0, R * 1.05, 0);
    mesh(geo.sph(0.035), accent, head, 0, R * 1.05 + 0.1, 0);
    const halo = mesh(new THREE.TorusGeometry(R * 0.55, 0.012, 8, 48), accent, head, 0, R * 1.32, 0); halo.rotation.x = Math.PI / 2; halo.castShadow = false;
  } else if (s.head === 'round') {
    skull.scale.set(1.05, 0.97, 1.0);
    if (s.eye === 'monocle') { mesh(geo.caps(0.01, 0.07), trim, head, -R * 0.35, R * 1.0, 0).rotation.z = 0.5; mesh(geo.sph(0.028), accent, head, -R * 0.48, R * 1.1, 0); }
    if (s.eye === 'goggles') {   // goggles pushed up on the forehead
      const strap = mesh(new THREE.TorusGeometry(R * 1.0, 0.022, 8, 48), trim, head, 0, R * 0.42, 0); strap.rotation.x = Math.PI / 2 - 0.25;
      for (const sx of [-1, 1]) { const g = mesh(new THREE.TorusGeometry(R * 0.2, 0.035, 10, 30), accent, head, sx * R * 0.32, R * 0.62, R * 0.72); g.rotation.x = -0.45; }
    }
  } else if (s.head === 'helmet') {
    skull.scale.set(1.1, 0.96, 1.02);
    for (const sx of [-1, 1]) { const cup = mesh(new THREE.CylinderGeometry(R * 0.32, R * 0.32, 0.08, 28), accent, head, sx * R * 1.08, 0, 0); cup.rotation.z = Math.PI / 2; }
    const band = mesh(new THREE.TorusGeometry(R * 1.08, 0.02, 8, 40, Math.PI), trim, head, 0, 0, 0); band.rotation.z = 0; band.rotation.y = Math.PI / 2;
  } else if (s.head === 'wedge') {
    skull.scale.set(1.0, 1.0, 1.0);
    const crest = mesh(geo.rbox(0.05, R * 0.55, R * 0.8, 0.02), accent, head, 0, R * 0.95, -R * 0.1); crest.rotation.x = -0.25;
  } else {
    skull.scale.set(0.98, 1.0, 1.04);
    for (const sx of [-1, 1]) { const f = mesh(geo.rbox(0.035, R * 0.7, R * 0.45, 0.015), accent, head, sx * R * 0.98, R * 0.45, -R * 0.1); f.rotation.z = sx * 0.35; }
  }
  // face screen: a curved patch of a slightly larger sphere (hugs the head); eyes + smile sit on it, facing outward
  const FR = R * 1.012, sk = skull.scale;
  const facePatch = new THREE.Mesh(new THREE.SphereGeometry(FR, 48, 32, Math.PI / 2 - 0.78, 1.56, Math.PI / 2 - 0.5, 0.98), dark);
  facePatch.scale.copy(sk); head.add(facePatch);
  const onFace = (o: THREE.Object3D, x: number, y: number, lift = 0.006) => {
    const n = new THREE.Vector3(x / (FR * sk.x), y / (FR * sk.y), 0); n.z = Math.sqrt(Math.max(0.05, 1 - n.x * n.x - n.y * n.y));
    o.position.set(n.x * FR * sk.x, n.y * FR * sk.y, n.z * FR * sk.z).addScaledVector(n, lift);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.normalize()); return o;
  };
  const eye = (x: number, w = R * 0.25, h = R * 0.36) => { const g = geo.sph(1, 24, 16); g.scale(w / 2, h / 2, 0.012); const e = new THREE.Mesh(g, eyeMat); head.add(onFace(e, x, R * 0.04)); lids.push(e); return e; };
  const eyeZ = R;   // (props below that referenced the old flat face)
  if (s.eye === 'slit') { eye(-R * 0.3, R * 0.3, R * 0.2); eye(R * 0.3, R * 0.3, R * 0.2); }   // SENTINEL: focused, squinty
  else { eye(-R * 0.3); eye(R * 0.3); }
  if (s.eye === 'monocle') { const m = new THREE.Mesh(new THREE.TorusGeometry(R * 0.25, 0.02, 8, 36), accent); head.add(onFace(m, R * 0.3, R * 0.04, 0.012)); }
  const mouthPivot = new THREE.Group(); head.add(onFace(mouthPivot, 0, -R * 0.27));
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(R * 0.11, 0.012, 6, 24, Math.PI), eyeMat); mouth.rotation.z = Math.PI; mouthPivot.add(mouth); void eyeZ;
  root.userData.mouth = mouth;
  // short arms with round mitten hands
  const arm = (sx: number): Limb => {
    const a = new THREE.Group(); a.position.set(sx * (s.torsoW * 0.5 + 0.02), torsoH * 0.72, 0); torso.add(a);
    const up = s.armLen * 0.5;
    mesh(geo.caps(0.05, Math.max(0.01, up - 0.06)), shell, a, 0, -up / 2, 0);
    const b = new THREE.Group(); b.position.y = -up; a.add(b);
    mesh(geo.caps(0.046, Math.max(0.01, up - 0.06)), id === 'forge' ? accent : shell, b, 0, -up / 2, 0);
    const end = new THREE.Group(); end.position.y = -up; b.add(end);
    mesh(geo.sph(0.06), trim, end, 0, -0.025, 0);
    return { a, b, end };
  };
  const armL = arm(1), armR = arm(-1);
  // stubby legs, round feet
  const leg = (sx: number): Limb => {
    const a = new THREE.Group(); a.position.set(sx * s.torsoW * 0.24, hipY, 0); body.add(a);
    const up = s.legLen * 0.5;
    mesh(geo.caps(0.056, Math.max(0.01, up - 0.06)), trim, a, 0, -up / 2, 0);
    const b = new THREE.Group(); b.position.y = -up; a.add(b);
    mesh(geo.caps(0.056, Math.max(0.01, up - 0.06)), trim, b, 0, -up / 2, 0);
    const end = new THREE.Group(); end.position.y = -up; b.add(end);
    mesh(geo.rbox(0.13, footH, 0.17, 0.028), accent, end, 0, -footH / 2 + 0.005, 0.025);
    return { a, b, end };
  };
  const legL = leg(1), legR = leg(-1);
  const panels: THREE.Group[] = [];
  if (id === 'archive') for (const sx of [-1, 1]) {   // fold-out drawers on the sides of the body
    const pn = new THREE.Group(); pn.position.set(sx * s.torsoW * 0.5, torsoH * 0.5, -s.torsoD * 0.25); torso.add(pn);
    mesh(geo.rbox(0.04, torsoH * 0.5, s.torsoD * 0.7, 0.015), accent, pn, 0, 0, s.torsoD * 0.35);
    for (let k = 0; k < 2; k++) mesh(new THREE.BoxGeometry(0.044, 0.01, s.torsoD * 0.45), shell, pn, sx * 0.004, (k - 0.5) * 0.06, s.torsoD * 0.35);
    panels.push(pn);
  }
  if (id === 'sentinel') {   // magnifier
    const m = new THREE.Group(); m.position.set(0, -0.06, 0.03); armR.end.add(m);
    mesh(geo.caps(0.012, 0.08), trim, m, 0, -0.03, 0);
    const ring = mesh(new THREE.TorusGeometry(0.065, 0.014, 10, 36), accent, m, 0, -0.12, 0); ring.rotation.y = Math.PI / 2;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.058, 32), new THREE.MeshPhysicalMaterial({ color: '#dff4ff', transparent: true, opacity: 0.35, roughness: 0.05 }));
    lens.position.set(0, -0.12, 0); lens.rotation.y = Math.PI / 2; m.add(lens);
  }
  if (id === 'relay') mesh(geo.rbox(s.torsoW * 0.62, torsoH * 0.6, 0.1, 0.035), accent, torso, 0, torsoH * 0.52, -s.torsoD * 0.5 - 0.02);   // delivery backpack
  return { spec: s, root, body, torso, head, armL, armR, legL, legR, eyeMat, lids, panels, hipY, handL: armL.end, handR: armR.end };
}

const tmpC = new THREE.Color();
/** Writes a Pose into the rig. */
export function applyPose(r: Rig, p: Pose) {
  r.root.position.set(p.x, p.y, p.z); r.root.rotation.set(0, p.rotY, 0);
  const sq = p.ex.squash ?? 0;   // landing squash / anticipation (volume-preserving)
  r.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
  r.torso.rotation.set(p.lean, p.twist, p.side);
  r.head.rotation.set(p.headPitch, p.headYaw, p.headRoll, 'YXZ');
  const arm = (l: Limb, v: [number, number, number], sx: number) => { l.a.rotation.set(-v[0], 0, sx * v[1]); l.b.rotation.set(-v[2], 0, 0); };
  arm(r.armL, p.armL, 1); arm(r.armR, p.armR, -1);
  const leg = (l: Limb, v: [number, number]) => { l.a.rotation.set(-v[0], 0, 0); l.b.rotation.set(v[1], 0, 0); l.end.rotation.set(-(v[1] - v[0]) * 0.6, 0, 0); };
  leg(r.legL, p.legL); leg(r.legR, p.legR);
  const s = r.spec, L = s.legLen * 0.5;   // keep the planted foot on the floor
  const legH = (v: [number, number]) => L * Math.cos(v[0]) + L * Math.cos(v[0] - v[1]);
  r.body.position.y = Math.max(legH(p.legL), legH(p.legR)) - s.legLen;
  const happy = p.ex.happy ?? 0;   // eyes squash shut to blink; happy = smiling crescent eyes
  for (const e of r.lids) e.scale.y = Math.max(0.08, 1 - 0.92 * p.blink - 0.6 * happy);
  const mouth = r.root.userData.mouth as THREE.Mesh; mouth.scale.set(1 + 0.6 * happy, 1 + 0.8 * happy, 1);
  if (p.eyeColor) tmpC.set(p.eyeColor).multiplyScalar(3 * p.eye); else tmpC.copy(r.root.userData.eyeBase as THREE.Color).multiplyScalar(2.2 * p.eye);
  r.eyeMat.color.copy(tmpC);
  r.panels.forEach((pn, i) => { pn.rotation.y = (i ? -1 : 1) * (p.ex.panels ?? 0) * 1.1; });
}

// ---- procedural motion helpers (pure functions of time) ----
const TAU = Math.PI * 2;
/** Deterministic blink: ~every 2.5-4 s per bot, 120 ms. */
export function blinkAt(t: number, seed: number) {
  const period = 2.6 + (seed % 7) * 0.2, ph = ((t + seed * 0.37) % period + period) % period;
  return ph < 0.12 ? Math.sin((ph / 0.12) * Math.PI) : 0;
}
export function idle(p: Pose, t: number, seed: number) {
  const b = Math.sin((t + seed) * 1.7);
  p.y += 0.006 * b; p.lean += 0.02 * b; p.headPitch += 0.03 * Math.sin((t + seed) * 0.9);
  p.armL[0] += 0.03 * b; p.armR[0] -= 0.03 * b; p.blink = Math.max(p.blink, blinkAt(t, seed)); return p;
}
/** Walk / run cycle at gait phase ph (cycles), intensity k (0 walk .. 1 sprint). */
export function walk(p: Pose, ph: number, k: number, spec: BotSpec) {
  const a = TAU * ph, sw = 0.45 + 0.45 * k;
  p.legL = [sw * Math.sin(a), 0.2 + (0.6 + 0.6 * k) * Math.max(0, Math.sin(a + 1.2))];
  p.legR = [sw * Math.sin(a + Math.PI), 0.2 + (0.6 + 0.6 * k) * Math.max(0, Math.sin(a + Math.PI + 1.2))];
  p.armL = [-(0.5 + 0.6 * k) * Math.sin(a), 0.15, 0.4 + 0.9 * k]; p.armR = [-(0.5 + 0.6 * k) * Math.sin(a + Math.PI), 0.15, 0.4 + 0.9 * k];
  p.y += spec.bounce * (1 + k) * Math.abs(Math.cos(a)); p.lean += 0.06 + 0.25 * k; p.twist += 0.08 * Math.sin(a);
  return p;
}
/** Typing at a desk: forearms forward, alternating hand taps. */
export function typing(p: Pose, t: number, seed: number) {
  const r = Math.sin(t * 19 + seed), l = Math.sin(t * 17 + seed * 2 + 1.3);
  p.armL = [1.15 + 0.06 * l, 0.12, 1.25]; p.armR = [1.15 + 0.06 * r, 0.12, 1.25]; p.lean += 0.12; p.headPitch += 0.18 + 0.02 * Math.sin(t * 3); return p;
}
