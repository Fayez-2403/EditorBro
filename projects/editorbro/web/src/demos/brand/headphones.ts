// LUMA Halo: a headphone built from primitives, studio-lit, plus the chapter accents (battery ticks, ANC rings, spatial
// orbits). Everything here is a pure function of the Pose passed to render(), so the reel can seek it frame-exact.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type VariantId = 'graphite' | 'sand' | 'ember';
export const VARIANT_ORDER: VariantId[] = ['graphite', 'sand', 'ember'];

export interface Palette {
  label: string;
  shell: string;
  band: string;
  cushion: string;
  metal: string;
  face: string;
  ring: string;
  halo: string;
  rim: string;
  ui: string; // accent for the page chrome
}

export const VARIANTS: Record<VariantId, Palette> = {
  graphite: {
    label: 'Graphite', shell: '#2e3135', band: '#232528', cushion: '#161719', metal: '#aab0b8', face: '#3a3e44',
    ring: '#d9dde3', halo: '#6f8cc0', rim: '#9fb6e0', ui: '#a9bddf',
  },
  sand: {
    label: 'Sand', shell: '#d9c8aa', band: '#c8b493', cushion: '#a8946f', metal: '#d6bd93', face: '#cdbb9b',
    ring: '#f6e6c8', halo: '#e9b56a', rim: '#ffd9a0', ui: '#e8c48f',
  },
  ember: {
    label: 'Ember', shell: '#b9472b', band: '#8e3421', cushion: '#24181a', metal: '#e2a77e', face: '#a53e25',
    ring: '#ffd3b2', halo: '#ff5726', rim: '#ff8a5c', ui: '#ff7a4d',
  },
};

export interface Pose {
  cx: number; cy: number; w: number; h: number; // target rect in CSS px
  rotY: number;
  time: number;
  opacity: number;
  ticks: number; ticksVis: number; // battery ring fill 0..1 and visibility
  anc: number; // ANC rings visibility
  orbit: number; // spatial orbit visibility
  halo: number; // halo intensity multiplier
}

const MODEL_W = 2.55, MODEL_H = 2.45;
const TICKS = 48;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const glowTex = () => canvasTex(256, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,.55)');
  r.addColorStop(0.6, 'rgba(255,255,255,.12)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});

// The halo: a soft eclipse ring with a broad glow, the brand's visual signature.
const haloTex = () => canvasTex(1024, (g, s) => {
  const c = s / 2;
  const broad = g.createRadialGradient(c, c, 0, c, c, c);
  broad.addColorStop(0, 'rgba(255,255,255,.34)');
  broad.addColorStop(0.45, 'rgba(255,255,255,.16)');
  broad.addColorStop(0.75, 'rgba(255,255,255,.04)');
  broad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = broad; g.fillRect(0, 0, s, s);
  const ring = g.createRadialGradient(c, c, c * 0.5, c, c, c * 0.74);
  ring.addColorStop(0, 'rgba(255,255,255,0)');
  ring.addColorStop(0.55, 'rgba(255,255,255,.55)');
  ring.addColorStop(0.62, 'rgba(255,255,255,.9)');
  ring.addColorStop(0.7, 'rgba(255,255,255,.35)');
  ring.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = ring; g.fillRect(0, 0, s, s);
});

const poolTex = () => canvasTex(512, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,.75)');
  r.addColorStop(0.4, 'rgba(255,255,255,.25)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});

const shadowTex = () => canvasTex(256, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(0,0,0,.85)');
  r.addColorStop(0.5, 'rgba(0,0,0,.35)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});

// Brushed, concentric finish for the outer cup plates (seeded, so it never changes between frames).
const brushedTex = () => canvasTex(512, (g, s) => {
  const rnd = mulberry32(7);
  g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 520; i++) {
    const r = rnd() * s * 0.5;
    const v = 200 + Math.floor(rnd() * 55);
    g.strokeStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.4})`;
    g.lineWidth = 0.6 + rnd() * 1.2;
    g.beginPath(); g.arc(s / 2, s / 2, r, 0, Math.PI * 2); g.stroke();
  }
});

// Rounded puck profile for the lathe (axis Y; h=0 is the head side, h=depth the outer face).
function cupProfile(R: number, depth: number, corner: number) {
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(0.0001, depth));
  const n = 10;
  // outer face edge rounding
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - corner + Math.sin(a) * corner, depth - corner + Math.cos(a) * corner));
  }
  // slight taper toward the head side
  pts.push(new THREE.Vector2(R * 0.995, depth * 0.45));
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    const c2 = corner * 0.6;
    pts.push(new THREE.Vector2(R * 0.985 - c2 + Math.cos(a) * c2, c2 - Math.sin(a) * c2));
  }
  pts.push(new THREE.Vector2(0.0001, 0));
  return pts;
}

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  root = new THREE.Group(); // positioned and scaled into the target rect
  model = new THREE.Group(); // rotates (turntable)
  mats: Record<'shell' | 'band' | 'cushion' | 'metal' | 'face' | 'ring' | 'fabric' | 'led', THREE.MeshPhysicalMaterial>;
  halo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  pool: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  ticks: THREE.InstancedMesh;
  rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  orbits: THREE.Group = new THREE.Group();
  orbitLines: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  orbitDots: THREE.Sprite[] = [];
  rimL: THREE.DirectionalLight;
  rimR: THREE.DirectionalLight;
  key: THREE.DirectionalLight;
  haloColor = new THREE.Color();
  uiColor = new THREE.Color();
  private tickLit = new THREE.Color();
  private tickDim = new THREE.Color('#2a2826');
  private tmp = new THREE.Color();
  private W = 1; private H = 1;
  private D = 9;

  constructor(canvas: HTMLCanvasElement, opts: { preserve: boolean; dpr: number }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: opts.preserve, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(opts.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    this.camera.position.set(0, 0, this.D);
    this.camera.lookAt(0, 0, 0);

    // Lights: warm key, coloured rims that follow the colourway, a soft fill.
    this.scene.add(new THREE.HemisphereLight(0xfff4e6, 0x1a1816, 0.35));
    this.key = new THREE.DirectionalLight(0xfff1e0, 2.4); this.key.position.set(3, 4.5, 5);
    this.rimL = new THREE.DirectionalLight(0xffffff, 3.2); this.rimL.position.set(-5, 2.5, -3.5);
    this.rimR = new THREE.DirectionalLight(0xffffff, 2.2); this.rimR.position.set(5, 0.5, -4);
    const fill = new THREE.DirectionalLight(0xdfe6ff, 0.45); fill.position.set(0, -2.5, 4);
    this.scene.add(this.key, this.rimL, this.rimR, fill);

    const brushed = brushedTex();
    const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
    this.mats = {
      shell: phys({ color: '#3b3e44', metalness: 0.18, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
      band: phys({ color: '#2a2c30', metalness: 0.12, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 }),
      cushion: phys({ color: '#1d1e21', metalness: 0, roughness: 0.78, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#6b6660'), envMapIntensity: 0.35 }),
      metal: phys({ color: '#b9bfc7', metalness: 1, roughness: 0.26 }),
      face: phys({ color: '#2c2f34', metalness: 0.6, roughness: 0.3, map: brushed, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.6 }),
      ring: phys({ color: '#d9dde3', metalness: 1, roughness: 0.18 }),
      fabric: phys({ color: '#141416', metalness: 0, roughness: 0.95 }),
      led: phys({ color: '#ffffff', emissive: new THREE.Color('#ffffff'), emissiveIntensity: 2.2, roughness: 0.4 }),
    };

    this.buildModel();

    // Halo, floor light pool and contact shadow live in the root (they translate and scale but don't turn).
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.halo.position.set(0, 0.12, -1.8);
    this.halo.renderOrder = -2;
    const floorY = -1.22;
    this.pool = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: poolTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.22 }));
    this.pool.rotation.x = -Math.PI / 2; this.pool.position.y = floorY - 0.02; this.pool.renderOrder = -1;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity: 0.75 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = floorY - 0.01;

    // Battery chapter: 48 ticks around the floor, one per hour.
    const tickGeo = new THREE.BoxGeometry(0.022, 0.006, 0.15);
    this.ticks = new THREE.InstancedMesh(tickGeo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true }), TICKS);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
      p.set(Math.cos(a) * 1.5, floorY, Math.sin(a) * 1.5);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2);
      m.compose(p, q, s);
      this.ticks.setMatrixAt(i, m);
      this.ticks.setColorAt(i, this.tickDim);
    }

    // ANC chapter: incoming sound rings that shrink and fade into the left cup.
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.0075, 8, 96), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      r.rotation.y = Math.PI / 2;
      this.rings.push(r);
      this.model.add(r);
    }

    // Spatial chapter: three tilted orbits, each carrying a glowing source.
    const glow = glowTex();
    const tilts: [number, number][] = [[0.35, 0.2], [-0.5, -0.4], [1.2, 0.6]];
    tilts.forEach(([tx, tz], i) => {
      const g = new THREE.Group();
      g.rotation.set(Math.PI / 2 + tx, 0, tz);
      const line = new THREE.Mesh(new THREE.TorusGeometry(1.55 + i * 0.12, 0.0045, 6, 160), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      g.add(line);
      const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      dot.scale.setScalar(0.32);
      g.add(dot);
      this.orbitLines.push(line); this.orbitDots.push(dot);
      this.orbits.add(g);
    });

    this.root.add(this.halo, this.pool, this.shadow, this.ticks, this.model, this.orbits);
    this.root.rotation.x = 0.16;
    this.scene.add(this.root);
  }

  private buildModel() {
    const { shell, band, cushion, metal, face, ring, fabric, led } = this.mats;
    const g = this.model;
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, f?: (m: THREE.Mesh) => void) => {
      const mesh = new THREE.Mesh(geo, mat);
      f?.(mesh);
      g.add(mesh);
      return mesh;
    };

    // Headband: a slim metal spine over a padded inner band.
    add(new THREE.TorusGeometry(1.04, 0.032, 20, 160, Math.PI), band, (m) => { m.scale.z = 3.6; });
    add(new THREE.TorusGeometry(1.074, 0.009, 12, 160, Math.PI), metal, (m) => { m.scale.z = 3.2; });
    add(new THREE.TorusGeometry(0.975, 0.046, 24, 140, Math.PI * 0.72), cushion, (m) => { m.scale.z = 2.6; m.rotation.z = Math.PI * 0.14; });

    const cupY = -0.82;
    for (const side of [-1, 1]) {
      const x = side * 1.04;
      // Slider: sleeve on the band, metal rail down to the yoke.
      add(new THREE.CapsuleGeometry(0.044, 0.13, 8, 20), band, (m) => { m.position.set(x, -0.06, 0); m.scale.set(1, 1, 1.75); });
      add(new THREE.CapsuleGeometry(0.016, 0.24, 6, 12), metal, (m) => { m.position.set(x, -0.25, 0); m.scale.set(1, 1, 2.2); });
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 24), metal, (m) => { m.position.set(x, -0.36, 0); });
      // Yoke: a fork arcing over the cup, pivots at front and back.
      add(new THREE.TorusGeometry(0.46, 0.024, 16, 80, Math.PI), metal, (m) => { m.rotation.y = Math.PI / 2; m.position.set(x, cupY, 0); });
      for (const z of [-0.46, 0.46]) add(new THREE.SphereGeometry(0.036, 20, 14), metal, (m) => { m.position.set(x, cupY, z); });

      // Cup: a rounded puck (lathe), axis along x, slightly oval.
      const cupGeo = new THREE.LatheGeometry(cupProfile(0.42, 0.25, 0.085), 96);
      add(cupGeo, shell, (m) => {
        m.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        m.position.set(side * 0.86, cupY, 0);
        m.scale.set(1, 1, 0.9);
      });
      // Outer face plate + polished ring + status light.
      const fx = side * (0.86 + 0.252);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.012, 96), face, (m) => { m.rotation.z = Math.PI / 2; m.position.set(fx, cupY, 0); m.scale.set(1, 1, 0.92); });
      add(new THREE.TorusGeometry(0.305, 0.011, 12, 120), ring, (m) => { m.rotation.y = Math.PI / 2; m.position.set(fx, cupY, 0); m.scale.set(0.92, 1, 1); });
      add(new THREE.SphereGeometry(0.014, 12, 10), led, (m) => { m.position.set(fx + side * 0.008, cupY - 0.23, 0); });
      // Cushion ring and inner fabric toward the head.
      add(new THREE.TorusGeometry(0.31, 0.085, 24, 96), cushion, (m) => { m.rotation.y = Math.PI / 2; m.position.set(side * 0.83, cupY, 0); m.scale.set(0.9, 1, 1); });
      add(new THREE.CircleGeometry(0.3, 64), fabric, (m) => { m.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; m.position.set(side * 0.8, cupY, 0); m.scale.set(0.9, 1, 1); });
    }
    g.position.y = 0.12;
  }

  resize(w: number, h: number) {
    this.W = w; this.H = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setColors(a: Palette, b: Palette, k: number) {
    const mix = (key: keyof Palette, mat: THREE.MeshPhysicalMaterial) => {
      mat.color.set(a[key]).lerp(this.tmp.set(b[key]), k);
    };
    mix('shell', this.mats.shell);
    mix('band', this.mats.band);
    mix('cushion', this.mats.cushion);
    mix('metal', this.mats.metal);
    mix('face', this.mats.face);
    mix('ring', this.mats.ring);
    this.haloColor.set(a.halo).lerp(this.tmp.set(b.halo), k);
    this.uiColor.set(a.ui).lerp(this.tmp.set(b.ui), k);
    this.rimL.color.set(a.rim).lerp(this.tmp.set(b.rim), k);
    this.rimR.color.copy(this.rimL.color).lerp(new THREE.Color('#ffffff'), 0.55);
    this.mats.led.emissive.copy(this.uiColor);
    this.tickLit.copy(this.uiColor);
  }

  render(p: Pose) {
    const halfH = this.D * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const ppu = this.H / (2 * halfH); // CSS px per world unit at z=0
    const wx = ((p.cx / this.W) * 2 - 1) * halfH * this.camera.aspect;
    const wy = -((p.cy / this.H) * 2 - 1) * halfH;
    const s = Math.max(0.05, Math.min(p.w / ppu / MODEL_W, p.h / ppu / MODEL_H));
    this.root.position.set(wx, wy, 0);
    this.root.scale.setScalar(s);
    this.model.rotation.y = p.rotY;

    const t = p.time;
    const breathe = 0.92 + 0.08 * Math.sin(t * 1.3);
    this.halo.material.color.copy(this.haloColor).multiplyScalar(0.95 * breathe * p.halo);
    this.halo.rotation.z = t * 0.05;
    this.pool.material.color.copy(this.haloColor).multiplyScalar(0.55);

    // Battery ticks
    const lit = p.ticks * TICKS;
    for (let i = 0; i < TICKS; i++) {
      const f = Math.min(1, Math.max(0, lit - i));
      this.ticks.setColorAt(i, this.tmp.copy(this.tickDim).lerp(this.tickLit, f));
    }
    if (this.ticks.instanceColor) this.ticks.instanceColor.needsUpdate = true;
    (this.ticks.material as THREE.MeshBasicMaterial).opacity = p.ticksVis;
    this.ticks.visible = p.ticksVis > 0.001;

    // ANC rings: travel in toward the left cup, shrinking and fading.
    this.rings.forEach((r, i) => {
      const ph = (t * 0.42 + i / this.rings.length) % 1;
      const d = 1 - ph;
      r.position.set(-(1.2 + d * 1.25), -0.82, 0);
      r.scale.setScalar(0.34 + d * 0.62);
      r.material.color.copy(this.uiColor);
      r.material.opacity = p.anc * Math.sin(ph * Math.PI) * 0.95;
      r.visible = p.anc > 0.001;
    });

    // Spatial orbits
    this.orbits.visible = p.orbit > 0.001;
    this.orbitLines.forEach((l, i) => {
      l.material.color.copy(this.uiColor);
      l.material.opacity = 0.45 * p.orbit;
      const dot = this.orbitDots[i];
      const R = 1.55 + i * 0.12;
      const a = t * (0.55 + i * 0.18) + i * 2.1;
      dot.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      dot.material.color.copy(this.uiColor);
      dot.material.opacity = p.orbit;
    });

    this.renderer.domElement.style.opacity = String(p.opacity);
    this.renderer.render(this.scene, this.camera);
  }
}
