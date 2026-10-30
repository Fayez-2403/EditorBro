// Render 07 (V3): the bot breakdances on Dubplate's drop ("like a NUCLEAR BOMB" and the fast run), a sound use case: every move
// is keyed to the V3 music's measured grid and onsets (data/aura_v3/audio.json), so it is in sync by construction.
// Bar 1: it slams down on the downbeat, pops on each eighth. Bar 2: a moonwalk glide, head nods on the snares. Bar 3: the
// breakdance: a drop, a two-turn helicopter spin, a freeze on beat 4. Bar 4: pop-locks on each vocal syllable of the fast run,
// then a toe-stand lean. The stage animates the song: a 48-bar spectrum ring, LED floor tiles rippling out on each kick, lasers
// on the snares, the song's waveform ring behind. An original character (Claude's colours, no logo), labelled an illustration.
import * as THREE from 'three';
import { LOOK, A, CX, FXW, type AuraCtx, type World, ease, pulse, pulses, statement, mono, txt, alpha, fillRR, sat, span, V2HY } from './common';
import { BOT } from './bot';

type J = THREE.Group;
type PoseV = Record<string, [number, number, number]>;   // joint -> rotation xyz
const P = (o: PoseV) => o;
const POSES: Record<string, PoseV> = {
  idle: P({ shL: [0, 0, 0.18], shR: [0, 0, -0.18], elL: [-0.2, 0, 0], elR: [-0.2, 0, 0] }),
  land: P({ shL: [0, 0, 1.2], shR: [0, 0, -1.2], elL: [-0.4, 0, 0], elR: [-0.4, 0, 0], hipL: [-0.6, 0, 0.25], hipR: [-0.6, 0, -0.25], knL: [1.2, 0, 0], knR: [1.2, 0, 0], spine: [0.35, 0, 0] }),
  popA: P({ shL: [0, 0, 1.57], elL: [0, 0, 1.57], shR: [0, 0, -0.35], elR: [-1.0, 0, 0], head: [0, 0.55, 0], spine: [0, 0, 0.08] }),
  popB: P({ shR: [0, 0, -1.57], elR: [0, 0, -1.57], shL: [0, 0, 0.35], elL: [-1.0, 0, 0], head: [0, -0.55, 0], spine: [0, 0, -0.08] }),
  popC: P({ shL: [-1.35, 0, 0.1], shR: [-1.35, 0, -0.1], elL: [-0.7, 0, 0], elR: [-0.7, 0, 0], head: [0.15, 0, 0] }),
  popD: P({ shL: [0, 0, 2.6], shR: [0, 0, -2.6], elL: [0, 0, 0.6], elR: [0, 0, -0.6], head: [-0.25, 0, 0], hipL: [0, 0, 0.2], hipR: [0, 0, -0.2] }),
  crouch: P({ hipL: [-1.3, 0, 0.3], hipR: [-1.3, 0, -0.3], knL: [2.1, 0, 0], knR: [2.1, 0, 0], spine: [0.6, 0, 0], shL: [-0.6, 0, 0.5], shR: [-0.6, 0, -0.5] }),
  spin: P({ hipL: [-0.3, 0, 1.1], hipR: [-0.3, 0, -1.1], knL: [0.2, 0, 0], knR: [0.2, 0, 0], spine: [0.9, 0, 0], shL: [-2.4, 0, 0.2], shR: [0, 0, -1.2] }),
  freeze: P({ hipL: [-1.6, 0, 0.4], hipR: [-0.6, 0, -0.2], knL: [1.9, 0, 0], knR: [1.5, 0, 0], spine: [0.4, 0, 0.3], shL: [0, 0, 0.3], shR: [0, 0, -2.9], elR: [0, 0, 0], head: [0, 0.4, 0.3] }),
  lean: P({ shL: [0.15, 0, 0.12], shR: [0.15, 0, -0.12], elL: [0, 0, 0], elR: [0, 0, 0], head: [0.1, 0, 0] }),
};
const ORDER = ['popA', 'popB', 'popC', 'popD'];

export function r7World(): World {
  let x!: AuraCtx;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 608 / 1080, 0.05, 200);
  const J: Record<string, J> = {};
  const root = new THREE.Group(), tiles: { m: THREE.InstancedMesh; pos: [number, number][] } = { m: null as any, pos: [] };
  let bars!: THREE.InstancedMesh, lasers: THREE.Mesh[] = [], wave!: THREE.Line, chest!: THREE.MeshStandardMaterial, eyeMat!: THREE.MeshBasicMaterial;
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const shell = () => new THREE.MeshPhysicalMaterial({ color: BOT.shell, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, metalness: 0.05 });
  const joint = (name: string, parent: THREE.Object3D, p: [number, number, number]) => { const g = new THREE.Group(); g.position.set(...p); parent.add(g); J[name] = g; return g; };
  const cap = (r: number, len: number, mat: THREE.Material, parent: THREE.Object3D, y = -len / 2 - r * 0.4) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat); m.position.y = y; parent.add(m); return m; };
  /** The choreography at local time lt (from the drop's downbeat): the pose blend and the root motion. */
  const choreo = (lt: number, t: number, B: number, e8: number, beat: number, vocals: number[]) => {
    const bi = Math.floor(lt / B), bl = lt - bi * B;
    let from = 'idle', to = 'idle', k = 1, ry = 0, y = 1.0, x0 = 0, tiltX = 0, tiltZ = 0, sq = 1;
    if (bi <= 0) {   // the landing, then a pop on every eighth
      const e = Math.floor(bl / e8), seq = ['land', ...ORDER, ...ORDER].slice(0, 8);
      from = e ? seq[e - 1]! : 'land'; to = seq[e]!; k = ease.out(sat((bl - e * e8) / 0.08), 3);
      sq = 1 - 0.25 * Math.exp(-bl / 0.08);
    } else if (bi === 1) {   // the moonwalk: glide back, feet alternate each beat
      const ph = bl / beat; from = 'idle'; to = 'idle'; k = 1; x0 = 0.6 - 1.2 * (bl / B);
      const s1 = Math.sin(ph * Math.PI), s2 = Math.cos(ph * Math.PI);
      return { pose: { ...POSES.idle!, hipL: [-0.15 * s1, 0, 0], hipR: [0.15 * s1, 0, 0], knL: [Math.max(0, 0.7 * s2), 0, 0], knR: [Math.max(0, -0.7 * s2), 0, 0], shL: [0.4 * s1, 0, 0.2], shR: [-0.4 * s1, 0, -0.2], head: [0.25 * pulses(t, vocals, 0.08), -0.5, 0] } as PoseV, ry: -0.5, y: 1.0 - 0.03 * Math.abs(s1), x0, tiltX: 0, tiltZ: 0, sq: 1 };
    } else if (bi === 2) {   // the breakdance
      if (bl < beat * 0.5) { from = 'idle'; to = 'crouch'; k = ease.out(sat(bl / 0.15), 3); y = 1.0 - 0.45 * k; }
      else if (bl < beat * 3) { from = 'crouch'; to = 'spin'; k = ease.out(sat((bl - beat * 0.5) / 0.12), 3); y = 0.55; ry = ease.inOut(sat((bl - beat * 0.5) / (beat * 2.5)), 2) * Math.PI * 4; }
      else { from = 'spin'; to = 'freeze'; k = ease.out(sat((bl - beat * 3) / 0.09), 3); y = 0.5; tiltZ = 1.1 * k; ry = Math.PI * 4 + 0.6 * k; }
    } else {   // pop-locks on the fast run's syllables, then the lean
      if (bl >= 7 * e8) { from = ORDER[vocals.filter((v) => v <= t).length % 4]!; to = 'lean'; k = ease.out(sat((bl - 7 * e8) / 0.1), 3); tiltX = 0.42 * k; }
      else {
        const past = vocals.filter((v) => v <= t && v >= t - bl), n = past.length, last = past[n - 1] ?? t - bl;
        from = ORDER[(n + 3) % 4]!; to = ORDER[n % 4]!; k = ease.out(sat((t - last) / 0.06), 3);
      }
      ry = -0.2;
    }
    const pa = POSES[from]!, pb = POSES[to]!, pose: PoseV = {};
    for (const jn of new Set([...Object.keys(pa), ...Object.keys(pb)])) { const a = pa[jn] ?? [0, 0, 0], b = pb[jn] ?? [0, 0, 0]; pose[jn] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
    return { pose, ry, y, x0, tiltX, tiltZ, sq };
  };
  return {
    init(ctx) {
      x = ctx;
      scene.background = new THREE.Color('#05060A'); scene.fog = new THREE.FogExp2('#05060A', 0.06);
      const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: '#06080C', side: THREE.BackSide })));
      for (const [c_, k, p] of [[A.teal, 2.2, [6, 2, 4]], [BOT.coral, 2.0, [-6, 2, 3]], ['#FFFFFF', 2.6, [0, 8, 2]]] as [string, number, [number, number, number]][]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(c_).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); env.add(m); }
      const pm = new THREE.PMREMGenerator(x.renderer); scene.environment = pm.fromScene(env, 0.02).texture; pm.dispose();
      scene.add(new THREE.AmbientLight('#405060', 0.35));
      const key = new THREE.SpotLight('#FFFFFF', 60, 30, 0.5, 0.6, 1.2); key.position.set(2, 8, 5); key.target.position.set(0, 1, 0); scene.add(key, key.target);
      const rimT = new THREE.PointLight(A.teal, 20, 12, 1.5); rimT.position.set(4, 2, -3); const rimC = new THREE.PointLight(BOT.coral, 20, 12, 1.5); rimC.position.set(-4, 2, -3); scene.add(rimT, rimC);
      // the stage: a glossy floor, LED tiles, the spectrum ring, lasers, the waveform ring
      const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0A0C11', roughness: 0.22, metalness: 0.4 })); scene.add(floor);
      for (let r = 1.2; r < 7.5; r += 0.5) for (let a = 0; a < Math.PI * 2; a += 0.5 / r) tiles.pos.push([Math.cos(a) * r, Math.sin(a) * r]);
      tiles.m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.4, 0.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.9, toneMapped: false }), tiles.pos.length);
      tiles.pos.forEach(([a, b], i) => { dummy.position.set(a, 0.01, b); dummy.rotation.y = Math.atan2(a, b); dummy.updateMatrix(); tiles.m.setMatrixAt(i, dummy.matrix); tiles.m.setColorAt(i, col.set('#000000')); }); scene.add(tiles.m);
      bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 1, 0.12).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }), 40); scene.add(bars);   // an arc behind the bot, never in front
      for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? A.teal : BOT.coral).multiplyScalar(3), transparent: true, opacity: 0.8, toneMapped: false })); l.position.set(i < 2 ? -6 : 6, 5, -6); scene.add(l); lasers.push(l); }
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(257 * 3), 3));
      wave = new THREE.Line(wg, new THREE.LineBasicMaterial({ color: new THREE.Color(A.teal).multiplyScalar(2.5), toneMapped: false })); wave.position.set(0, 1.6, -3.2); scene.add(wave);
      // the bot
      scene.add(root);
      const hips = joint('hips', root, [0, 0, 0]);
      const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.22), shell()); hips.add(pelvis);
      const spine = joint('spine', hips, [0, 0.08, 0]);
      cap(0.2, 0.32, shell(), spine, 0.3);
      chest = new THREE.MeshStandardMaterial({ color: BOT.coral, emissive: new THREE.Color(BOT.coral), emissiveIntensity: 1.2 }); const cl = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), chest); cl.position.set(0, 0.32, 0.205); spine.add(cl);
      const head = joint('head', spine, [0, 0.66, 0]);
      const hm = new THREE.Mesh(rounded(0.4, 0.32, 0.34, 0.1), shell()); head.add(hm);
      const vis = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshPhysicalMaterial({ color: BOT.visor, roughness: 0.05, clearcoat: 1, metalness: 0.2 })); vis.position.set(0, 0, 0.172); head.add(vis);
      eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BOT.eye).multiplyScalar(2.2), toneMapped: false });
      for (const ex of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.05, 4, 8), eyeMat); e.position.set(ex, 0.005, 0.175); head.add(e); }
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14), new THREE.MeshStandardMaterial({ color: BOT.shade })); ant.position.y = 0.23; head.add(ant);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), chest); tip.position.y = 0.31; head.add(tip);
      for (const [s, n] of [[-1, 'L'], [1, 'R']] as [number, string][]) {
        const sh = joint('sh' + n, spine, [s * 0.27, 0.48, 0]); cap(0.065, 0.24, shell(), sh);
        const el = joint('el' + n, sh, [0, -0.34, 0]); cap(0.055, 0.22, shell(), el);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), shell()); hand.position.y = -0.33; el.add(hand);
        const hip = joint('hip' + n, hips, [s * 0.11, -0.06, 0]); cap(0.08, 0.3, shell(), hip);
        const kn = joint('kn' + n, hip, [0, -0.42, 0]); cap(0.07, 0.3, shell(), kn);
        const ft = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.24), new THREE.MeshStandardMaterial({ color: BOT.coral, roughness: 0.4 })); ft.position.set(0, -0.44, 0.05); kn.add(ft);
      }
    },
    render3d(t, rt, p) {
      const t0 = p.t0 as number, B = x.cues.bar, e8 = x.cues.eighth, beat = x.cues.beat, lt = t - t0, au = x.audio;
      const vocals = au.events('vocal', t0 + 3 * B, t0 + 4 * B).map(([v]) => v);
      const c = choreo(lt, t, B, e8, beat, vocals), kick = au.hit('kick', t, 0.1), snare = au.hit('snare', t, 0.12);
      // poses are authored with a limb's spread positive outward on both sides; three's z axis spreads them inward, so mirror it
      for (const [jn, g] of Object.entries(J)) { const r = c.pose[jn]; g.rotation.set(r?.[0] ?? 0, r?.[1] ?? 0, -(r?.[2] ?? 0)); }
      root.position.set(c.x0, c.y - 0.04 * kick, 0); root.rotation.set(c.tiltX, c.ry, c.tiltZ); root.scale.set(1 / Math.sqrt(c.sq), c.sq, 1 / Math.sqrt(c.sq));
      chest.emissiveIntensity = 1 + 3 * kick; eyeMat.color.set(BOT.eye).multiplyScalar(2 + 2 * kick);
      // the stage reacts: tiles ripple out from the bot on each kick, the spectrum ring, the lasers, the waveform
      const kicks = au.events('kick', t - 1.2, t + 1e-6);
      tiles.pos.forEach(([a, b], i) => {
        const r = Math.hypot(a - c.x0, b); let v = 0.02 + 0.05 * au.env('bass', t);
        for (const [kt, ks] of kicks) { const age = t - kt; v += ks * Math.exp(-Math.abs(r - age * 7) * 2.2) * Math.exp(-age * 2); }
        col.set(Math.floor(r * 2) % 2 ? A.teal : BOT.coral).multiplyScalar(Math.min(1.6, v * 1.5)); tiles.m.setColorAt(i, col);
      });
      tiles.m.instanceColor!.needsUpdate = true;
      for (let i = 0; i < 40; i++) {
        const a = Math.PI * (1.1 + 0.8 * (i / 39)), band = i % 3 === 0 ? 'low' : i % 3 === 1 ? 'mid' : 'high', v = au.env(band, t - (i % 8) * 0.012);
        dummy.position.set(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2 - 0.4); dummy.rotation.set(0, -a, 0); dummy.scale.set(1, 0.12 + 1.7 * v, 1); dummy.updateMatrix(); bars.setMatrixAt(i, dummy.matrix);
        bars.setColorAt(i, col.set(i % 2 ? A.teal : BOT.coral).multiplyScalar(0.5 + 1.2 * v));
      }
      bars.instanceMatrix.needsUpdate = true; bars.instanceColor!.needsUpdate = true;
      lasers.forEach((l, i) => { l.rotation.set(-0.5 + 0.25 * Math.sin(t * 1.3 + i), (i % 2 ? 1 : -1) * (0.6 + 0.4 * Math.sin(t * 0.9 + i * 2)), 0); (l.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.75 * snare; });
      const wp = wave.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2, u = Math.abs(i / 128 - 1), r = 1.6 + 0.6 * au.env('rms', t - u * 0.6) * (0.6 + 0.4 * au.env('high', t - u * 0.6)); wp.setXYZ(i, Math.cos(a) * r, Math.sin(a) * r, 0); }
      wp.needsUpdate = true;
      // the camera: an orbit, a punch on each bar line, low and close for the breakdance
      const bi = Math.floor(lt / B), a = -0.45 + 0.6 * (lt / (4 * B)), low = bi === 2 ? 1 : 0, rr = 5.6 - 1.2 * low - 0.4 * ease.inOut(sat((lt - 3 * B) / B), 2);
      cam.position.set(Math.sin(a) * rr, 1.5 - 0.5 * low, Math.cos(a) * rr); cam.lookAt(c.x0 * 0.5, 0.95 - 0.25 * low, 0);
      cam.fov = 40 - 6 * pulse(t, t0 + bi * B, 0.15); cam.aspect = rt.width / rt.height; cam.updateProjectionMatrix();
      x.renderer.setRenderTarget(rt); x.renderer.setClearColor('#05060A', 1); x.renderer.clear(); x.renderer.render(scene, cam);
    },
    draw(c, t, p) {
      const t0 = p.t0 as number, B = x.cues.bar, e8 = x.cues.eighth, au = x.audio;
      if (LOOK.clean) return;   // V4: the dance alone (V4 draws its own captions)
      c.save(); c.translate(0, (p?.hy as number | undefined) ?? (p?.v2 ? V2HY : 0));   // under the prompt card held above
      txt(c, 'R07 · ROBOT DANCE · THREE.JS', 32, 84, mono(12, 600), alpha(A.text, 0.6), 2, 'left');
      txt(c, 'moved by the song', FXW - 32, 84, mono(11, 600), alpha(A.text, 0.6), 1, 'right');
      ([['KICK', au.hit('kick', t, 0.1), BOT.coral], ['SNARE', au.hit('snare', t, 0.12), A.teal], ['VOCAL', au.hit('vocal', t, 0.12), A.violet]] as [string, number, string][]).forEach(([n, v, col_], i) => {
        const y = 106 + i * 18; txt(c, n, 32, y + 4, mono(10, 700), A.dim, 1, 'left'); fillRR(c, 84, y - 4, 110, 7, 3, 'rgba(255,255,255,0.08)'); fillRR(c, 84, y - 4, Math.max(2, 110 * sat(v)), 7, 3, col_);
      });
      c.restore();
      statement(c, 'SOUND → MOTION', t, t0 + 3 * B + 2 * e8, 880, A.text, BOT.coral);
      txt(c, 'CLAUDE · AT WORK (illustration)', CX, 1040, mono(9, 600), alpha(A.text, 0.45), 1.2, 'center');
      if (t - t0 < 0.1) { c.fillStyle = `rgba(255,240,230,${0.6 * (1 - (t - t0) / 0.1)})`; c.fillRect(0, 0, FXW, 1080); }
    },
  };
}

/** A rounded box (for the head). */
function rounded(w: number, h: number, d: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r;
  s.moveTo(x, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, y); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(x, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, y); s.quadraticCurveTo(-w / 2, -h / 2, x, -h / 2);
  return new THREE.ExtrudeGeometry(s, { depth: d - 2 * r * 0.5, bevelEnabled: true, bevelThickness: r * 0.5, bevelSize: r * 0.5, bevelSegments: 4, curveSegments: 8 }).translate(0, 0, -(d - r) / 2);
}
