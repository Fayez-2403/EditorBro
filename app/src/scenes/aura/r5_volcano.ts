// Render 05: a procedural volcano, built for the song's fast vocal section (the montage intercuts the IDE, the editor and the
// preview on the odd eighths; this world plays on the rest). Terrain: a displaced cone (CPU, value-noise fbm) with a lava
// shader (lit by a moon and the crater, radial lava channels whose front flows down from r5.erupt). An ash plume and a
// ballistic lava fountain are GPU particles whose positions are computed from t in the vertex shader, so every frame is
// still a pure function of time. Bars 1-2: the drone push in at night, the crater breathing with the kick. Bar 3: the eruption.
// Bar 4: "CODE → WORLDS", lava rivers, and on r5.rock a lava bomb is thrown at the lens into the pit stop.
import * as THREE from 'three';
import { V2HY, LOOK, A, FXW, type AuraCtx, type World, ease, pulse, statement, mono, txt, alpha, sat, span } from './common';
import { hash, noise2 } from '../../engine/util';

const CR = new THREE.Vector3(0, 11.2, 0);   // the crater
const glsl = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * vn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return v; }
`;
const terrVert = /* glsl */ `varying vec3 vW; varying vec3 vN; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const terrFrag = /* glsl */ `
precision highp float; varying vec3 vW; varying vec3 vN;
uniform vec3 uCam; uniform float uT, uGlow, uFront, uErupt;
${glsl}
void main() {
  vec3 n = normalize(vN), p = vW; float r = length(p.xz), ang = atan(p.z, p.x);
  float rock = fbm(p.xz * .35) * .6 + fbm(p.xz * 2.1) * .4;
  vec3 base = mix(vec3(.1, .095, .1), vec3(.26, .24, .24), rock);
  vec3 moon = normalize(vec3(-.45, .62, .35));
  vec3 c = base * (vec3(.42, .55, .82) * max(dot(n, moon), 0.) * 1.15 + vec3(.1, .12, .17));
  vec3 toC = vec3(0., 11.6, 0.) - p; float dC = length(toC);
  c += base * vec3(1., .45, .15) * max(dot(n, toC / dC), 0.) * uGlow * 9. / (1. + dC * dC * .03);   // crater underlight
  // lava channels: radial grooves down the slope, revealed from the crater down to the flow front
  float ch = 1. - abs(sin(ang * 7. + fbm(p.xz * .25) * 5.)), chan = pow(ch, 26.) * smoothstep(.5, .9, fbm(p.xz * .6 + 3.));
  float down = 12. - p.y;   // depth below the rim
  float front = smoothstep(uFront, uFront - 1.2, down);
  float flick = .75 + .25 * vn(p.xz * 3. + uT * 2.);
  vec3 lava = mix(vec3(.9, .18, .02), vec3(1., .75, .25), pow(ch, 60.)) * flick;
  c += lava * chan * front * 1.6 * step(r, 34.);
  // the crater lake
  float lake = smoothstep(2.6, 1.4, r) * step(9.5, p.y);
  c += mix(vec3(1., .3, .04), vec3(1., .85, .4), vn(p.xz * 2. + uT)) * lake * (.8 + 1.2 * uGlow);
  // cracks on the cone glow faintly before the eruption
  c += vec3(1., .38, .08) * pow(1. - abs(vn(p.xz * 1.1) * 2. - 1.), 60.) * smoothstep(9., 3., r) * (.3 + uGlow) * .9;
  float d = length(uCam - p);
  vec3 fogC = mix(vec3(.06, .07, .11), vec3(.3, .14, .08), smoothstep(40., 8., length(p.xz)) * (.25 + .6 * uErupt));
  c = mix(c, fogC, 1. - exp(-d * .009));
  gl_FragColor = vec4(pow(max(c, 0.), vec3(2.2)), 1.);
}`;
const skyFrag = /* glsl */ `
precision highp float; varying vec3 vD; uniform float uErupt, uGlow;
${glsl}
void main() {
  vec3 d = normalize(vD); float y = d.y;
  vec3 c = mix(vec3(.13, .1, .12), vec3(.04, .05, .1), smoothstep(-.05, .55, y));
  c += vec3(.75, .3, .12) * exp(-abs(y - .02) * 7.) * (.18 + .45 * uErupt + .15 * uGlow);
  float st = step(.9965, h21(floor(d.xy * 380.) + floor(d.z * 7.))) * smoothstep(.1, .5, y);
  c += vec3(.8, .85, 1.) * st * .6;
  gl_FragColor = vec4(pow(c, vec3(2.2)), 1.);
}`;
const plumeVert = /* glsl */ `
attribute vec4 aR; uniform float uT, uErupt, uPx; varying float vA; varying float vH; varying float vHot;
void main() {
  float P = 6., age = mod(uT + aR.w * P, P), e = clamp(uErupt, 0., 1.);
  float sp = 1.6 + 2.6 * e;
  vec3 p = vec3(0., 11.4, 0.) + vec3((aR.x - .5) * (1.2 + age * (1.4 + 2. * e)), age * sp + age * age * .25 * e, (aR.y - .5) * (1.2 + age * (1.4 + 2. * e)));
  p.x += age * age * .22 + sin(age * 1.3 + aR.z * 6.) * .6;
  vH = age / P; vHot = exp(-age * 1.2);
  vA = smoothstep(0., .5, age) * pow(1. - vH, 1.5) * (.16 + .2 * e);
  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_PointSize = uPx * (2.2 + age * (2.4 + 2.6 * e)) * 200. / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const plumeFrag = /* glsl */ `
precision highp float; varying float vA; varying float vH; varying float vHot; uniform float uGlow;
void main() { vec2 q = gl_PointCoord - .5; float r = dot(q, q) * 4.; if (r > 1.) discard;
  float a = exp(-r * 3.2) * (1. - r) * vA;
  vec3 c = mix(vec3(.16, .15, .16), vec3(.95, .42, .16) * (.5 + .7 * uGlow), pow(vHot, 1.6));
  gl_FragColor = vec4(pow(c, vec3(2.2)) * a, a); }`;
const lavaVert = /* glsl */ `
attribute vec4 aR; uniform float uE, uPx; varying float vAge; varying float vOn;
void main() {
  float per = 1.25 + aR.x * .9, first = aR.w * per, e = uE;
  vOn = step(0., e) * step(first, e);
  float age = mod(max(e - first, 0.), per), k = age / per;
  float burst = 1. + 1.4 * exp(-max(e, 0.) * 1.2);          // the opening blast is the biggest
  float th = aR.y * 6.2831853, hs = (.6 + aR.z * 3.6) * burst, vs = (9. + aR.x * 9.) * burst;
  vec3 p = vec3(0., 11.6, 0.) + vec3(cos(th) * hs, vs, sin(th) * hs) * age + vec3(0., -9.8, 0.) * .5 * age * age;
  vAge = k;
  vec4 mv = viewMatrix * vec4(p, 1.);
  gl_PointSize = vOn * uPx * (.3 + .4 * aR.z) * 440. / -mv.z * (1. - .45 * k);
  gl_Position = projectionMatrix * mv;
}`;
const lavaFrag = /* glsl */ `
precision highp float; varying float vAge; varying float vOn;
void main() { if (vOn < .5) discard; vec2 q = gl_PointCoord - .5; float r = dot(q, q) * 4.; if (r > 1.) discard;
  vec3 c = mix(vec3(1., .85, .5) * 3., vec3(1., .3, .04) * 1.6, smoothstep(0., .35, vAge));
  c = mix(c, vec3(.25, .03, .005), smoothstep(.55, 1., vAge));
  gl_FragColor = vec4(c * exp(-r * 3.), 1.); }`;

export function r5World(): World {
  let x!: AuraCtx; let b0 = 0, er = 0, ti = 0, rk = 0, bar = 0, e8 = 0;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 608 / 1080, 0.1, 400);
  const U = { uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uGlow: { value: 0 }, uFront: { value: 0 }, uErupt: { value: 0 }, uE: { value: -1 }, uPx: { value: 1 } };
  let rock!: THREE.Mesh, rockMat!: THREE.MeshStandardMaterial;
  return {
    init(ctx) {
      x = ctx; b0 = x.ev('r5.in'); er = x.ev('r5.erupt'); ti = x.ev('r5.title'); rk = x.ev('r5.rock'); bar = x.cues.bar; e8 = x.cues.eighth;
      // the terrain: a cone with a crater, radial ridges and fbm, displaced once on the CPU
      const g = new THREE.PlaneGeometry(220, 220, 300, 300).rotateX(-Math.PI / 2), pos = g.attributes.position as THREE.BufferAttribute;
      const fb = (a: number, b: number) => { let v = 0, s = 0.5, f = 1; for (let o = 0; o < 5; o++) { v += s * noise2(a * f, b * f, 7); f *= 2.03; s *= 0.5; } return v; };
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), pz = pos.getZ(i), r = Math.hypot(px, pz), an = Math.atan2(pz, px);
        let h = 13.2 * Math.pow(Math.max(0, 1 - r / 34), 1.7) + 1.2 * Math.exp(-r / 60);
        h -= 2.6 * Math.max(0, 1 - r / 3) ** 1.4;                                        // the crater
        h += (0.35 + 0.9 * Math.min(1, r / 14)) * Math.abs(Math.sin(an * 9 + fb(px * 0.05, pz * 0.05) * 4)) * Math.min(1, r / 5) * 0.8;
        h += fb(px * 0.06, pz * 0.06) * 2.4 * Math.min(1, r / 8) + fb(px * 0.3, pz * 0.3) * 0.35;
        pos.setY(i, h);
      }
      g.computeVertexNormals();
      scene.add(new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: terrVert, fragmentShader: terrFrag, uniforms: U })));
      const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: U,
        vertexShader: `varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`, fragmentShader: skyFrag }));
      scene.add(sky);
      const pts = (n: number, seed: number) => { const a = new Float32Array(n * 4), p = new Float32Array(n * 3);
        for (let i = 0; i < n * 4; i++) a[i] = hash(seed, i); const gg = new THREE.BufferGeometry();
        gg.setAttribute('position', new THREE.BufferAttribute(p, 3)); gg.setAttribute('aR', new THREE.BufferAttribute(a, 4)); return gg; };
      const plume = new THREE.Points(pts(2400, 31), new THREE.ShaderMaterial({ vertexShader: plumeVert, fragmentShader: plumeFrag, uniforms: U, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
      const lava = new THREE.Points(pts(2600, 47), new THREE.ShaderMaterial({ vertexShader: lavaVert, fragmentShader: lavaFrag, uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      plume.frustumCulled = lava.frustumCulled = false; scene.add(plume, lava);
      // the lava bomb thrown at the lens
      const tc = document.createElement('canvas'); tc.width = 512; tc.height = 256; const tg = tc.getContext('2d')!;
      tg.fillStyle = '#000'; tg.fillRect(0, 0, 512, 256); tg.strokeStyle = '#FF7A22'; tg.lineCap = 'round';
      for (let k = 0; k < 46; k++) {   // branching cracks, deterministic
        let px = hash(k, 1) * 512, py = hash(k, 2) * 256; tg.lineWidth = 1 + 3 * hash(k, 3); tg.beginPath(); tg.moveTo(px, py);
        for (let j = 0; j < 7; j++) { px += (hash(k, j, 4) - 0.5) * 60; py += (hash(k, j, 5) - 0.5) * 40; tg.lineTo(px, py); } tg.stroke();
      }
      const em = new THREE.CanvasTexture(tc); em.colorSpace = THREE.SRGBColorSpace;
      rockMat = new THREE.MeshStandardMaterial({ color: '#2A2224', roughness: 0.85, emissive: new THREE.Color('#FFFFFF'), emissiveMap: em, emissiveIntensity: 1.4 });
      const rg = new THREE.IcosahedronGeometry(1, 3), rp = rg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < rp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(rp, i); v.multiplyScalar(1 + 0.22 * noise2(v.x * 2 + v.z, v.y * 2, 3)); rp.setXYZ(i, v.x, v.y, v.z); }
      rg.computeVertexNormals(); rock = new THREE.Mesh(rg, rockMat); rock.visible = false; scene.add(rock);
      scene.add(new THREE.AmbientLight('#FF7A3A', 0.35)); const pl = new THREE.PointLight('#FF6A2A', 60, 40, 1.6); pl.position.set(0, 14, 2); scene.add(pl);
    },
    render3d(t, rt) {
      const lt = t - b0, ee = t - er, kick = x.audio.hit('kick', t, 0.12);
      U.uT.value = lt; U.uPx.value = x.px; U.uE.value = ee; U.uErupt.value = ee < 0 ? 0 : 1 - 0.5 * Math.exp(-ee * 0.4);
      U.uGlow.value = (ee < 0 ? 0.25 + 0.35 * kick + 0.4 * span(t, b0, er) : 1.2 + 1.8 * pulse(t, er, 0.25) + 0.3 * kick);
      U.uFront.value = ee < 0 ? 0.4 : 0.4 + 11 * ease.out(sat(ee / (2.2 * bar)), 1.6);
      // camera: the drone push (bars 1-2), the low hero under the fountain (bar 3), the orbit (bar 4)
      const shake = (ee >= 0 ? 0.5 * pulse(t, er, 0.35) + 0.08 * kick : 0.03 * kick);
      const sx = (hash(Math.round(t * 60), 1) - 0.5) * shake, sy = (hash(Math.round(t * 60), 2) - 0.5) * shake;
      if (t < er) {
        const k = ease.inOut(span(t, b0, er), 2);
        cam.position.set(-7 + 5 * k + sx, 7.5 - 2.5 * k + sy, 58 - 28 * k); cam.lookAt(0, 9.5 + 1.5 * k, 0); cam.fov = 38;
      } else if (t < ti) {
        const k = span(t, er, ti);
        cam.position.set(-9 + 2 * k + sx, 5.2 + sy, 27 - 2 * k); cam.lookAt(0, 15 + 3 * k, 0); cam.fov = 44;
      } else {
        const k = (t - ti) / bar, a = -0.35 + 0.7 * k;
        cam.position.set(Math.sin(a) * 34 + sx, 10 + sy, Math.cos(a) * 34); cam.lookAt(0, 12, 0); cam.fov = 40;
      }
      cam.aspect = rt.width / rt.height; cam.updateProjectionMatrix(); U.uCam.value.copy(cam.position);
      // the lava bomb: launched two eighths before r5.rock, fills the lens one eighth after
      rock.visible = t >= rk - 2 * e8;
      if (rock.visible) {
        const k = ease.in(span(t, rk - 2 * e8, rk + e8), 2.2), to = cam.position.clone().add(cam.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.2));
        rock.position.copy(CR.clone().add(new THREE.Vector3(0, 2, 0)).lerp(to, k)); rock.rotation.set(t * 3, t * 2.2, 0); rock.scale.setScalar(0.5 + 0.4 * k);
        rockMat.emissiveIntensity = 1.2 + 1.2 * k;
      }
      x.renderer.setRenderTarget(rt); x.renderer.setClearColor('#03050A', 1); x.renderer.clear(); x.renderer.render(scene, cam);
    },
    draw(c, t, p) {
      const ee = t - er;
      if (!LOOK.clean) { c.save(); if (p?.v2) c.translate(0, V2HY);   // V2: the prompt card sits above the HUD; V4 (clean): no HUD
      txt(c, 'R05 · PROCEDURAL VOLCANO · THREE.JS', 32, 84, mono(12, 600), alpha(A.text, 0.6), 2, 'left');
      txt(c, ee < 0 ? 'terrain 90,601 verts' : 'lava 2,600 particles', FXW - 32, 84, mono(12, 600), alpha(A.text, 0.6), 1, 'right');
      c.restore(); }
      if (ee >= 0 && ee < 0.12) { c.fillStyle = `rgba(255,220,170,${0.75 * (1 - ee / 0.12)})`; c.fillRect(0, 0, FXW, 1080); }   // the blast flash
      statement(c, 'CODE → WORLDS', t, ti, 880, A.text, A.amber);
      const rk2 = span(t, rk + 0.6 * e8, rk + e8);
      if (rk2 > 0) { c.fillStyle = `rgba(3,4,6,${rk2})`; c.fillRect(0, 0, FXW, 1080); }   // the bomb fills the lens
    },
  };
}
