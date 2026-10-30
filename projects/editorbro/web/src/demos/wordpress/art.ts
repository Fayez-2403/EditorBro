// Hero and thumbnail illustrations for Meridian Freight, drawn as SVG in code (seeded, so every load is identical).
import { mulberry32 } from './util';

export const ART_W = 1440;
export const ART_H = 800;

export interface HeroArt {
  svg: string;
  /** Anchor in art units for the HTML tracking tag. */
  hud: { x: number; y: number };
}

const f = (n: number) => n.toFixed(1);

/** Longitude lines converging above the frame: the Meridian motif, very faint. */
function meridians(cx: number, horizon: number, color: string, op: number) {
  let s = `<g fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="1.2">`;
  for (let i = 1; i <= 7; i++) {
    const rx = i * 128;
    s += `<path d="M${cx - rx} ${horizon} A${rx} ${horizon + 120} 0 0 1 ${cx + rx} ${horizon}"/>`;
  }
  s += `<path d="M${cx} ${horizon} V-200"/></g>`;
  return s;
}

function crane(x: number, h: number, base: number, fill: string) {
  const top = base - h;
  return `<g fill="${fill}">
    <rect x="${x}" y="${top}" width="4" height="${h}"/><rect x="${x + 26}" y="${top}" width="4" height="${h}"/>
    <rect x="${x - 2}" y="${f(top + h * 0.45)}" width="34" height="3"/>
    <rect x="${x - 50}" y="${top - 4}" width="104" height="5"/>
    <path d="M${x + 8} ${top - 4} L${x + 15} ${top - 26} L${x + 22} ${top - 4} Z"/>
    <path d="M${x + 15} ${top - 25} L${x - 44} ${top - 3} M${x + 15} ${top - 25} L${x + 50} ${top - 3}" stroke="${fill}" stroke-width="1.4"/>
  </g><circle cx="${x + 15}" cy="${top - 27}" r="2.4" fill="#FF8A3D"/>`;
}

function glitter(r: () => number, cx: number, y0: number, y1: number, color: string, n: number, spread: number, op: number) {
  let s = `<g fill="${color}">`;
  for (let i = 0; i < n; i++) {
    const k = Math.pow(i / n, 1.5);
    const y = y0 + k * (y1 - y0);
    const w = (14 + r() * 70) * (1 + k * 2.2);
    const x = cx + (r() - 0.5) * (spread * 0.25 + k * spread);
    s += `<rect x="${f(x - w / 2)}" y="${f(y)}" width="${f(w)}" height="${f(1.2 + k * 2.4)}" opacity="${f(op * (1 - k * 0.75) * (0.4 + r() * 0.6))}" rx="1"/>`;
  }
  return s + '</g>';
}

export function oceanArt(): HeroArt {
  const r = mulberry32(11);
  const horizon = 540;
  let s = `<svg class="art" viewBox="0 0 ${ART_W} ${ART_H}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"><defs>
  <linearGradient id="oSky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0B1B2B"/><stop offset=".5" stop-color="#16304A"/><stop offset=".78" stop-color="#46506B"/>
    <stop offset=".93" stop-color="#C47A5C"/><stop offset="1" stop-color="#F2A064"/></linearGradient>
  <linearGradient id="oSea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3A3F58"/><stop offset=".12" stop-color="#172A40"/><stop offset="1" stop-color="#07121D"/></linearGradient>
  <radialGradient id="oSun"><stop offset="0" stop-color="#FFE7C0"/><stop offset=".55" stop-color="#F8A35C"/><stop offset="1" stop-color="#F26A1F"/></radialGradient>
  <radialGradient id="oGlow"><stop offset="0" stop-color="#F7964F" stop-opacity=".55"/><stop offset="1" stop-color="#F7964F" stop-opacity="0"/></radialGradient>
  <linearGradient id="oRefl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050C14" stop-opacity=".75"/><stop offset="1" stop-color="#050C14" stop-opacity="0"/></linearGradient>
  <pattern id="oRibs" width="3.2" height="15" patternUnits="userSpaceOnUse"><rect width="1" height="15" fill="#000" opacity=".22"/></pattern>
  <clipPath id="oSkyClip"><rect width="${ART_W}" height="${horizon}"/></clipPath>
  </defs>
  <rect width="${ART_W}" height="${horizon}" fill="url(#oSky)"/>
  ${meridians(980, horizon, '#FFFFFF', 0.06)}
  <circle cx="1010" cy="${horizon}" r="360" fill="url(#oGlow)"/>
  <g clip-path="url(#oSkyClip)"><circle cx="1010" cy="${horizon + 14}" r="62" fill="url(#oSun)"/></g>`;
  // distant port, hazy
  s += `<g opacity=".9">${crane(1268, 70, horizon, '#2A3550')}${crane(1352, 86, horizon, '#2A3550')}${crane(1428, 64, horizon, '#2A3550')}
    <rect x="1160" y="${horizon - 14}" width="70" height="14" fill="#2A3550"/><rect x="1232" y="${horizon - 22}" width="30" height="22" fill="#2A3550"/></g>`;
  s += `<rect y="${horizon}" width="${ART_W}" height="${ART_H - horizon}" fill="url(#oSea)"/>`;
  s += glitter(r, 1010, horizon + 4, ART_H, '#F7A867', 110, 260, 0.75);
  s += glitter(r, 720, horizon + 10, ART_H, '#8FB3D9', 70, 1500, 0.16);
  // ship: containers first (clip group for ribs), then hull and bridge
  const deck = 566;
  const pal = ['#7A3A22', '#1E3A55', '#8C7656', '#5C2B22', '#2D5B5B', '#B4511F', '#2E4660', '#6A5A44', '#3B3F5C', '#9A4A26'];
  let stacks = '';
  let clip = '';
  let x = 650;
  for (let b = 0; b < 18; b++) {
    const mid = 1 - Math.abs(b - 8.5) / 11;
    const tiers = 2 + Math.round(mid * 3 + r() * 1.4);
    for (let t = 0; t < tiers; t++) {
      const y = deck - (t + 1) * 15;
      stacks += `<rect x="${x}" y="${y}" width="30" height="14.2" fill="${pal[Math.floor(r() * pal.length)]}"/>`;
    }
    clip += `<rect x="${x}" y="${deck - tiers * 15}" width="30" height="${tiers * 15}"/>`;
    stacks += `<rect x="${x}" y="${deck - tiers * 15}" width="30" height="1.8" fill="#F7B47A" opacity=".8"/>`;
    x += 31;
  }
  s += `<defs><clipPath id="oStackClip">${clip}</clipPath></defs>${stacks}
    <rect x="650" y="420" width="560" height="150" fill="url(#oRibs)" clip-path="url(#oStackClip)"/>`;
  // bridge and funnel
  s += `<g fill="#0A1520">
    <rect x="1222" y="470" width="70" height="98"/><rect x="1208" y="474" width="98" height="7"/>
    <rect x="1266" y="438" width="22" height="34"/></g>
    <rect x="1266" y="446" width="22" height="6" fill="#F26A1F"/>
    <g fill="#FFC98A"><rect x="1226" y="488" width="62" height="3.5" opacity=".9"/><rect x="1226" y="505" width="40" height="3" opacity=".7"/>
    <rect x="1270" y="505" width="16" height="3" opacity=".55"/><rect x="1226" y="522" width="22" height="3" opacity=".5"/><rect x="1254" y="522" width="32" height="3" opacity=".7"/></g>
    <rect x="1222" y="470" width="70" height="1.8" fill="#F7B47A" opacity=".8"/>
    <path d="M640 566 V512" stroke="#0A1520" stroke-width="3"/><circle cx="640" cy="510" r="2.6" fill="#FFD9A0"/>
    <path d="M1300 474 V430" stroke="#0A1520" stroke-width="2.5"/><circle cx="1300" cy="428" r="2.4" fill="#FF6A3D"/>`;
  // hull
  s += `<path d="M560 563 L1336 563 L1322 618 L606 618 Q578 600 560 563 Z" fill="#08121C"/>
    <path d="M596 606 L1325 606 L1322 618 L606 618 Q600 612 596 606 Z" fill="#8E3516"/>
    <rect x="560" y="563" width="776" height="1.6" fill="#F7B47A" opacity=".55"/>
    <text x="1290" y="592" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2" fill="#FFFFFF" fill-opacity=".5">MERIDIAN VEGA</text>
    <rect x="606" y="618" width="716" height="46" fill="url(#oRefl)"/>
    <path d="M556 616 q16 -6 30 2 q-14 4 -30 -2z" fill="#DCE7F2" opacity=".35"/>`;
  s += `<rect y="740" width="${ART_W}" height="60" fill="#050C14" opacity=".35"/></svg>`;
  return { svg: s, hud: { x: 1257, y: 438 } };
}

function hill(r: () => number, base: number, amp: number, fill: string) {
  const a = [r() * 6, r() * 6, r() * 6];
  let d = `M0 ${ART_H} L0 ${base}`;
  for (let x = 0; x <= ART_W; x += 16) {
    const y = base - amp * (0.55 + 0.25 * Math.sin(x * 0.0042 + a[0]) + 0.14 * Math.sin(x * 0.011 + a[1]) + 0.06 * Math.sin(x * 0.031 + a[2]));
    d += ` L${x} ${f(y)}`;
  }
  return `<path d="${d} L${ART_W} ${ART_H} Z" fill="${fill}"/>`;
}

function truck(x: number, base: number, scale: number, body: string) {
  const s = scale;
  return `<g transform="translate(${x} ${base}) scale(${s})">
    <rect x="0" y="-34" width="74" height="28" fill="${body}"/><rect x="0" y="-34" width="74" height="1.6" fill="#F3D19C" opacity=".7"/>
    <path d="M76 -26 h14 l9 10 v10 h-23z" fill="#0A1620"/><rect x="80" y="-23" width="8" height="6" fill="#FFD9A0" opacity=".8"/>
    <rect x="-2" y="-7" width="102" height="3" fill="#0A1620"/>
    <circle cx="12" cy="-2" r="4.2" fill="#05101A"/><circle cx="26" cy="-2" r="4.2" fill="#05101A"/><circle cx="88" cy="-2" r="4.2" fill="#05101A"/>
    <path d="M99 -12 L240 -30 L240 8 Z" fill="url(#rBeam)"/>
  </g>`;
}

export function roadArt(): HeroArt {
  const r = mulberry32(23);
  const horizon = 520;
  let s = `<svg class="art" viewBox="0 0 ${ART_W} ${ART_H}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"><defs>
  <linearGradient id="rSky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0C1F31"/><stop offset=".52" stop-color="#1D4358"/><stop offset=".8" stop-color="#557A80"/>
    <stop offset=".93" stop-color="#C9B48E"/><stop offset="1" stop-color="#EBCB97"/></linearGradient>
  <radialGradient id="rGlow"><stop offset="0" stop-color="#F7DDA8" stop-opacity=".6"/><stop offset="1" stop-color="#F7DDA8" stop-opacity="0"/></radialGradient>
  <linearGradient id="rRiver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2C5060"/><stop offset=".3" stop-color="#17323F"/><stop offset="1" stop-color="#0A1822"/></linearGradient>
  <linearGradient id="rBeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE6B5" stop-opacity=".55"/><stop offset="1" stop-color="#FFE6B5" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="${ART_W}" height="${ART_H}" fill="url(#rSky)"/>
  ${meridians(1150, horizon, '#FFFFFF', 0.05)}
  <circle cx="1150" cy="455" r="300" fill="url(#rGlow)"/><circle cx="1150" cy="455" r="44" fill="#FFEACB"/>`;
  s += hill(r, 468, 80, '#3E6170') + hill(r, 505, 62, '#284A5C') + hill(r, 545, 40, '#183446');
  s += `<rect y="588" width="${ART_W}" height="${ART_H - 588}" fill="url(#rRiver)"/>`;
  s += glitter(r, 1150, 592, 690, '#F0D3A0', 56, 240, 0.65);
  const deck = 540;
  // piers and their reflections
  s += `<g fill="#0A1825">${[470, 790, 1110].map((px) => `<path d="M${px} ${deck + 46} h26 l6 ${640 - deck - 46} h-38z"/>`).join('')}</g>`;
  s += `<g fill="#0A1825" opacity=".3">${[470, 790, 1110].map((px) => `<rect x="${px - 6}" y="640" width="38" height="40"/>`).join('')}</g>`;
  // deck truss below the track, so the train reads clearly on top
  s += `<g stroke="#0A1825" stroke-width="3" fill="none"><path d="M330 ${deck + 46} H1440"/>`;
  for (let tx = 330; tx < 1440; tx += 64) s += `<path d="M${tx} ${deck + 8} L${tx + 32} ${deck + 46} L${tx + 64} ${deck + 8}"/><path d="M${tx + 32} ${deck + 8} V${deck + 46}"/>`;
  s += `</g><rect x="330" y="${deck}" width="${ART_W - 330}" height="9" fill="#0A1825"/><rect x="330" y="${deck}" width="${ART_W - 330}" height="1.5" fill="#F3D19C" opacity=".45"/>`;
  // double-stack container train
  const pal = ['#B5532A', '#2E5B78', '#A18665', '#3D6E6A', '#7C3524', '#D07A2E', '#4A5D78', '#8A6F4D', '#C9A36A'];
  let x = 590;
  while (x < 1150) {
    s += `<rect x="${x}" y="${deck - 8}" width="66" height="6" fill="#0B1824"/><circle cx="${x + 10}" cy="${deck - 1.5}" r="3.2" fill="#05101A"/><circle cx="${x + 56}" cy="${deck - 1.5}" r="3.2" fill="#05101A"/>`;
    for (let c = 0; c < 2; c++) {
      for (let tier = 0; tier < 2; tier++) {
        if (tier === 1 && r() < 0.25) continue;
        const cy = deck - 8 - (tier + 1) * 20;
        s += `<rect x="${x + 2 + c * 32}" y="${cy}" width="30" height="19.4" fill="${pal[Math.floor(r() * pal.length)]}"/>`;
        s += `<rect x="${x + 2 + c * 32}" y="${cy}" width="30" height="1.5" fill="#F3D19C" opacity="${tier ? 0.8 : 0.35}"/>`;
      }
    }
    x += 70;
  }
  s += `<path d="M1156 ${deck - 50} H1236 L1262 ${deck - 30} V${deck - 2} H1156 Z" fill="#0D1B27"/>
    <path d="M1222 ${deck - 45} h14 l16 13 h-30z" fill="#FFD9A0" opacity=".9"/>
    <rect x="1156" y="${deck - 50}" width="66" height="1.6" fill="#F3D19C" opacity=".8"/>
    <rect x="1170" y="${deck - 38}" width="40" height="3" fill="#F26A1F" opacity=".85"/>
    <circle cx="1170" cy="${deck - 1.5}" r="3.4" fill="#05101A"/><circle cx="1246" cy="${deck - 1.5}" r="3.4" fill="#05101A"/>
    <path d="M1262 ${deck - 18} L1440 ${deck - 52} L1440 ${deck + 18} Z" fill="url(#rBeam)"/>`;
  // riverside road with trucks (visible on wide screens)
  s += `<rect y="700" width="${ART_W}" height="30" fill="#0A1722"/><rect y="730" width="${ART_W}" height="70" fill="#07111A"/>
    <g fill="#E9D9B5" opacity=".45">${Array.from({ length: 30 }, (_, i) => `<rect x="${i * 52}" y="714" width="26" height="2"/>`).join('')}</g>`;
  s += truck(560, 728, 0.9, '#2E5B78') + truck(940, 728, 0.9, '#B5532A');
  s += `</svg>`;
  return { svg: s, hud: { x: 1196, y: deck - 52 } };
}

/** Air scene geometry is shared with the plane animation. */
export const AIR = { cx: 1060, cy: 1180, r: 760, arc: 'M800 560 Q1040 250 1300 528' };

export function airArt(): HeroArt {
  const r = mulberry32(37);
  const { cx, cy, r: R } = AIR;
  let s = `<svg class="art" viewBox="0 0 ${ART_W} ${ART_H}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"><defs>
  <linearGradient id="aSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050D17"/><stop offset=".6" stop-color="#0A1A2B"/><stop offset="1" stop-color="#12304A"/></linearGradient>
  <radialGradient id="aGlobe" cx=".5" cy=".05" r=".9"><stop offset="0" stop-color="#1D3E5E"/><stop offset=".35" stop-color="#10253A"/><stop offset="1" stop-color="#07121D"/></radialGradient>
  <linearGradient id="aArc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F26A1F" stop-opacity=".2"/><stop offset="1" stop-color="#FF9A55"/></linearGradient>
  <clipPath id="aClip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs>
  <rect width="${ART_W}" height="${ART_H}" fill="url(#aSky)"/>`;
  s += '<g fill="#DCE8F5">';
  for (let i = 0; i < 170; i++) {
    const x = r() * ART_W, y = r() * 620;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.5 + r() * 1.2)}" opacity="${f(0.15 + r() * 0.6)}"/>`;
  }
  s += '</g>';
  for (let k = 0; k < 4; k++) s += `<circle cx="${cx}" cy="${cy}" r="${R + 6 + k * 9}" fill="none" stroke="#4F86B5" stroke-opacity="${f(0.22 - k * 0.05)}" stroke-width="${10 - k * 2}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#aGlobe)"/><g clip-path="url(#aClip)" fill="none" stroke="#7FB0DA">`;
  for (let i = -6; i <= 6; i++) {
    const rx = Math.abs(Math.sin((i * Math.PI) / 14)) * R;
    s += i === 0 ? `<path d="M${cx} ${cy - R} V${cy}" stroke-opacity=".16"/>` : `<ellipse cx="${cx}" cy="${cy}" rx="${f(rx)}" ry="${R}" stroke-opacity=".13"/>`;
  }
  for (const lat of [8, 20, 32, 44, 56, 68]) {
    const y = cy - R * Math.sin((lat * Math.PI) / 180), hw = R * Math.cos((lat * Math.PI) / 180);
    s += `<ellipse cx="${cx}" cy="${f(y)}" rx="${f(hw)}" ry="${f(hw * 0.09)}" stroke-opacity=".11"/>`;
  }
  s += '</g><g fill="#F7A867" clip-path="url(#aClip)">';
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.5, d = R * (0.86 + r() * 0.13);
    s += `<circle cx="${f(cx + Math.cos(a) * d)}" cy="${f(cy + Math.sin(a) * d)}" r="${f(0.8 + r() * 1.3)}" opacity="${f(0.2 + r() * 0.5)}"/>`;
  }
  s += `</g>
  <path d="M960 650 Q1180 420 1395 600" fill="none" stroke="#F26A1F" stroke-opacity=".35" stroke-width="1.6" stroke-dasharray="3 7"/>
  <path d="M880 700 Q1000 560 1180 690" fill="none" stroke="#F26A1F" stroke-opacity=".3" stroke-width="1.4" stroke-dasharray="3 7"/>
  <path class="air-route" d="${AIR.arc}" fill="none" stroke="#F7A867" stroke-opacity=".35" stroke-width="1.8" stroke-dasharray="3 7"/>
  <path class="air-trail" d="${AIR.arc}" fill="none" stroke="url(#aArc)" stroke-width="3" stroke-linecap="round"/>
  ${[[800, 560], [1300, 528], [960, 650], [1395, 600], [880, 700], [1180, 690]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i < 2 ? 12 : 8}" fill="#F26A1F" opacity=".22"/><circle cx="${x}" cy="${y}" r="${i < 2 ? 4.5 : 3}" fill="#FFB27A"/>`)
    .join('')}
  <g class="air-plane"><path transform="translate(-18 -18) scale(1.5)" fill="#FFFFFF" d="M12 2.5c.9 0 1.5.9 1.5 2v5l7.5 4.5v2l-7.5-2.2V19l2.5 1.8V22L12 21l-4 1v-1.2l2.5-1.8v-5.2L3 16v-2l7.5-4.5v-5c0-1.1.6-2 1.5-2z"/></g>
  </svg>`;
  return { svg: s, hud: { x: 1300, y: 528 } };
}

// ---------- news thumbnails (400 x 250) ----------
export function thumbCalendar() {
  const r = mulberry32(5);
  let s = `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="250" fill="#132A40"/>`;
  s += `<text x="28" y="44" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2" fill="#9FB4C8">PEAK 2026 · BOOKING WINDOW</text>`;
  for (let w = 0; w < 6; w++)
    for (let d = 0; d < 7; d++) {
      const x = 28 + d * 50, y = 64 + w * 28;
      const hot = w >= 2 && w <= 3 && d > 0 && d < 6;
      const booked = !hot && r() < 0.3;
      s += `<rect x="${x}" y="${y}" width="44" height="22" rx="3" fill="${hot ? '#F26A1F' : booked ? '#2C5A7A' : '#1B3853'}"/>`;
    }
  s += `<path d="M228 120 l18 -26" stroke="#F5F2EC" stroke-width="2"/><rect x="246" y="78" width="126" height="26" rx="3" fill="#F5F2EC"/>
    <text x="256" y="95" font-family="IBM Plex Mono, monospace" font-size="11" fill="#0B1B2B">BOOK 6 WKS OUT</text></svg>`;
  return s;
}

export function thumbReefer() {
  let s = `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="250" fill="#E9E3D6"/>
  <rect x="34" y="70" width="230" height="120" fill="#F5F2EC" stroke="#0B1B2B" stroke-width="2"/>`;
  for (let i = 0; i < 22; i++) s += `<rect x="${42 + i * 10}" y="78" width="4" height="104" fill="#D9D2C3"/>`;
  s += `<rect x="234" y="78" width="22" height="104" fill="#0B1B2B"/><rect x="238" y="90" width="14" height="10" fill="#7FD1C0"/>
  <rect x="28" y="190" width="242" height="8" fill="#0B1B2B"/>
  <rect x="288" y="56" width="88" height="140" rx="6" fill="#0B1B2B"/>
  <text x="300" y="82" font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="1.5" fill="#9FB4C8">SETPOINT</text>
  <text x="300" y="116" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="34" fill="#F5F2EC">4.2°C</text>
  <path d="M300 160 h64" stroke="#2C5A7A" stroke-width="16" opacity=".6"/>
  <path d="M300 162 q8 -6 16 0 t16 -2 t16 3 t16 -2" fill="none" stroke="#F26A1F" stroke-width="2"/>
  <text x="300" y="186" font-family="IBM Plex Mono, monospace" font-size="9" fill="#9FB4C8">2–8 °C BAND</text></svg>`;
  return s;
}

export function thumbTower() {
  const r = mulberry32(9);
  let s = `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="250" fill="#0B1B2B"/>`;
  s += meridians(200, 260, '#7FB0DA', 0.12);
  for (let i = 0; i < 5; i++) {
    const x1 = 30 + r() * 140, y1 = 150 + r() * 80, x2 = 220 + r() * 150, y2 = 130 + r() * 90;
    s += `<path d="M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2)} ${f(Math.min(y1, y2) - 70 - r() * 40)} ${f(x2)} ${f(y2)}" fill="none" stroke="#F26A1F" stroke-opacity="${f(0.45 + r() * 0.5)}" stroke-width="1.6"/>
      <circle cx="${f(x1)}" cy="${f(y1)}" r="3" fill="#FFB27A"/><circle cx="${f(x2)}" cy="${f(y2)}" r="3" fill="#FFB27A"/>`;
  }
  s += `<rect x="24" y="24" width="150" height="58" rx="4" fill="#132A40" stroke="#2C5A7A"/>
    <text x="36" y="46" font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="1.5" fill="#9FB4C8">LIVE SHIPMENTS</text>
    <text x="36" y="72" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="24" fill="#F5F2EC">3,418</text>
    <rect x="120" y="58" width="44" height="14" rx="7" fill="#1E5B45"/><text x="129" y="68.5" font-family="IBM Plex Mono, monospace" font-size="9" fill="#9BE3C4">98.7%</text></svg>`;
  return s;
}
