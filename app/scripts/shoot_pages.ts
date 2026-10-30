// Capture real screenshots of public web pages for a reel's "receipts" (light colour scheme, mobile width, 2.5x pixels).
//   bun scripts/shoot_pages.ts <out-dir> <name>=<url> [<name>=<url> ...]
// Writes <out-dir>/<name>.png (the full page) and prints its size. Cookie banners are dismissed when a button says so.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const [out, ...pairs] = process.argv.slice(2);
if (!out || !pairs.length) throw new Error('usage: bun scripts/shoot_pages.ts <out-dir> <name>=<url> ...');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, colorScheme: 'light' });
  for (const p of pairs) {
    const i = p.indexOf('='); const name = p.slice(0, i), url = p.slice(i + 1);
    // SHOOT_WAIT=load for pages that never go network-idle (claude.com keeps a connection open)
    await page.goto(url, { waitUntil: (process.env.SHOOT_WAIT as 'load' | 'networkidle') || 'networkidle', timeout: 60000 });
    for (const label of ['Accept', 'Reject', 'Accept all', 'Got it']) {
      const b = page.getByRole('button', { name: label, exact: true });
      if (await b.count()) { try { await b.first().click({ timeout: 1500 }); } catch { /* not clickable */ } }
    }
    await page.waitForTimeout(process.env.SHOOT_WAIT ? 3500 : 800);
    const f = path.join(out, `${name}.png`);
    await page.screenshot({ path: f, fullPage: true });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${name}: ${url} -> ${f} (430 x ${h} css px at 2.5x)`);
  }
} finally { await browser.close(); }
