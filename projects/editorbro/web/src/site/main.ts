// The EditorBro hub: the live highway world as the hero, the nine demo sites, the articles.
import { createHighway } from '../world/highway';

const REPO = 'https://github.com/Fayez-2403/EditorBro';
const DEMOS = [
  { slug: 'brand', name: 'LUMA Audio', niche: 'D2C brand · Three.js product', accent: '#FF7A4D' },
  { slug: 'store', name: 'Threadline', niche: 'E-commerce · cart & checkout', accent: '#4A55E8' },
  { slug: 'loyalty', name: 'Brewpoint Rewards', niche: 'Loyalty app · scripted assistant', accent: '#D2493B' },
  { slug: 'food', name: 'Tiffinly', niche: 'Food ordering · live order status', accent: '#2E8B5A' },
  { slug: 'delivery', name: 'Dashr', niche: 'Delivery tracking · live map', accent: '#C8F542' },
  { slug: 'automation', name: 'Flowsmith', niche: 'Automation builder · run a flow', accent: '#FF5A1F' },
  { slug: 'wordpress', name: 'Meridian Freight', niche: 'WordPress theme · real block theme', accent: '#F26A1F' },
  { slug: 'company', name: 'Halcyon Grid', niche: 'Corporate site · energy field', accent: '#7CF2C3' },
  { slug: 'vault', name: 'Vaultline', niche: 'E2EE messenger · real WebCrypto', accent: '#9DAAFF' },
];
const DOCS = ['01-what-is-editorbro', '02-from-prompt-to-reel', '03-skills-map', '04-the-12-gates', '05-engines', '06-sound-and-voice',
  '07-qa-measure-dont-guess', '08-websites-and-apps', '09-case-study-editorbro-reel'];
const title = (s: string) => s.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()).replace('editorbro', 'EditorBro').replace('qa ', 'QA: ');

const grid = document.getElementById('grid')!;
for (const d of DEMOS) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = `/demos/${d.slug}/`;
  a.style.setProperty('--accent', d.accent);
  a.innerHTML = `<span class="dot"></span><b>${d.name}</b><small>${d.niche}</small><i>Open →</i>`;
  grid.appendChild(a);
}
const list = document.getElementById('docs-list')!;
DOCS.forEach((d) => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="${REPO}/blob/main/docs/${d}.md">${title(d)}</a>`;
  list.appendChild(li);
});
document.getElementById('copy')!.addEventListener('click', async (e) => {
  const b = e.currentTarget as HTMLButtonElement;
  try { await navigator.clipboard.writeText(`git clone ${REPO}`); b.textContent = 'Copied ✓'; } catch { b.textContent = `git clone ${REPO}`; }
});

// the hero: the highway world, playing the push-in on a loop (time from the rAF timestamp; the world stays pure in t)
const canvas = document.getElementById('world') as HTMLCanvasElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const size = () => {
  const s = Math.min(1, 1100 / Math.max(innerWidth, innerHeight));   // keep the GPU cost sane on big screens
  return { w: Math.round(innerWidth * s), h: Math.round(innerHeight * s) };
};
const { w, h } = size();
const world = await createHighway(canvas, w, h);
canvas.style.width = '100%';
canvas.style.height = '100%';
const still = new URLSearchParams(location.search).has('still');   // for screenshots: no loop, seek(t) instead
(window as unknown as { seek: (t: number) => void }).seek = (t: number) => world.render(t);
if (reduce || still) world.render(still ? 2.0 : 4.2);
else {
  let t0: number | null = null;
  const loop = (ts: number) => {
    t0 ??= ts;
    world.render(((ts - t0) / 1000) % 8.5);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
await document.fonts.ready;
(window as unknown as { __ready: boolean }).__ready = true;
