// DOTS short: the five mascots and the to-do-list monster (character bible as code). Fan-made: the mascot designs are
// OpenAI's (projects/dots-heist/FACTS.md); the five are the faces of ONE dot's skills, never a team of dots.
// Look: fuzzy flocked felt (sheen + fibre bump), black felt features, no limbs: they act with squash and stretch, hops,
// leans and tilts. Every rig's look at time t is a pure function of the Pose computed for t (applyPose only).
import * as THREE from 'three';
import { mulberry32 } from '../engine/util';
import { ax, mono } from './_vo';

export type DotId = 'pink' | 'blue' | 'yellow' | 'green' | 'purple';
export const DOT_IDS: DotId[] = ['pink', 'blue', 'yellow', 'green', 'purple'];

export interface DotSpec { id: DotId; name: string; skill: string; felt: string; sheen: string; accent: string; h: number }
export const DOTS: Record<DotId, DotSpec> = {
  pink: { id: 'pink', name: 'PINK', skill: 'CONTENT', felt: '#F6B3C6', sheen: '#FFE3EC', accent: '#F27FA3', h: 0.5 },
  blue: { id: 'blue', name: 'BLUE', skill: 'RESEARCH', felt: '#4F86EE', sheen: '#B9D2FF', accent: '#3B74E6', h: 0.46 },
  yellow: { id: 'yellow', name: 'YELLOW', skill: 'CODE', felt: '#F5C63E', sheen: '#FFF0B8', accent: '#E8AE10', h: 0.56 },
  green: { id: 'green', name: 'GREEN', skill: 'EXPLORE', felt: '#55BE69', sheen: '#C8F5CF', accent: '#2FA548', h: 0.5 },
  purple: { id: 'purple', name: 'PURPLE', skill: 'APPS', felt: '#DD3E95', sheen: '#FFC2E2', accent: '#C9237D', h: 0.5 },
};

// ------------------------------------------------------------------------------------------------ felt material
let fibre: THREE.CanvasTexture | null = null;
/** Seeded fibre texture: thousands of short soft strokes (flocked felt), used as bump + a faint colour variation. */
export function fibreTex(): THREE.CanvasTexture {
  if (fibre) return fibre;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d')!, r = mulberry32(77);
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S); g.lineCap = 'round';
  for (let i = 0; i < 26000; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI * 2, l = 2 + r() * 7, v = Math.floor(70 + r() * 120);
    g.strokeStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`; g.lineWidth = 0.6 + r() * 1.1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  fibre = new THREE.CanvasTexture(c); fibre.wrapS = fibre.wrapT = THREE.RepeatWrapping; fibre.repeat.set(1.6, 1.6); fibre.anisotropy = 8;
  return fibre;
}
export function feltMat(hex: string, sheen = '#ffffff', k = 1) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex).multiplyScalar(k), roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.55,
    sheenColor: new THREE.Color(sheen), bumpMap: fibreTex(), bumpScale: 4.5,
  });
}
export const blackFelt = () => feltMat('#1B1B20', '#55555f');
export const glossBlack = () => new THREE.MeshPhysicalMaterial({ color: '#0d0d10', roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });

// ------------------------------------------------------------------------------------------------ pose
export interface DotPose {
  x: number; y: number; z: number; rotY: number;
  /** lean (pitch, + toward camera), tilt (roll); both pivot at the base */
  lean: number; tilt: number;
  /** + squash (wider, shorter), - stretch; volume-preserving */
  sq: number;
  /** gaze offset -1..1 (eyes slide over the face) */
  lookX: number; lookY: number;
  blink: number; mouth: number; happy: number;
  /** per-character extras: worried (pink brows), beret, glint (purple), pupil (green), scale */
  ex: Record<string, number>;
}
export const restDot = (): DotPose => ({ x: 0, y: 0, z: 0, rotY: 0, lean: 0, tilt: 0, sq: 0, lookX: 0, lookY: 0, blink: 0, mouth: 0, happy: 0, ex: {} });

export interface DotRig {
  id: DotId; spec: DotSpec; root: THREE.Group; body: THREE.Group; face: THREE.Group; eyes: THREE.Object3D[]; eyeBase: THREE.Vector3[];
  mouthOpen: THREE.Mesh; smile: THREE.Object3D; parts: Record<string, THREE.Object3D>; shadow: THREE.Mesh;
}

function addMesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}

/** Rounded polygon shape (corner radius r) for the triangle and similar plush silhouettes. */
function roundedPoly(pts: [number, number][], r: number) {
  const s = new THREE.Shape(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!, p1 = pts[i]!, p2 = pts[(i + 1) % n]!;
    const a = new THREE.Vector2(p0[0] - p1[0], p0[1] - p1[1]).normalize(), b = new THREE.Vector2(p2[0] - p1[0], p2[1] - p1[1]).normalize();
    const q0 = [p1[0] + a.x * r, p1[1] + a.y * r], q1 = [p1[0] + b.x * r, p1[1] + b.y * r];
    if (i === 0) s.moveTo(q0[0]!, q0[1]!); else s.lineTo(q0[0]!, q0[1]!);
    s.quadraticCurveTo(p1[0], p1[1], q1[0]!, q1[1]!);
  }
  s.closePath(); return s;
}
function heartShape(w: number) {
  const s = new THREE.Shape(), k = w / 2;
  s.moveTo(0, -k * 0.95);
  s.bezierCurveTo(-k * 0.35, -k * 0.55, -k * 1.05, -k * 0.15, -k * 1.0, k * 0.38);
  s.bezierCurveTo(-k * 0.96, k * 0.86, -k * 0.38, k * 1.02, 0, k * 0.6);
  s.bezierCurveTo(k * 0.38, k * 1.02, k * 0.96, k * 0.86, k * 1.0, k * 0.38);
  s.bezierCurveTo(k * 1.05, -k * 0.15, k * 0.35, -k * 0.55, 0, -k * 0.95);
  return s;
}
function plush(shape: THREE.Shape, depth: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 10, curveSegments: 40 });
  g.translate(0, 0, -depth / 2); g.computeBoundingBox(); const bb = g.boundingBox!; g.translate(0, -bb.min.y, 0);
  // puff the front and back faces a little (a stuffed toy, not a cookie)
  const p = g.attributes.position as THREE.BufferAttribute, h = bb.max.y - bb.min.y, w = bb.max.x - bb.min.x;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = x / (w / 2), v = (y - h / 2) / (h / 2), d = Math.max(0, 1 - u * u * 0.8 - v * v * 0.8);
    p.setZ(i, z + Math.sign(z) * d * depth * 0.55);
  }
  g.computeVertexNormals(); return g;
}

const ray = new THREE.Raycaster();
/** Point + normal on the front of `targets` at (x, y) (local coords of `space`), found by a ray from the front. */
function surf(space: THREE.Object3D, targets: THREE.Object3D[], x: number, y: number) {
  space.updateMatrixWorld(true);
  const o = space.localToWorld(new THREE.Vector3(x, y, 3)), d = space.localToWorld(new THREE.Vector3(x, y, 0)).sub(o).normalize();
  ray.set(o, d); const h = ray.intersectObjects(targets, false)[0];
  if (!h) return { p: new THREE.Vector3(x, y, 0.2), n: new THREE.Vector3(0, 0, 1) };
  const n = h.face!.normal.clone().transformDirection(h.object.matrixWorld);
  return { p: space.worldToLocal(h.point.clone()), n: n.transformDirection(new THREE.Matrix4().copy(space.matrixWorld).invert()).normalize() };
}
function stick(o: THREE.Object3D, s: { p: THREE.Vector3; n: THREE.Vector3 }, lift = 0.004) {
  o.position.copy(s.p).addScaledVector(s.n, lift); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), s.n); return o;
}
/** A flat felt dot / ellipse badge (eyes, cheeks), thin, facing +z. */
const badgeGeo = (w: number, h: number, d = 0.012) => { const g = new THREE.SphereGeometry(1, 28, 16); g.scale(w / 2, h / 2, d); return g; };
/** Arc stroke (closed happy eyes, smiles, brows): a partial torus in the xy plane, centred, opening downward when rot=0. */
const arcGeo = (r: number, tube: number, arc = Math.PI) => { const g = new THREE.TorusGeometry(r, tube, 8, 32, arc); g.rotateZ((Math.PI - arc) / 2); return g; };

/** Builds one mascot. Origin on the floor at the centre of its base, facing +z. */
export function buildDot(id: DotId): DotRig {
  const s = DOTS[id], felt = feltMat(s.felt, s.sheen), ink = blackFelt(), gloss = glossBlack();
  const root = new THREE.Group(); root.name = s.name;
  const body = new THREE.Group(); root.add(body);
  const face = new THREE.Group(); body.add(face);
  const parts: Record<string, THREE.Object3D> = {};
  const eyes: THREE.Object3D[] = [];
  let shapes: THREE.Object3D[] = [];
  const H = s.h;
  if (id === 'pink') {   // soft rounded blob, headphones, closed happy eyes
    const g = new THREE.SphereGeometry(H * 0.5, 64, 48);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i); if (y < 0) y *= 0.82; p.setXYZ(i, p.getX(i) * 1.18, y, p.getZ(i) * 0.92); }
    g.computeVertexNormals(); const m = addMesh(g, felt, body, 0, H * 0.43, 0); shapes = [m];
    const band = addMesh(new THREE.TorusGeometry(H * 0.56, H * 0.04, 14, 48, Math.PI), ink, body, 0, H * 0.45, -0.01);
    parts.band = band;
    for (const sx of [-1, 1]) {
      const cup = addMesh(new THREE.CylinderGeometry(H * 0.15, H * 0.15, H * 0.11, 36), ink, body, sx * H * 0.6, H * 0.43, 0); cup.rotation.z = Math.PI / 2;
      const pad = addMesh(new THREE.CylinderGeometry(H * 0.11, H * 0.11, H * 0.04, 30), feltMat('#3A3A44'), body, sx * H * 0.68, H * 0.43, 0); pad.rotation.z = Math.PI / 2;
      parts[sx < 0 ? 'cupL' : 'cupR'] = cup;
    }
    for (const sx of [-1, 1]) {   // closed happy eyes: upward arcs (∩); `worried` flips them
      const e = new THREE.Mesh(arcGeo(H * 0.07, H * 0.017), ink); e.castShadow = false;
      const w = new THREE.Group(); w.add(e); face.add(stick(w, surf(body, shapes, sx * H * 0.2, H * 0.52))); eyes.push(w);
    }
    for (const sx of [-1, 1]) { const ch = new THREE.Mesh(badgeGeo(H * 0.12, H * 0.07), feltMat('#F48AA8')); face.add(stick(ch, surf(body, shapes, sx * H * 0.33, H * 0.38))); }
  } else if (id === 'blue') {   // cloud of puffs, black beret, small eyes
    const g = new THREE.Group(); body.add(g);
    const puffs: [number, number, number][] = [[0, 0.42, 0.34], [-0.33, 0.32, 0.25], [0.33, 0.32, 0.25], [-0.17, 0.62, 0.24], [0.2, 0.6, 0.22], [-0.48, 0.2, 0.15], [0.48, 0.2, 0.15], [0, 0.18, 0.28]];
    shapes = puffs.map(([x, y, r]) => { const m = addMesh(new THREE.SphereGeometry(r * H, 48, 32), felt, g, x * H, y * H, 0); m.scale.z = 0.72; return m; });
    const beret = new THREE.Group(); beret.position.set(H * 0.08, H * 0.82, 0); beret.rotation.z = -0.32; beret.rotation.x = -0.15; body.add(beret);
    const cap = addMesh(new THREE.SphereGeometry(H * 0.3, 40, 20), ink, beret); cap.scale.set(1, 0.3, 0.92);
    addMesh(new THREE.CylinderGeometry(H * 0.02, H * 0.03, H * 0.07, 12), ink, beret, 0, H * 0.1, 0);
    parts.beret = beret;
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(badgeGeo(H * 0.075, H * 0.1, 0.014), gloss); face.add(stick(e, surf(body, shapes, sx * H * 0.13, H * 0.44))); eyes.push(e); }
  } else if (id === 'yellow') {   // rounded triangle, big round glasses, black bow tie
    const w = H * 1.05, sh = roundedPoly([[-w / 2, 0], [w / 2, 0], [0, H * 0.94]], H * 0.2);
    const m = addMesh(plush(sh, H * 0.2, H * 0.1), felt, body); shapes = [m];
    const glasses = new THREE.Group(); body.add(glasses); parts.glasses = glasses;
    for (const sx of [-1, 1]) {
      const sp = surf(body, shapes, sx * H * 0.15, H * 0.42);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(H * 0.12, H * 0.018, 12, 48), gloss); glasses.add(stick(rim, sp, 0.03));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(H * 0.115, 40), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1 }));
      glasses.add(stick(lens, sp, 0.028));
      const e = new THREE.Mesh(badgeGeo(H * 0.06, H * 0.06, 0.012), gloss); face.add(stick(e, surf(body, shapes, sx * H * 0.15, H * 0.42))); eyes.push(e);
    }
    const br = new THREE.Mesh(new THREE.TorusGeometry(H * 0.05, H * 0.014, 8, 20, Math.PI), gloss); glasses.add(stick(br, surf(body, shapes, 0, H * 0.46), 0.035));
    parts.bow = bowTie(body, shapes, H * 0.1, H, ink);
  } else if (id === 'green') {   // frog: wide body, two eye bulbs with big eyes, bow tie
    const g = new THREE.SphereGeometry(H * 0.5, 64, 48), p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i); if (y < 0) y *= 0.78; p.setXYZ(i, p.getX(i) * 1.25, y * 0.86, p.getZ(i) * 0.95); }
    g.computeVertexNormals(); const m = addMesh(g, felt, body, 0, H * 0.4, 0); shapes = [m];
    for (const sx of [-1, 1]) {
      const bulb = addMesh(new THREE.SphereGeometry(H * 0.19, 40, 30), felt, body, sx * H * 0.27, H * 0.78, H * 0.06);
      const white = addMesh(new THREE.SphereGeometry(H * 0.15, 40, 30), feltMat('#FBFBF7', '#ffffff'), body, sx * H * 0.27, H * 0.8, H * 0.15); white.scale.z = 0.7;
      const pupil = new THREE.Mesh(badgeGeo(H * 0.13, H * 0.15, 0.02), gloss); pupil.position.set(sx * H * 0.27, H * 0.8, H * 0.255); body.add(pupil); eyes.push(pupil);
      parts[sx < 0 ? 'bulbL' : 'bulbR'] = bulb; void white;
    }
    for (const sx of [-1, 1]) { const ch = new THREE.Mesh(badgeGeo(H * 0.1, H * 0.06), feltMat('#F48AA8')); face.add(stick(ch, surf(body, shapes, sx * H * 0.38, H * 0.42))); }
    parts.bow = bowTie(body, shapes, H * 0.13, H, ink);
  } else {   // purple: magenta heart, round black sunglasses
    const m = addMesh(plush(heartShape(H * 1.05), H * 0.22, H * 0.11), felt, body); shapes = [m];
    const shades = new THREE.Group(); body.add(shades); parts.shades = shades;
    for (const sx of [-1, 1]) {
      const sp = surf(body, shapes, sx * H * 0.16, H * 0.56);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.13, H * 0.13, H * 0.03, 40), gloss); lens.rotation.x = Math.PI / 2;
      const w = new THREE.Group(); w.add(lens); shades.add(stick(w, sp, 0.03)); eyes.push(w);
    }
    const br = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.012, H * 0.012, H * 0.09, 8), gloss); br.rotation.z = Math.PI / 2;
    const bw = new THREE.Group(); bw.add(br); shades.add(stick(bw, surf(body, shapes, 0, H * 0.6), 0.04));
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(H * 0.05, H * 0.16), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
    glint.rotation.z = -0.6; const gw = new THREE.Group(); gw.add(glint); shades.add(stick(gw, surf(body, shapes, -H * 0.2, H * 0.6), 0.055)); parts.glint = glint;
  }
  // mouth: a felt smile (closed) + an open mouth that grows with `mouth`
  const my = id === 'green' ? H * 0.4 : id === 'yellow' ? H * 0.22 : id === 'purple' ? H * 0.34 : id === 'blue' ? H * 0.32 : H * 0.36;
  const msp = surf(body, shapes, 0, my);
  const smile = new THREE.Group(); face.add(stick(smile, msp, 0.002));
  const sm = new THREE.Mesh(arcGeo(id === 'green' ? H * 0.14 : H * 0.055, H * 0.014), ink); sm.rotation.z = Math.PI; smile.add(sm);
  const mouthOpen = new THREE.Mesh(badgeGeo(H * 0.13, H * 0.12, 0.01), feltMat('#5A1626', '#a0405a')); smile.add(mouthOpen); mouthOpen.position.y = -H * 0.02; mouthOpen.scale.setScalar(0.001);
  const tongue = new THREE.Mesh(badgeGeo(H * 0.07, H * 0.04, 0.006), feltMat('#F2798F')); tongue.position.set(0, -H * 0.04, 0.008); mouthOpen.add(tongue);
  // soft contact shadow (a radial blob under the character; stays on the floor during hops)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(H * 0.62, 40), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; shadow.renderOrder = 1;
  return { id, spec: s, root, body, face, eyes, eyeBase: eyes.map(e => e.position.clone()), mouthOpen, smile, parts, shadow };
}

function bowTie(body: THREE.Group, shapes: THREE.Object3D[], y: number, H: number, mat: THREE.Material) {
  const sp = surf(body, shapes, 0, y), bow = new THREE.Group(); body.add(stick(bow, sp, 0.012));
  for (const sx of [-1, 1]) {
    const g = new THREE.ConeGeometry(H * 0.075, H * 0.14, 3, 1); g.rotateZ(sx * Math.PI / 2); g.scale(1, 1, 0.45);
    const m = new THREE.Mesh(g, mat); m.position.x = sx * H * 0.065; m.castShadow = true; bow.add(m);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(H * 0.035, 16, 12), mat); knot.scale.z = 0.6; bow.add(knot);
  return bow;
}

let blob: THREE.CanvasTexture | null = null;
export function blobTex() {
  if (blob) return blob;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(40,36,50,0.75)'); gr.addColorStop(0.5, 'rgba(40,36,50,0.32)'); gr.addColorStop(1, 'rgba(40,36,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); blob = new THREE.CanvasTexture(c); return blob;
}

/** Writes a pose into the rig. */
export function applyDot(r: DotRig, p: DotPose) {
  const k = p.ex.scale ?? 1;
  r.root.position.set(p.x, p.y, p.z); r.root.rotation.set(0, p.rotY, 0); r.root.scale.setScalar(k);
  r.body.rotation.set(p.lean, 0, p.tilt);
  const sq = Math.max(-0.45, Math.min(0.45, p.sq));
  r.body.scale.set(1 + sq * 0.55, 1 - sq, 1 + sq * 0.55);
  const H = r.spec.h;
  r.eyes.forEach((e, i) => {
    const b = r.eyeBase[i]!; e.position.set(b.x + p.lookX * H * 0.035, b.y + p.lookY * H * 0.03, b.z);
    const closed = r.id === 'pink' ? 0 : p.blink;
    e.scale.set(1, Math.max(0.08, 1 - 0.92 * closed - 0.45 * p.happy), 1);
  });
  if (r.id === 'pink') r.eyes.forEach(e => { e.rotation.z = (p.ex.worried ?? 0) > 0.5 ? Math.PI : 0; });
  if (r.id === 'green') { const pu = p.ex.pupil ?? 1; r.eyes.forEach(e => e.scale.multiplyScalar(pu)); }
  const m = Math.max(0, Math.min(1, p.mouth));
  r.mouthOpen.scale.set(0.6 + 0.4 * m, Math.max(0.001, m), 1); (r.smile.children[0] as THREE.Mesh).scale.set(1 + 0.5 * p.happy, 1 + 0.6 * p.happy, 1);
  (r.smile.children[0] as THREE.Mesh).visible = m < 0.35;
  if (r.parts.beret) r.parts.beret.rotation.z = -0.32 + (p.ex.beret ?? 0);
  if (r.parts.glint) ((r.parts.glint as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = p.ex.glint ?? 0;
  if (r.parts.glasses) r.parts.glasses.position.y = (p.ex.glassesUp ?? 0) * H * 0.08;
  // shadow follows on the floor; shrinks with height
  const fl = p.ex.floor ?? 0, up = Math.max(0, p.y - fl);   // the surface it stands on (floor, riser)
  r.shadow.position.set(p.x, fl + 0.003, p.z); const sk = k * (1 - Math.min(0.6, up * 1.4)) * (1 + sq * 0.4); r.shadow.scale.setScalar(Math.max(0.2, sk));
  (r.shadow.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - Math.min(0.7, up * 1.2)) * (p.ex.shadow ?? 1);
}

// ------------------------------------------------------------------------------------------------ motion verbs (pure)
const TAU = Math.PI * 2;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Damped spring 0 -> 1 from t0. */
export function springK(t: number, t0: number, resp = 0.35, zeta = 0.5) {
  const d = t - t0; if (d <= 0) return 0;
  const w = TAU / resp;
  if (zeta >= 1) return 1 - (1 + w * d) * Math.exp(-w * d);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * d) * (Math.cos(wd * d) + (zeta * w / wd) * Math.sin(wd * d));
}
export function blinkAt(t: number, seed: number) {
  const period = 2.7 + (seed % 5) * 0.31, ph = ((t + seed * 0.53) % period + period) % period;
  return ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
}
/** Idle breathing + blink. */
export function idleDot(p: DotPose, t: number, seed: number, amt = 1) {
  const b = Math.sin((t + seed * 0.7) * 2.4);
  p.sq += 0.025 * b * amt; p.tilt += 0.02 * Math.sin((t + seed) * 1.3) * amt; p.blink = Math.max(p.blink, blinkAt(t, seed));
  return p;
}
/** A hop that leaves at t0 and lands at t0 + dur: anticipation crouch (`ant` s, 0.25 default), stretch on take-off,
 *  a 40% landing squash that rebounds over 0.4 s (03-cartoon timing). */
export function hop(p: DotPose, t: number, t0: number, dur = 0.5, h = 0.25, ant = 0.25) {
  const a = t0 - ant, land = t0 + dur;
  if (t >= a && t < t0) p.sq += 0.3 * Math.sin(((t - a) / ant) * Math.PI * 0.5);
  else if (t >= t0 && t < land) { const u = (t - t0) / dur; p.y += h * 4 * u * (1 - u); p.sq -= 0.28 * Math.cos(u * Math.PI) * (u < 0.5 ? 1 : -0.3); }
  else if (t >= land && t < land + 0.4) { const v = (t - land) / 0.4; p.sq += 0.4 * Math.exp(-v * 4) * Math.cos(v * TAU * 1.1); }
  return p;
}
/** Follow-through: a value that trails `x(t)` by `lag` s (accessories settle after the body). */
export const trail = (x: (t: number) => number, t: number, lag = 0.2) => x(t - lag);
/** Position along a hop path from a to b between t0 and t0 + dur (arc in y via hop()). */
export function hopTo(p: DotPose, t: number, t0: number, dur: number, a: [number, number], b: [number, number], h = 0.25) {
  const u = clamp01((t - t0) / dur); p.x += a[0] + (b[0] - a[0]) * u; p.z += a[1] + (b[1] - a[1]) * u; return hop(p, t, t0, dur, h);
}
/** Scared tremble. */
export function tremble(p: DotPose, t: number, amt = 1) { p.tilt += 0.06 * amt * Math.sin(t * 61); p.x += 0.006 * amt * Math.sin(t * 47); p.sq += 0.03 * amt * Math.sin(t * 53); return p; }
/** Talking: mouth flaps on the speaker's word timings (words = [start, end][]). */
export function talk(p: DotPose, t: number, words: [number, number][], amt = 1) {
  for (const [a, b] of words) if (t >= a - 0.02 && t <= b) { const u = (t - a) / Math.max(0.08, b - a); p.mouth = Math.max(p.mouth, amt * (0.35 + 0.65 * Math.abs(Math.sin(u * Math.PI * Math.max(1, Math.round((b - a) / 0.16)))))); p.sq -= 0.03 * amt; }
  return p;
}

// ------------------------------------------------------------------------------------------------ the to-do-list monster
export const TODO_ROWS = ['Reply: 100 emails', '7 meetings (back to back)', 'Deadline: KAL thi!', 'Launch prep', 'Post kal hai', 'Fix the bugs', 'Slack: 48 unread', 'Report bhejo', 'Taxes…', 'Gym (lol)'];
export interface Monster { root: THREE.Group; sheet: THREE.Mesh; geo: THREE.PlaneGeometry; canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; eyes: THREE.Group; pupils: THREE.Mesh[]; brows: THREE.Mesh[]; W: number; L: number; rest: Float32Array }
export function buildMonster(W = 0.9, L = 2.2): Monster {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 1252;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const geo = new THREE.PlaneGeometry(W, L, 6, 60); geo.translate(0, L / 2, 0);
  const sheet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
  sheet.castShadow = true; sheet.receiveShadow = true;
  const root = new THREE.Group(); root.add(sheet);
  const eyes = new THREE.Group(); root.add(eyes); const pupils: THREE.Mesh[] = [], brows: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 20), new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.3, clearcoat: 0.6 })); w.position.set(sx * 0.17, 0, 0.04); w.scale.z = 0.6; w.castShadow = true; eyes.add(w);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), glossBlack()); pu.position.set(sx * 0.17, -0.01, 0.1); eyes.add(pu); pupils.push(pu);
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.03), blackFelt()); br.position.set(sx * 0.17, 0.12, 0.08); br.rotation.z = -sx * 0.45; eyes.add(br); brows.push(br);
  }
  return { root, sheet, geo, canvas, tex, eyes, pupils, brows, W, L, rest: (geo.attributes.position as THREE.BufferAttribute).array.slice() as Float32Array };
}
/** Paper face: title, rows, checkboxes (checked fraction 0..1), and a toothy mouth near the top (open 0..1). */
export function drawMonster(m: Monster, checked: number, mouth: number, angry = 1) {
  const c = m.canvas.getContext('2d')!, Wc = m.canvas.width, Hc = m.canvas.height;
  c.fillStyle = '#FBF8F1'; c.fillRect(0, 0, Wc, Hc);
  c.strokeStyle = 'rgba(80,120,200,0.22)'; c.lineWidth = 2;
  for (let y = 300; y < Hc; y += 86) { c.beginPath(); c.moveTo(0, y); c.lineTo(Wc, y); c.stroke(); }
  c.strokeStyle = 'rgba(230,80,80,0.35)'; c.beginPath(); c.moveTo(70, 0); c.lineTo(70, Hc); c.stroke();
  // mouth (upper part of the sheet), teeth
  const mh = 30 + 120 * mouth * angry, my = 190;
  c.fillStyle = '#2A0F18'; c.beginPath(); c.ellipse(Wc / 2, my, 170, mh / 2 + 6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#FFFFFF';
  for (let k = 0; k < 7; k++) { const x = Wc / 2 - 150 + k * 50; c.beginPath(); c.moveTo(x, my - mh / 2 - 6); c.lineTo(x + 25, my - mh / 2 + 26); c.lineTo(x + 50, my - mh / 2 - 6); c.fill();
    c.beginPath(); c.moveTo(x, my + mh / 2 + 6); c.lineTo(x + 25, my + mh / 2 - 22); c.lineTo(x + 50, my + mh / 2 + 6); c.fill(); }
  c.fillStyle = '#1B1B20'; c.font = ax(58, 100, 900); c.textAlign = 'center'; c.fillText('TO-DO', Wc / 2, 330);
  c.textAlign = 'left'; c.font = mono(34, 600);
  TODO_ROWS.forEach((r, i) => {
    const y = 420 + i * 86, done = checked * TODO_ROWS.length > i + 0.5;
    c.strokeStyle = '#1B1B20'; c.lineWidth = 4; c.strokeRect(92, y - 34, 38, 38);
    if (done) { c.strokeStyle = '#2FA548'; c.lineWidth = 8; c.beginPath(); c.moveTo(98, y - 16); c.lineTo(110, y - 2); c.lineTo(134, y - 40); c.stroke(); }
    c.fillStyle = done ? 'rgba(27,27,32,0.4)' : '#1B1B20'; c.fillText(r, 148, y);
    if (done) { c.strokeStyle = 'rgba(27,27,32,0.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(148, y - 12); c.lineTo(148 + c.measureText(r).width, y - 12); c.stroke(); }
  });
  m.tex.needsUpdate = true;
}
/** Bends the sheet into a creature: curvature along its length (sway, lean toward camera, top curl = jaw). Returns the
 *  frame (position, angle) at u along the length, for placing the eyes. */
export function poseMonster(m: Monster, t: number, o: { rise: number; lean: number; curl: number; sway: number; wobble: number }) {
  const p = m.geo.attributes.position as THREE.BufferAttribute, L = m.L * Math.max(0.02, o.rise), n = 61;
  // integrate a curve in the y-z plane: angle(u) = lean*u + curl*smoothstep(0.75,1,u) + wobble*sin
  const ys: number[] = [0], zs: number[] = [0], an: number[] = [0];
  for (let i = 1; i < n; i++) {
    const u = i / (n - 1), du = 1 / (n - 1);
    const a = o.lean * u + o.curl * Math.max(0, (u - 0.72) / 0.28) ** 2 + o.wobble * 0.25 * Math.sin(u * 6 - t * 7);
    an.push(a); ys.push(ys[i - 1]! + Math.cos(a) * L * du); zs.push(zs[i - 1]! + Math.sin(a) * L * du);
  }
  for (let i = 0; i < p.count; i++) {
    const rx = m.rest[i * 3]!, ry = m.rest[i * 3 + 1]!, u = ry / m.L, k = Math.min(n - 1, Math.round(u * (n - 1)));
    const sway = o.sway * Math.sin(t * 2.2 + u * 2.5) * u;
    const flare = 1 + 0.12 * Math.sin(u * Math.PI);
    p.setXYZ(i, rx * flare + sway, ys[k]!, zs[k]!);
  }
  p.needsUpdate = true; m.geo.computeVertexNormals();
  const at = (u: number) => { const k = Math.min(n - 1, Math.round(u * (n - 1))); return { y: ys[k]!, z: zs[k]!, a: an[k]!, x: o.sway * Math.sin(t * 2.2 + u * 2.5) * u }; };
  return at;
}
