// Render 04: a chrome + glass 3D brand assembly (an original mark, not anyone's logo): a chrome ring in four arcs, a glass
// play-triangle with dispersion, a chrome timeline bar and two keyframe diamonds. Bar 1: four macro shots of the loose pieces,
// a hard cut on every beat. Bar 2: the eight pieces fly in and lock, one on each eighth (a spring settle, a teal lock flash, a
// camera tick). Bar 3: the hero shot, a light sweep, "MATTER → MOTION", and on r4.reflect the studio swaps for one whose floor
// is a timeline, so the chrome reflects the edit.
import * as THREE from 'three';
import { V2HY, LOOK, A, FXW, type AuraCtx, type World, ease, pulse, statement, mono, txt, alpha, sat, span } from './common';
import { hash } from '../../engine/util';

type Piece = { mesh: THREE.Mesh; fin: THREE.Vector3; finQ: THREE.Quaternion; sc: THREE.Vector3; scE: THREE.Euler; spin: THREE.Vector3; mat: THREE.MeshPhysicalMaterial };

function studio(timeline: boolean): THREE.Scene {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: '#020306', side: THREE.BackSide })));
  const panel = (w: number, h: number, col: string, k: number, pos: [number, number, number], look: [number, number, number] = [0, 0, 0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); s.add(m);
  };
  // a horizon band all round (what chrome mostly shows), then the softboxes
  const band = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 5, 64, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#5F7286').multiplyScalar(0.9), side: THREE.BackSide }));
  band.position.y = -1.5; s.add(band);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 48), new THREE.MeshBasicMaterial({ color: '#1A222C' })); floor.rotation.x = -Math.PI / 2; floor.position.y = -4.6; s.add(floor);
  panel(16, 6, '#ffffff', 3.2, [0, 8, 0]);                   // the overhead softbox
  panel(3, 14, '#ffffff', 5, [-8, 0, 3]);                    // the key strip
  panel(2.2, 12, A.teal, 3.2, [8, 0.5, 2]);                  // the teal rim strip
  panel(5, 2, A.amber, 2.4, [4, -1.5, -8]);                  // a warm practical behind
  panel(10, 1.2, '#ffffff', 2.2, [0, 1.8, 9]);               // a front strip for the face highlights
  if (timeline) {   // the floor becomes an edit: five tracks of clips and a playhead
    const cols = [A.teal, A.violet, A.amber, A.lime, A.blue];
    for (let tr = 0; tr < 5; tr++) for (let k = 0; k < 6; k++) {
      const w = 1.2 + 1.6 * hash(tr, k, 4), x = -9 + k * 3.2 + hash(tr, k, 5) * 0.8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.55), new THREE.MeshBasicMaterial({ color: new THREE.Color(cols[tr]!).multiplyScalar(2.2) }));
      m.position.set(x, -4.5, 4 - tr * 0.8); m.rotation.x = -Math.PI / 2; s.add(m);
    }
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(4) }));
    ph.position.set(0.6, -4.45, 2.4); ph.rotation.x = -Math.PI / 2; s.add(ph);
  }
  return s;
}

function playShape(): THREE.Shape {
  const s = new THREE.Shape(), r = 0.11, P: [number, number][] = [[-0.4, -0.52], [0.6, 0], [-0.4, 0.52]];
  const lerp2 = (a: [number, number], b: [number, number], k: number): [number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  for (let i = 0; i < 3; i++) {
    const a = P[i]!, b = P[(i + 1) % 3]!, prev = P[(i + 2) % 3]!;
    const la = Math.hypot(prev[0] - a[0], prev[1] - a[1]), lb = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const p0 = lerp2(a, prev, r / la), p1 = lerp2(a, b, r / lb);
    if (i === 0) s.moveTo(...p0); else s.lineTo(...p0);
    s.quadraticCurveTo(a[0], a[1], p1[0], p1[1]);
  }
  s.closePath(); return s;
}

export function r4World(): World {
  let x!: AuraCtx; let b0 = 0, as = 0, hero = 0, refl = 0, beat = 0, e8 = 0, bar = 0;
  const scene = new THREE.Scene(), logo = new THREE.Group();
  const cam = new THREE.PerspectiveCamera(28, 608 / 1080, 0.05, 100);
  const key = new THREE.DirectionalLight('#ffffff', 1.4), rim = new THREE.PointLight(A.teal, 0, 12, 1.6);
  let envA!: THREE.Texture, envB!: THREE.Texture;
  const pieces: Piece[] = [];
  const land = (i: number) => as + i * e8;
  return {
    init(ctx) {
      x = ctx; b0 = x.ev('r4.in'); as = x.ev('r4.assemble'); hero = x.ev('r4.hero'); refl = x.ev('r4.reflect'); beat = x.cues.beat; e8 = x.cues.eighth; bar = x.cues.bar;
      const pm = new THREE.PMREMGenerator(x.renderer);
      envA = pm.fromScene(studio(false), 0.02).texture; envB = pm.fromScene(studio(true), 0.02).texture; pm.dispose();
      scene.environment = envA; scene.background = new THREE.Color('#05070B');
      // a soft back glow so the chrome reads against the dark
      const g = document.createElement('canvas'); g.width = g.height = 256; const gc = g.getContext('2d')!;
      const rg = gc.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, 'rgba(70,170,190,0.95)'); rg.addColorStop(0.35, 'rgba(40,70,120,0.55)'); rg.addColorStop(1, 'rgba(5,7,11,0)');
      gc.fillStyle = '#05070B'; gc.fillRect(0, 0, 256, 256); gc.fillStyle = rg; gc.fillRect(0, 0, 256, 256);   // opaque, so the glass has something to refract
      const gt = new THREE.CanvasTexture(g); gt.colorSpace = THREE.SRGBColorSpace;
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: gt }));
      glow.position.set(0, 0.4, -7); scene.add(glow);
      key.position.set(-4, 5, 6); scene.add(key, rim); rim.position.set(2.5, 1.5, 3);
      scene.add(logo);
      const chrome = () => new THREE.MeshPhysicalMaterial({ color: '#E9EEF4', metalness: 1, roughness: 0.07, envMapIntensity: 1.25, clearcoat: 0.6, clearcoatRoughness: 0.05, emissive: new THREE.Color(A.teal), emissiveIntensity: 0 });
      const glass = new THREE.MeshPhysicalMaterial({ color: '#F2FEFF', metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.9, ior: 1.55, dispersion: 6, attenuationColor: new THREE.Color('#7FE9F2'), attenuationDistance: 2.4, clearcoat: 1, envMapIntensity: 1.6, specularIntensity: 1, emissive: new THREE.Color(A.teal), emissiveIntensity: 0 });
      const add = (geo: THREE.BufferGeometry, mat: THREE.MeshPhysicalMaterial, pos: [number, number, number], rz = 0) => {
        const i = pieces.length, mesh = new THREE.Mesh(geo, mat);
        const fin = new THREE.Vector3(...pos), finQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz));
        // the loose position: a shell around the mark, deterministic (hash), with a slow drift and spin
        const th = hash(i, 11) * Math.PI * 2, ph = (hash(i, 12) - 0.5) * 1.6, R = 1.9 + 1.2 * hash(i, 13);
        const sc = new THREE.Vector3(Math.cos(th) * Math.cos(ph) * R, Math.sin(ph) * R * 0.9, Math.sin(th) * Math.cos(ph) * R * 0.6 - 0.4);
        const scE = new THREE.Euler(hash(i, 14) * 6, hash(i, 15) * 6, hash(i, 16) * 6), spin = new THREE.Vector3(hash(i, 17) - 0.5, hash(i, 18) - 0.5, hash(i, 19) - 0.5).multiplyScalar(0.9);
        pieces.push({ mesh, fin, finQ, sc, scE, spin, mat }); logo.add(mesh);
      };
      for (let k = 0; k < 4; k++) add(new THREE.TorusGeometry(1.25, 0.1, 40, 120, Math.PI / 2 - 0.14), chrome(), [0, 0, 0], k * Math.PI / 2 + 0.07 + Math.PI / 4);
      add(new THREE.CapsuleGeometry(0.045, 1.5, 8, 24).rotateZ(Math.PI / 2), chrome(), [0, -0.8, 0.05]);
      add(new THREE.OctahedronGeometry(0.12, 0).scale(1, 1.25, 0.7), chrome(), [-0.42, -0.8, 0.12]);
      add(new THREE.OctahedronGeometry(0.12, 0).scale(1, 1.25, 0.7), chrome(), [0.36, -0.8, 0.12]);
      const tri = new THREE.ExtrudeGeometry(playShape(), { depth: 0.26, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 8, curveSegments: 24 }); tri.center();
      add(tri, glass, [0.04, 0.08, 0]);
    },
    render3d(t, rt) {
      const lt = t - b0;
      // the pieces
      pieces.forEach((P, i) => {
        const L = land(i), d = t - L, sp = P.spin.clone().multiplyScalar(lt);
        const looseP = P.sc.clone().add(new THREE.Vector3(Math.sin(lt * 0.7 + i), Math.cos(lt * 0.5 + i * 2), 0).multiplyScalar(0.06));
        const looseQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(P.scE.x + sp.x, P.scE.y + sp.y, P.scE.z + sp.z));
        const k = ease.in(span(t, L - 1.6 * e8, L), 2.4);
        const pos = looseP.clone().lerp(P.fin, k), q = looseQ.clone().slerp(P.finQ, ease.inOut(span(t, L - 1.6 * e8, L), 2));
        if (d >= 0) {   // the lock: a short damped bounce along the flight direction, a scale pop and a flash
          const dir = P.fin.clone().sub(P.sc).normalize(), b = Math.exp(-d / 0.085) * Math.sin(d * 44);
          pos.copy(P.fin).addScaledVector(dir, 0.1 * b);
        }
        P.mesh.position.copy(pos); P.mesh.quaternion.copy(q);
        P.mesh.scale.setScalar(1 + 0.07 * pulse(t, L, 0.07));
        P.mat.emissiveIntensity = 1.2 * pulse(t, L, 0.09) + (t >= refl ? 0.35 * pulse(t, refl, 0.2) : 0) + (i === 7 ? 0.08 : 0);
      });
      // camera: bar 1 four macro shots (hard cuts on the beats), bar 2 the build, bar 3 the hero
      const shake = pieces.reduce((m, _, i) => m + pulse(t, land(i), 0.05) * (hash(i, 21) - 0.5), 0) * 0.05;
      scene.environment = t >= refl ? envB : envA;
      if (t < as) {
        const s = Math.min(3, Math.floor(lt / beat)), st = lt - s * beat, P = pieces[[0, 7, 5, 2][s]!]!;
        P.mesh.updateMatrixWorld(); P.mesh.geometry.computeBoundingSphere();
        const c = P.mesh.geometry.boundingSphere!.center.clone().applyMatrix4(P.mesh.matrixWorld);   // the arc itself, not the ring centre
        const dir = new THREE.Vector3(Math.cos(1.1 + s * 1.9), 0.25 + 0.2 * Math.sin(s * 2.3), Math.sin(1.1 + s * 1.9) + 1.2).normalize();
        cam.fov = 30; cam.position.copy(c).addScaledVector(dir, (s === 1 ? 2.1 : 1.15) - 0.22 * st / beat);
        cam.lookAt(c.x + 0.1 * Math.sin(st), c.y, c.z);
        logo.rotation.set(0, 0, 0);
      } else if (t < hero) {
        const k = ease.out(span(t, as, hero), 2);
        cam.fov = 28; cam.position.set(0.6 - 0.6 * k + shake, 0.5 - 0.3 * k + shake * 0.6, 15.5 - 3.5 * k); cam.lookAt(0, -0.05, 0);
        logo.rotation.set(0, 0.35 * (1 - k), 0);
      } else {
        const k = (t - hero) / bar;
        cam.fov = 26; cam.position.set(-1.6 + 2.2 * ease.inOut(sat(k), 2), -0.9 + 0.5 * k, 11.8 - 1.2 * k); cam.lookAt(0, -0.05, 0);
        logo.rotation.set(0.12, -0.32 + 0.5 * ease.inOut(sat(k), 2), 0);
      }
      cam.aspect = rt.width / rt.height; cam.updateProjectionMatrix();
      // the key light sweeps on the hero bar; the rim breathes with the kick
      const sw = t >= hero ? ease.inOut(span(t, hero, hero + bar), 2) : 0.3;
      key.position.set(-6 + 12 * sw, 5, 6); key.intensity = 1.2 + 0.8 * pulse(t, hero, 0.25);
      rim.intensity = 6 * x.audio.hit('kick', t, 0.12) + 2;
      x.renderer.setRenderTarget(rt); x.renderer.setClearColor('#05070B', 1); x.renderer.clear(); x.renderer.render(scene, cam);
    },
    draw(c, t, p) {
      if (!LOOK.clean) { c.save(); if (p?.v2) c.translate(0, V2HY);   // V2: the prompt card sits above the HUD; V4 (clean): no HUD
      txt(c, 'R04 · CHROME + GLASS · THREE.JS', 32, 84, mono(12, 600), alpha(A.text, 0.6), 2, 'left');
      const locked = pieces.filter((_, i) => t >= land(i)).length;
      if (t < as) txt(c, `MACRO ${Math.min(4, Math.floor((t - b0) / beat) + 1)}/4`, FXW - 32, 84, mono(12, 600), alpha(A.text, 0.6), 1.5, 'right');
      else {
        txt(c, `LOCK ${locked}/8`, FXW - 32, 84, mono(12, 600), locked === 8 ? A.teal : alpha(A.text, 0.6), 1.5, 'right');
        for (let i = 0; i < 8; i++) { c.fillStyle = i < locked ? A.teal : 'rgba(255,255,255,0.14)'; c.fillRect(FXW - 32 - (8 - i) * 14, 98, 10, 3); }
      }
      if (t >= refl) txt(c, 'env: timeline', FXW - 32, 122, mono(11, 600), alpha(A.teal, 0.8 * sat((t - refl) / 0.2)), 1.5, 'right');
      c.restore(); }
      statement(c, 'MATTER → MOTION', t, x.ev('r4.title'), 880, A.text, A.teal);
    },
  };
}
