// Capture a page through window.seek(t), with Chrome on the GPU.
//   node scripts/capture.mjs --page reel.html --t 0,1.5,3.8 --out ../out/wip_hook                stills
//   node scripts/capture.mjs --page reel.html --fps 60 --dur 4 --out ../out/hook.mp4 --w 540 --h 960   clip via ffmpeg
//   node scripts/capture.mjs --page demos/store/index.html --w 432 --h 768 --dpr 2.5 --query reel=1 --t 0,3,6 --out ../out/wip_demos/store
// --w/--h are the CSS viewport; output pixels are w*dpr x h*dpr. --query adds URL params (a=1&b=2).
// Needs the dev server (npm run dev, port 54210). Uses puppeteer-core from tools/motion-studio.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const require = createRequire(resolve(import.meta.dirname, '../../../../tools/motion-studio/package.json'));
const puppeteer = require('puppeteer-core');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const page_ = opt('page', 'reel.html');
const W = +opt('w', 1080), H = +opt('h', 1920), dpr = +opt('dpr', 1), query = opt('query', '');
const out = resolve(opt('out', '../out/wip'));
const times = opt('t', null), fps = +opt('fps', 0), dur = +opt('dur', 0), start = +opt('start', 0);
const port = opt('port', '54210');
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.setViewport({ width: W, height: H, deviceScaleFactor: dpr });
await page.goto(`http://localhost:${port}/${page_}?w=${W}&h=${H}${query ? `&${query}` : ''}`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__ready === true, { timeout: 120000 });
const gl = await page.evaluate(() => {
  const g = document.createElement('canvas').getContext('webgl2');
  const d = g && g.getExtension('WEBGL_debug_renderer_info');
  return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log('renderer:', gl);

if (times) {
  mkdirSync(out, { recursive: true });
  for (const t of times.split(',').map(Number)) {
    await page.evaluate((x) => window.seek(x), t);
    const name = `${out}/t${t.toFixed(2)}.png`;
    await page.screenshot({ path: name });
    console.log('still', name);
  }
} else if (fps && dur) {
  mkdirSync(dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(fps * dur);
  for (let f = 0; f < n; f++) {
    await page.evaluate((x) => window.seek(x), start + f / fps);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 30 === 0) process.stdout.write(`\r${f}/${n}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\n${n} frames -> ${out}`);
}
await browser.close();
