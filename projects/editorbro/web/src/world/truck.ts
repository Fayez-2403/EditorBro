// The pickup that leads the hook: a side profile extruded across its width (rounded by a bevel, wheel arches cut in),
// glass, a chrome bumper, rimmed wheels, and a flatbed trailer carrying a giant EditorBro clapperboard.
import * as THREE from 'three';
import { slate } from './textures';

const lin = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);

function stripes() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#141416';
  for (let x = -64; x < 576; x += 96) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 48, 0); g.lineTo(x + 96, 0); g.lineTo(x + 48, 64); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Extrude a side profile (u = length, front negative; v = height) across the width, centred on x.
function sideExtrude(shape: THREE.Shape, width: number, bevel = 0.07) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 18 });
  g.rotateY(-Math.PI / 2);
  g.translate((width - bevel * 2) / 2, 0, 0);
  return g;
}

export const WHEEL_R = 0.42;

export function buildTruck() {
  const group = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: lin(0.03, 0.032, 0.036), roughness: 0.35, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.12 });
  const glass = new THREE.MeshPhysicalMaterial({ color: lin(0.02, 0.03, 0.04), roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const chrome = new THREE.MeshStandardMaterial({ color: lin(0.8, 0.8, 0.82), roughness: 0.18, metalness: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: lin(0.02, 0.02, 0.02), roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: lin(0.015, 0.015, 0.016), roughness: 0.7 });
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // body: hood, cab, covered bed, with wheel arches around (u = ±1.8, v = 0.42)
  const s = new THREE.Shape();
  s.moveTo(-2.85, 0.5);
  s.lineTo(-2.9, 1.0);
  s.quadraticCurveTo(-2.85, 1.2, -2.5, 1.24);
  s.lineTo(-1.55, 1.3);
  s.lineTo(-0.85, 1.98);
  s.quadraticCurveTo(-0.8, 2.02, -0.7, 2.02);
  s.lineTo(0.3, 2.02);
  s.quadraticCurveTo(0.42, 2.0, 0.44, 1.9);
  s.lineTo(0.48, 1.36);
  s.lineTo(2.82, 1.36);
  s.quadraticCurveTo(2.9, 1.34, 2.9, 1.26);
  s.lineTo(2.9, 0.5);
  s.lineTo(2.36, 0.5);
  s.absarc(1.8, 0.42, 0.56, 0.14, Math.PI - 0.14, false);
  s.lineTo(-1.24, 0.5);
  s.absarc(-1.8, 0.42, 0.56, 0.14, Math.PI - 0.14, false);
  s.lineTo(-2.85, 0.5);
  mesh(sideExtrude(s, 2.04), paint);

  // glass: side windows and windscreen, one slightly wider extrusion inset into the cab
  const w = new THREE.Shape();
  w.moveTo(-1.42, 1.38);
  w.lineTo(-0.82, 1.92);
  w.lineTo(0.3, 1.92);
  w.lineTo(0.38, 1.4);
  w.lineTo(-1.42, 1.38);
  mesh(sideExtrude(w, 2.06, 0), glass);
  mesh(new THREE.BoxGeometry(1.72, 0.44, 0.03), glass, 0, 1.68, 0.47);

  // rear: tailgate seam, lights, bumper, plate, hitch
  mesh(new THREE.BoxGeometry(1.9, 0.02, 0.02), dark, 0, 1.12, 2.91);
  for (const x of [-0.93, 0.93]) {
    const tl = mesh(new THREE.BoxGeometry(0.14, 0.36, 0.05), new THREE.MeshStandardMaterial({ color: 0x440000, emissive: new THREE.Color(1.0, 0.04, 0.02), emissiveIntensity: 2.4 }), x, 1.08, 2.9);
    tl.castShadow = false;
  }
  mesh(new THREE.BoxGeometry(2.06, 0.2, 0.22), chrome, 0, 0.52, 2.98);
  mesh(new THREE.BoxGeometry(0.52, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: lin(0.85, 0.85, 0.8), roughness: 0.6 }), 0, 0.78, 2.92);
  mesh(new THREE.BoxGeometry(0.1, 0.1, 1.2), dark, 0, 0.5, 3.6);

  // wheels: tyre + rim, rolled by the caller through `wheels`
  const wheels: THREE.Object3D[] = [];
  const tyre = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.3, 24).rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(WHEEL_R * 0.6, WHEEL_R * 0.6, 0.31, 12).rotateZ(Math.PI / 2);
  const wheel = (x: number, z: number, r = 1) => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(tyre, rubber), rm = new THREE.Mesh(rim, chrome);
    t.castShadow = true;
    g.add(t, rm); g.scale.setScalar(r); g.position.set(x, WHEEL_R * r, z);
    group.add(g); wheels.push(g);
  };
  for (const [x, z] of [[-0.9, -1.8], [0.9, -1.8], [-0.9, 1.8], [0.9, 1.8]]) wheel(x, z);

  // trailer: deck, fenders, small wheels, the clapperboard
  mesh(new THREE.BoxGeometry(1.95, 0.12, 3.3), dark, 0, 0.62, 5.85);
  for (const x of [-1.02, 1.02]) {
    mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.22, 16, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), dark, x, 0.36, 5.6);
    wheel(x, 5.6, 0.76);
  }
  const slateMats = Array.from({ length: 6 }, () => new THREE.MeshStandardMaterial({ color: lin(0.02, 0.02, 0.022), roughness: 0.6 }));
  slateMats[4] = new THREE.MeshStandardMaterial({ map: slate(), roughness: 0.65 });
  mesh(new THREE.BoxGeometry(2.3, 1.58, 0.18), slateMats, 0, 1.55, 6.2);
  const stickMat = new THREE.MeshStandardMaterial({ map: stripes(), roughness: 0.6 });
  mesh(new THREE.BoxGeometry(2.3, 0.26, 0.18), stickMat, 0, 2.47, 6.2);
  const hinge = new THREE.Group();
  hinge.position.set(-1.15, 2.6, 6.2);
  const stick = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 0.18), stickMat);
  stick.position.set(1.15, 0.15, 0); stick.castShadow = true;
  hinge.add(stick); group.add(hinge);

  return { group, wheels, hinge };
}
