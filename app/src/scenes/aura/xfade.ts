// V4 transitions (aura_v4.ts): one shader pass that composites two finished shots (each render's 3D + its 2D, in column-sized
// targets) into the reel's column. k runs 0..1 through a transition and crosses the cut at 0.5; every transition is centred on a
// measured transient (data/aura_v4/cues.json `xf`). The same pass carries the per-shot looks on the bass drop-outs: under water
// while the bass is out ("going under"), a splash when it comes back, a desaturated freeze in the last gap ("number one").
// Pure functions of their uniforms (time, k, seeds).
import * as THREE from 'three';
import { FSPass } from '../../engine/gl';

export const XMODE = { cut: 0, zoom: 1, burn: 2, ink: 3, whip: 4, slice: 5, claw: 6, flash: 7, iris: 8 } as const;
export type XName = keyof typeof XMODE;

const frag = /* glsl */ `
uniform sampler2D tA, tB;
uniform int uMode;
uniform float uK, uT, uAsp, uSeed, uUnder, uFreeze, uSplash, uPrompt;
uniform vec2 uC;

vec3 ta(vec2 uv) { return texture(tA, clamp(uv, 0.001, 0.999)).rgb; }
vec3 tb(vec2 uv) { return texture(tB, clamp(uv, 0.001, 0.999)).rgb; }
// radial zoom blur around uC: z > 1 zooms in; blur = the streak length
vec3 zoomA(vec2 uv, float z, float blur) { vec3 s = vec3(0.); vec2 d = uv - uC; for (int i = 0; i < 14; i++) { float f = float(i) / 13.; s += ta(uC + d / (z * (1. + blur * f))); } return s / 14.; }
vec3 zoomB(vec2 uv, float z, float blur) { vec3 s = vec3(0.); vec2 d = uv - uC; for (int i = 0; i < 14; i++) { float f = float(i) / 13.; s += tb(uC + d / (z * (1. + blur * f))); } return s / 14.; }
vec3 splitA(vec2 uv, float o) { return vec3(ta(uv + vec2(o, 0.)).r, ta(uv).g, ta(uv - vec2(o, 0.)).b); }
vec3 splitB(vec2 uv, float o) { return vec3(tb(uv + vec2(o, 0.)).r, tb(uv).g, tb(uv - vec2(o, 0.)).b); }
// one claw mark: a slanted, slightly curved band; returns the signed distance to its torn edge (< 0 inside)
float claw(vec2 p, float x0, float w) {
  vec2 q = rot2(-0.42) * (p - vec2(x0, 0.));
  q.x += 0.05 * q.y * q.y;                                                     // the curve of a swipe
  float taper = smoothstep(0.62, 0.1, abs(q.y + 0.04));                         // pointed at both ends
  float jag = (fbm(vec2(q.y * 22., x0 * 9. + uSeed), 3) * 0.5) * 0.012;           // torn paper
  return abs(q.x) - w * taper - jag;
}

void main() {
  vec2 uv = vUv;
  vec2 P = (uv - 0.5) * vec2(uAsp, 1.);
  // per-shot looks that move the picture: under water (a slow wobble), the splash (a ring of refraction as the bass comes back)
  if (uUnder > 0.) uv += uUnder * vec2(0.0045 * sin(uv.y * 34. + uT * 5.3), 0.0035 * cos(uv.x * 27. - uT * 4.1));
  if (uSplash > 0.) {
    vec2 d = (uv - vec2(0.5, 0.56)) * vec2(uAsp, 1.); float r = length(d), age = 1. - uSplash;
    uv += normalize(d + 1e-5) * 0.022 * sin(r * 70. - age * 38.) * exp(-abs(r - age * 0.9) * 9.) * uSplash;
  }
  float k = clamp(uK, 0., 1.);
  vec3 col;
  if (uMode == 0) col = ta(uv);
  else if (uMode == 1) {                                                         // zoom through: A pushes in, B arrives pushed-in and settles
    float s = k < 0.5 ? k / 0.5 : (1. - k) / 0.5, e = s * s;
    vec3 a = zoomA(uv, 1. + 1.1 * e, 0.32 * e), b = zoomB(uv, 1. + 1.1 * e, 0.32 * e);
    col = mix(a, b, smoothstep(0.44, 0.56, k)) + vec3(0.9, 0.97, 1.) * 0.55 * exp(-abs(k - 0.5) * 22.);
  } else if (uMode == 2) {                                                       // burn: B shows through A's brightest light first
    float l = luma(ta(uv)), n = fbm(P * 7. + uSeed, 4) * 0.5 + 0.5;
    float v = clamp(l * 1.6, 0., 1.) * 0.7 + n * 0.3, th = 1.08 - 1.2 * k;
    float m = smoothstep(th, th + 0.05, v);
    col = mix(ta(uv), tb(uv), m) + vec3(1., 0.52, 0.18) * 3.0 * exp(-abs(v - th) * 45.) * smoothstep(0., 0.15, k) * smoothstep(1., 0.85, k);
  } else if (uMode == 3) {                                                       // ink: a blot spreads from uC; B is inside it
    vec2 d = (uv - uC) * vec2(uAsp, 1.); float r = length(d);
    float w = fbm(d * 5.5 + uSeed, 4) * 0.11 + fbm(d * 17. + uSeed * 1.7, 3) * 0.035;
    float R = pow(k, 1.35) * 1.3, sd = r + w - R;
    float m = 1. - smoothstep(-0.003, 0.003, sd);
    vec3 a = mix(ta(uv), vec3(0.016, 0.02, 0.055), 0.9 * exp(-max(sd, 0.) * 70.) * smoothstep(0., 0.05, k));   // the wet, dark front
    col = mix(a, tb(uv) * (1. - 0.6 * exp(-max(-sd, 0.) * 40.)), m);
  } else if (uMode == 4) {                                                       // whip: A out to the left, B in from the right, motion-blurred
    float s = k * k * (3. - 2. * k), v = 4. * k * (1. - k);
    vec3 a = vec3(0.), b = vec3(0.);
    for (int i = 0; i < 14; i++) { float f = (float(i) / 13. - 0.5) * 0.16 * v; a += ta(uv + vec2(s + f, 0.)); b += tb(uv + vec2(s - 1. + f, 0.)); }
    col = uv.x + s < 1. ? a / 14. : b / 14.;
  } else if (uMode == 5) {                                                       // slice: rows switch to B in a stepped glitch, RGB split
    float rows = 26., row = floor(uv.y * rows), st = floor(uT * 30.);
    float h = hash12(vec2(row, st + uSeed * 7.)), m = step(h, k * 1.25 - 0.12);
    float off = (hash12(vec2(row * 1.7, st + 3.)) - 0.5) * 0.14 * sin(3.14159 * k);
    vec2 u2 = uv + vec2(off, 0.); float o = 0.008 * sin(3.14159 * k);
    col = mix(splitA(u2, o), splitB(u2, o), m);
  } else if (uMode == 6) {                                                       // claw: three tears open (staggered) and B shows through
    float m = 0., rim = 0.;
    for (int i = 0; i < 3; i++) {
      float fi = float(i), ki = clamp((k - fi * 0.06) / 0.8, 0., 1.), w = 0.004 + 0.21 * pow(ki, 1.7);
      float d = claw(P, -0.13 + fi * 0.13, w);
      m = max(m, (1. - smoothstep(-0.002, 0.002, d)) * step(0.001, ki)); rim = max(rim, exp(-abs(d) * 260.) * step(0.001, ki));
    }
    m = max(m, smoothstep(0.82, 1., k));
    col = mix(ta(uv), tb(uv), m) + vec3(1.) * 0.9 * rim * (1. - m);
  } else if (uMode == 7) {                                                       // flash: A blows out to white, B comes out of it
    col = k < 0.5 ? ta(uv) + vec3(1., 0.97, 0.92) * 2.2 * pow(k / 0.5, 2.) : tb(uv) + vec3(1., 0.97, 0.92) * 2.2 * pow((1. - k) / 0.5, 3.);
  } else {                                                                       // iris: a circle opens from uC with a hot ring
    vec2 d = (uv - uC) * vec2(uAsp, 1.); float r = length(d), R = pow(k, 1.25) * 1.25;
    float m = 1. - smoothstep(R - 0.004, R + 0.004, r);
    col = mix(ta(uv), tb(uv), m) + vec3(1., 0.62, 0.45) * 2.0 * exp(-abs(r - R) * 70.) * (1. - k);
  }
  if (uPrompt > 0.) {                                                            // V4.1's prompt beat: the coming render out of focus, grey, dark
    vec3 s = vec3(0.);
    for (int i = 0; i < 28; i++) { float a = float(i) * 2.39996, r = sqrt((float(i) + 0.5) / 28.) * 0.03 * uPrompt; s += ta(uv + vec2(cos(a) / uAsp, sin(a)) * r); }
    vec3 b = s / 28.; float l = luma(b);
    col = mix(col, mix(b, vec3(l), 0.5) * 0.3 + vec3(0.003, 0.005, 0.01), uPrompt);
  }
  if (uUnder > 0.) {                                                             // under water: deep teal, a caustic net, darker
    float cn = fbm(vec2(P.x * 6., P.y * 9. - uT * 0.6) + vec2(uT * 0.25, 0.), 3);
    float caus = pow(1. - abs(sin(cn * 9.)), 8.);
    vec3 g = col * vec3(0.22, 0.52, 0.72) + vec3(0., 0.035, 0.07) + vec3(0.35, 0.8, 0.95) * caus * 0.25 * smoothstep(0.2, -0.5, P.y);
    col = mix(col, g, uUnder);
  }
  if (uFreeze > 0.) { float l = luma(col); col = mix(col, vec3(l) * vec3(1.04, 1., 0.94), 0.88 * uFreeze); col *= 1. - 0.35 * uFreeze * dot(P, P) * 2.; }
  fragColor = vec4(max(col, 0.), 1.);
}`;

export interface XOpts { mode: XName; k: number; t: number; seed?: number; c?: [number, number]; under?: number; freeze?: number; splash?: number; prompt?: number }

export class XFade {
  private pass = new FSPass(frag, {
    tA: { value: null }, tB: { value: null }, uMode: { value: 0 }, uK: { value: 0 }, uT: { value: 0 }, uAsp: { value: 608 / 1080 }, uSeed: { value: 0 },
    uUnder: { value: 0 }, uFreeze: { value: 0 }, uSplash: { value: 0 }, uPrompt: { value: 0 }, uC: { value: new THREE.Vector2(0.5, 0.5) },
  });
  /** Draws A (and B through the transition) into `out`'s current viewport. */
  render(renderer: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, a: THREE.Texture, b: THREE.Texture | null, o: XOpts) {
    const u = this.pass.u;
    u.tA!.value = a; u.tB!.value = b ?? a; u.uMode!.value = b ? XMODE[o.mode] : 0; u.uK!.value = o.k; u.uT!.value = o.t; u.uSeed!.value = o.seed ?? 0;
    u.uUnder!.value = o.under ?? 0; u.uFreeze!.value = o.freeze ?? 0; u.uSplash!.value = o.splash ?? 0; u.uPrompt!.value = o.prompt ?? 0;
    (u.uC!.value as THREE.Vector2).set(...(o.c ?? [0.5, 0.5]));
    this.pass.render(renderer, out);
  }
}
