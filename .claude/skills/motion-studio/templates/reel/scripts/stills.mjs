// Renders a list of reel frames to PNG with one browser instance, then a contact sheet.
// node scripts/stills.mjs <bundleDir> <outDir> <frame,frame,...> [Composition]
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [bundle, out, list, id = 'Reel'] = process.argv.slice(2);
const frames = list.split(',').map(Number);
mkdirSync(out, { recursive: true });
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } });
const serveUrl = path.resolve(bundle);
const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions: { gl: 'angle' } });
for (const frame of frames) {
  const t = Date.now();
  await renderStill({ serveUrl, composition, frame, output: path.join(out, `${String(frame).padStart(4, '0')}.png`), puppeteerInstance: browser, chromiumOptions: { gl: 'angle' } });
  console.log(frame, ((Date.now() - t) / 1000).toFixed(1) + 's');
}
await browser.close({ silent: true });
