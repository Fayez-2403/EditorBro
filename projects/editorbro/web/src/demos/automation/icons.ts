// Flowsmith marks and icons (hand-drawn SVG, generic: no third-party product logos).
export const logo = (s = 30) => `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#16161b"/><path d="M9 25.5h22l-3 5.5H12z" fill="#ff5a1f"/><path d="M11 25.5c0-4 3-6.5 7-6.5h11v-3.5c-4.5 0-7-2.5-7-6.5" fill="none" stroke="#f5f4ef" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="29.5" cy="9.5" r="2.4" fill="#ff8a3d"/></svg>`;

const ic = (d: string) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const I = {
  form: ic('<rect x="4.5" y="3.5" width="15" height="17" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  filter: ic('<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>'),
  spark: ic('<path d="M12 3.5 13.8 9l5.7 1.9-5.7 1.9L12 18.5l-1.8-5.7L4.5 10.9 10.2 9z"/><path d="M19 3.5v3M17.5 5h3"/>'),
  branch: ic('<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="9.5" r="2"/><path d="M6 7.5v9M6 13c0-2.5 1.5-3.5 4-3.5h6"/>'),
  chat: ic('<path d="M4 5.5h16v10.5H9.5L5 19.5V16H4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  table: ic('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>'),
  play: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.2v13.6L18.8 12z" fill="currentColor"/></svg>`,
  check: ic('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  minus: ic('<path d="M5 12h14"/>'),
  fit: ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  search: ic('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  clock: ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  hook: ic('<path d="M9 7a3 3 0 1 1 4.5 2.6L11 14"/><circle cx="8" cy="17" r="2.5"/><circle cx="16" cy="17" r="2.5"/><path d="M10.5 17h3"/>'),
  mail: ic('<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>'),
  globe: ic('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>'),
  tag: ic('<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-6.6 6.6a1.4 1.4 0 0 1-2 0z"/><circle cx="8.2" cy="8.2" r="1.4"/>'),
  pause: ic('<path d="M9 5v14M15 5v14"/>'),
  more: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/></svg>`,
  spin: `<svg class="ic spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="2.6"/><path d="M12 4a8 8 0 0 1 8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  bolt: ic('<path d="M13 3 5 13.5h6L10 21l9-11h-6z"/>'),
};
