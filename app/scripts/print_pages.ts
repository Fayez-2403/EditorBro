#!/usr/bin/env bun
// Print a paged HTML document (one <section class="page"> per page, fixed px size) to a PDF and to one PNG per page, in the
// installed Chrome (as render.ts). Used for the DM packs, e.g. projects/grok-bot-reel/dm-pack.
//   bun scripts/print_pages.ts <file.html> <out-dir> [name]      -> <out-dir>/<name>.pdf + <out-dir>/<name>_page_NN.png
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [src, outDir, name = 'pack'] = process.argv.slice(2);
if (!src || !outDir) { console.error('usage: bun scripts/print_pages.ts <file.html> <out-dir> [name]'); process.exit(1); }
const out = path.resolve(outDir); try { mkdirSync(out, { recursive: true }); } catch { /* exists */ }
const browser = await chromium.launch(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : { channel: process.env.BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve(src)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: path.join(out, `${name}.pdf`), width: '1080px', height: '1350px', printBackground: true, preferCSSPageSize: true });
const n = await page.locator('section.page').count();
for (let i = 0; i < n; i++) {
  await page.locator('section.page').nth(i).screenshot({ path: path.join(out, `${name}_page_${String(i + 1).padStart(2, '0')}.png`) });
}
await browser.close();
console.log(`${name}.pdf + ${n} pages -> ${out}`);
