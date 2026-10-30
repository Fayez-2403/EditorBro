// Isometric SVG scenes for the Halcyon Grid solutions tabs, plus case-study thumbnails and the IR chart.
const f = (n: number) => n.toFixed(1);
const COS = Math.cos(Math.PI / 6);

interface Iso { k: number; ox: number; oy: number }
const P = (o: Iso, x: number, y: number, z: number): [number, number] => [o.ox + (x - y) * COS * o.k, o.oy + (x + y) * 0.5 * o.k - z * o.k];
const poly = (pts: [number, number][], fill: string, extra = '') =>
  `<path d="M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')} Z" fill="${fill}" ${extra}/>`;

interface BoxStyle { top: string; left: string; right: string; stroke?: string }
function box(o: Iso, x: number, y: number, z: number, w: number, d: number, h: number, s: BoxStyle, cls = '') {
  const a = P(o, x, y, z + h), b = P(o, x + w, y, z + h), c = P(o, x + w, y + d, z + h), e = P(o, x, y + d, z + h);
  const b0 = P(o, x + w, y, z), c0 = P(o, x + w, y + d, z), e0 = P(o, x, y + d, z);
  const st = s.stroke ? `stroke="${s.stroke}" stroke-width=".8" stroke-linejoin="round"` : '';
  return `<g class="${cls}">${poly([e, c, c0, e0], s.left, st)}${poly([b, c, c0, b0], s.right, st)}${poly([a, b, c, e], s.top, st)}</g>`;
}
const line = (o: Iso, pts: [number, number, number][], stroke: string, w = 1.2, extra = '') =>
  `<path d="M${pts.map(([x, y, z]) => P(o, x, y, z).map(f).join(' ')).join(' L')}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;

const CONTAINER: BoxStyle = { top: '#FAFAF6', left: '#D9E0DB', right: '#C3CEC8', stroke: '#9FB0A8' };
const DARK: BoxStyle = { top: '#3A4C57', left: '#22333D', right: '#1A2830' };

function ground(o: Iso, x: number, y: number, w: number, d: number, fill: string, gridStroke: string) {
  let s = poly([P(o, x, y, 0), P(o, x + w, y, 0), P(o, x + w, y + d, 0), P(o, x, y + d, 0)], fill);
  for (let i = 1; i < w; i += 2) s += line(o, [[x + i, y, 0], [x + i, y + d, 0]], gridStroke, 0.6);
  for (let j = 1; j < d; j += 2) s += line(o, [[x, y + j, 0], [x + w, y + j, 0]], gridStroke, 0.6);
  return s;
}

/** Utility-scale: two rows of battery containers, inverter skids and a substation tie-in. */
export function sceneUtility() {
  const o: Iso = { k: 13, ox: 250, oy: 92 };
  let s = `<svg viewBox="0 0 560 420" class="scene" aria-hidden="true">`;
  s += ground(o, -2, -3, 34, 17, '#E4E8E2', '#D3DAD3');
  const items: string[] = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 4; i++) {
      const x = i * 7.2, y = row * 4.2;
      items.push(box(o, x, y, 0, 6, 2.4, 2.6, CONTAINER, 'bx'));
      const [mx, my] = P(o, x + 0.6, y + 2.4, 1.3);
      items.push(`<g class="bx">${poly([P(o, x + 0.5, y + 2.4, 1.95), P(o, x + 5.5, y + 2.4, 1.95), P(o, x + 5.5, y + 2.4, 1.75), P(o, x + 0.5, y + 2.4, 1.75)], '#2DBE8C')}
        <circle cx="${f(mx)}" cy="${f(my)}" r="1.6" fill="#0B7A55"/></g>`);
    }
  for (let row = 0; row < 3; row++) items.push(box(o, 29, row * 4.2 + 0.3, 0, 1.8, 1.8, 2.2, DARK, 'bx'));
  s += items.join('');
  // substation gantry and line out
  const gx = 30, gy = 13.5;
  s += line(o, [[gx, gy, 0], [gx, gy, 7], [gx + 4, gy, 7], [gx + 4, gy, 0]], '#33454F', 1.6);
  s += line(o, [[gx, gy + 2, 0], [gx, gy + 2, 7], [gx + 4, gy + 2, 7], [gx + 4, gy + 2, 0]], '#33454F', 1.6);
  s += line(o, [[gx, gy, 7], [gx, gy + 2, 7]], '#33454F', 1.4) + line(o, [[gx + 4, gy, 7], [gx + 4, gy + 2, 7]], '#33454F', 1.4);
  s += box(o, gx + 1, gy + 0.3, 0, 2, 1.4, 1.8, DARK);
  const [ax, ay] = P(o, gx + 4, gy + 1, 7);
  s += `<path d="M${f(ax)} ${f(ay)} Q ${f(ax + 60)} ${f(ay + 30)} 560 ${f(ay - 10)}" fill="none" stroke="#33454F" stroke-width="1.1"/>
        <path class="flow" d="M${f(ax)} ${f(ay)} Q ${f(ax + 60)} ${f(ay + 30)} 560 ${f(ay - 10)}" fill="none" stroke="#2DBE8C" stroke-width="2.2" stroke-dasharray="6 12" stroke-linecap="round"/>`;
  s += `</svg>`;
  return s;
}

/** Commercial & industrial: a factory with rooftop solar and a bank of storage cabinets. */
export function sceneCI() {
  const o: Iso = { k: 12, ox: 250, oy: 90 };
  let s = `<svg viewBox="0 0 560 420" class="scene" aria-hidden="true">`;
  s += ground(o, -3, -3, 34, 20, '#E4E8E2', '#D3DAD3');
  s += box(o, 0, 0, 0, 18, 11, 6, { top: '#EDEFEA', left: '#CDD5CF', right: '#B7C3BC', stroke: '#9FB0A8' }, 'bx');
  // roof solar: panel grid on the roof plane
  let panels = '';
  for (let i = 0; i < 6; i++)
    for (let j = 0; j < 3; j++) {
      const x = 1 + i * 2.8, y = 1 + j * 3.2;
      panels += poly([P(o, x, y, 6.05), P(o, x + 2.4, y, 6.05), P(o, x + 2.4, y + 2.6, 6.05), P(o, x, y + 2.6, 6.05)], '#1E3A52', 'stroke="#2E5677" stroke-width=".6" class="bx"');
    }
  s += panels;
  // loading doors on the left face
  for (let i = 0; i < 3; i++) {
    const x = 3 + i * 5;
    s += poly([P(o, x, 11, 0), P(o, x + 3, 11, 0), P(o, x + 3, 11, 3.6), P(o, x, 11, 3.6)], '#8FA39A');
  }
  // storage cabinets
  for (let i = 0; i < 4; i++) {
    s += box(o, 20.5, 1 + i * 2.6, 0, 2.2, 2, 3.2, CONTAINER, 'bx');
    s += poly([P(o, 20.5, 3 + i * 2.6, 2.6), P(o, 22.7, 3 + i * 2.6, 2.6), P(o, 22.7, 3 + i * 2.6, 2.4), P(o, 20.5, 3 + i * 2.6, 2.4)], '#2DBE8C');
  }
  s += box(o, 25, 3, 0, 2.4, 3, 2.4, DARK, 'bx');
  const [ax, ay] = P(o, 22.7, 6, 1.5), [bx, by] = P(o, 18, 6, 1.5);
  s += `<path class="flow" d="M${f(ax)} ${f(ay)} L${f(bx)} ${f(by)}" stroke="#2DBE8C" stroke-width="2.2" stroke-dasharray="5 9" stroke-linecap="round"/>`;
  s += `</svg>`;
  return s;
}

/** Microgrid: an island with solar rows, one storage container, houses and a turbine. */
export function sceneMicrogrid() {
  const o: Iso = { k: 12, ox: 280, oy: 120 };
  let s = `<svg viewBox="0 0 560 420" class="scene" aria-hidden="true">
    <ellipse cx="280" cy="250" rx="262" ry="132" fill="#CFE6E4"/>
    <ellipse cx="280" cy="250" rx="236" ry="114" fill="none" stroke="#B7D8D5" stroke-width="1.2" stroke-dasharray="3 6"/>
    <ellipse cx="282" cy="236" rx="210" ry="96" fill="#E9E2CF"/><ellipse cx="286" cy="226" rx="186" ry="80" fill="#DCE6D3"/>`;
  // solar rows, tilted
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++) {
      const x = 0.5 + c * 2.6, y = 3.5 + r * 2.8;
      s += poly([P(o, x, y, 0.9), P(o, x + 2.2, y, 0.9), P(o, x + 2.2, y + 1.5, 0.2), P(o, x, y + 1.5, 0.2)], '#1E3A52', 'stroke="#2E5677" stroke-width=".6" class="bx"');
    }
  s += box(o, 15, 6.5, 0, 5, 2.2, 2.4, CONTAINER, 'bx');
  s += poly([P(o, 15.4, 8.7, 1.75), P(o, 19.6, 8.7, 1.75), P(o, 19.6, 8.7, 1.55), P(o, 15.4, 8.7, 1.55)], '#2DBE8C');
  // houses with pitched roofs
  const house = (x: number, y: number) => {
    let h = box(o, x, y, 0, 2.6, 2.2, 1.8, { top: '#F4F1E8', left: '#E2DCCD', right: '#CFC8B6' });
    const r1 = P(o, x, y + 1.1, 2.9), r2 = P(o, x + 2.6, y + 1.1, 2.9);
    h += poly([P(o, x, y + 2.2, 1.8), P(o, x + 2.6, y + 2.2, 1.8), r2, r1], '#B9573A');
    h += poly([P(o, x + 2.6, y, 1.8), P(o, x + 2.6, y + 2.2, 1.8), r2], '#9C4430');
    return `<g class="bx">${h}</g>`;
  };
  s += house(5.5, 13.2) + house(9, 12.2) + house(12.5, 13.2);
  // turbine
  const [tx, ty] = P(o, 0, 11, 0), [hx, hy] = P(o, 0, 11, 9);
  s += `<path d="M${f(tx)} ${f(ty)} L${f(hx)} ${f(hy)}" stroke="#8FA39A" stroke-width="3"/>
    <g class="rotor" style="transform-origin:${f(hx)}px ${f(hy)}px">${[0, 120, 240].map((a) => `<path d="M${f(hx)} ${f(hy)} l0 -38" stroke="#8FA39A" stroke-width="3" stroke-linecap="round" transform="rotate(${a} ${f(hx)} ${f(hy)})"/>`).join('')}<circle cx="${f(hx)}" cy="${f(hy)}" r="3.4" fill="#6E8794"/></g>`;
  // jetty
  s += poly([P(o, 21, 15.5, 0.1), P(o, 28, 15.5, 0.1), P(o, 28, 16.6, 0.1), P(o, 21, 16.6, 0.1)], '#A88E68');
  const [ax, ay] = P(o, 15, 8, 1), [bx, by] = P(o, 11, 13.2, 1);
  s += `<path class="flow" d="M${f(ax)} ${f(ay)} Q ${f((ax + bx) / 2 + 10)} ${f((ay + by) / 2 + 14)} ${f(bx)} ${f(by)}" fill="none" stroke="#2DBE8C" stroke-width="2.2" stroke-dasharray="5 9" stroke-linecap="round"/>`;
  return s + `</svg>`;
}

/** Halcyon OS: a fleet dashboard with price vs state-of-charge over a day. */
export function sceneOS() {
  const W = 560, H = 420;
  const px = (h: number) => 40 + (h / 24) * 300;
  let price = '', soc = '';
  for (let h = 0; h <= 24; h += 0.5) {
    const p = 0.45 + 0.18 * Math.cos(((h - 3) / 24) * Math.PI * 2) - 0.32 * Math.exp(-((h - 13) ** 2) / 10) + 0.42 * Math.exp(-((h - 19.5) ** 2) / 3);
    const c = 0.2 + 0.72 / (1 + Math.exp(-(h - 12) * 1.1)) - 0.74 / (1 + Math.exp(-(h - 19.8) * 1.6));
    price += `${h ? 'L' : 'M'}${f(px(h))} ${f(250 - p * 130)} `;
    soc += `${h ? 'L' : 'M'}${f(px(h))} ${f(250 - c * 130)} `;
  }
  return `<svg viewBox="0 0 ${W} ${H}" class="scene" aria-hidden="true">
    <rect x="12" y="20" width="536" height="380" rx="14" fill="#0E1A22"/>
    <rect x="12" y="20" width="536" height="46" rx="14" fill="#13232D"/><rect x="12" y="52" width="536" height="14" fill="#13232D"/>
    <circle cx="36" cy="43" r="5" fill="#2DBE8C"/><text x="50" y="48" font-family="JetBrains Mono, monospace" font-size="12" fill="#CFE3DC">HALCYON OS · FLEET · TODAY</text>
    <rect x="410" y="31" width="122" height="24" rx="12" fill="#18352C"/><text x="471" y="47" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#7CF2C3">5-MIN DISPATCH</text>
    <g stroke="#22343F" stroke-width="1">${[0, 1, 2, 3].map((i) => `<path d="M40 ${120 + i * 43} H340"/>`).join('')}</g>
    <rect x="${f(px(9.5))}" y="96" width="${f(px(16.5) - px(9.5))}" height="160" fill="#2DBE8C" opacity=".1"/>
    <rect x="${f(px(18))}" y="96" width="${f(px(22.5) - px(18))}" height="160" fill="#FFB25B" opacity=".12"/>
    <text x="${f(px(10))}" y="112" font-family="JetBrains Mono, monospace" font-size="10" fill="#7CF2C3">CHARGE</text>
    <text x="${f(px(18.3))}" y="112" font-family="JetBrains Mono, monospace" font-size="10" fill="#FFB25B">DISCHARGE</text>
    <path class="os-line" d="${price}" fill="none" stroke="#FFB25B" stroke-width="2.2"/>
    <path class="os-line" d="${soc}" fill="none" stroke="#7CF2C3" stroke-width="2.6"/>
    ${[0, 6, 12, 18, 24].map((h) => `<text x="${f(px(h) - 8)}" y="276" font-family="JetBrains Mono, monospace" font-size="10" fill="#6E8794">${String(h).padStart(2, '0')}:00</text>`).join('')}
    <g font-family="JetBrains Mono, monospace" font-size="11">
      ${[['DESERT PEAK', '412 MW', '#7CF2C3', 'DISCHARGING'], ['ISLAND GRID', '18 MW', '#7CF2C3', 'DISCHARGING'], ['COLD STORE', '4 MW', '#FFB25B', 'HOLDING'], ['RIVERBEND', '96 MW', '#9EE8FF', 'RESERVE']]
        .map(([n, v, c, st], i) => `<g transform="translate(362 ${96 + i * 44})"><rect width="168" height="36" rx="8" fill="#13232D"/><circle cx="14" cy="18" r="4" fill="${c}"/>
          <text x="26" y="15" fill="#CFE3DC">${n}</text><text x="26" y="29" fill="#6E8794" font-size="9.5">${st} · ${v}</text></g>`).join('')}
    </g>
    <g font-family="JetBrains Mono, monospace"><text x="40" y="318" font-size="10" fill="#6E8794">FLEET OUTPUT</text><text x="40" y="350" font-size="26" fill="#F3F1EA">1,284 MW</text>
    <text x="210" y="318" font-size="10" fill="#6E8794">STATE OF CHARGE</text><text x="210" y="350" font-size="26" fill="#7CF2C3">68%</text>
    <text x="380" y="318" font-size="10" fill="#6E8794">GRID FREQ.</text><text x="380" y="350" font-size="26" fill="#F3F1EA">50.01 Hz</text></g>
    <rect x="40" y="368" width="480" height="4" rx="2" fill="#22343F"/><rect x="40" y="368" width="326" height="4" rx="2" fill="#7CF2C3"/>
  </svg>`;
}

// ---------- case study thumbnails (data-led, 400 x 240) ----------
export function thumbShift() {
  let solar = 'M30 200', shifted = '';
  for (let h = 0; h <= 24; h += 0.5) {
    const x = 30 + (h / 24) * 340;
    solar += ` L${f(x)} ${f(200 - 120 * Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) ** 1.3)}`;
  }
  solar += ' L370 200 Z';
  for (let h = 17; h <= 22.5; h += 0.25) shifted += `${h === 17 ? 'M' : 'L'}${f(30 + (h / 24) * 340)} ${f(200 - 86 * Math.exp(-((h - 19.6) ** 2) / 2.2))} `;
  return `<svg viewBox="0 0 400 240" aria-hidden="true"><rect width="400" height="240" fill="#0E1A22"/>
    <g stroke="#1E313B">${[60, 100, 140, 180].map((y) => `<path d="M30 ${y} H370"/>`).join('')}</g>
    <path d="${solar}" fill="#FFB25B" opacity=".85"/>
    <path d="${shifted} L${f(30 + (22.5 / 24) * 340)} 200 L${f(30 + (17 / 24) * 340)} 200 Z" fill="#7CF2C3" opacity=".9"/>
    <path d="M200 70 C 250 40, 290 60, 300 104" fill="none" stroke="#F3F1EA" stroke-width="1.6" stroke-dasharray="3 5"/><path d="M296 98 l4 7 l5 -6" fill="none" stroke="#F3F1EA" stroke-width="1.6"/>
    <text x="30" y="226" font-family="JetBrains Mono, monospace" font-size="10" fill="#6E8794">NOON SOLAR → 7 PM PEAK</text></svg>`;
}

export function thumbIsland() {
  let s = `<svg viewBox="0 0 400 240" aria-hidden="true"><rect width="400" height="240" fill="#CFE6E4"/>`;
  for (let i = 0; i < 7; i++) {
    const rx = 170 - i * 22, ry = 92 - i * 12;
    let d = '';
    for (let a = 0; a <= 64; a++) {
      const th = (a / 64) * Math.PI * 2;
      const wob = 1 + 0.07 * Math.sin(th * 3 + i) + 0.04 * Math.sin(th * 5 - i * 0.7);
      d += `${a ? 'L' : 'M'}${f(200 + Math.cos(th) * rx * wob)} ${f(122 + Math.sin(th) * ry * wob)} `;
    }
    s += `<path d="${d}Z" fill="${i === 0 ? '#E9E2CF' : i < 3 ? '#DCE6D3' : '#C9DCC0'}" stroke="#9FBFA8" stroke-width=".8" opacity="${i ? 0.9 : 1}"/>`;
  }
  const nodes: [number, number][] = [[150, 110], [230, 98], [262, 140], [190, 150], [214, 124]];
  s += nodes.map(([x, y]) => `<path d="M214 124 L${x} ${y}" stroke="#0B7A55" stroke-width="1.6"/>`).join('');
  s += nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 4 ? 9 : 5}" fill="${i === 4 ? '#0B7A55' : '#F3F1EA'}" stroke="#0B7A55" stroke-width="2"/>`).join('');
  s += `<text x="24" y="222" font-family="JetBrains Mono, monospace" font-size="10" fill="#3C5B55">SOLAR + STORAGE · DIESEL AS BACKUP</text></svg>`;
  return s;
}

export function thumbPeak() {
  let demand = '', capped = '';
  for (let h = 0; h <= 24; h += 0.25) {
    const x = 30 + (h / 24) * 340;
    const v = 70 + 60 * Math.exp(-((h - 11) ** 2) / 8) + 50 * Math.exp(-((h - 15.5) ** 2) / 3) + 8 * Math.sin(h * 2.3);
    demand += `${h ? 'L' : 'M'}${f(x)} ${f(200 - v)} `;
    capped += `${h ? 'L' : 'M'}${f(x)} ${f(200 - Math.min(v, 118))} `;
  }
  return `<svg viewBox="0 0 400 240" aria-hidden="true"><rect width="400" height="240" fill="#F3F1EA"/>
    <g stroke="#E1DED3">${[60, 100, 140, 180].map((y) => `<path d="M30 ${y} H370"/>`).join('')}</g>
    <path d="${demand}" fill="none" stroke="#B9B3A3" stroke-width="1.6" stroke-dasharray="4 4"/>
    <path d="${capped} L370 200 L30 200 Z" fill="#7CF2C3" opacity=".35"/><path d="${capped}" fill="none" stroke="#0B7A55" stroke-width="2.4"/>
    <path d="M30 82 H370" stroke="#E8833A" stroke-width="1.4"/><text x="300" y="76" font-family="JetBrains Mono, monospace" font-size="10" fill="#B4561B">DEMAND CAP</text>
    <text x="30" y="226" font-family="JetBrains Mono, monospace" font-size="10" fill="#5D6B73">PEAK SHAVED · LINES KEEP RUNNING</text></svg>`;
}

// ---------- IR chart ----------
export const IR = [
  { fy: 'FY22', v: 0.6 },
  { fy: 'FY23', v: 1.3 },
  { fy: 'FY24', v: 2.2 },
  { fy: 'FY25', v: 3.4 },
  { fy: 'FY26', v: 4.8 },
];
export function irChart() {
  const W = 640, H = 320, L = 52, R = 600, T = 30, B = 262;
  const x = (i: number) => L + 20 + (i / (IR.length - 1)) * (R - L - 40);
  const y = (v: number) => B - (v / 5) * (B - T);
  const pts = IR.map((d, i) => [x(i), y(d.v)] as const);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x1 - x0) * 0.45;
    d += ` C${f(x0 + cx)} ${f(y0)} ${f(x1 - cx)} ${f(y1)} ${f(x1)} ${f(y1)}`;
  }
  const area = `${d} L${f(pts[pts.length - 1][0])} ${B} L${f(pts[0][0])} ${B} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" class="ir-chart" role="img" aria-label="Contracted storage capacity grew from 0.6 GWh in FY22 to 4.8 GWh in FY26 (sample data)">
    <defs><linearGradient id="irArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CF2C3" stop-opacity=".32"/><stop offset="1" stop-color="#7CF2C3" stop-opacity="0"/></linearGradient>
    <clipPath id="irClip"><rect class="ir-clip" x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
    <g font-family="JetBrains Mono, monospace" font-size="11" fill="#6E8794">
      ${[0, 1, 2, 3, 4, 5].map((v) => `<path d="M${L} ${f(y(v))} H${R}" stroke="#1F313B" stroke-width="1"/><text x="${L - 12}" y="${f(y(v) + 4)}" text-anchor="end">${v}</text>`).join('')}
      ${IR.map((p, i) => `<text x="${f(x(i))}" y="${B + 26}" text-anchor="middle">${p.fy}</text>`).join('')}
    </g>
    <path class="ir-area" d="${area}" fill="url(#irArea)" clip-path="url(#irClip)"/>
    <path class="ir-line" d="${d}" fill="none" stroke="#7CF2C3" stroke-width="3" stroke-linecap="round"/>
    ${pts.map(([px, py], i) => `<g class="ir-dot" style="transform-origin:${f(px)}px ${f(py)}px"><circle cx="${f(px)}" cy="${f(py)}" r="${i === pts.length - 1 ? 7 : 5}" fill="#0E1A22" stroke="#7CF2C3" stroke-width="2.5"/>
      <text x="${f(px)}" y="${f(py - 16)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="${i === pts.length - 1 ? '#7CF2C3' : '#CFE3DC'}">${IR[i].v.toFixed(1)}</text></g>`).join('')}
  </svg>`;
}
