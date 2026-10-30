// Render 08 (V4, light mode): ink on paper, one fragment shader moved by the song. An ensō (one brush circle) paints itself across
// the beat, thick and wet at the start, a dry, splitting brush at the end; on every measured kick a drop of ink lands and blooms
// (watercolour: a darker drying edge, granulation, inks that multiply where they overlap, a wet sheen while fresh); each snare throws
// a splatter. Drops sit where a hash of their kick's time puts them, so every frame is a pure function of t. Kicks and snares are
// V4's own measured onsets (data/aura_v4/audio.json, 1 ms). p.t0 = the render's own start (V4 time).
import * as THREE from 'three';
import { FSPass } from '../../engine/gl';
import { hash } from '../../engine/util';
import { LOOK, FXW, type AuraCtx, type World, ease, statement, ax, mono, txt, alpha, sat } from './common';
import { spring } from '../_vo';

const ND = 12, NS = 2;
const frag = /* glsl */ `
uniform float uT, uLt, uAsp, uEnso, uEnsoW;
uniform vec4 uDrop[${ND}];   // x, y, age (s, < 0 = none), size
uniform vec3 uInk[${ND}];    // the ink (sRGB 0..1)
uniform vec4 uSplat[${NS}];  // x, y, age, seed

vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  vec2 P = (vUv - 0.5) * vec2(uAsp, 1.);
  P = rot2(0.035 * uLt) * P * (1. - 0.03 * uLt);                                  // the camera drifts in
  // paper: warm cream, a large tone variation and fibres
  float fib = fbm(P * vec2(90., 30.), 3), tone = fbm(P * 2.6 + 4.1, 3);
  vec3 col = vec3(0.955, 0.935, 0.895) + 0.018 * tone + 0.012 * fib;
  col *= 1. - 0.18 * dot(P, P);
  float wf = fbm(P * 4.6 + vec2(0., uT * 0.04), 4), wf2 = fbm(P * 13. + 7.3, 3);  // one shared flow field for every drop
  float wet = 0.;
  for (int i = 0; i < ${ND}; i++) {
    vec4 d = uDrop[i]; if (d.z < 0.) continue;
    vec2 q = P - d.xy; float r = length(q), a = atan(q.y, q.x), age = d.z;
    float grow = 1. - exp(-age / 0.32), R = d.w * grow * (0.82 + 0.18 * sqrt(min(age, 3.)));
    float fing = (0.6 * sin(a * 7. + d.x * 40.) * sin(a * 3. - d.y * 31.) + 0.4 * sin(a * 13. + d.w * 50.)) * 0.022;   // fingering of the front
    float dw = r + (wf * 0.085 + wf2 * 0.03 + fing) * min(1., age * 2.2) * (0.4 + d.w * 2.);
    float inside = smoothstep(R + 0.003, R - 0.003, dw);
    float edge = exp(-max(R - dw, 0.) * 34.);                                          // pigment piles up where it dries
    float dens = inside * (0.42 + 0.58 * edge) * (0.82 + 0.36 * wf2) * (1. - 0.25 * sat(age / 2.5));
    col *= mix(vec3(1.), d.w > 0. ? uInk[i] : vec3(1.), dens);                         // inks multiply where they overlap
    wet += inside * exp(-age / 0.7);
  }
  // the ensō: one brush circle, swept from a1 through uEnso (0..1) of 0.93 of a turn
  { float a0 = 2.05, sw = 0.93 * 6.2831853;
    vec2 q = P - vec2(0., 0.035); float r = length(q), ang = mod(atan(q.y, q.x) - a0 + 6.2831853, 6.2831853), u = ang / sw;
    float Rr = 0.205 * (1. + 0.035 * sin(ang * 2.3 + 1.1) + 0.02 * sin(ang * 5.1));
    float w = uEnsoW * mix(0.034, 0.011, smoothstep(0.2, 1., u)) * (0.85 + 0.3 * fbm(vec2(u * 9., 2.), 2));
    float across = (r - Rr) / max(w, 1e-4);
    float bristle = fbm(vec2(u * 46., across * 3.2), 3);                               // dry-brush streaks along the stroke
    float dry = smoothstep(0.45, 1., u) * 0.9;
    float m = smoothstep(1.05, 0.85, abs(across)) * step(u, uEnso) * step(0.001, uEnso);
    m *= smoothstep(-0.25 + dry, 0.15 + dry, bristle + 0.35);
    float ah = a0 + uEnso * sw, wh = uEnsoW * mix(0.034, 0.011, smoothstep(0.2, 1., uEnso));    // the round, wet head of the stroke
    vec2 hp = 0.205 * (1. + 0.035 * sin(uEnso * sw * 2.3 + 1.1) + 0.02 * sin(uEnso * sw * 5.1)) * vec2(cos(ah), sin(ah));
    m = max(m, smoothstep(wh, wh * 0.8, length(q - hp)) * step(0.001, uEnso) * step(uEnso, 0.995) * (1. - dry * 0.6));
    col *= mix(vec3(1.), vec3(0.075, 0.07, 0.08), m * 0.97);
    wet += m * exp(-max(uEnso - u, 0.) * 6.) * 0.8;
  }
  // snare splatter: small elongated droplets thrown out from a point
  for (int s = 0; s < ${NS}; s++) {
    vec4 S = uSplat[s]; if (S.z < 0.) continue;
    for (int j = 0; j < 14; j++) {
      vec2 h = hash22(vec2(float(j), S.w)); float ang = h.x * 6.2831853, dist = 0.03 + 0.17 * h.y * h.y;
      vec2 c = S.xy + vec2(cos(ang), sin(ang)) * dist * (1. - exp(-S.z / 0.05));
      vec2 q = rot2(-ang) * (P - c); float rr = 0.0025 + 0.007 * hash12(vec2(j, S.w + 1.));
      float m = smoothstep(rr, rr * 0.6, length(q * vec2(0.55, 1.)));
      col *= mix(vec3(1.), vec3(0.08, 0.07, 0.1), m);
    }
  }
  // the wet sheen: a highlight off the fresh ink (normal from the screen-space slope of the wetness)
  vec2 g = vec2(dFdx(wet), dFdy(wet)) * 60.; vec3 n = normalize(vec3(-g, 1.));
  col += vec3(1.) * pow(max(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.), 24.) * min(wet, 1.) * 0.35;
  fragColor = vec4(lin(clamp(col, 0., 1.)) * 1.12, 1.);
}`;

const INKS: [number, number, number][] = [[0.07, 0.1, 0.36], [0.86, 0.22, 0.12], [0.1, 0.09, 0.1], [0.12, 0.42, 0.46]];   // indigo, vermilion, sumi, teal

export function r8World(): World {
  let x!: AuraCtx;
  const drop = Array.from({ length: ND }, () => new THREE.Vector4(0, 0, -1, 0)), ink = Array.from({ length: ND }, () => new THREE.Vector3());
  const splat = Array.from({ length: NS }, () => new THREE.Vector4(0, 0, -1, 0));
  const pass = new FSPass(frag, { uT: { value: 0 }, uLt: { value: 0 }, uAsp: { value: 608 / 1080 }, uEnso: { value: 0 }, uEnsoW: { value: 1 }, uDrop: { value: drop }, uInk: { value: ink }, uSplat: { value: splat } });
  /** The drops at t: four seeded so the page is never empty, then one per kick since t0 (the latest ND). */
  const drops = (t: number, t0: number) => {
    const seeds: [number, number, number, number, number][] = [[t0 - 0.55, -0.12, 0.2, 0.17, 0], [t0 - 0.4, 0.13, -0.16, 0.14, 1], [t0 - 0.22, -0.05, -0.28, 0.1, 3], [t0 - 0.08, 0.16, 0.3, 0.08, 2]];
    const kicks = x.audio.events('kick', t0, t + 1e-6).map(([kt, s]) => {
      const h1 = hash(Math.round(kt * 1000), 1), h2 = hash(Math.round(kt * 1000), 2), h3 = hash(Math.round(kt * 1000), 3);
      return [kt, (h1 - 0.5) * 0.44, (h2 - 0.5) * 0.78, 0.07 + 0.13 * s * (0.6 + 0.4 * h3), Math.floor(h3 * 4)] as [number, number, number, number, number];
    });
    return [...seeds, ...kicks].filter((d) => d[0] <= t).slice(-ND);
  };
  return {
    init(ctx) { x = ctx; },
    render3d(t, rt, p) {
      const t0 = p.t0 as number, beat = x.cues.beat, u = pass.u;
      u.uT!.value = t; u.uLt!.value = t - t0;
      const ds = drops(t, t0);
      for (let i = 0; i < ND; i++) {
        const d = ds[i]; if (!d) { drop[i]!.set(0, 0, -1, 0); continue; }
        drop[i]!.set(d[1], d[2], t - d[0], d[3]); ink[i]!.set(...INKS[d[4]]!);
      }
      // the ensō: painted from t0 - 0.05 across one beat (fast, then slowing as the brush runs dry)
      u.uEnso!.value = ease.out(sat((t - (t0 - 0.05)) / beat), 2.2); u.uEnsoW!.value = 1;
      const sn = x.audio.events('snare', t0 - 0.3, t + 1e-6).slice(-NS);
      for (let s = 0; s < NS; s++) {
        const e = sn[s]; if (!e) { splat[s]!.set(0, 0, -1, 0); continue; }
        splat[s]!.set((hash(Math.round(e[0] * 1000), 4) - 0.5) * 0.36, (hash(Math.round(e[0] * 1000), 5) - 0.5) * 0.6, t - e[0], Math.round(e[0] * 1000) % 97);
      }
      pass.render(x.renderer, rt);
    },
    draw(c, t, p) {
      const t0 = p.t0 as number, beat = x.cues.beat;
      // the seal: a red chop stamped on the first snare after the ensō closes
      const st = x.audio.events('snare', t0 + beat * 0.8, t0 + 8).map(([s]) => s)[0];
      if (st !== undefined && t >= st) {
        const k = spring(t - st, 0.22, 0.5), s = 1.5 - 0.5 * k;
        c.save(); c.translate(432, 742); c.rotate(-0.06); c.scale(s, s); c.globalAlpha = sat((t - st) / 0.04) * 0.92;
        c.fillStyle = '#C8102E'; c.beginPath(); c.roundRect(-30, -30, 60, 60, 6); c.fill();
        c.strokeStyle = 'rgba(255,240,230,0.9)'; c.lineWidth = 2; c.beginPath(); c.roundRect(-24, -24, 48, 48, 3); c.stroke();
        txt(c, 'R08', 0, 9, ax(22, 100, 900), '#FFF4EC', 0, 'center'); c.restore();
      }
      if (LOOK.clean) return;
      txt(c, 'R08 · INK · ONE SHADER', 32, 84, mono(12, 600), alpha('#1A1612', 0.7), 2, 'left');
      txt(c, 'kick = a drop · snare = a splatter', FXW - 32, 84, mono(11, 600), alpha('#1A1612', 0.6), 1, 'right');
      statement(c, 'INK → RHYTHM', t, t0 + 2 * beat, 880, '#1A1612', '#C8102E');
    },
  };
}
