// Dashr brand marks, icons and illustrations (all hand-built SVG).
export const logo = (s = 32) => `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#c8f542"/><path d="M11 12h10.5a8 8 0 0 1 0 16H11" fill="none" stroke="#0b0e13" stroke-width="4.2" stroke-linecap="round"/><path d="M6 20h10M8.5 15.5h5M8.5 24.5h5" stroke="#0b0e13" stroke-width="3" stroke-linecap="round"/></svg>`;

const ic = (d: string, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const I = {
  back: ic('<path d="M15 6 9 12l6 6"/>'),
  help: ic('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
  phone: ic('<path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>'),
  chat: ic('<path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/><path d="M8 10.5h8"/>'),
  box: ic('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
  truck: ic('<path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="16.5" cy="17" r="1.8"/>'),
  pin: ic('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  check: ic('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  near: ic('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5" stroke-dasharray="2.5 3"/>'),
  copy: ic('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  minus: ic('<path d="M5 12h14"/>'),
  target: ic('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5"/>'),
  play: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`,
  pause: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5.5" width="4" height="13" rx="1.2" fill="currentColor"/><rect x="13.5" y="5.5" width="4" height="13" rx="1.2" fill="currentColor"/></svg>`,
  replay: ic('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>'),
  star: `<svg class="ic star" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2 14.6 8.6l5.9.8-4.3 4.1 1 5.8L12 16.6l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>`,
  shield: ic('<path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
  store: ic('<path d="M4 9.5 5.5 4.5h13L20 9.5M4 9.5v10h16v-10M4 9.5h16"/><path d="M9.5 19.5v-5h5v5"/>'),
  home: ic('<path d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1z"/>'),
};

// Illustrated courier portrait (flat, geometric).
export const avatar = (s = 52) => `<svg class="avatar" width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true">
  <defs><clipPath id="avc"><circle cx="32" cy="32" r="32"/></clipPath><linearGradient id="avbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3a1a"/><stop offset="1" stop-color="#1a2412"/></linearGradient></defs>
  <g clip-path="url(#avc)">
    <rect width="64" height="64" fill="url(#avbg)"/>
    <circle cx="50" cy="12" r="18" fill="#c8f542" opacity=".12"/>
    <path d="M6 66c2-14 12-21 26-21s24 7 26 21z" fill="#1d2430"/>
    <path d="M22 47l10 9 10-9" fill="none" stroke="#c8f542" stroke-width="3" stroke-linejoin="round"/>
    <path d="M27 40h10v8l-5 4-5-4z" fill="#a8714b"/>
    <ellipse cx="20.5" cy="29" rx="2.6" ry="3.6" fill="#b47a52"/><ellipse cx="43.5" cy="29" rx="2.6" ry="3.6" fill="#b47a52"/>
    <path d="M21 26c0-8 5-13 11-13s11 5 11 13v4c0 8-5 14-11 14s-11-6-11-14z" fill="#c48a5e"/>
    <path d="M21.5 31c1 6 5 11 10.5 11S41.5 37 42.5 31c-1 3-3 5-4.5 5.5-1.5-1.6-3.5-2-6-2s-4.5.4-6 2C24.5 36 22.5 34 21.5 31z" fill="#2a1d16" opacity=".55"/>
    <path d="M20 26c-1-9 5-15 12.5-15 7 0 12 5 11.5 13-2.5-4-6.5-6-12-6-4 0-7 1.5-9 4.5z" fill="#1c1410"/>
    <path d="M26.5 26.5h3.5M34 26.5h3.5" stroke="#1c1410" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="28.2" cy="29.6" r="1.3" fill="#1c1410"/><circle cx="35.8" cy="29.6" r="1.3" fill="#1c1410"/>
    <path d="M29 36.2c1.8 1.2 4.2 1.2 6 0" stroke="#5a3322" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  </g></svg>`;

// Signature "Neha R." as one hand-written stroke set; drawn with stroke-dashoffset (pathLength = 1).
export const SIGNATURE_D = [
  'M20 84 C23 62 27 40 31 21 C36 41 45 66 55 85 C58 62 61 41 65 20',
  'C67 46 70 68 80 72 C92 76 99 61 92 56 C84 51 75 62 82 72 C88 80 100 79 109 70',
  'C115 50 121 27 125 14 C127 31 121 60 116 83 C122 65 132 56 140 60 C148 64 143 78 149 82',
  'C153 70 161 58 173 60 C162 55 150 66 154 77 C158 85 170 78 175 64 C174 73 177 81 186 80',
  'M207 83 C209 61 211 41 213 22 C231 13 254 20 247 37 C242 49 222 53 214 50 C229 60 241 74 254 85',
  'M262 82 C263 81 264 81 265 82',
  'M22 98 C92 90 172 95 296 74',
].join(' ');

export const signatureSvg = () => `<svg class="sig" viewBox="0 0 310 110" aria-hidden="true"><path id="sigPath" d="${SIGNATURE_D}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="none" stroke="#eef2f6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Photo proof: parcel left at a door (small illustration).
export const doorPhoto = () => `<svg class="door" viewBox="0 0 120 120" aria-hidden="true">
  <rect width="120" height="120" fill="#1b2029"/>
  <rect x="0" y="96" width="120" height="24" fill="#232933"/>
  <rect x="30" y="10" width="60" height="88" rx="2" fill="#2c3440"/><rect x="35" y="15" width="50" height="81" rx="1.5" fill="#3a4554"/>
  <rect x="40" y="22" width="40" height="30" rx="1.5" fill="#323c49"/><rect x="40" y="58" width="40" height="32" rx="1.5" fill="#323c49"/>
  <circle cx="76" cy="58" r="2.4" fill="#c8f542"/>
  <text x="60" y="8" font-size="7" fill="#7d8899" text-anchor="middle" font-family="sans-serif">1204</text>
  <rect x="14" y="98" width="64" height="8" rx="2" fill="#3b2f25"/>
  <path d="M22 78h34v22H22z" fill="#c9965c"/><path d="M22 78l6-7h34l-6 7z" fill="#dcae74"/><path d="M56 78l6-7v22l-6 7z" fill="#a8763f"/>
  <path d="M36 71.5l-6 6.5v22" stroke="#c8f542" stroke-width="3.2"/><rect x="26" y="86" width="12" height="7" rx="1" fill="#f3efe6"/>
</svg>`;
