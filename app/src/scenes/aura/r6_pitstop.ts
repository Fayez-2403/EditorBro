// Render 06: a procedural pit stop, the biggest reveal. Everything is original: an open-wheel car built from primitives (graphite
// and teal, the channel's own TECHPE TREK on the sidepods, number 55), a fourteen-person crew, a pit box under strip lights.
// No real series, team, sponsor or livery marks. Shots, each on its cue: the car arrives (r6.in), brake glow (r6.brake), the
// top-down as the crew converge (r6.crew), wheel off (r6.off), wheel on (r6.on), jacks drop and GO (r6.drop), the launch
// (r6.launch), and the spinning wheel that turns into the editor (r6.wheel). The stop is shown slowed x3.2 with its clock.
import * as THREE from 'three';
import { V2HY, LOOK, A, CX, FXW, type AuraCtx, type World, ease, pulse, mono, txt, ax, alpha, fillRR, sat, span } from './common';
import { hash } from '../../engine/util';

const R = 0.36, AX = 0.82, AZ = 1.8;                         // wheel radius, half track, half wheelbase
const CORNERS: [number, number][] = [[-AX, -AZ], [AX, -AZ], [-AX, AZ], [AX, AZ]];   // FL FR RL RR (forward is -z)
const STOP_S = 1.98;

function canvasTex(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const box = (w: number, h: number, d: number, m: THREE.Material, p: [number, number, number], rx = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(...p); o.rotation.x = rx; return o;
};

function makeWheel(front: boolean, mats: Record<string, THREE.Material>) {
  const w = front ? 0.3 : 0.38, rr = 0.235, g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  const prof = [[rr, -w / 2], [R - 0.05, -w / 2], [R - 0.01, -w / 2 + 0.04], [R, 0], [R - 0.01, w / 2 - 0.04], [R - 0.05, w / 2], [rr, w / 2]].map(([a, b]) => new THREE.Vector2(a, b));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 56).rotateZ(Math.PI / 2), mats.tire); spin.add(tire);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, w * 0.92, 40, 1, true).rotateZ(Math.PI / 2), mats.rim); spin.add(barrel);
  const face = new THREE.Mesh(new THREE.RingGeometry(rr * 0.8, rr, 40).rotateY(Math.PI / 2), mats.rimFace); face.position.x = w * 0.42; spin.add(face);   // a lip: the disc glows between the spokes
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24).rotateY(Math.PI / 2), mats.rimFace); hub.position.x = w * 0.43; spin.add(hub);
  for (let k = 0; k < 6; k++) { const s = box(0.02, rr * 1.9, 0.045, mats.rim, [w * 0.44, 0, 0]); s.rotation.x = (k / 6) * Math.PI; spin.add(s); }
  const blur = new THREE.Mesh(new THREE.RingGeometry(0.06, rr * 0.98, 48).rotateY(Math.PI / 2), mats.blur); blur.position.x = w * 0.455; spin.add(blur);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6).rotateZ(Math.PI / 2), (mats.nut as THREE.MeshStandardMaterial).clone()); nut.position.x = w * 0.48; spin.add(nut);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.028, 40).rotateZ(Math.PI / 2), mats.disc); disc.position.x = -w * 0.15; g.add(disc);
  return { g, spin, nut: nut.material as THREE.MeshStandardMaterial, blur };
}

function makeCar(mats: Record<string, THREE.Material>, livery: THREE.Texture, nose: THREE.Texture) {
  const car = new THREE.Group(), body = new THREE.Group(); car.add(body);
  // the monocoque + nose + engine cover: a top-view outline, extruded, then shaped in height along the car
  const prof: [number, number][] = [[0.07, -2.78], [0.12, -2.2], [0.2, -1.4], [0.33, -0.8], [0.42, -0.2], [0.44, 0.5], [0.34, 1.3], [0.2, 2.0], [0.12, 2.5]];
  const sh = new THREE.Shape(); sh.moveTo(0, prof[0]![1]);
  sh.splineThru(prof.map(([w, z]) => new THREE.Vector2(w, z))); sh.lineTo(0, 2.55);
  sh.splineThru([...prof].reverse().map(([w, z]) => new THREE.Vector2(-w, z))); sh.closePath();
  const mono = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 5, curveSegments: 40, steps: 1 });
  mono.rotateX(Math.PI / 2).translate(0, 0.36 + 0.14, 0);
  const pp = mono.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pp.count; i++) {   // height profile: a low drooping nose, a tall cockpit, a falling engine cover
    const z = pp.getZ(i), y = pp.getY(i), k = THREE.MathUtils.smoothstep(z, -2.6, -0.7), back = THREE.MathUtils.smoothstep(z, 0.6, 2.5);
    const hgt = 0.42 + 0.58 * k - 0.35 * back, y0 = 0.14 - 0.06 * (1 - k);
    pp.setY(i, y0 + (y - 0.14) * hgt);
  }
  mono.computeVertexNormals(); body.add(new THREE.Mesh(mono, mats.paint));
  // sidepods (with the livery panels), floor, engine fin, airbox, cockpit, helmet, halo
  for (const s of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.25, 8, 24).rotateX(Math.PI / 2), mats.paint); pod.scale.set(1, 0.95, 1); pod.position.set(s * 0.55, 0.36, 0.3); body.add(pod);
    const inlet = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), mats.carbon); inlet.position.set(s * 0.55, 0.38, -0.36); inlet.rotation.y = Math.PI; body.add(inlet);
    const lv = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.29), new THREE.MeshPhysicalMaterial({ map: livery, transparent: true, roughness: 0.3, clearcoat: 1 }));
    lv.position.set(s * 0.756, 0.37, 0.32); lv.rotation.y = s * Math.PI / 2; body.add(lv);
  }
  body.add(box(1.36, 0.035, 3.7, mats.carbon, [0, 0.07, 0.25]));
  const fin = new THREE.Shape(); fin.moveTo(-0.2, 0); fin.lineTo(0.4, 0.42); fin.lineTo(2.2, 0.28); fin.lineTo(2.35, 0); fin.closePath();
  const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.03, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(0.015, 0.56, 0); body.add(new THREE.Mesh(fg, mats.paint));
  const air = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 6, 16).rotateX(Math.PI / 2), mats.paint); air.position.set(0, 0.8, 0.25); air.scale.set(1.2, 1, 1); body.add(air);
  const scoop = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), mats.carbon); scoop.position.set(0, 0.82, -0.08); scoop.rotation.y = Math.PI; body.add(scoop);
  const cock = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24).rotateX(-Math.PI / 2), mats.carbon); cock.scale.set(1, 1, 1.9); cock.position.set(0, 0.645, -0.45); body.add(cock);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.135, 28, 20), mats.helmet); helm.position.set(0, 0.69, -0.34); body.add(helm);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.137, 28, 12, Math.PI * 0.7, Math.PI * 0.6, Math.PI * 0.35, Math.PI * 0.2), mats.visor); visor.position.copy(helm.position); body.add(visor);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.026, 10, 40, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), mats.carbon); halo.position.set(0, 0.8, -0.38); halo.scale.set(0.95, 1, 1.25); body.add(halo);
  const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.2, 10), mats.carbon); pil.position.set(0, 0.72, -0.76); pil.rotation.x = 0.35; body.add(pil);
  const nz = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.32), new THREE.MeshPhysicalMaterial({ map: nose, transparent: true, roughness: 0.3, clearcoat: 1 })); nz.rotation.x = -Math.PI / 2 + 0.12; nz.position.set(0, 0.395, -1.62); body.add(nz);
  // the stripe down the spine
  const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 2.9, 4, 8).rotateX(Math.PI / 2), mats.accent); stripe.position.set(0, 0.6, -1.0); stripe.scale.set(1, 0.4, 1); body.add(stripe);
  // wings
  body.add(box(1.86, 0.035, 0.42, mats.carbon, [0, 0.11, -2.56]), box(1.62, 0.03, 0.2, mats.accent, [0, 0.2, -2.46], -0.22));
  for (const s of [-1, 1]) body.add(box(0.025, 0.22, 0.5, mats.carbon, [s * 0.93, 0.18, -2.52]));
  body.add(box(1.02, 0.04, 0.32, mats.carbon, [0, 0.9, 2.46], 0.08), box(1.0, 0.03, 0.2, mats.accent, [0, 1.01, 2.38], -0.3), box(0.05, 0.42, 0.07, mats.carbon, [0, 0.7, 2.36]));
  for (const s of [-1, 1]) body.add(box(0.025, 0.46, 0.56, mats.paint, [s * 0.51, 0.82, 2.44]));
  body.add(box(1.0, 0.18, 0.3, mats.carbon, [0, 0.16, 2.35], -0.35));
  // suspension arms (a hint) and the rain light
  for (const [cx, cz] of CORNERS) for (const dy of [0.2, 0.32]) { const arm = box(Math.abs(cx) - 0.28, 0.018, 0.03, mats.carbon, [cx / 2 + Math.sign(cx) * 0.14, dy, cz]); body.add(arm); }
  const rl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF2A2A').multiplyScalar(3) })); rl.position.set(0, 0.36, 2.52); body.add(rl);
  const wheels = CORNERS.map(([cx, cz], i) => { const w = makeWheel(i < 2, mats); w.g.position.set(cx, R, cz); if (cx < 0) w.g.scale.x = -1; car.add(w.g); return w; });
  return { car, body, wheels };
}

function makeCrew(mats: Record<string, THREE.Material>, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const g = new THREE.Group(), suit = i % 3 === 0 ? mats.suitB : mats.suit;
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 6, 14), mats.suitDark); legs.position.y = 0.45; g.add(legs);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 6, 16), suit); torso.position.y = 1.02; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), mats.crewHelmet); head.position.y = 1.55; g.add(head);
    const vis = new THREE.Mesh(new THREE.SphereGeometry(0.152, 20, 10, Math.PI * 0.65, Math.PI * 0.7, Math.PI * 0.38, Math.PI * 0.22), mats.visor); vis.position.y = 1.55; g.add(vis);
    for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.42, 4, 10), suit); arm.position.set(s * 0.26, 1.02, -0.12); arm.rotation.x = -0.9; g.add(arm); }
    return g;
  });
}

export function r6World(): World {
  let x!: AuraCtx; let t0 = 0, brk = 0, crw = 0, off = 0, on = 0, drp = 0, lch = 0, whl = 0, end = 0, e8 = 0, ts = 0;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 608 / 1080, 0.05, 300);
  const V0 = 36, ACC = 9;
  let car!: ReturnType<typeof makeCar>, crew: THREE.Group[] = [], spare: ReturnType<typeof makeWheel>[] = [], old: ReturnType<typeof makeWheel>[] = [];
  let disc!: THREE.MeshStandardMaterial, blurM!: THREE.MeshBasicMaterial, goLight!: THREE.MeshBasicMaterial, smoke!: THREE.Points;
  const SU = { uT: { value: 0 }, uTl: { value: 0 }, uAcc: { value: ACC }, uPx: { value: 1 } };
  /** The car's z along the lane (forward is -z): it brakes to a stop at ts, sits, then launches at lch. */
  const carZ = (t: number) => (t < ts ? (V0 * (ts - t) ** 2) / (2 * (ts - t0)) : t < lch ? 0 : -0.5 * ACC * (t - lch) ** 2);
  // crew roles: per corner a gunner, an off-man and an on-man, plus front and rear jacks
  const roles: { rest: THREE.Vector3; work: THREE.Vector3; face: number; crouch: number }[] = [];
  return {
    init(ctx) {
      x = ctx; e8 = x.cues.eighth;
      t0 = x.ev('r6.in'); brk = x.ev('r6.brake'); crw = x.ev('r6.crew'); off = x.ev('r6.off'); on = x.ev('r6.on'); drp = x.ev('r6.drop'); lch = x.ev('r6.launch'); whl = x.ev('r6.wheel'); end = x.ev('fin.timeline');
      ts = crw - 0.12;
      // a night pit-lane environment for the reflections: dark, overhead strips, the teal wall strip, the warm garage
      const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: '#05070B', side: THREE.BackSide })));
      const ep = (w: number, h: number, col: string, k: number, pos: [number, number, number], look: [number, number, number]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.lookAt(...look); env.add(m); };
      for (let z = -12; z <= 12; z += 4) ep(4, 0.5, '#F4F7FA', 4, [0, 6, z], [0, 0, z]);
      ep(30, 0.4, A.teal, 2.5, [8, 1, 0], [0, 1, 0]); ep(10, 3, '#FFD8A8', 1.6, [-8, 2, 0], [0, 2, 0]); ep(30, 2, '#2A3442', 1, [0, -2, 12], [0, 0, 0]);
      const pm = new THREE.PMREMGenerator(x.renderer); scene.environment = pm.fromScene(env, 0.02).texture; scene.environmentIntensity = 1; pm.dispose();
      scene.background = new THREE.Color('#04060A'); scene.fog = new THREE.FogExp2('#04060A', 0.028);
      const M = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
      disc = new THREE.MeshStandardMaterial({ color: '#2A2A2E', metalness: 0.8, roughness: 0.4, emissive: new THREE.Color('#FF5A10'), emissiveIntensity: 0 });
      blurM = new THREE.MeshBasicMaterial({ color: '#8D96A3', transparent: true, opacity: 0, depthWrite: false });
      const mats: Record<string, THREE.Material> = {
        paint: M({ color: '#141920', metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.7 }),
        accent: M({ color: A.teal, metalness: 0.3, roughness: 0.28, clearcoat: 1, emissive: new THREE.Color(A.teal), emissiveIntensity: 0.12 }),
        carbon: M({ color: '#0C0D10', metalness: 0.3, roughness: 0.42, clearcoat: 0.6 }),
        tire: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.82 }),
        rim: M({ color: '#3B4048', metalness: 1, roughness: 0.22 }), rimFace: M({ color: '#22262C', metalness: 1, roughness: 0.3 }),
        nut: new THREE.MeshStandardMaterial({ color: A.teal, emissive: new THREE.Color(A.teal), emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.3 }),
        disc, blur: blurM,
        helmet: M({ color: '#F1F3F6', metalness: 0.1, roughness: 0.2, clearcoat: 1 }), visor: M({ color: '#0A0C10', metalness: 0.9, roughness: 0.05 }),
        suit: new THREE.MeshStandardMaterial({ color: '#1E2631', roughness: 0.75 }), suitB: new THREE.MeshStandardMaterial({ color: '#16707A', roughness: 0.7 }),
        suitDark: new THREE.MeshStandardMaterial({ color: '#12161C', roughness: 0.8 }), crewHelmet: M({ color: '#E8ECF1', roughness: 0.25, clearcoat: 1 }),
      };
      const livery = canvasTex(1024, 256, (g) => {
        g.clearRect(0, 0, 1024, 256); g.fillStyle = A.teal; g.fillRect(40, 196, 944, 14);
        g.font = ax(120, 120, 900); g.textAlign = 'center'; g.fillStyle = '#F2F5F8'; g.fillText('TECHPE TREK', 512, 160);
      });
      const nose = canvasTex(256, 384, (g) => { g.clearRect(0, 0, 256, 384); g.font = ax(230, 110, 900); g.textAlign = 'center'; g.fillStyle = '#F2F5F8'; g.translate(128, 192); g.rotate(Math.PI / 2); g.fillText('55', 0, 80); });
      car = makeCar(mats, livery, nose); scene.add(car.car);
      for (const [cx, cz] of CORNERS) {   // the spares (held by the on-men) and, after the swap, the old wheels
        const sp = makeWheel(cz < 0, mats); if (cx < 0) sp.g.scale.x = -1; scene.add(sp.g); spare.push(sp);
      }
      old = car.wheels;
      // the pit box floor: asphalt, the box lines, wheel marks, the lane line
      const floor = canvasTex(2048, 2048, (g) => {
        g.fillStyle = '#0E1013'; g.fillRect(0, 0, 2048, 2048);
        for (let i = 0; i < 26000; i++) { const v = 10 + hash(i, 1) * 20; g.fillStyle = `rgb(${v},${v + 1},${v + 4})`; g.fillRect(hash(i, 2) * 2048, hash(i, 3) * 2048, 2, 2); }
        const m = 2048 / 40, X = (v: number) => 1024 + v * m, Z = (v: number) => 1024 + v * m;
        g.fillStyle = 'rgba(63,214,224,0.10)'; g.fillRect(X(-1.6), Z(-3.4), 3.2 * m, 6.6 * m);
        g.strokeStyle = '#B9BEC4'; g.lineWidth = 6; g.strokeRect(X(-1.6), Z(-3.4), 3.2 * m, 6.6 * m);
        g.fillStyle = '#F2C230'; for (const [cx, cz] of CORNERS) { g.fillRect(X(cx * 1.15) - 6, Z(cz) - 26, 12, 52); g.fillRect(X(cx * 1.15) - 26, Z(cz) - 4, 52, 8); }
        g.fillStyle = '#E9ECEF'; for (let z = -20; z < 20; z += 3) g.fillRect(X(3.6), Z(z), 8, 1.6 * m);
        g.font = ax(64, 110, 900); g.textAlign = 'center'; g.fillStyle = 'rgba(233,236,239,0.9)'; g.fillText('55', X(0), Z(-4.2));
      });
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floor, roughness: 0.6, metalness: 0.05, envMapIntensity: 0.35 }));
      scene.add(fl);
      // a soft contact shadow under the car
      const sh = canvasTex(256, 512, (g) => { const r = g.createRadialGradient(128, 256, 10, 128, 256, 250); r.addColorStop(0, 'rgba(0,0,0,0.85)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 512); });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false }));
      shadow.position.y = 0.01; shadow.name = 'shadow'; car.car.add(shadow);
      // the garage (-x), the pit wall (+x), the overhead light gantry
      const wall = new THREE.MeshStandardMaterial({ color: '#1B2029', roughness: 0.7 });
      scene.add(box(0.4, 4.6, 100, wall, [-6.2, 2.3, -20]));
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(40, 60).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0F1114', roughness: 0.6, envMapIntensity: 0.35 })); lane.position.set(0, -0.002, -50); scene.add(lane);
      const lit = (w: number, h: number, d: number, col: string, k: number, p: [number, number, number]) => scene.add(box(w, h, d, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k) }), p));
      lit(0.05, 2.8, 8, '#DDE6F0', 1.4, [-5.98, 1.9, 0]);                  // the lit garage opening
      for (let k = -1; k <= 1; k++) lit(0.06, 0.5, 1.6, A.teal, 1.6, [-5.95, 3.65, k * 2.6]);   // timing monitors
      for (let k = 0; k < 5; k++) for (let j = 0; j < 3; j++) { const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 24), mats.tire); tire.position.set(-5.4, 0.15 + j * 0.31, -6 + k * 0.8); scene.add(tire); }
      scene.add(box(0.3, 1.1, 100, wall, [6.6, 0.55, -20])); lit(0.05, 0.06, 100, A.teal, 2.2, [6.44, 1.06, -20]);
      for (let z = -44; z <= 16; z += 4) { const b = box(3.4, 0.06, 0.35, new THREE.MeshBasicMaterial({ color: new THREE.Color('#F4F7FA').multiplyScalar(2.4) }), [0, 5.2, z]); b.layers.set(1); scene.add(b); }   // layer 1: the top-down shots look past it
      const gl = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FF2A2A').multiplyScalar(3) }); goLight = gl;
      const gan = box(0.5, 0.22, 0.12, new THREE.MeshStandardMaterial({ color: '#0C0E12' }), [0, 2.9, -4.4]); scene.add(gan);
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), gl); lamp.position.set(0, 2.9, -4.47); lamp.rotation.y = Math.PI; scene.add(lamp);
      // lights
      scene.add(new THREE.AmbientLight('#8AA0B8', 0.16));
      const key = new THREE.DirectionalLight('#EAF2FF', 1.3); key.position.set(-3, 8, 2); scene.add(key);
      const rim = new THREE.DirectionalLight(A.teal, 1.6); rim.position.set(5, 3, -4); scene.add(rim);
      for (const z of [-2, 2, -14, -26]) { const s = new THREE.SpotLight('#FFFFFF', 11, 14, 0.7, 0.7, 1.4); s.position.set(0, 5, z); s.target.position.set(0, 0, z); scene.add(s, s.target); }
      // crew: per corner gun / off / on, then the jacks
      CORNERS.forEach(([cx, cz]) => {
        const sx = Math.sign(cx);
        roles.push({ rest: new THREE.Vector3(sx * 3.4, 0, cz), work: new THREE.Vector3(cx + sx * 0.62, 0, cz), face: sx > 0 ? -Math.PI / 2 : Math.PI / 2, crouch: 0.62 });
        roles.push({ rest: new THREE.Vector3(sx * 3.6, 0, cz + 0.9), work: new THREE.Vector3(cx + sx * 0.85, 0, cz + 0.95), face: sx > 0 ? -Math.PI / 2 : Math.PI / 2, crouch: 0.8 });
        roles.push({ rest: new THREE.Vector3(sx * 3.6, 0, cz - 0.9), work: new THREE.Vector3(cx + sx * 0.85, 0, cz - 0.95), face: sx > 0 ? -Math.PI / 2 : Math.PI / 2, crouch: 0.8 });
      });
      roles.push({ rest: new THREE.Vector3(-1.5, 0, -6), work: new THREE.Vector3(0, 0, -3.35), face: 0, crouch: 0.86 });
      roles.push({ rest: new THREE.Vector3(1.5, 0, 6), work: new THREE.Vector3(0, 0, 3.15), face: Math.PI, crouch: 0.86 });
      crew = makeCrew(mats, roles.length); for (const c of crew) scene.add(c);
      // the launch tire smoke (GPU particles, positions from t)
      const n = 900, aR = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) aR[i] = hash(83, i);
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); sg.setAttribute('aR', new THREE.BufferAttribute(aR, 4));
      smoke = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        vertexShader: `attribute vec4 aR; uniform float uT, uTl, uAcc, uPx; varying float vA;
          void main() { float tb = uTl + aR.w * 1.3, age = uT - tb, side = aR.x < .5 ? -.82 : .82, zc = -.5 * uAcc * pow(max(tb - uTl, 0.), 2.);
            vec3 p = vec3(side + side * age * .9 + (aR.y - .5) * .5, .16 + age * (.7 + aR.z * .6), 1.9 + zc + age * (1.2 + aR.y));
            vA = step(0., age) * smoothstep(0., .15, age) * (1. - smoothstep(.6, 1.8, age)) * .3;
            vec4 mv = viewMatrix * vec4(p, 1.); gl_PointSize = uPx * (90. + age * 260.) / -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying float vA; void main() { vec2 q = gl_PointCoord - .5; float r = dot(q, q) * 4.; if (r > 1.) discard; float a = exp(-r * 3.) * vA; gl_FragColor = vec4(vec3(.55, .58, .62) * a, a); }` }));
      smoke.frustumCulled = false; scene.add(smoke);
    },
    render3d(t, rt) {
      const z = carZ(t), lift = ease.out(span(t, crw + 0.25, crw + 0.5), 3) * (1 - ease.in(span(t, drp, drp + 0.06), 2));
      const dd = t - drp, bounce = dd > 0 ? -0.035 * Math.exp(-dd / 0.13) * Math.cos(dd * 32) : 0;
      car.car.position.set(0, 0, z); car.body.position.y = 0.07 * lift + bounce;
      // the wheels: rolling, braking glow, the swap, the launch wheelspin
      const roll = z / R + (t > lch ? -(t - lch) * 26 * Math.exp(-(t - lch) * 0.6) : 0);
      disc.emissiveIntensity = 3.2 * ease.out(span(t, brk - 0.2, brk), 2) * (1 - span(t, ts, ts + 1.5)) + (t > lch ? 0.6 : 0);
      const spinFast = t > lch ? sat((t - lch) * 1.2) : t < ts ? sat((ts - t) / 0.8) : 0;
      blurM.opacity = 0.75 * spinFast;
      CORNERS.forEach(([cx, cz], i) => {
        const sx = Math.sign(cx), o = old[i]!, s = spare[i]!;
        // the old wheel: on the car until r6.off, then pulled out (two eighths) and carried back
        const out = ease.out(span(t, off, off + 2 * e8), 3), back = ease.inOut(span(t, off + 2 * e8, off + 6 * e8), 2);
        o.g.position.set(cx + sx * (out * 0.9 + back * 0.6), R + 0.07 * lift + (t > off ? 0.05 * out : 0), cz + back * 0.5);
        o.spin.rotation.x = t < off ? roll : roll;
        if (t >= off && o.g.parent === car.car) { /* stays attached; positions are car-local and the car is parked here */ }
        // the spare: held out by the on-man, slammed on at r6.on, then rolls with the car
        const inK = ease.in(span(t, on - 2 * e8, on), 2.2);
        s.g.visible = t >= crw;
        s.g.position.set(cx + sx * (1.05 * (1 - inK)), R + 0.07 * lift + bounce * 0.4 + 0.1 * (1 - inK), cz - 0.45 * (1 - inK) + z);
        s.spin.rotation.x = t > lch ? roll : 0;
        s.nut.emissiveIntensity = 0.4 + 4 * pulse(t, on + i * 0.03, 0.09);
        o.g.visible = !(t > lch);
      });
      // the old wheels ride the car until it parks; they are car-local, so after the launch they are hidden
      // crew: rush in (r6.crew), work, step back after the drop
      crew.forEach((c, i) => {
        const r = roles[i]!, inK = ease.out(span(t, crw + hash(i, 5) * 0.12, crw + 0.5 + hash(i, 6) * 0.15), 3), outK = ease.inOut(span(t, drp + 0.05, drp + 0.6), 2);
        const p = r.rest.clone().lerp(r.work, inK * (1 - outK));
        c.position.copy(p); c.rotation.y = r.face + (1 - inK) * 0.3 * (hash(i, 7) - 0.5);
        const cr = 1 - (1 - r.crouch) * inK * (1 - outK); c.scale.set(1, cr, 1);
        c.visible = t >= t0;
      });
      goLight.color.set(t >= drp ? '#22FF7A' : '#FF2A2A').multiplyScalar(3);
      SU.uT.value = t; SU.uTl.value = lch; SU.uPx.value = x.px; smoke.visible = t > lch;
      // camera, one setup per cue
      const carP = new THREE.Vector3(0, 0.4, z), shake = 0.05 * pulse(t, on, 0.1) + 0.06 * pulse(t, drp, 0.1) + 0.08 * pulse(t, lch, 0.25);
      const sx = (hash(Math.round(t * 60), 3) - 0.5) * shake, sy = (hash(Math.round(t * 60), 4) - 0.5) * shake;
      cam.up.set(0, 1, 0); cam.layers.enable(1);
      if (t < brk) { cam.fov = 26; cam.position.set(-2.4 + sx, 0.32 + sy, -7.5); cam.lookAt(carP); }
      else if (t < crw) { const wp = new THREE.Vector3(-AX, R, -AZ + z); cam.fov = 40; cam.position.set(wp.x - 1.25 + sx, 0.3 + sy, wp.z - 0.9); cam.lookAt(wp.x, wp.y, wp.z); }
      else if (t < off) { const k = ease.out(span(t, crw, off), 2); cam.fov = 52; cam.up.set(0, 0, -1); cam.layers.disable(1); cam.position.set(sx, 9.6 - 0.8 * k, 0.15); cam.lookAt(0, 0, 0); }
      else if (t < on + 2 * e8) { const k = span(t, off, on + 2 * e8); cam.fov = 50; cam.up.set(0, 0, -1); cam.layers.disable(1); cam.position.set(sx, 7.6 - 0.6 * k, -0.6); cam.lookAt(0, 0, -0.75); }   // closer top-down: all four wheels out, all four in
      else if (t < drp) { cam.fov = 52; cam.up.set(0, 0, -1); cam.layers.disable(1); cam.position.set(sx, 8.4, 0.15); cam.lookAt(0, 0, 0); }
      else if (t < lch) { const k = span(t, drp, lch); cam.fov = 30; cam.position.set(0.9 - 0.4 * k + sx, 0.28 + sy, -5.6 + 0.4 * k); cam.lookAt(0, 0.38, 0); }
      else if (t < whl) { const k = ease.in(span(t, lch, whl), 1.6); cam.fov = 40 + 10 * k; cam.position.set(1.1 + sx, 0.55 + sy, 5.2 - 2.0 * k); cam.lookAt(0, 0.45, z * 0.85); }
      else { const k = span(t, whl, end); cam.fov = 40 - 5 * k; cam.position.set(6.6 - 0.8 * k + sx, 0.6 + sy, z + 1.4); cam.lookAt(0.3, 0.45, z + 0.5); }   // tracking alongside at speed
      cam.aspect = rt.width / rt.height; cam.updateProjectionMatrix();
      x.renderer.setRenderTarget(rt); x.renderer.setClearColor('#04060A', 1); x.renderer.clear(); x.renderer.render(scene, cam);
    },
    draw(c, t, p) {
      if (!LOOK.clean) { c.save(); if (p?.v2) c.translate(0, V2HY);   // V2: the prompt card sits above the HUD; V4 (clean): no HUD
      txt(c, 'R06 · PIT STOP · THREE.JS', 32, 84, mono(12, 600), alpha(A.text, 0.6), 2, 'left');
      txt(c, 'CG · fictional team', FXW - 32, 84, mono(12, 600), alpha(A.text, 0.6), 1, 'right');
      // the stop clock (the stop is shown slowed: reel seconds -> event seconds)
      if (t >= ts && t < whl) {
        const s = STOP_S * sat((t - ts) / (lch - ts)), done = t >= lch;
        fillRR(c, 28, 104, 196, 64, 10, 'rgba(5,8,12,0.6)');
        txt(c, done ? 'STOP' : 'STOP · SLOW ×3.2', 44, 128, mono(11, 600), A.dim, 1.5, 'left');
        txt(c, s.toFixed(2) + ' s', 44, 158, ax(26, 110, 800), done ? A.lime : A.text, 0, 'left');
      }
      // the corner checks, lit as each wheel locks
      if (t >= on - 2 * e8 && t < lch) {
        ['FL', 'FR', 'RL', 'RR'].forEach((n, i) => {
          const ok = t >= on + i * 0.03, xx = FXW - 32 - (3 - i) * 52;
          fillRR(c, xx - 44, 106, 44, 30, 8, ok ? alpha(A.green, 0.85) : 'rgba(255,255,255,0.08)');
          txt(c, n, xx - 22, 126, mono(12, 700), ok ? '#04140B' : A.dim, 1, 'center');
        });
      }
      c.restore(); }
      if (t >= drp && t < lch + 0.6) {   // GO
        const k = ease.out(span(t, drp, drp + 0.15), 3);
        txt(c, 'GO', CX, 250, ax(64 + 20 * (1 - k), 125, 900), alpha(A.green, k), 4, 'center');
      }
      if (t >= lch && t < whl) {   // the payoff number
        const k = ease.out(span(t, lch, lch + 0.25), 4);
        c.save(); c.globalAlpha = k;
        txt(c, STOP_S.toFixed(2) + ' s', CX, 860 + (1 - k) * 30, ax(92, 115, 900), A.text, -1, 'center');
        txt(c, 'PIT STOP · RENDERED, NOT FILMED', CX, 900, mono(14, 600), A.teal, 2.5, 'center');
        c.restore();
      }
      const wf = span(t, end - e8, end);   // the wheel blooms into the editor
      if (wf > 0) { c.fillStyle = `rgba(232,246,248,${ease.in(wf, 2) * 0.9})`; c.fillRect(0, 0, FXW, 1080); }
    },
  };
}
