// Render an HTML page (a card, a search bar, a title, a UI screen) to PNG frames with headless Chrome.
// Transparent background (omitBackground), so the PNGs can go onto emissive planes in Blender or over a Remotion scene.
//
//   node render_html.mjs card.html --out frames/card --w 1500 --h 600                 one still
//   node render_html.mjs bar.html  --out frames/bar  --states "q=;q=20 best;q=20 best tools"   one PNG per state (?state=...)
//   node render_html.mjs ui.html   --out frames/ui   --fps 60 --dur 2.5               frame-by-frame through window.seek(t)
//
// A page that animates must expose window.seek(seconds) and be a pure function of t (no Date.now, no Math.random).
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const page_ = args[0];
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i > 0 ? args[i + 1] : d; };
if (!page_) { console.error('usage: node render_html.mjs <page.html> --out <dir> [--w 1080 --h 1920] [--states a;b] [--fps 60 --dur 2] [--scale 1]'); process.exit(1); }

const out = resolve(opt('out', 'frames'));
const W = +opt('w', 1080), H = +opt('h', 1920), scale = +opt('scale', 1);
const states = opt('states', null), fps = +opt('fps', 0), dur = +opt('dur', 0);
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);
if (!CHROME) { console.error('Chrome not found: set CHROME_PATH'); process.exit(1); }
mkdirSync(out, { recursive: true });

const url = pathToFileURL(resolve(page_)).href;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: scale });
const shot = (name) => page.screenshot({ path: `${out}/${name}.png`, omitBackground: true });
const ready = () => page.evaluate(() => document.fonts.ready.then(() => true));

if (states) {
  const list = states.split(";");
  for (let i = 0; i < list.length; i++) {
    await page.goto(`${url}?state=${encodeURIComponent(list[i])}`, { waitUntil: 'networkidle0' });
    await ready();
    await shot(String(i).padStart(3, '0'));
  }
  console.log(`${list.length} states -> ${out}`);
} else if (fps && dur) {
  await page.goto(url, { waitUntil: 'networkidle0' });
  await ready();
  if (!(await page.evaluate(() => typeof window.seek === 'function'))) { console.error('page has no window.seek(t)'); process.exit(1); }
  const n = Math.round(fps * dur);
  for (let f = 0; f < n; f++) {
    await page.evaluate((t) => window.seek(t), f / fps);
    await shot(String(f).padStart(4, '0'));
  }
  console.log(`${n} frames at ${fps} fps -> ${out}`);
} else {
  await page.goto(url, { waitUntil: 'networkidle0' });
  await ready();
  await shot('still');
  console.log(`still -> ${out}/still.png`);
}
await browser.close();
