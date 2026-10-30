// Render 03: an audio-reactive shader world, one fragment shader driven by the song's own measured data (data/aura/audio.json:
// the rms / bass / vocal / high envelopes and the kick / snare / hat onsets). Bar 1: liquid light with a circular waveform ring
// (the last 0.64 s of rms around the circle) and a shockwave on every kick. Bar 2: the field fractures into voronoi shards that
// jump on the kicks, then the camera drops into a tunnel whose speed is the song's loudness. Bar 3: "MUSIC → MATHEMATICS", the
// lens bulges out into the next room. A live readout of the uniforms shows the numbers really are the track.
import * as THREE from 'three';
import { V2HY, LOOK, A, FXW, type AuraCtx, type World, ease, statement, mono, txt, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';

const HIST = 64;

const vert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uT, uFract, uCorr, uLens, uTravel;
uniform float uKick, uSnare, uHat, uBass, uRms, uVocal, uHigh;
uniform float uHist[${HIST}]; uniform float uAges[4];
#define TAU 6.2831853
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p) { float n = h21(p); return vec2(n, h21(p + n)); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return v; }
vec3 pal(float x) { return .5 + .5 * cos(TAU * (vec3(1.) * x + vec3(.52, .62, .78))); }   // teal -> blue -> violet, amber at the peaks
float hist(float u) { float x = clamp(u, 0., 1.) * float(${HIST - 1}); int i = int(floor(x)); float f = fract(x), a = 0., b = 0.;
  for (int k = 0; k < ${HIST}; k++) { if (k == i) a = uHist[k]; if (k == i + 1) b = uHist[k]; } return mix(a, b, f); }

vec3 liquid(vec2 p, float t) {
  vec2 q = vec2(fbm(p * 1.4 + t * .12), fbm(p * 1.4 - t * .1 + 3.1));
  float f = fbm(p * 1.8 + 2.2 * q + vec2(0, t * .2) + uVocal * .6);
  vec3 c = mix(vec3(.012, .02, .04), vec3(.05, .36, .46), smoothstep(.25, .85, f));     // charcoal -> teal
  c = mix(c, vec3(.32, .22, .7), smoothstep(.45, .9, q.y) * .55);                      // violet in the warp
  c *= .6 + .8 * uRms;
  c += vec3(.25, .85, .95) * pow(f, 4.) * .9 * (.4 + uVocal);                          // cool highlights ride the vocal
  c += vec3(1., .66, .28) * pow(f, 7.) * 2.4 * uBass;                                  // amber only at the bass peaks
  return c;
}
vec3 ring(vec2 p) {
  float r = length(p), a = atan(p.x, p.y) / TAU + .5, u = abs(a - .5) * 2.;        // mirrored: the ring closes cleanly
  float R = .34 + .2 * hist(u) + .05 * uKick, d = abs(r - R);
  vec3 c = vec3(.25, .84, .88) * (exp(-d * 120.) * 1.6 + exp(-d * 18.) * .35);
  for (int k = 0; k < 4; k++) { float g = uAges[k]; if (g < 0. || g > .9) continue;   // kick shockwaves
    float w = abs(r - (.2 + g * 1.7)); c += vec3(.75, .95, 1.) * exp(-w * 60.) * (1. - g / .9) * .9; }
  return c;
}
vec3 shards(vec2 p, float t) {
  vec2 g = p * 3.2, i = floor(g), f = fract(g); float md = 8., md2 = 8.; vec2 id = vec2(0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(x, y), r = o + h22(i + o) - f; float d = dot(r, r);
    if (d < md) { md2 = md; md = d; id = i + o; } else if (d < md2) md2 = d; }
  float edge = sqrt(md2) - sqrt(md);
  vec2 rnd = h22(id) - .5, off = rnd * (.12 + .35 * uKick) * uFract;
  float rot = (h21(id + 7.) - .5) * 1.2 * uFract * (.4 + uKick);
  vec2 pp = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * (p + off);
  vec3 c = liquid(pp * 1.1 + rnd, t) * (1.05 + .4 * h21(id)) + ring(pp) * .8;
  c *= .7 + .6 * smoothstep(0., .08, edge);
  c += vec3(.4, .95, 1.) * exp(-edge * 60.) * (.5 + 1.4 * uKick) * uFract;
  return c;
}
vec3 tunnel(vec2 p, float t) {
  float r = max(length(p), 1e-3), a = atan(p.y, p.x) / TAU, z = .32 / r + uTravel;
  float seg = 14., la = abs(fract(a * seg) - .5), lz = abs(fract(z * 1.5) - .5);
  float grid = exp(-la * 40. * r) + exp(-lz * 26.);
  vec3 c = mix(vec3(.25, .84, .88), vec3(.61, .48, 1.), .5 + .5 * sin(z * .8 + uVocal * 2.)) * grid * (.25 + .9 * uRms) * smoothstep(.0, .25, r);
  c += vec3(1., .72, .3) * exp(-abs(fract(z * .25 + .1) - .5) * 30.) * uKick * 1.3;   // a light band thrown down the tube on each kick
  c += liquid(vec2(a * 6., z * .5), t) * .45 * smoothstep(.9, .1, r);
  c += ring(p * 2.6) * smoothstep(.35, .05, r) * .8;                                   // the waveform portal at the far end
  return c * (1. - exp(-r * 6.));
}
void main() {
  vec2 p = (vUv - .5) * vec2(uRes.x / uRes.y, 1.) * 2.;
  // the lens: barrel bulge + zoom into the centre
  float L = uLens; p *= 1. - .55 * L * (1. - .35 * dot(p, p)); p.y += .03;
  vec3 col;
  float t = uT;
  vec3 a = liquid(p, t) + ring(p);
  vec3 b = shards(p, t);
  vec3 c = tunnel(p, t);
  col = mix(a, b, smoothstep(0., .25, uFract));
  col = mix(col, c, uCorr);
  // hats: a sparse sparkle grain; snare: a cool lift
  float sp = step(.985 - .02 * uHat, h21(floor(vUv * uRes / 3.) + floor(t * 30.)));
  col += vec3(.8, .95, 1.) * sp * uHat * .5 + vec3(.05, .1, .14) * uSnare;
  // chromatic split + flash as the lens blows out
  col += vec3(.6, .95, 1.) * pow(L, 3.) * 1.6;
  col *= 1. - .35 * dot(vUv - .5, vUv - .5) * 2.;                                     // vignette
  col = col / (1. + col * .6);                                                         // soft shoulder
  gl_FragColor = vec4(pow(max(col, 0.), vec3(2.2)), 1.);                               // the pipeline is linear
}`;

export function r3World(): World {
  let x!: AuraCtx; let b0 = 0, bar = 0, e8 = 0, fr = 0, co = 0, le = 0;
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const u: Record<string, THREE.IUniform> = {
    uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uFract: { value: 0 }, uCorr: { value: 0 }, uLens: { value: 0 }, uTravel: { value: 0 },
    uKick: { value: 0 }, uSnare: { value: 0 }, uHat: { value: 0 }, uBass: { value: 0 }, uRms: { value: 0 }, uVocal: { value: 0 }, uHigh: { value: 0 },
    uHist: { value: new Array(HIST).fill(0) }, uAges: { value: [-1, -1, -1, -1] },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: u, depthTest: false, depthWrite: false });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  /** The tunnel's travelled distance: the integral of its speed (1 + 2.4 * rms) from the corridor cue, so it stays a function of t. */
  const travel = (t: number) => { let z = 0; for (let s = co; s < t; s += 0.02) z += 0.02 * (0.6 + 2.4 * x.audio.env('rms', s)); return z; };
  const uni = (t: number) => {
    const au = x.audio;
    return { kick: au.hit('kick', t, 0.12), snare: au.hit('snare', t, 0.14), hat: au.hit('hat', t, 0.06), bass: au.env('bass', t), rms: au.env('rms', t), vocal: au.env('vocal', t), high: au.env('high', t) };
  };
  return {
    init(ctx) { x = ctx; b0 = x.ev('r3.in'); bar = x.cues.bar; e8 = x.cues.eighth; fr = x.ev('r3.fracture'); co = x.ev('r3.corridor'); le = x.ev('r3.lens'); },
    render3d(t, rt) {
      const v = uni(t);
      u.uRes!.value.set(rt.width, rt.height); u.uT!.value = t - b0;
      u.uKick!.value = v.kick; u.uSnare!.value = v.snare; u.uHat!.value = v.hat; u.uBass!.value = v.bass; u.uRms!.value = v.rms; u.uVocal!.value = v.vocal; u.uHigh!.value = v.high;
      for (let i = 0; i < HIST; i++) u.uHist!.value[i] = x.audio.env('rms', t - i * 0.01) * (0.5 + 0.5 * x.audio.env('high', t - i * 0.01));
      const ks = x.audio.events('kick', t - 1, t + 1e-6).slice(-4).map(([k]) => t - k);
      for (let i = 0; i < 4; i++) u.uAges!.value[i] = ks[i] ?? -1;
      u.uFract!.value = t < fr ? 0 : sat(spring(t - fr, 0.3, 0.55));
      u.uCorr!.value = ease.inOut(span(t, co - e8, co + e8), 2);
      u.uTravel!.value = t > co - e8 ? travel(t) : 0;
      u.uLens!.value = ease.in(span(t, le, le + e8), 2);
      x.renderer.setRenderTarget(rt); x.renderer.render(scene, cam);
    },
    draw(c, t, p) {
      const v = uni(t), fade = 1 - span(t, le, le + e8 * 0.6);
      c.save(); c.globalAlpha = fade;
      if (!LOOK.clean) { c.save(); if (p?.v2) c.translate(0, V2HY);   // V2: the prompt card sits above the HUD; V4 (clean): no HUD
      txt(c, 'R03 · AUDIO-REACTIVE SHADER', 32, 84, mono(12, 600), alpha(A.text, 0.6), 2, 'left');
      txt(c, 'GLSL · 1 pass · audio.json', FXW - 32, 84, mono(12, 600), alpha(A.text, 0.6), 1, 'right');
      // the live uniform readout: the actual values the shader is getting this frame
      fillRR(c, 28, 104, 218, 132, 10, 'rgba(5,8,12,0.55)');
      ([['u_kick', v.kick, A.amber], ['u_bass', v.bass, A.teal], ['u_vocal', v.vocal, A.violet], ['u_hat', v.hat, A.cyan], ['u_rms', v.rms, A.text]] as [string, number, string][]).forEach(([k, n, col], i) => {
        const y = 128 + i * 22;
        txt(c, k, 42, y + 4, mono(11, 600), A.dim, 0.5, 'left');
        fillRR(c, 104, y - 5, 90, 8, 3, 'rgba(255,255,255,0.08)'); fillRR(c, 104, y - 5, Math.max(2, 90 * sat(n)), 8, 3, col);
        txt(c, n.toFixed(2), 234, y + 4, mono(11, 600), A.text, 0, 'right');
      });
      const ph = t < fr ? 'waveform ring' : t < co ? 'voronoi fracture' : 'tunnel · speed = rms';
      txt(c, ph, 32, 262, mono(11, 600), alpha(A.teal, 0.85), 1.5, 'left');
      c.restore(); }
      statement(c, 'MUSIC → MATHEMATICS', t, x.ev('r3.title'), 880, A.text, A.teal);
      c.restore();
    },
  };
}
