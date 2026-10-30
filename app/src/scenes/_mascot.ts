// The Motion Flex mascot (user, 2026-10-20): Claude Code's pixel creature (the user's reference icon: a 12 x 8 body, two
// side arms, four legs, two eye slots, Claude orange), built as voxels and walked in full 3D across the top band of the
// whole reel, in black pixel "thug life" shades. It loops in depth (away, a turn, toward the camera), always facing
// where it walks, so it is seen front, three-quarter, side and back; its legs step in diagonal pairs on every eighth of
// the song's measured grid. On every bar's downbeat it turns to the camera, swings both arms up into a flex, puffs up,
// and an orange aura flares (glow, rising wisps, a shock ring): aura farming. Every other flex a BUILT BY CLAUDE tag
// pops beside it. A pure function of the grid position u. (Claude Code's mark is Anthropic's; used here as the subject.)
const ORANGE = '#D97757', SHADE = '#000000', GLINT = '#FFFFFF', INK = '#0E1116', LIME = '#C8F25A', EYE = '#FFFFFF';
const U = 7;                                    // px per voxel at the band's middle depth (v3: bigger, clearer)
const F = 900, CY = 100, CAM_H = 81;            // pinhole: focal length, horizon line, camera height (px)
const RX = 180, RZ = 90, TURN_PER_BAR = 1.2;    // the walk: an ellipse in depth (shallow, so it never gets small), radians per walk

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const outBack = (x: number, s = 1.9) => { const k = x - 1; return 1 + (s + 1) * k * k * k + s * k * k; };
const hash = (i: number, j: number) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
const mix = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.round(Math.max(0, Math.min(255, v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

type V3 = [number, number, number];
type Box = { a: V3; b: V3; col: string; part: 'body' | 'armL' | 'armR' | 'leg0' | 'leg1' | 'leg2' | 'leg3' | 'face' };

/** The model in voxel units: x -8..8 (width), y 0..10 (feet to top), z -3..3 (front is -z, toward the camera). */
const MODEL: Box[] = [
  { a: [-6, 2, -3], b: [6, 10, 3], col: ORANGE, part: 'body' },
  { a: [-8, 4, -1], b: [-6, 6, 1], col: ORANGE, part: 'armL' },
  { a: [6, 4, -1], b: [8, 6, 1], col: ORANGE, part: 'armR' },
  // four legs: the outer pair in front, the inner pair behind (from the front it is the icon's row of four)
  { a: [-5, 0, -2.5], b: [-4, 2, -0.5], col: ORANGE, part: 'leg0' },
  { a: [-3, 0, 0.5], b: [-2, 2, 2.5], col: ORANGE, part: 'leg1' },
  { a: [2, 0, 0.5], b: [3, 2, 2.5], col: ORANGE, part: 'leg2' },
  { a: [4, 0, -2.5], b: [5, 2, -0.5], col: ORANGE, part: 'leg3' },
  // the eye slots (white, as in the icon), just proud of the front face
  { a: [-4, 6, -3.06], b: [-3, 8, -3.02], col: EYE, part: 'face' },
  { a: [3, 6, -3.06], b: [4, 8, -3.02], col: EYE, part: 'face' },
  // the thug-life shades: a bar and two stepped pixel lenses over the eyes, a glint on each
  { a: [-5.5, 7.4, -3.3], b: [5.5, 8.1, -3.08], col: SHADE, part: 'face' },
  { a: [-5, 6.6, -3.3], b: [-2, 7.4, -3.08], col: SHADE, part: 'face' },
  { a: [-4.6, 5.9, -3.3], b: [-2.4, 6.6, -3.08], col: SHADE, part: 'face' },
  { a: [2, 6.6, -3.3], b: [5, 7.4, -3.08], col: SHADE, part: 'face' },
  { a: [2.4, 5.9, -3.3], b: [4.6, 6.6, -3.08], col: SHADE, part: 'face' },
  { a: [-4.6, 7.5, -3.36], b: [-4.0, 7.9, -3.3], col: GLINT, part: 'face' },
  { a: [2.4, 7.5, -3.36], b: [3.0, 7.9, -3.3], col: GLINT, part: 'face' },
];
const LIGHT: V3 = (() => { const v: V3 = [-0.45, 0.75, -0.5]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; })();

/** The bot at grid position u (fractional eighths of the variant). Draws in the 608 x 1080 column. */
export function drawMascot(c: CanvasRenderingContext2D, u: number, t: number) {
  const bar = Math.floor(u / 8), e = u - bar * 8, move = ((bar % 4) + 4) % 4;
  // v3 (user: "more clear", "good dance moves"): a 4-bar routine, every move on the song's eighths
  //   0 FLEX + AURA, then walk   1 ARM PUMP in place   2 SPIN HOP, then walk   3 SHUFFLE + RAISE THE ROOF
  const beat = (k: number) => Math.exp(-((e - k) ** 2) / 0.02);                   // a pulse on eighth k
  const onE = e - Math.floor(e), pulse = Math.exp(-onE * 6);                       // decays after every eighth
  const walksBefore = Math.floor(bar / 4) * 2 + (move > 0 ? 1 : 0) + (move > 2 ? 1 : 0);
  const walkBar = move === 0 || move === 2, walking = walkBar && e >= 2, w = clamp((e - 2) / 6);
  const phi = (walksBefore + (walking ? w : 0)) * TURN_PER_BAR;
  const px0 = RX * Math.sin(phi), pz = RZ * Math.cos(phi);
  const dx = RX * Math.cos(phi), dz = -RZ * Math.sin(phi);
  const pathYaw = Math.atan2(-dx, -dz);
  // how much it faces us (dance and flex face the camera; the walk faces along the path)
  const front = walkBar ? (e < 2 ? clamp(outBack(clamp(e / 0.5))) * (1 - clamp((e - 1.45) / 0.55)) : 0)
    : clamp(e / 0.4) * (1 - clamp((e - 7.5) / 0.5));
  let yaw = Math.atan2(Math.sin(pathYaw) * (1 - front), Math.cos(pathYaw) * (1 - front) + front);
  let armL = 0, armR = 0, jump = 0, roll = 0, squash = 0, side = 0, flex = 0;
  const kick = [0, 0, 0, 0];
  if (move === 0) {                                     // the flex: both arms up, a puff, the aura
    flex = front; armL = armR = front;
  } else if (move === 1) {                              // arm pump: one arm up per eighth, alternating, lean into it
    const k = Math.floor(e), up = clamp(1 - onE * 1.6);
    if (k % 2 === 0) armL = up; else armR = up;
    roll = (k % 2 === 0 ? 1 : -1) * 0.12 * up;
    squash = 0.12 * pulse; yaw += Math.sin(Math.PI * e / 2) * 0.25;
    if (e > 6) { armL = armR = clamp((e - 6) / 0.4); flex = armL * 0.6; }
  } else if (move === 2) {                              // spin hop: up, a full turn in the air, a squash landing
    const h = clamp(e / 2);
    jump = e < 2 ? Math.sin(Math.PI * h) * 3.2 : 0;
    yaw += e < 2 ? 2 * Math.PI * (h * h * (3 - 2 * h)) : 0;
    squash = 0.22 * beat(2) - (e < 2 ? 0.08 * Math.sin(Math.PI * h) : 0);
    armL = armR = e < 2 ? 0.7 * Math.sin(Math.PI * h) : 0;
  } else {                                              // shuffle + raise the roof
    const k = Math.floor(e);
    side = Math.sin(Math.PI * e / 2) * 2.2;              // slides a voxel or two each way, in time
    roll = -Math.cos(Math.PI * e / 2) * 0.08;
    kick[k % 4] = clamp(1 - onE * 1.8);                  // legs kick in turn
    const roof = k % 2 === 0 ? clamp(1 - onE * 1.4) : 0; // both arms punch up on the on-beats
    armL = armR = roof; squash = 0.1 * pulse;
    if (e > 6.5) { flex = clamp((e - 6.5) / 0.4); armL = armR = Math.max(armL, flex); }
  }
  const step = walking ? Math.sin(Math.PI * (e - 2)) : 0;                         // one step per eighth
  const bob = (walking ? Math.abs(step) * 0.5 : 0) + jump;
  const puff = 1 + 0.08 * flex;
  const px = px0 + side * U * Math.cos(yaw);

  // a model point -> world (px): legs step or kick, arms rise, body squashes, leans and turns, placed on the path
  const place = (p: V3, part: Box['part']): V3 => {
    let [x, y, z] = p;
    if (part.startsWith('leg')) {
      const k = +part[3]!, pair = k === 0 || k === 2 ? 1 : -1;                      // diagonal pairs alternate
      const s = step * pair;
      y += Math.max(0, s) * 0.9 + kick[k]! * 1.2; z += s * 0.7 - kick[k]! * 1.0;
      y += jump;
    } else {
      if (part === 'armL' || part === 'armR') {
        // an arm rises outside the body into a tall raised block (like the icon flexing): y 4..6 at rest -> y 6..10.5
        const sd = part === 'armR' ? 1 : -1, a = part === 'armR' ? armR : armL;
        const yf = 6 + (y - 4) * 2.25, xf = x + sd * (0.8 + 0.35 * (y - 4));
        x = x + (xf - x) * a; y = y + (yf - y) * a;
        z += (walking ? -step * sd * 0.4 : 0);
      }
      x *= puff * (1 + 0.6 * squash); y = 2 + (y - 2) * (1 + 0.04 * flex - squash);
      // the lean (roll) about the feet
      const rx = x * Math.cos(roll) - (y - 2) * Math.sin(roll), ry = 2 + x * Math.sin(roll) + (y - 2) * Math.cos(roll);
      x = rx; y = ry + bob;
    }
    const X = (x * Math.cos(yaw) + z * Math.sin(yaw)) * U, Z = (-x * Math.sin(yaw) + z * Math.cos(yaw)) * U;
    return [px + X, y * U, pz + Z];
  };
  const proj = (p: V3): [number, number, number] => { const s = F / (F + p[2]); return [304 + p[0] * s, CY - (p[1] - CAM_H) * s, s]; };

  // ---- the aura (behind it): always a faint glow, flaring on the flex
  const g0 = proj([px, 5 * U, pz]), sc = g0[2];
  const aura = 0.16 + 0.84 * flex;   // flex is set by the routine
  c.save();
  c.globalCompositeOperation = 'lighter';
  const rg = c.createRadialGradient(g0[0], g0[1], 4, g0[0], g0[1], 95 * sc);
  rg.addColorStop(0, `rgba(217,119,87,${0.55 * aura})`); rg.addColorStop(0.5, `rgba(217,119,87,${0.18 * aura})`); rg.addColorStop(1, 'rgba(217,119,87,0)');
  c.fillStyle = rg; c.fillRect(g0[0] - 100 * sc, g0[1] - 100 * sc, 200 * sc, 200 * sc);
  if (flex > 0.02) {
    // light rays fanning out behind it, turning slowly
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + u * 0.05, r0 = 30 * sc, r1 = (75 + 25 * hash(i, 3)) * sc * flex;
      c.fillStyle = `rgba(255,190,150,${0.16 * flex})`;
      c.beginPath(); c.moveTo(g0[0] + Math.cos(a - 0.06) * r0, g0[1] + Math.sin(a - 0.06) * r0);
      c.lineTo(g0[0] + Math.cos(a) * r1, g0[1] + Math.sin(a) * r1); c.lineTo(g0[0] + Math.cos(a + 0.06) * r0, g0[1] + Math.sin(a + 0.06) * r0); c.fill();
    }
    // rising wisps
    for (let i = 0; i < 14; i++) {
      const ph = (e * 0.9 + hash(i, 1)) % 1, ang = hash(i, 2) * Math.PI * 2;
      const wx = g0[0] + Math.cos(ang) * (34 + 14 * hash(i, 4)) * sc, wy = g0[1] + 26 * sc - ph * 80 * sc;
      c.fillStyle = `rgba(255,170,120,${0.7 * flex * (1 - ph)})`;
      c.fillRect(wx - 1.5 * sc, wy - 1.5 * sc, 3 * sc, 3 * sc);   // pixel sparks, to match the voxels
    }
  }
  c.restore();
  // the shock ring on the ground when it lands the flex, and its shadow
  const ground = proj([px, 0, pz]);
  if (e < 1.2) {
    const k = clamp(e / 1.2);
    c.strokeStyle = `rgba(217,119,87,${0.7 * (1 - k)})`; c.lineWidth = 2;
    c.beginPath(); c.ellipse(ground[0], ground[1], (30 + 70 * k) * sc, (6 + 13 * k) * sc, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(ground[0], ground[1], 44 * sc, 8 * sc, 0, 0, Math.PI * 2); c.fill();

  // ---- the voxels: every visible face, far to near, lit
  const cam: V3 = [0, CAM_H, -F];
  const faces: { pts: [number, number][]; d: number; col: string }[] = [];
  for (const bx of MODEL) {
    const [a, b] = [bx.a, bx.b];
    const corner = (i: number): V3 => [i & 1 ? b[0] : a[0], i & 2 ? b[1] : a[1], i & 4 ? b[2] : a[2]];
    const W = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => place(corner(i), bx.part));
    // faces by corner index: -x, +x, -y, +y, -z, +z
    for (const q of [[0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6], [0, 1, 3, 2], [4, 6, 7, 5]]) {
      const P = q.map((i) => W[i]!);
      const u1 = [P[1]![0] - P[0]![0], P[1]![1] - P[0]![1], P[1]![2] - P[0]![2]], v1 = [P[3]![0] - P[0]![0], P[3]![1] - P[0]![1], P[3]![2] - P[0]![2]];
      let n: V3 = [u1[1]! * v1[2]! - u1[2]! * v1[1]!, u1[2]! * v1[0]! - u1[0]! * v1[2]!, u1[0]! * v1[1]! - u1[1]! * v1[0]!];
      const ctr: V3 = [(P[0]![0] + P[2]![0]) / 2, (P[0]![1] + P[2]![1]) / 2, (P[0]![2] + P[2]![2]) / 2];
      // make the normal point out of the box
      const mid = place([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], bx.part);
      if ((ctr[0] - mid[0]) * n[0] + (ctr[1] - mid[1]) * n[1] + (ctr[2] - mid[2]) * n[2] < 0) n = [-n[0], -n[1], -n[2]];
      if ((cam[0] - ctr[0]) * n[0] + (cam[1] - ctr[1]) * n[1] + (cam[2] - ctr[2]) * n[2] <= 0) continue;   // facing away
      const l = Math.hypot(...n) || 1, lit = Math.max(0, (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / l);
      const k = bx.col === EYE || bx.col === GLINT ? 1 : 0.5 + 0.72 * lit;
      faces.push({ pts: P.map((p) => { const s = proj(p); return [s[0], s[1]] as [number, number]; }), d: Math.hypot(ctr[0] - cam[0], ctr[1] - cam[1], ctr[2] - cam[2]), col: mix(bx.col, k) });
    }
  }
  faces.sort((p, q) => q.d - p.d);
  for (const f of faces) {
    c.fillStyle = f.col; c.beginPath(); c.moveTo(f.pts[0]![0], f.pts[0]![1]); for (const p of f.pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(20,10,6,0.55)'; c.lineWidth = 1.3; c.lineJoin = 'round'; c.stroke();
  }

  // ---- BUILT BY CLAUDE, beside it on every other flex (inside the frame, on the side it has room)
  if (bar % 2 === 0 && e < 3) {
    const k = clamp(outBack(clamp(e / 0.35), 2.2)) * (1 - clamp((e - 2.4) / 0.6));
    if (k > 0.01) {
      const x = ground[0], left = x > 304, label = 'BUILT BY CLAUDE';
      c.save(); c.font = '700 12px "Plex-600", monospace';
      const tw = c.measureText(label).width + 22, bx = left ? x - 60 * sc - tw : x + 60 * sc, by = CY - 2;
      c.globalAlpha *= Math.min(1, k * 2); c.translate(bx + tw / 2, by + 13); c.scale(k, k); c.translate(-(bx + tw / 2), -(by + 13));
      c.fillStyle = INK; c.strokeStyle = LIME; c.lineWidth = 1.5; c.beginPath(); c.roundRect(bx, by, tw, 26, 13); c.fill(); c.stroke();
      c.fillStyle = LIME; c.textBaseline = 'middle'; c.fillText(label, bx + 11, by + 13.5);
      c.restore();
    }
  }
  void t;
}
