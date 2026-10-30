// Dashr city map: a night-mode city drawn in SVG from a seeded generator. Street grid, river with bridges,
// parks, landmarks and district labels. The courier route runs along the street centrelines.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();
export const WORLD = { w: 1110, h: 1420 };
const NX = 8, NY = 13;
export const SX = (i: number) => 33 + i * 134;
export const SY = (j: number) => 33 + j * 104;
const AVE_X = new Set([3, 6]), AVE_Y = new Set([4, 9]);
const hwX = (i: number) => (AVE_X.has(i) ? 11 : 7);
const hwY = (j: number) => (AVE_Y.has(j) ? 11 : 7);

// river: two cubic segments
type P = [number, number];
const RIVER: P[][] = [
  [[-560, 520], [-360, 560], [-220, 720], [-60, 610]],
  [[-60, 610], [200, 470], [400, 740], [610, 650]],
  [[610, 650], [800, 570], [930, 720], [1170, 700]],
  [[1170, 700], [1320, 690], [1420, 560], [1660, 620]],
];
const RIVER_HW = 40;
const cubic = (s: P[], t: number): P => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * s[0][k] + 3 * u * u * t * s[1][k] + 3 * u * t * t * s[2][k] + t * t * t * s[3][k]) as P;
};
const riverPts: P[] = RIVER.flatMap((s) => Array.from({ length: 120 }, (_, i) => cubic(s, i / 119)));
const riverDist = (x: number, y: number) => {
  let m = Infinity;
  for (const [px, py] of riverPts) m = Math.min(m, Math.hypot(px - x, py - y));
  return m;
};
const riverD = `M${RIVER[0][0].map(f).join(' ')} ${RIVER.map((s) => `C${s.slice(1).map((p) => p.map(f).join(' ')).join(' ')}`).join(' ')}`;

// route along street centrelines (pickup -> drop)
export const ROUTE_PTS: P[] = [[SX(1), SY(2)], [SX(3), SY(2)], [SX(3), SY(9)], [SX(6), SY(9)], [SX(6), SY(10)], [904, SY(10)]];
export const PICKUP = ROUTE_PTS[0];
export const DROP = ROUTE_PTS[ROUTE_PTS.length - 1];
export const GEOFENCE = 170;

export function roundedPath(pts: P[], r = 22) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
    const r1 = Math.min(r, l1 / 2, l2 / 2);
    const p1: P = [bx - ((bx - ax) / l1) * r1, by - ((by - ay) / l1) * r1];
    const p2: P = [bx + ((cx - bx) / l2) * r1, by + ((cy - by) / l2) * r1];
    d += ` L${f(p1[0])} ${f(p1[1])} Q${bx} ${by} ${f(p2[0])} ${f(p2[1])}`;
  }
  const e = pts[pts.length - 1];
  return `${d} L${e[0]} ${e[1]}`;
}
export const ROUTE_D = roundedPath(ROUTE_PTS);

const C = {
  land: '#0f1319', block: '#151a22', bldg: '#1a2029', bldgHi: '#202733', street: '#1f2630', ave: '#283140',
  water: '#0d2433', waterHi: '#14405a', park: '#11281d', tree: '#17402b', label: '#4a5566', bridge: '#2b3442',
};

const PARKS = new Set(['5,1', '5,2', '0,11', '1,11']);
const STADIUM = ['1,8', '2,8'];
const MARKET = '6,3';

export function buildCity(): string {
  const rnd = mulberry32(2026);
  const out: string[] = [];
  out.push(`<rect x="-700" y="-700" width="${WORLD.w + 1400}" height="${WORLD.h + 1400}" fill="${C.land}"/>`);
  // streets (under everything else)
  for (let i = -3; i <= NX + 3; i++) out.push(`<path d="M${SX(i)} -600 V${WORLD.h + 600}" stroke="${AVE_X.has(i) ? C.ave : C.street}" stroke-width="${hwX(i) * 2}"/>`);
  for (let j = -5; j <= NY + 5; j++) out.push(`<path d="M-600 ${SY(j)} H${WORLD.w + 600}" stroke="${AVE_Y.has(j) ? C.ave : C.street}" stroke-width="${hwY(j) * 2}"/>`);
  // diagonal boulevard in the north-east
  out.push(`<path d="M560 -40 L1150 420" stroke="${C.ave}" stroke-width="20"/>`);
  // blocks
  const blocks: string[] = [], parks: string[] = [], trees: string[] = [];
  for (let i = -3; i < NX + 3; i++) for (let j = -5; j < NY + 5; j++) {
    const x0 = SX(i) + hwX(i), x1 = SX(i + 1) - hwX(i + 1), y0 = SY(j) + hwY(j), y1 = SY(j + 1) - hwY(j + 1);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const key = `${i},${j}`;
    const near = riverDist(cx, cy);
    if (near < RIVER_HW + 58) {
      if (near > RIVER_HW + 6) { parks.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="8" fill="${C.park}"/>`); for (let k = 0; k < 9; k++) trees.push(`<circle cx="${f(x0 + 8 + rnd() * (x1 - x0 - 16))}" cy="${f(y0 + 8 + rnd() * (y1 - y0 - 16))}" r="${f(4 + rnd() * 5)}" fill="${C.tree}"/>`); }
      continue;
    }
    // the diagonal boulevard cuts these
    const dDiag = Math.abs((1150 - 560) * (-40 - cy) - (560 - cx) * (420 + 40)) / Math.hypot(590, 460);
    if (dDiag < 60) { blocks.push(`<path d="M${x0} ${y0} H${x1} V${y1} H${x0}Z" fill="${C.block}" opacity=".7"/>`); continue; }
    if (PARKS.has(key)) {
      parks.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="10" fill="${C.park}"/>`);
      parks.push(`<path d="M${x0 + 10} ${cy + 10} C${cx - 20} ${y0 + 10} ${cx + 20} ${y1 - 10} ${x1 - 10} ${cy - 8}" stroke="#1a3a2a" stroke-width="4" fill="none"/>`);
      for (let k = 0; k < 16; k++) trees.push(`<circle cx="${f(x0 + 8 + rnd() * (x1 - x0 - 16))}" cy="${f(y0 + 8 + rnd() * (y1 - y0 - 16))}" r="${f(4 + rnd() * 6)}" fill="${C.tree}"/>`);
      continue;
    }
    if (STADIUM.includes(key)) {
      if (key === STADIUM[0]) {
        const sx0 = x0, sx1 = SX(3) - hwX(3), sw = sx1 - sx0;
        blocks.push(`<rect x="${sx0}" y="${y0}" width="${sw}" height="${y1 - y0}" rx="12" fill="${C.block}"/>`);
        blocks.push(`<ellipse cx="${sx0 + sw / 2}" cy="${cy}" rx="${sw / 2 - 14}" ry="${(y1 - y0) / 2 - 10}" fill="#1c232d" stroke="#283241" stroke-width="6"/>`);
        blocks.push(`<ellipse cx="${sx0 + sw / 2}" cy="${cy}" rx="${sw / 2 - 44}" ry="${(y1 - y0) / 2 - 26}" fill="#142a20" stroke="#1d3a2b" stroke-width="2"/>`);
      }
      continue;
    }
    blocks.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="6" fill="${C.block}"/>`);
    if (key === MARKET) {
      for (let a = 0; a < 5; a++) for (let b = 0; b < 3; b++) blocks.push(`<rect x="${x0 + 10 + a * 21}" y="${y0 + 10 + b * 22}" width="15" height="15" rx="2" fill="#232b37"/>`);
      continue;
    }
    // building footprints: split the block into lots
    const cols = 2 + Math.floor(rnd() * 2), rows = 2;
    const lw = (x1 - x0 - 8) / cols, lh = (y1 - y0 - 8) / rows;
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      if (rnd() < 0.12) continue;
      const bx = x0 + 4 + a * lw + 3, by = y0 + 4 + b * lh + 3, bw = lw - 6 - rnd() * 8, bh = lh - 6 - rnd() * 8;
      const hi = rnd() < 0.25;
      blocks.push(`<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" rx="2" fill="${hi ? C.bldgHi : C.bldg}"/>`);
      if (hi) blocks.push(`<rect x="${f(bx + 4)}" y="${f(by + 4)}" width="${f(bw - 8)}" height="${f(bh - 8)}" rx="1.5" fill="none" stroke="#28303c" stroke-width="1"/>`);
    }
  }
  out.push(...blocks, ...parks, ...trees);
  // river
  out.push(`<path d="${riverD}" stroke="#121c26" stroke-width="${RIVER_HW * 2 + 14}" fill="none" stroke-linecap="round"/>`);
  out.push(`<path d="${riverD}" stroke="${C.water}" stroke-width="${RIVER_HW * 2}" fill="none" stroke-linecap="round"/>`);
  out.push(`<path id="riverFlow" d="${riverD}" stroke="${C.waterHi}" stroke-width="3" fill="none" stroke-dasharray="26 34" opacity=".8"/>`);
  out.push(`<path id="riverFlow2" d="${riverD}" stroke="${C.waterHi}" stroke-width="2" fill="none" stroke-dasharray="12 60" opacity=".5" transform="translate(0 18)"/>`);
  // bridges: streets that keep going over the water
  for (const i of [1, 3, 6]) {
    const x = SX(i);
    let y = 0;
    let best = Infinity;
    for (const [px, py] of riverPts) { const d = Math.abs(px - x); if (d < best) { best = d; y = py; } }
    const w = hwX(i) * 2 + 8;
    out.push(`<rect x="${x - w / 2}" y="${f(y - RIVER_HW - 16)}" width="${w}" height="${RIVER_HW * 2 + 32}" rx="4" fill="${C.bridge}"/>`);
    out.push(`<path d="M${x - w / 2 + 2} ${f(y - RIVER_HW - 12)} V${f(y + RIVER_HW + 12)} M${x + w / 2 - 2} ${f(y - RIVER_HW - 12)} V${f(y + RIVER_HW + 12)}" stroke="#3a4555" stroke-width="2"/>`);
  }
  // landmarks
  const ct: P = [SX(2) - 6, SY(6) + 52];
  out.push(`<g transform="translate(${ct[0]} ${ct[1]})"><circle r="16" fill="#1d2430" stroke="#3a4555" stroke-width="2"/><path d="M0 -8 V0 L6 4" stroke="#8b97a8" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`);
  // labels
  const label = (x: number, y: number, s: string, size = 15, rot = 0, fill = C.label, ls = 0.32) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" letter-spacing="${ls}em" text-anchor="middle" transform="rotate(${rot} ${x} ${y})" class="mlabel">${s}</text>`;
  out.push(label(240, 170, 'OLD QUARTER', 17));
  out.push(label(780, 430, 'MILL DISTRICT', 17));
  out.push(label(640, 1020, 'RIVERSIDE HEIGHTS', 17));
  out.push(label(235, 1240, 'GREENWAY', 17));
  out.push(label(170, 560, 'River Neela', 15, -24, '#2c6a8a', 0.12));
  out.push(label(870, 650, 'River Neela', 15, 14, '#2c6a8a', 0.12));
  out.push(label(SX(3) + 18, 820, 'Indigo Avenue', 11, 90, '#3f4a5a', 0.14));
  out.push(label(640, SY(4) - 16, 'Canal Road', 11, 0, '#3f4a5a', 0.14));
  out.push(label(300, SY(9) - 16, 'Harbour Street', 11, 0, '#3f4a5a', 0.14));
  out.push(label(SX(1) + (SX(3) - SX(1)) / 2, SY(8) + 52, 'City Stadium', 12, 0, '#55627a', 0.1));
  out.push(label(ct[0], ct[1] + 32, 'Clock Tower', 11, 0, '#55627a', 0.1));
  out.push(label(SX(6) + 67, SY(3) + 104, 'Central Market', 11, 0, '#55627a', 0.1));
  out.push(label(SX(5) + 67, SY(1) - 12, 'Lotus Garden', 11, 0, '#3d7a58', 0.1));
  out.push(label(860, 210, 'Foundry Boulevard', 11, 38, '#3f4a5a', 0.14));
  return out.join('');
}

// ambient traffic: a few cars running the grid, positions are pure functions of t
export const TRAFFIC = Array.from({ length: 14 }, (_, k) => {
  const r = mulberry32(400 + k);
  const vertical = r() < 0.5;
  const line = vertical ? SX(Math.floor(r() * (NX + 1))) : SY(Math.floor(r() * (NY + 1)));
  return { vertical, line, speed: 40 + r() * 70, off: r() * 2000, dir: r() < 0.5 ? 1 : -1, lane: (r() < 0.5 ? -3 : 3) };
});
