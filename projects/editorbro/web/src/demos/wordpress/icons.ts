// Hand-drawn 24px line icons for Meridian Freight (stroke = currentColor). No third-party icon sets, no brand marks.
const P: Record<string, string> = {
  ship: '<path d="M3 14.5h18l-2.2 4.8H5.2z"/><path d="M5.5 14.5v-3.8h5v3.8M10.5 14.5v-3.8h4.5v3.8"/><path d="M16 14.5V8h2.6v6.5"/><path d="M2 22c1.6 0 1.6-.9 3.3-.9s1.6.9 3.3.9 1.6-.9 3.4-.9 1.6.9 3.3.9 1.6-.9 3.3-.9 1.6.9 3.4.9"/>',
  plane: '<path d="M12 2.5c.9 0 1.5.9 1.5 2v5l7.5 4.5v2l-7.5-2.2V19l2.5 1.8V22L12 21l-4 1v-1.2l2.5-1.8v-5.2L3 16v-2l7.5-4.5v-5c0-1.1.6-2 1.5-2z"/>',
  truck: '<path d="M2 6.5h11.5v10H2z"/><path d="M13.5 9.5h4.2l3.3 3.6v3.4h-7.5"/><circle cx="6" cy="17.6" r="2"/><circle cx="17.3" cy="17.6" r="2"/>',
  warehouse: '<path d="M3 21V9.2l9-5 9 5V21"/><path d="M7 21v-8h10v8"/><path d="M7 15.6h10M7 18.3h10"/>',
  customs: '<path d="M6 2.5h8.2L18 6.3V21.5H6z"/><path d="M14 2.6v3.9h3.9"/><path d="M9 13.3l2.1 2.1 4-4.2"/>',
  crane: '<path d="M3.5 21h17"/><path d="M6.5 21V3.8h12"/><path d="M6.5 8.2l4.4-4.4"/><path d="M16.2 3.8v6"/><path d="M16.2 9.8l-2.6 2.6M16.2 9.8l2.6 2.6"/><path d="M13.2 12.4h6v4.2h-6z"/>',
  phone: '<path d="M5 3.5h3.5L10 8l-2.2 1.5a11 11 0 0 0 6.7 6.7L16 14l4.5 1.5V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.6 6.2 12 13l8.4-6.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevD: '<path d="M6 9.5l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  capsule: '<path d="M8.6 20.4a4.2 4.2 0 0 1-6-6l9-9a4.2 4.2 0 0 1 6 6z"/><path d="M8.1 9.6l6 6"/>',
  car: '<path d="M3 16.5v-4.2L5.2 7h13.6l2.2 5.3v4.2z"/><path d="M3.4 12.3h17.2"/><circle cx="7.5" cy="16.8" r="1.8"/><circle cx="16.5" cy="16.8" r="1.8"/>',
  bag: '<path d="M5 8h14l-1.1 13H6.1z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  bolt: '<path d="M13.2 2.5 4.6 13.6H11l-1 7.9 8.6-11.1h-6.4z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
};

export const icon = (name: keyof typeof P | string, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? ''}</svg>`;

export const STAR =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z"/></svg>';

export const LOGO = `<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="16.5" fill="none" stroke="currentColor" stroke-width="2.4"/>
  <ellipse cx="20" cy="20" rx="7" ry="16.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
  <path d="M3.5 20h33" stroke="currentColor" stroke-width="1.8"/>
  <path d="M9.5 30.5 30 10" stroke="#F26A1F" stroke-width="3.6" stroke-linecap="round"/>
  <circle cx="30.6" cy="9.4" r="3.6" fill="#F26A1F"/>
</svg>`;

/** Fills every [data-icon] placeholder in the static markup. */
export function hydrateIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon!, el.dataset.iconClass ?? 'ico');
  });
  root.querySelectorAll<HTMLElement>('[data-logo]').forEach((el) => (el.innerHTML = LOGO));
  root.querySelectorAll<HTMLElement>('[data-stars]').forEach((el) => (el.innerHTML = STAR.repeat(5)));
}
