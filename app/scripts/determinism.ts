// Seek determinism check: the same t must give the same pixels whatever was rendered before it, in any order, in any session.
//   VITE_VARIANT=<v> bun scripts/determinism.ts --variant <v> --t 0,1.2,7.3,23.4,49.9 [--out report.json] [--save dir] [--warm]
// Renders the times forward, reversed and forward again in one page, then reversed in a second, fresh browser; hashes the
// engine's own pixel buffer (__pdoom.png(), the buffer the export reads, not a browser screenshot) and compares every copy.
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const VARIANT = opt('variant', '')!;
const TIMES = opt('t', '0,1.2,7.3,23.4,49.9')!.split(',').map(Number);
const APP = path.resolve(import.meta.dir, '..');

async function reachable(url: string) { try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); return r.ok; } catch { return false; } }
let port = 0;
for (let p = 5900; p < 6000 && !port; p++) if (!(await reachable(`http://localhost:${p}`))) port = p;
const proc = Bun.spawn(['bunx', 'vite', '--port', String(port), '--strictPort'], { cwd: APP, stdout: 'ignore', stderr: 'ignore', env: { ...process.env, PDOOM_NO_HMR: '1', VITE_VARIANT: VARIANT } });
const url = `http://localhost:${port}`;
for (let i = 0; i < 150 && !(await reachable(url)); i++) await Bun.sleep(100);
const stop = () => {
  if (process.platform !== 'win32') { proc.kill(); return; }
  Bun.spawnSync(['taskkill', '/T', '/F', '/PID', String(proc.pid)]);
  Bun.spawnSync(['powershell', '-NoProfile', '-Command', `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`]);
};

async function session(orders: number[][]) {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.goto(`${url}/?export=1`);
    await page.waitForFunction(() => (window as any).__pdoom?.ready || (window as any).__pdoom?.error, null, { timeout: 120000 });
    const out: [number, string][][] = [];
    // --warm: draw two frames first (Chrome may switch a 2D canvas's rasterizer after its first heavy frames)
    if (argv.includes('--warm')) for (const t of [0, 1.2]) { await page.evaluate((t) => (window as any).__pdoom.still(t, 1, 0.5), t); await page.evaluate(() => (window as any).__pdoom.png()); }
    for (const order of orders) {
      const row: [number, string][] = [];
      for (const t of order) {
        await page.evaluate((t) => (window as any).__pdoom.still(t, 1, 0.5), t);
        const b64: string = await page.evaluate(() => (window as any).__pdoom.png());
        const h = createHash('md5').update(Buffer.from(b64, 'base64')).digest('hex').slice(0, 12); row.push([t, h]);
        const save = opt('save'); if (save) await Bun.write(path.join(save, `t${t}_${h}.png`), Buffer.from(b64, 'base64'));
      }
      out.push(row);
    }
    return out;
  } finally { await browser.close(); }
}

try {
  const fwd = TIMES, rev = [...TIMES].reverse();
  const a = await session([fwd, rev, fwd]), b = await session([rev]);
  const runs = [...a.map((r, i) => [`page 1, ${['forward', 'reversed', 'forward again'][i]}`, r] as const), ['page 2 (fresh browser), reversed', b[0]!] as const];
  const byT = new Map<number, Set<string>>();
  for (const [, r] of runs) for (const [t, h] of r) { if (!byT.has(t)) byT.set(t, new Set()); byT.get(t)!.add(h); }
  for (const [name, r] of runs) console.log(`${name.padEnd(34)} ${r.map(([t, h]) => `${t}s:${h}`).join('  ')}`);
  let ok = true;
  for (const t of TIMES) { const hs = byT.get(t)!; ok &&= hs.size === 1; console.log(`t=${t}: ${hs.size === 1 ? 'IDENTICAL in all 4 runs' : `DIFFERS (${[...hs].join(', ')})`}`); }
  console.log(ok ? 'DETERMINISTIC: every t is bit-identical across seek orders and sessions' : 'NOT DETERMINISTIC');
  const rep = opt('out'); if (rep) await Bun.write(rep, JSON.stringify({ variant: VARIANT, times: TIMES, runs, deterministic: ok }, null, 1));
  if (!ok) process.exitCode = 1;
} finally { stop(); }
