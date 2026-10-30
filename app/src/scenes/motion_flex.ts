// One continuous, seekable performance. The analysed music is the only clock.
// The carrier changes topology; it never resets at the copy changes.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D, clearRT, W, H } from '../engine/gl';
import { F, font } from '../engine/type';
import { COL } from './_vo';

const TAU = Math.PI * 2;
const INK = '#10110f', PAPER = '#edece3', CLAY = '#eb8c69', ACID = '#d8fa79';
const sat = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { x = sat(x); return x * x * (3 - 2 * x); };
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const windowAt = (b: number, a: number, z: number, feather = 0.65) =>
  smooth((b - a) / feather) * (1 - smooth((b - z + feather) / feather));

// These are score proportions, snapped onto the measured grid in init().
// Retiming the song changes every move without rewriting animation seconds.
const STOPS = [0, 0.16, 0.31, 0.47, 0.63, 0.79, 1];

const vertex = /* glsl */ `
  uniform float morph, clock, energy;
  varying vec3 wp;
  varying vec2 tex;
  const float PI = 3.141592653589793;
  void main() {
    float u = uv.x * 2. * PI;
    float v = uv.y * 2. * PI;
    // Ring -> twisted ribbon -> breathing sphere. A common surface preserves identity.
    vec3 ring = vec3((1.02 + .36*cos(v))*cos(u), (1.02+.36*cos(v))*sin(u), .36*sin(v));
    float twist = v + 3.*u + clock*.28;
    vec3 ribbon = vec3((.96 + .30*cos(twist))*cos(u), (.96+.30*cos(twist))*sin(u), .48*sin(twist));
    vec3 sphere = vec3(sin(uv.y*PI)*cos(u), sin(uv.y*PI)*sin(u), cos(uv.y*PI))*1.13;
    sphere *= 1. + .055*sin(u*7.+clock)*sin(v*4.-clock*.4);
    vec3 p = mix(ring, ribbon, smoothstep(0.,1.,morph));
    p = mix(p, sphere, smoothstep(1.,2.,morph));
    p *= 1. + energy*.045;
    vec4 world = modelMatrix * vec4(p,1.);
    wp = world.xyz; tex = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform float clock, lightMode, opacity;
  varying vec3 wp;
  varying vec2 tex;
  void main() {
    vec3 n = normalize(cross(dFdx(wp),dFdy(wp)));
    if (!gl_FrontFacing) n = -n;
    vec3 view = normalize(cameraPosition-wp);
    vec3 r = reflect(-view,n);
    // Analytic studio strips: no downloaded HDR or frame-dependent simulation.
    float key = pow(max(0.,dot(r,normalize(vec3(-.4,.75,1.)))),38.);
    float soft = pow(max(0.,dot(r,normalize(vec3(.6,.1,1.)))),4.);
    float strip = pow(max(0.,1.-abs(r.x*.8+r.y*.28+.12)),26.);
    float rim = pow(1.-abs(dot(n,view)),2.2);
    float bands = .5+.5*sin(r.y*9.+r.z*3.+clock*.22);
    vec3 base = mix(vec3(.025,.033,.028),vec3(.36,.49,.36),bands);
    vec3 tint = mix(vec3(.95,.48,.27),vec3(.60,.91,.83),smoothstep(-.4,.7,r.x));
    vec3 col = base + tint*soft*.62 + vec3(1.,.96,.83)*strip*.85;
    col += vec3(1.0,.94,.82)*key*2. + tint*rim*.7;
    col *= mix(1.,.72,lightMode);
    gl_FragColor = vec4(col,opacity);
  }
`;

export default class MotionFlex extends Scene {
  private bg = new Layer2D();
  private fg = new Layer2D();
  private world = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, W / H, .1, 80);
  private material = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment,
    uniforms: { morph: { value: 0 }, clock: { value: 0 }, energy: { value: 0 },
      lightMode: { value: 0 }, opacity: { value: 1 } },
    side: THREE.DoubleSide, transparent: true,
  });
  private geometry = new THREE.PlaneGeometry(1, 1, 160, 64);
  private carrier = new THREE.Mesh(this.geometry, this.material);
  private starsGeometry = new THREE.BufferGeometry();
  private starsMaterial = new THREE.PointsMaterial({ color: CLAY, size: .017, transparent: true, opacity: .6, depthWrite: false });
  private stars = new THREE.Points(this.starsGeometry, this.starsMaterial);
  private points = new Float32Array(840 * 3);
  private startBeat = 0;
  private endBeat = 24;
  private cuts: number[] = [];

  override init() {
    const au = this.ctx.audio;
    this.startBeat = au.beatAt(0);
    this.endBeat = au.beatAt(this.ctx.params.scoreDuration ?? au.duration);
    const span = this.endBeat - this.startBeat;
    this.cuts = STOPS.map((p, i) => i === 0 ? this.startBeat : i === STOPS.length - 1
      ? this.endBeat : Math.round(this.startBeat + span * p));
    this.camera.position.set(0, .04, 8);
    this.world.add(this.carrier, this.stars);
    this.starsGeometry.setAttribute('position', new THREE.BufferAttribute(this.points, 3));
    this.stars.frustumCulled = false;
  }

  private label(c: CanvasRenderingContext2D, text: string, x: number, y: number, size = 12,
    color = PAPER, align: CanvasTextAlign = 'left') {
    c.font = font(F.mono(500), size); c.fillStyle = color;
    c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(text, x, y);
  }

  private type(c: CanvasRenderingContext2D, text: string, x: number, baseline: number,
    size: number, color = PAPER, reveal = 1, maxW = 480, outline = false) {
    c.save();
    c.font = font(F.archivo(75, 900), size);
    const w = c.measureText(text).width;
    const scale = Math.min(1, maxW / Math.max(1, w));
    c.translate(x, baseline); c.scale(scale, 1);
    c.beginPath(); c.rect(-4, -size * 1.07, w + 8, size * 1.2); c.clip();
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const lift = Math.pow(1 - sat(reveal), 3) * size * 1.2;
    c.fillStyle = color; c.strokeStyle = color; c.lineWidth = .9;
    if (outline) c.strokeText(text, 0, lift); else c.fillText(text, 0, lift);
    c.restore();
  }

  private brackets(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    c.strokeStyle = color; c.lineWidth = 1;
    c.beginPath();
    for (const [px, py, dx, dy] of [[x,y,1,1], [x+w,y,-1,1], [x,y+h,1,-1], [x+w,y+h,-1,-1]]) {
      c.moveTo(px, py + dy * 12); c.lineTo(px, py); c.lineTo(px + dx * 12, py);
    }
    c.stroke();
  }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const au = this.ctx.audio;
    // Exact endpoint pose equals the beginning. This also makes out-of-order seeking stable.
    const t = f.t >= (this.ctx.params.scoreDuration ?? au.duration) ? 0 : Math.max(0, f.t);
    const b = au.beatAt(t), p = (b - this.startBeat) / (this.endBeat - this.startBeat);
    const [a0, a1, a2, a3, a4, a5, a6] = this.cuts;
    const kick = au.hit('kick', t, .08);
    const phase = p * TAU;
    const kinetic = windowAt(b, a2 - .7, a3 + .4);
    const tunnel = windowAt(b, a3 - .6, a4 + .7);
    const build = windowAt(b, a4 - .6, a5 + .55);
    const cta = windowAt(b, a5 - .4, a6 - .6);
    const returnToStart = smooth((b - (a6 - 1)) / 1);
    const light = kinetic;
    const motionTime = mix(p, 0, returnToStart);

    const back = this.bg.ctx;
    this.bg.clear(INK);
    back.save(); back.translate(COL.x, 0);
    // Warm vignette follows the carrier through the full transformation.
    const halo = back.createRadialGradient(280, 505, 30, 280, 505, 450);
    halo.addColorStop(0, '#344037'); halo.addColorStop(.6, '#171c17'); halo.addColorStop(1, INK);
    back.fillStyle = halo; back.fillRect(0, 0, COL.w, H);
    back.globalAlpha = light; back.fillStyle = PAPER; back.fillRect(0, 0, COL.w, H); back.globalAlpha = 1;

    // Fine travelling contours, deliberately subordinate to the hero.
    back.strokeStyle = light > .5 ? 'rgba(25,30,22,.10)' : 'rgba(224,238,211,.09)';
    back.lineWidth = .7;
    for (let i = 0; i < 16; i++) {
      const y = 75 + i * 67;
      back.beginPath();
      for (let j = 0; j <= 30; j++) {
        const x = j * COL.w / 30;
        const wave = Math.sin(x / 155 + phase + i * .2) * (8 + 20 * tunnel);
        j ? back.lineTo(x, y + wave) : back.moveTo(x, y + wave);
      }
      back.stroke();
    }
    if (tunnel > .001) {
      back.save(); back.globalAlpha = tunnel;
      back.translate(278, 505); back.rotate(-.13 + .12 * Math.sin(phase));
      for (let i = 0; i < 18; i++) {
        const travel = ((i / 18 + motionTime * 2) % 1 + 1) % 1;
        const s = .07 + travel * travel * 4;
        back.strokeStyle = `rgba(216,250,121,${(1-travel)*.65})`;
        back.lineWidth = .7 + travel * 1.5;
        back.strokeRect(-165*s, -250*s, 330*s, 500*s);
      }
      back.restore();
    }
    back.restore();
    clearRT(this.ctx.renderer, out);
    this.ctx.comp.draw(this.ctx.renderer, this.bg.upload(), out);

    // Every property is assigned at every frame: no accumulated rotation or delta integration.
    this.material.uniforms.clock.value = motionTime * TAU * 4;
    this.material.uniforms.morph.value = mix(0, .9 + .85 * build, smooth((b-a1+.5)/1.8)) * (1-returnToStart);
    this.material.uniforms.energy.value = kick * (1-returnToStart);
    this.material.uniforms.lightMode.value = light;
    this.material.uniforms.opacity.value = 1 - kinetic * .85;
    this.carrier.position.set(-.12 + .20*Math.sin(motionTime*TAU), .12 - cta*.27, 0);
    this.carrier.rotation.set(.38 + .55*Math.sin(motionTime*TAU), -.3 + motionTime*TAU*2, -.28 + motionTime*TAU);
    const size = (1 + .09*Math.sin(motionTime*TAU) + .2*tunnel - .6*cta - .24*build);
    this.carrier.scale.setScalar(size);

    // Fibonacci particles: orbit -> vortex -> focus around the same carrier.
    for (let i = 0; i < 840; i++) {
      const u = (i + .5)/840, theta = i*2.399963229728653 + motionTime*TAU;
      const z = 1-2*u, r = Math.sqrt(1-z*z);
      const radius = 1.58 + .12*Math.sin(i*.3+motionTime*TAU*3);
      const spread = mix(1, 2.7, tunnel);
      this.points[i*3] = Math.cos(theta)*r*radius*spread;
      this.points[i*3+1] = z*radius*mix(1,1.9,tunnel);
      this.points[i*3+2] = Math.sin(theta)*r*radius + tunnel*Math.sin(theta*2+phase)*2;
    }
    this.starsGeometry.attributes.position.needsUpdate = true;
    this.starsMaterial.opacity = (0.18 + .48*tunnel + .34*build) * (1-kinetic) * (1-cta*.85);
    this.starsMaterial.size = .012 + build*.013;
    this.stars.rotation.set(motionTime*.4, motionTime*.6, 0);
    this.ctx.renderer.setRenderTarget(out);
    this.ctx.renderer.clearDepth();
    this.ctx.renderer.render(this.world, this.camera);

    const c = this.fg.ctx; this.fg.clear();
    c.save(); c.translate(COL.x, 0);
    const fg = light > .5 ? INK : PAPER;
    this.label(c, 'TECHPE TREK / MOTION STUDY', 42, 224, 11, fg);
    // Segments are metadata, not a clock display. Words all stay inside x<=534, y=203..799.
    for (let i = 0; i < 6; i++) {
      c.globalAlpha = p >= STOPS[i] ? .9 : .22;
      c.fillStyle = fg; c.fillRect(42+i*80, 242, 69, 2);
    }
    c.globalAlpha = 1;

    const drawHook = (alpha: number) => {
      c.save(); c.globalAlpha = alpha;
      this.type(c, 'THIS IS', 42, 365, 106);
      this.type(c, 'CODE.', 42, 470, 137, ACID);
      this.label(c, 'EVERY FRAME. EVERY MOVE.', 44, 738, 13);
      c.restore();
    };
    const hook = 1-smooth((b-a1+.7)/.7);
    drawHook(Math.max(hook, returnToStart));

    const titleAlpha = windowAt(b,a1-.7,a2+.1,.6) * (1-returnToStart);
    if (titleAlpha > .001) {
      c.save(); c.globalAlpha = titleAlpha;
      this.label(c, 'CREATE WITH', 44, 300, 13, CLAY);
      this.type(c,'CLAUDE',42,400,114,PAPER,smooth((b-a1+.7)/.7));
      this.type(c,'OPUS 5.5',42,700,91,ACID,smooth((b-a1+.25)/.7));
      this.label(c,'WORDS INTO WORLDS.',44,740,13);
      c.restore();
    }

    if (kinetic > .001) {
      c.save(); c.globalAlpha = kinetic;
      // Baseline-locked elastic type with a traveling outline-to-fill mask.
      const travel = smooth((b-a2)/(Math.max(1,a3-a2-1)));
      this.label(c,'01 / KINETIC TYPE',44,288,12,INK);
      const lines = ['MAKE','IT','MOVE.'];
      lines.forEach((word,i) => {
        const y = 408+i*135, s = 146;
        this.type(c,word,42,y,s,INK,1,475,true);
        c.save(); c.beginPath(); c.rect(39, y-s, 485*sat(travel*1.6-i*.18), s+20); c.clip();
        this.type(c,word,42,y,s,i === 1 ? '#b34f35' : INK);
        c.restore();
      });
      const bx = 42+Math.sin(travel*Math.PI)*290;
      c.fillStyle = '#b34f35'; c.fillRect(bx,712,148,5);
      this.label(c,'TYPE THAT MOVES TO THE TRACK.',44,758,11,INK);
      c.restore();
    }

    if (tunnel > .001) {
      c.save(); c.globalAlpha = tunnel;
      this.label(c,'02 / DEPTH + PARTICLES',44,286,12,ACID);
      this.type(c,'BREAK',42,377,103,PAPER,smooth((b-a3+.6)/.7));
      this.type(c,'THE FRAME.',42,725,90,PAPER,smooth((b-a3)/.7));
      c.restore();
    }

    if (build > .001) {
      c.save(); c.globalAlpha = build;
      this.label(c,'03 / THE WORKFLOW',44,286,12,CLAY);
      this.type(c,'WORDS',42,370,106,PAPER,smooth((b-a4+.6)/.7));
      this.type(c,'TO WORLDS.',42,742,85,PAPER,smooth((b-a4)/.7));
      // Real production stages, no fabricated app screenshot, no repository names.
      const rows = ['01   PROMPT', '02   MOTION SKILLS', '03   CODE + RENDER'];
      rows.forEach((text,i) => {
        const reveal = smooth((b-a4+.4-i*.38)/.65);
        const y = 437+i*68;
        c.save(); c.globalAlpha *= reveal;
        const x = mix(110,44,reveal);
        c.fillStyle = 'rgba(15,17,14,.87)'; c.fillRect(x,y,484,53);
        c.strokeStyle = i===1 ? CLAY : 'rgba(230,234,214,.3)'; c.lineWidth = 1; c.strokeRect(x,y,484,53);
        this.label(c,text,x+17,y+33,15,i===1?CLAY:PAPER);
        c.restore();
      });
      c.restore();
    }

    if (cta > .001) {
      c.save(); c.globalAlpha = cta*(1-returnToStart);
      this.label(c,'WANT THE WORKFLOW?',44,300,14,CLAY);
      this.type(c,'COMMENT',42,406,103,PAPER,smooth((b-a5+.4)/.6));
      this.type(c,'MOTION',42,523,123,ACID,smooth((b-a5)/.6));
      this.brackets(c,39,326,491,217,ACID);
      this.label(c,'I’LL DM YOU THE SKILLS + REPOS.',44,716,12);
      this.label(c,'SAVE IT. BUILD YOUR VERSION.',44,749,12,'#a6ada0');
      c.restore();
    }

    // Thin audio waveform is a true sampled envelope, not decorative random bars.
    c.save(); c.globalAlpha = .7;
    for (let i = 0; i < 64; i++) {
      const sampleT = Math.max(0, t - .7 + i / 63 * 1.4);
      const amplitude = au.env('rms', sampleT);
      const h = 2 + 12 * amplitude;
      c.fillStyle = fg; c.fillRect(44+i*7.4, 784-h/2, 2, h);
    }
    c.restore(); c.restore();
    this.ctx.comp.draw(this.ctx.renderer, this.fg.upload(), out);
    return { hud: 0, frame: 0, pdoom: 0, bloom: .17, bloomThreshold: 1.05, bloomRadius: .32,
      halation: .06, grain: 0, vignette: .12, ca: 0, shake: [0,0], zoom: 1 };
  }

  override dispose() {
    this.geometry.dispose(); this.material.dispose();
    this.starsGeometry.dispose(); this.starsMaterial.dispose();
    this.bg.texture.dispose(); this.fg.texture.dispose();
  }
}
