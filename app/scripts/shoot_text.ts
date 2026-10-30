// Capture real screenshots of single passages of a public web page (a reel's "receipts"): for each phrase, the nearest block
// element that contains it (p, li, h1-h3, a FAQ answer...), on a light, mobile-width page at 2.5x, after dismissing the
// cookie banner. FAQ questions given with open:<question> are clicked open first.
//   bun scripts/shoot_text.ts <out-dir> <url> [open:<question> ...] <name>=<phrase> [<name>=<phrase> ...]
// Writes <out-dir>/<name>.png per phrase and prints the matched text, so the receipt can be checked against the claim.
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const [outArg, url, ...rest] = process.argv.slice(2);
if (!outArg || !url || !rest.length) throw new Error('usage: bun scripts/shoot_text.ts <out-dir> <url> [open:<question>] <name>=<phrase> ...');
const out = path.resolve(outArg);
if (!existsSync(out)) mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2.5, colorScheme: 'light' });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  for (const label of ['Reject', 'Reject all', 'Accept', 'Got it']) {
    const b = page.getByRole('button', { name: label, exact: true });
    if (await b.count()) { try { await b.first().click({ timeout: 1500 }); break; } catch { /* not clickable */ } }
  }
  await page.waitForTimeout(600);
  for (const p of rest.filter((x) => x.startsWith('open:'))) {
    const q = p.slice(5); const el = page.getByText(q, { exact: false }).first();
    try { await el.scrollIntoViewIfNeeded({ timeout: 3000 }); await el.click({ timeout: 3000 }); await page.waitForTimeout(700); console.log(`opened: ${q}`); }
    catch { console.log(`could not open: ${q}`); }
  }
  for (const p of rest.filter((x) => !x.startsWith('open:'))) {
    const i = p.indexOf('='); const name = p.slice(0, i), phrase = p.slice(i + 1);
    // the smallest visible block element whose text contains the phrase
    const handle = await page.evaluateHandle((ph) => {
      const blocks = [...document.querySelectorAll('p, li, h1, h2, h3, h4, blockquote, dd, [role="region"], div')] as HTMLElement[];
      const hits = blocks.filter((b) => b.innerText && b.innerText.replace(/\s+/g, ' ').includes(ph) && b.offsetHeight > 0);
      hits.sort((a, b) => a.innerText.length - b.innerText.length);
      return hits[0] ?? null;
    }, phrase);
    const el = handle.asElement();
    if (!el) { console.log(`${name}: NOT FOUND "${phrase}"`); continue; }
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    // sticky / fixed bars (the site header) would cover the passage: hide them for the shot
    await page.evaluate(() => { for (const n of document.querySelectorAll('body *') as any) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') n.style.visibility = 'hidden'; } });
    const f = path.join(out, `${name}.png`);
    await el.screenshot({ path: f });
    const txt = (await el.innerText()).replace(/\s+/g, ' ').slice(0, 300);
    console.log(`${name}: ${f}\n   "${txt}"`);
  }
} finally { await browser.close(); }
