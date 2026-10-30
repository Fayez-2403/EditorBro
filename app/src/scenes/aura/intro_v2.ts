// V2 intro (0-10.105 s, Dhurandhar): the developer wears a chrome "aura" mask. The footage (only the backshot frames where his
// face is tracked, or not visible at all) and the mask render in 3D together: the mask is MediaPipe's 468-point face mesh,
// rebuilt each frame from landmarks precomputed by analysis/aura_v2_face.py (data/aura_v2/face.json), so it sits on his face
// through every move and the frame stays a pure function of t. Chrome PBR with a dark rim; a teal circuit pattern drawn in
// the mesh's own UV space (eye slits, the centre line, the brows, the face outline) pulses on each word and hit.
// 2D on top: the line word by word (each line kept on screen until the next hit), "6 RENDERS. ALL CODE." kept as a header
// to the dive, CREATOR MODE, light streaks and leaks on the hits, the timeline in the window, the dive.
import * as THREE from 'three';
import { A, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, pulses, mono, txt, ax, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';
import { hash } from '../../engine/util';

export type Face = { fps: number; n: number; w: number; h: number; frames: (number[] | null)[]; tris: number[]; uv: number[] };
type Shot = { ct: number; z: number; fx: number; fy: number; dx: number };

// MediaPipe face-mesh landmark paths (canonical indices)
const EYE_L = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const EYE_R = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
const CENTRE = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1];
const CHIN = [2, 164, 0, 17, 18, 200, 199, 175, 152];
const BROW_L = [70, 63, 105, 66, 107], BROW_R = [336, 296, 334, 293, 300];
const CHEEK_L = [116, 117, 118, 119, 120, 121, 47], CHEEK_R = [345, 346, 347, 348, 349, 350, 277];
const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];
const MOUTH = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
/** The canonical mesh is open at the eyes and the mouth: close them (fans), so the mask is one surface and the eye slits show. */
const fan = (loop: number[]) => loop.slice(1, -1).flatMap((v, i) => [loop[0]!, v, loop[i + 2]!]);

function emissiveTex(uv: number[]) {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const P = (i: number): [number, number] => [uv[i * 2]! * S, (1 - uv[i * 2 + 1]!) * S];
  const path = (ids: number[], w: number, col: string, close = false) => {
    g.beginPath(); ids.forEach((i, k) => (k ? g.lineTo(...P(i)) : g.moveTo(...P(i)))); if (close) g.closePath();
    g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 14; g.stroke();
  };
  for (const e of [EYE_L, EYE_R]) {   // glowing eye slits
    g.beginPath(); e.forEach((i, k) => (k ? g.lineTo(...P(i)) : g.moveTo(...P(i)))); g.closePath();
    g.shadowColor = '#7FF0FF'; g.shadowBlur = 24; g.fillStyle = '#9FF6FF'; g.fill();
  }
  path(OVAL, 6, '#3FD6E0'); path(CENTRE, 4, '#3FD6E0'); path(CHIN, 4, '#3FD6E0');
  path(BROW_L, 5, '#7FF0FF'); path(BROW_R, 5, '#7FF0FF'); path(CHEEK_L, 3, '#3FD6E0'); path(CHEEK_R, 3, '#3FD6E0'); path(LIPS, 3, '#9B7BFF');
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function introV2World(face: Face): World {
  let x!: AuraCtx; let H: number[] = [], W: Record<string, number> = {}, slam = 0, e8 = 0;
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(0, FXW, FXH, 0, -2000, 2000);
  const tex = new THREE.Texture(); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  let lastBmp: ImageBitmap | null = null;
  const plate = new THREE.PlaneGeometry(FXW, FXH); { const uv = plate.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); }   // ImageBitmaps upload top row first
  const bg = new THREE.Mesh(plate, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); bg.position.set(FXW / 2, FXH / 2, -500);
  const index = [...face.tris, ...fan(EYE_L), ...fan(EYE_R), ...fan(MOUTH)];
  const geo = new THREE.BufferGeometry(), rimGeo = new THREE.BufferGeometry(), smooth = new THREE.BufferGeometry();
  const pos = new Float32Array(468 * 3), rimPos = new Float32Array(468 * 3), sPos = new Float32Array(468 * 3), tmp = new Float32Array(468 * 3);
  const nb: number[][] = Array.from({ length: 468 }, () => []);
  for (let i = 0; i < index.length; i += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== b && !nb[index[i + a]!]!.includes(index[i + b]!)) nb[index[i + a]!]!.push(index[i + b]!);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(face.uv), 2)); geo.setIndex(index);
  rimGeo.setAttribute('position', new THREE.BufferAttribute(rimPos, 3)); rimGeo.setIndex(index);
  smooth.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); smooth.setIndex(index);
  const mat = new THREE.MeshPhysicalMaterial({ color: '#5A636E', metalness: 0.9, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 0.7, emissive: new THREE.Color('#FFFFFF'), emissiveMap: emissiveTex(face.uv), emissiveIntensity: 0.9, side: THREE.DoubleSide });
  const mask = new THREE.Mesh(geo, mat), rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: '#05070A', roughness: 0.55, side: THREE.DoubleSide }));
  mask.frustumCulled = rim.frustumCulled = false;
  scene.add(bg, rim, mask);
  const key = new THREE.DirectionalLight('#BFEFFF', 1.6); key.position.set(-300, 400, 900); scene.add(key, new THREE.AmbientLight('#203040', 0.6));
  /** The shot at t: the backshot's clip time and the camera move, re-cut on the intro's measured hits (faces only where tracked). */
  const shot = (t: number): Shot => {
    const [h1, h2, h3, h4, h5] = H as [number, number, number, number, number];
    if (t < h1) return { ct: 0.05 + t * 0.34, z: 1.08 + 0.14 * ease.inOut(t / h1, 2), fx: CX, fy: 470, dx: 0 };
    if (t < h2) return { ct: 1.75 + (t - h1) * 1.4, z: 1.06 + 0.14 * (1 - ease.out(span(t, h1, h1 + 0.3), 3)), fx: CX, fy: 420, dx: 0 };
    if (t < h3) { const k = (t - h2) / (h3 - h2); return { ct: 2.6 + (t - h2) * 0.53, z: 1.02 + 0.07 * k + 0.1 * (1 - ease.out(span(t, h2, h2 + 0.3), 3)), fx: CX, fy: 520, dx: 18 - 36 * k }; }
    if (t < h4) return { ct: 6.25 + (t - h3) * 0.9, z: 1.04 + 0.1 * (1 - ease.out(span(t, h3, h3 + 0.3), 3)), fx: CX, fy: 480, dx: 0 };
    if (t < h5) return { ct: 7.12 + (t - h4) * 0.32, z: 1.0 + 0.04 * (t - h4) + 0.1 * (1 - ease.out(span(t, h4, h4 + 0.3), 3)), fx: CX, fy: 420, dx: 0 };
    const k = ease.in(sat((t - h5) / (slam - h5)), 2); return { ct: 7.2 + (t - h5) * 0.3, z: 1 + 2.2 * k, fx: CX, fy: 400, dx: 0 };
  };
  const words = () => Object.values(W);
  return {
    init(ctx) {
      x = ctx; e8 = x.cues.eighth; slam = x.ev('dh.slam'); H = [1, 2, 3, 4, 5].map((i) => x.ev(`dh.hit${i}`));
      for (const k of ['ladies', 'and', 'gentlemen', 'you', 'are', 'not', 'ready', 'for', 'this']) W[k] = x.ev(`dh.${k}`);
      // a room for the chrome to reflect: the teal monitors in front, a warm lamp, a soft top
      const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: '#04060A', side: THREE.BackSide })));
      const panel = (w: number, h: number, col: string, k: number, p: [number, number, number]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); env.add(m); };
      panel(12, 4, A.teal, 1.2, [0, 1, 9]); panel(10, 3, '#FFFFFF', 1.4, [0, 9, 2]); panel(3, 6, '#FFB070', 1.1, [9, 0, 3]); panel(3, 8, '#7FF0FF', 0.7, [-9, 1, 2]);
      const pm = new THREE.PMREMGenerator(x.renderer); scene.environment = pm.fromScene(env, 0.02).texture; pm.dispose();
    },
    render3d(t, rt) {
      const s = shot(t), bmp = x.frame('ph', s.ct);
      if (bmp && bmp !== lastBmp) { tex.image = bmp; tex.needsUpdate = true; lastBmp = bmp; }
      // the camera: the shot's zoom about (fx, fy) and its pan, in column px (y up)
      const x0 = s.fx + (0 - s.fx - s.dx) / s.z, x1 = s.fx + (FXW - s.fx - s.dx) / s.z, yTop = s.fy - s.fy / s.z, yBot = s.fy + (FXH - s.fy) / s.z;
      cam.left = x0; cam.right = x1; cam.top = FXH - yTop; cam.bottom = FXH - yBot; cam.updateProjectionMatrix();
      const fi = Math.max(0, Math.min(face.n - 1, Math.round(s.ct * face.fps))), L = face.frames[fi];
      mask.visible = rim.visible = !!L;
      if (L) {
        let cx = 0, cy = 0;
        for (let i = 0; i < 468; i++) { pos[i * 3] = L[i * 3]! * FXW; pos[i * 3 + 1] = FXH - L[i * 3 + 1]! * FXH; pos[i * 3 + 2] = 60 - L[i * 3 + 2]! * FXW; cx += pos[i * 3]!; cy += pos[i * 3 + 1]!; }
        cx /= 468; cy /= 468;
        for (let i = 0; i < 468; i++) { rimPos[i * 3] = cx + (pos[i * 3]! - cx) * 1.03; rimPos[i * 3 + 1] = cy + (pos[i * 3 + 1]! - cy) * 1.03; rimPos[i * 3 + 2] = pos[i * 3 + 2]! - 8; }
        // lighting normals from a spatially smoothed copy (the landmark mesh is creased at a small scale); the outline stays exact
        sPos.set(pos);
        for (let it = 0; it < 6; it++) {
          for (let i = 0; i < 468; i++) { const n = nb[i]!; let ax_ = 0, ay = 0, az = 0; for (const j of n) { ax_ += sPos[j * 3]!; ay += sPos[j * 3 + 1]!; az += sPos[j * 3 + 2]!; } const m = n.length || 1; tmp[i * 3] = 0.5 * sPos[i * 3]! + 0.5 * ax_ / m; tmp[i * 3 + 1] = 0.5 * sPos[i * 3 + 1]! + 0.5 * ay / m; tmp[i * 3 + 2] = 0.5 * sPos[i * 3 + 2]! + 0.5 * az / m; }
          sPos.set(tmp);
        }
        smooth.attributes.position!.needsUpdate = true; smooth.computeVertexNormals();
        geo.setAttribute('normal', smooth.attributes.normal!); rimGeo.setAttribute('normal', smooth.attributes.normal!);
        geo.attributes.position!.needsUpdate = true; rimGeo.attributes.position!.needsUpdate = true;
        mat.emissiveIntensity = 0.85 + 1.1 * pulses(t, words(), 0.12) + 1.4 * pulses(t, H, 0.1);
      }
      x.renderer.setRenderTarget(rt); x.renderer.setClearColor('#05070A', 1); x.renderer.clear(); x.renderer.render(scene, cam);
    },
    draw(c, t) {
      x.frame('ph', shot(t).ct);   // (the prepare barrier collects the footage frame from this call)
      if ((import.meta as any).env?.VITE_AURA_COVER) return;   // a clean frame for the cover (analysis/aura_cover_v2.py)
      drawIntroOverlay(c, t, H, W, slam, e8, 'BACKSHOT · AI PLACEHOLDER · MASK: CODE');
    },
  };
}

/** The intro's 2D layer (shared by the masked intro and the stock-footage intro): the line word by word, each phrase kept
 * until the next hit; "6 RENDERS. ALL CODE." kept to the dive; CREATOR MODE; streaks and light leaks on the hits; the timeline in
 * the window; the dive's warp and flash onto Dubplate's slam. */
export function drawIntroOverlay(c: CanvasRenderingContext2D, t: number, H: number[], W: Record<string, number>, slam: number, e8: number, label: string) {
      const [h1, h2, h3, h4, h5] = H as [number, number, number, number, number];
      const shade = (y0: number, y1: number, a: number) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(3,4,6,${a})`); g.addColorStop(1, 'rgba(3,4,6,0)'); c.fillStyle = g; c.fillRect(0, 0, FXW, y1); };
      const word = (s: string, t0: number, xx: number, y: number, size: number, col: string) => {
        if (t < t0) return; const k = spring(t - t0, 0.22, 0.55); c.font = ax(size, 118, 900); const w = c.measureText(s).width;
        c.save(); c.translate(xx + w / 2, y); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); c.globalAlpha *= sat((t - t0) / 0.06); txt(c, s, 0, 0, ax(size, 118, 900), col, 1, 'center'); c.restore();
      };
      const line = (ws: [string, number, string?][], y: number, size: number) => {
        c.font = ax(size, 118, 900); const gap = size * 0.28, total = ws.reduce((a, [s]) => a + c.measureText(s).width, 0) + gap * (ws.length - 1);
        let xx = CX - total / 2; for (const [s, t0, col] of ws) { c.font = ax(size, 118, 900); const w = c.measureText(s).width; word(s, t0, xx, y, size, col ?? A.text); xx += w + gap; }
      };
      const streaks = (t0: number, k: number) => {   // a burst of light streaks across the frame on a hit
        const a = t - t0; if (a < 0 || a > 0.28) return;
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          const y = 120 + hash(t0, i, 1) * 820, len = 200 + hash(t0, i, 2) * 420, xx = -len + (FXW + 2 * len) * ease.out(a / 0.28, 2), g = c.createLinearGradient(xx - len, 0, xx, 0);
          g.addColorStop(0, 'rgba(127,240,255,0)'); g.addColorStop(1, `rgba(200,250,255,${0.7 * k * (1 - a / 0.28)})`); c.fillStyle = g; c.fillRect(xx - len, y, len, 1.5 + hash(t0, i, 3) * 3);
        }
        c.restore();
      };
      const leak = (t0: number, side: number) => {   // a warm light leak sweeping in from one side
        const a = t - t0; if (a < 0 || a > 0.9) return; const k = Math.sin(Math.PI * sat(a / 0.9));
        const g = c.createRadialGradient(side > 0 ? FXW : 0, 300 + 200 * a, 20, side > 0 ? FXW : 0, 300 + 200 * a, 560);
        g.addColorStop(0, `rgba(255,170,90,${0.38 * k})`); g.addColorStop(0.5, `rgba(255,120,60,${0.12 * k})`); g.addColorStop(1, 'rgba(255,120,60,0)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, FXW, FXH); c.restore();
      };
      if (t < h1) {   // the line, each phrase kept until the next hit
        shade(100, 470, 0.8);
        if (t < W.ladies! + 0.1) txt(c, 'OPUS 5.5 · THE EDITOR’S AURA', CX, 150, mono(12, 700), alpha(A.text, 0.85), 3, 'center');
        if (t < W.you!) { line([['LADIES', W.ladies!], ['AND', W.and!]], 230, 60); line([['GENTLEMEN,', W.gentlemen!]], 300, 60); }
        else {
          const up = ease.inOut(span(t, W.you!, W.you! + 0.25), 3);   // the first phrase stays, smaller, above
          c.save(); c.globalAlpha = 1 - 0.35 * up; txt(c, 'LADIES AND GENTLEMEN,', CX, 230 - 80 * up + (1 - up) * 0, ax(60 - 32 * up, 118, 900), A.text, 1, 'center'); c.restore();
          line([['YOU', W.you!], ['ARE', W.are!]], 228, 58); line([['NOT', W.not!], ['READY', W.ready!, A.teal]], 298, 58); line([['FOR', W.for!], ['THIS.', W.this!]], 368, 58);
        }
      } else if (t < h5) {   // "6 RENDERS. ALL CODE." held to the dive; CREATOR MODE under it
        shade(100, 440, 0.72);
        const compact = ease.inOut(span(t, h3, h3 + 0.3), 3), k1 = spring(t - h1, 0.25, 0.5);
        c.save(); c.translate(CX, 236 - 70 * compact); const s1 = (1.3 - 0.3 * k1) * (1 - 0.45 * compact); c.scale(s1, s1); txt(c, '6 RENDERS.', 0, 0, ax(66, 118, 900), A.text, 1, 'center'); c.restore();
        if (t >= h2) {
          const k2 = spring(t - h2, 0.25, 0.5);
          c.save(); c.translate(CX, 318 - 122 * compact); const s2 = (0.7 + 0.3 * k2) * (1 - 0.45 * compact); c.scale(s2, s2); txt(c, 'ALL CODE.', 0, 0, ax(66, 118, 900), A.teal, 1, 'center'); c.restore();
          txt(c, 'BUILT IN VS CODE WITH CLAUDE OPUS 5.5', CX, 362 - 130 * compact, mono(13 - 2 * compact, 700), alpha(A.text, 0.85 * sat((t - h2) / 0.2)), 2.5, 'center');
        }
        if (t >= h3) {
          const on = t >= h4, k = spring(t - h3, 0.3, 0.6), kk = ease.out(span(t, h4, h4 + 0.12), 3);
          c.save(); c.translate(CX, 300); c.scale(k, k);
          fillRR(c, -206, -34, 412, 68, 34, 'rgba(5,8,12,0.72)'); c.strokeStyle = alpha(on ? A.teal : '#FFFFFF', on ? 0.9 : 0.2); c.lineWidth = 1.5; c.beginPath(); c.roundRect(-206, -34, 412, 68, 34); c.stroke();
          txt(c, 'CREATOR MODE', -180, 7, ax(20, 120, 900), A.text, 2, 'left');
          fillRR(c, 100, -18, 84, 36, 18, on ? A.teal : '#2A3340'); c.beginPath(); c.arc(118 + 48 * kk, 0, 14, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill();
          txt(c, on ? 'ON' : 'OFF', on ? 130 : 160, 6, mono(11, 800), on ? '#04191C' : A.dim, 1, 'center'); c.restore();
        }
        if (t >= h4) {   // the timeline caught in the window
          const lt = t - h4;
          c.save(); c.globalAlpha = 0.3; c.globalCompositeOperation = 'lighter'; c.setTransform(c.getTransform().multiply(new DOMMatrix([1, -0.08, 0.25, 1, -40, 260])));
          for (let tr = 0; tr < 4; tr++) for (let k = 0; k < 6; k++) { const w = 40 + 60 * hash(tr, k), xx = 60 + k * 86 + hash(tr, k, 2) * 20 - lt * 40; fillRR(c, xx, 160 + tr * 18, w, 12, 3, ['#3FD6E0', '#9B7BFF', '#FFB547', '#C8F31D'][tr]!); }
          c.fillStyle = '#FFB547'; c.fillRect(300, 150, 2, 84); c.restore();
        }
      } else {   // the dive: warp streaks out of the monitor, the flash onto Dubplate's slam
        const k = ease.in(sat((t - h5) / (slam - h5)), 2);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 48; i++) {
          const a = hash(i, 7) * Math.PI * 2, r0 = 50 + hash(i, 8) * 200 + k * 520, len = 40 + 260 * k;
          c.strokeStyle = `rgba(127,240,255,${0.4 * k})`; c.lineWidth = 1.3; c.beginPath(); c.moveTo(CX + Math.cos(a) * r0, 400 + Math.sin(a) * r0); c.lineTo(CX + Math.cos(a) * (r0 + len), 400 + Math.sin(a) * (r0 + len)); c.stroke();
        }
        c.restore();
        const fl = span(t, slam - e8, slam); if (fl > 0) { c.fillStyle = `rgba(232,250,252,${ease.in(fl, 2)})`; c.fillRect(0, 0, FXW, FXH); }
      }
      for (const h of H) streaks(h, 1);
      leak(h2, 1); leak(h4, -1); leak(W.ready!, -1);
      txt(c, label, FXW - 18, 1052, mono(9, 600), alpha(A.text, 0.45), 1.2, 'right');
}
