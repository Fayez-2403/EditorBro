// Render 09 (V4, light mode): a white studio of glossy pastel toys that bounce on the song. Every landing IS a measured hit
// (V4's 1 ms onsets): the sphere and the cube take turns on the kicks, the capsule and the torus on the snares, the small ones on
// the hats. Flight height follows the gap to the next hit (a parabola that lands on it exactly), squash on contact and stretch with
// speed keep the volume, the cube flips one face per flight, the torus spins, and each landing rings a ripple across the floor.
// The studio is an infinite white sweep: white background, soft real shadows on a shadow catcher plus a contact blob per toy.
// Hits are assigned by their index in the whole song, so every frame is a pure function of t. p.t0 = the render's own start.
import * as THREE from 'three';
import { LOOK, FXW, type AuraCtx, type World, ease, pulse, statement, mono, txt, alpha, sat } from './common';

type Band = 'kick' | 'snare' | 'hat';
interface Toy { m: THREE.Mesh; band: Band; par: number; of: number; x: number; z: number; size: number; col: string; kind: string; hits: number[]; ring: THREE.Mesh; blob: THREE.Mesh }

export function r9World(): World {
  let x!: AuraCtx;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 608 / 1080, 0.1, 100);
  const toys: Toy[] = [];
  const WHITE = 1.42;
  const blobTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); return t;
  })();
  const add = (kind: string, geo: THREE.BufferGeometry, col: string, band: Band, par: number, of: number, xx: number, z: number, size: number) => {
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.16, envMapIntensity: 0.55 }));
    m.castShadow = true; scene.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(0.9), transparent: true, opacity: 0, depthWrite: false }));
    ring.position.set(xx, 0.004, z); scene.add(ring);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, color: '#3A3440' }));
    blob.position.set(xx, 0.006, z); scene.add(blob);
    toys.push({ m, band, par, of, x: xx, z, size, col, kind, hits: [], ring, blob });
  };
  /** The flight at t: the last landing, the next, and the parabola between (a long gap rests, then jumps into the next hit). */
  const flight = (hits: number[], t: number) => {
    let i = hits.length - 1; while (i >= 0 && hits[i]! > t) i--;
    const L0 = i >= 0 ? hits[i]! : -10, L1 = hits[i + 1] ?? L0 + 10, f = Math.min(L1 - L0, 0.72), up = L1 - f;
    const s = t < up ? 0 : (t - up) / f, H = 2.5 * f * f;
    return { L0, L1, n: i + 1, s, h: H * 4 * s * (1 - s), v: (H * 4 * (1 - 2 * s)) / f, air: t >= up };
  };
  return {
    init(ctx) {
      x = ctx;
      x.renderer.shadowMap.enabled = true; x.renderer.shadowMap.type = THREE.PCFShadowMap;
      scene.background = new THREE.Color(WHITE, WHITE, WHITE * 1.005);
      const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: '#BFC3C8', side: THREE.BackSide })));
      for (const [k, p] of [[3.2, [0, 9, 2]], [2.2, [-7, 3, 5]], [1.6, [7, 4, -2]], [1.2, [0, 2, 8]]] as [number, [number, number, number]][]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFFFFF').multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); env.add(m);
      }
      const pm = new THREE.PMREMGenerator(x.renderer); scene.environment = pm.fromScene(env, 0.03).texture; pm.dispose();
      scene.add(new THREE.HemisphereLight('#FFFFFF', '#E2DCEC', 0.8));
      const key = new THREE.DirectionalLight('#FFF7F0', 1.8); key.position.set(-3.2, 6.5, 4.2); key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5; scene.add(key);
      const rim = new THREE.DirectionalLight('#F0F4FF', 0.55); rim.position.set(3, 3, -5); scene.add(rim);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(WHITE, WHITE, WHITE) })); scene.add(floor);
      const catcher = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.22, color: '#2A2238' }));
      catcher.position.y = 0.002; catcher.receiveShadow = true; scene.add(catcher);
      // the toys (geometry with its base at y = 0, so squash keeps it on the floor)
      const rb = (w: number, r: number) => { const g = new THREE.BoxGeometry(w, w, w, 6, 6, 6), p = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3(), h = w / 2 - r;
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const c = new THREE.Vector3(Math.max(-h, Math.min(h, v.x)), Math.max(-h, Math.min(h, v.y)), Math.max(-h, Math.min(h, v.z))); v.sub(c).normalize().multiplyScalar(r).add(c); p.setXYZ(i, v.x, v.y, v.z); }
        g.computeVertexNormals(); return g; };
      add('cube', rb(0.62, 0.11), '#FF9474', 'kick', 1, 2, 0.5, 0.0, 0.62);
      add('sphere', new THREE.SphereGeometry(0.36, 64, 40).translate(0, 0.36, 0), '#4FD3A4', 'kick', 0, 2, -0.58, 0.38, 0.72);
      add('capsule', new THREE.CapsuleGeometry(0.19, 0.42, 12, 32).translate(0, 0.4, 0), '#9F86FF', 'snare', 0, 2, -0.2, -1.2, 0.8);
      add('torus', new THREE.TorusGeometry(0.28, 0.11, 32, 72), '#FFC633', 'snare', 1, 2, 0.86, -0.95, 0.78); toys[toys.length - 1]!.m.rotation.order = 'YXZ';
      add('ball', new THREE.SphereGeometry(0.17, 48, 32).translate(0, 0.17, 0), '#55B0FF', 'hat', 0, 2, -0.92, -0.55, 0.34);
      add('puck', new THREE.CylinderGeometry(0.24, 0.24, 0.17, 64).translate(0, 0.085, 0), '#FF6A88', 'hat', 1, 2, 0.12, 1.15, 0.48);
      // each toy's landings: its share of the song's measured hits, by their index in the whole song (min 0.2 s apart)
      for (const ty of toys) {
        const all = x.audio.events(ty.band, 0, x.audio.duration + 1).map(([h]) => h); let last = -1;
        all.forEach((h, i) => { if (i % ty.of === ty.par && h - last >= 0.2) { ty.hits.push(h); last = h; } });
      }
    },
    render3d(t, rt, p) {
      const t0 = p.t0 as number, lt = t - t0, B = x.cues.bar;
      for (const ty of toys) {
        const fl = flight(ty.hits, t), age = t - fl.L0;
        const sq = 1 - 0.32 * Math.exp(-age / 0.055) * (fl.air ? 0 : 1), st = fl.air ? 1 + Math.min(0.18, 0.035 * Math.abs(fl.v)) : 1;
        const sy = sq * st, sxz = 1 / Math.sqrt(sy), sc = ty.kind === 'ball' || ty.kind === 'puck' ? 0.75 : 1, h = fl.h * sc;
        ty.m.position.set(ty.x, h, ty.z); ty.m.scale.set(sxz, sy, sxz);
        const e = ease.inOut(fl.s, 2);
        if (ty.kind === 'cube') { ty.m.rotation.set(0, 0.5, -(fl.n + (fl.air ? e : 0)) * Math.PI / 2); ty.m.position.y = h + 0.31 * sy + (fl.air ? 0.31 * (Math.SQRT2 - 1) * Math.sin(e * Math.PI) : 0); }   // centred: a face-flip per flight
        else if (ty.kind === 'torus') { ty.m.rotation.set(1.15, (fl.n + (fl.air ? e : 0)) * Math.PI, 0); ty.m.position.y = h + 0.224 * sy; }   // centred, tilted, spun about the vertical
        else if (ty.kind === 'capsule') ty.m.rotation.set(0, 0, 0.28 * Math.exp(-age / 0.25) * Math.sin(age * 24) * (fl.air ? 0 : 1));
        else ty.m.rotation.set(0, lt * 0.6, 0);
        // the ripple of the last landing, and the contact shadow (darker and tighter the closer the toy is to the floor)
        const ra = age; (ty.ring.material as THREE.MeshBasicMaterial).opacity = ra < 0.75 ? 0.55 * Math.pow(1 - ra / 0.75, 2) : 0;
        ty.ring.scale.setScalar(ty.size * (0.6 + 3.2 * ease.out(sat(ra / 0.75), 2)));
        ty.blob.scale.setScalar(ty.size * (1.5 + 0.9 * h)); (ty.blob.material as THREE.MeshBasicMaterial).opacity = 0.95 / (1 + 2.2 * h);
      }
      const a = -0.16 + 0.07 * lt, r = 5.5 - 0.25 * ease.inOut(sat(lt / (2 * B)), 2);
      cam.position.set(Math.sin(a) * r, 1.95, Math.cos(a) * r); cam.lookAt(0, 0.4, -0.1);
      cam.fov = 40 - 1.4 * pulse(t, t0 + Math.floor(lt / B) * B, 0.12); cam.aspect = rt.width / rt.height; cam.updateProjectionMatrix();
      x.renderer.setRenderTarget(rt); x.renderer.setClearColor('#FFFFFF', 1); x.renderer.clear(); x.renderer.render(scene, cam);
    },
    draw(c, t, p) {
      if (LOOK.clean) return;
      const t0 = p.t0 as number;
      txt(c, 'R09 · BOUNCE · THREE.JS', 32, 84, mono(12, 600), alpha('#2A2238', 0.7), 2, 'left');
      txt(c, 'every landing = a measured hit', FXW - 32, 84, mono(11, 600), alpha('#2A2238', 0.6), 1, 'right');
      statement(c, 'PHYSICS → RHYTHM', t, t0 + x.cues.bar, 880, '#2A2238', '#FF8DA1');
    },
  };
}
