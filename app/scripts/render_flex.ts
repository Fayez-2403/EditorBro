// Motion Flex (Claude cut) renderer: stills, contact sheets and H.264 video from the seekable scene.
//   bun scripts/render_flex.ts --stills 0.5,3.3,9.8 --out ../out/flex_wip            (PNG per time + seek check)
//   bun scripts/render_flex.ts --sheet 0:29.1:0.5 --out ../out/flex_wip/sheet.jpg     (contact sheet)
//   bun scripts/render_flex.ts --video --scale .5 --fps 30 --out ../out/flex_animatic.mp4   (animatic)
//   bun scripts/render_flex.ts --video --fps 60 --samples 4 --out ../out/motion-flex_claude.mp4
// --variant flex (29.1 s reel, default) | flex_full (process intro + reel). --from/--to clip a range.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(app, '..');
const args = process.argv.slice(2);
const opt = (k: string, d: string) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]!; };
const has = (k: string) => args.includes('--' + k);
const variant = opt('variant', 'flex');
const fps = Number(opt('fps', '60')), samples = Number(opt('samples', '1')), scale = Number(opt('scale', '1'));
const port = Number(opt('port', '54991'));
const exe = path.join(process.env.LOCALAPPDATA ?? '', 'Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe');
const ffmpeg = process.platform === 'win32' && existsSync(exe) ? exe : 'ffmpeg';

const server = Bun.spawn(['bunx', 'vite', '--port', String(port), '--strictPort'], {
  cwd: app, env: { ...process.env, VITE_VARIANT: variant, PDOOM_NO_HMR: '1' }, stdout: 'ignore', stderr: 'inherit',
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  let ready = false;
  for (let i = 0; i < 150; i++) { try { if ((await fetch(`http://localhost:${port}/flex-render.html`)).ok) { ready = true; break; } } catch {} await Bun.sleep(100); }
  if (!ready) throw new Error('preview server did not start');
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true, args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`http://localhost:${port}/flex-render.html?scale=${scale}&fps=${fps}${has('wide') ? '&wide=1' : ''}`);
  await page.waitForFunction(() => window.__flex, undefined, { timeout: 180000 });
  const state = await page.evaluate(() => ({ error: window.__flex.error, duration: window.__flex.duration, w: window.__flex.width, h: window.__flex.height }));
  if (state.error) throw new Error(state.error);
  const frame = (t: number, s: number, type = 'image/png', q = .92) =>
    page.evaluate(({ t, s, type, q }) => window.__flex.render(t, s, type, q), { t, s, type, q }) as Promise<string>;
  const out = path.resolve(app, opt('out', `../out/flex_${variant}.mp4`));

  if (has('check')) {
    // determinism: every listed time rendered forward, then in reverse, must match byte for byte
    const times = opt('check', '').split(',').filter(Boolean).map(Number);
    const fwd: string[] = []; for (const t of times) fwd.push(await frame(t, 1));
    const bad: number[] = [];
    for (let i = times.length - 1; i >= 0; i--) if ((await frame(times[i]!, 1)) !== fwd[i]) bad.push(times[i]!);
    console.log(bad.length ? `seek FAIL at ${bad.join(', ')}` : `seek PASS (${times.length} times, reverse order)`);
  } else if (has('stills')) {
    const times = opt('stills', '').split(',').filter(Boolean).map(Number);
    mkdirSync(out, { recursive: true });
    let rep = 0;
    for (const t of times) await Bun.write(path.join(out, `f_${t.toFixed(3).padStart(7, '0')}${times.indexOf(t) !== times.lastIndexOf(t) ? `_${rep++}` : ''}.png`), Buffer.from(await frame(t, samples), 'base64'));
    const a = await frame(times[0] ?? 1, 1); await frame((times.at(-1) ?? 2) + .37, 1); const b = await frame(times[0] ?? 1, 1);
    console.log(`wrote ${times.length} stills to ${out}; out-of-order seek ${a === b ? 'PASS' : 'FAIL'}`);
  } else if (has('sheet')) {
    // contact sheet: --sheet a:b:step, labelled thumbnails (6 per row)
    const [a, b, st] = opt('sheet', '0:10:1').split(':').map(Number) as [number, number, number];
    const times: number[] = []; for (let t = a; t <= b + 1e-6; t += st) times.push(+t.toFixed(3));
    const dir = path.join(path.dirname(out), '_sheet_tmp'); mkdirSync(dir, { recursive: true });
    for (let i = 0; i < times.length; i++) await Bun.write(path.join(dir, `s_${String(i).padStart(4, '0')}.jpg`), Buffer.from(await frame(times[i]!, 1, 'image/jpeg', .85), 'base64'));
    const cols = Number(opt('cols', '6')), tw = Number(opt('thumb', '270'));
    const p = Bun.spawnSync({ cwd: app, cmd: [ffmpeg, '-y', '-loglevel', 'error', '-framerate', '1', '-i', path.join(dir, 's_%04d.jpg'),
      '-vf', `scale=${tw}:-1,drawtext=fontfile=public/fonts/Archivo-w1000-700.ttf:text='%{eif\\:n*${st}+${a}\\:d\\:2}':x=6:y=6:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x${Math.ceil(times.length / cols)}:padding=4:color=0x333333`,
      '-frames:v', '1', '-update', '1', out] });
    if (p.exitCode) throw new Error(p.stderr.toString());
    console.log(`sheet ${out} (${times.length} frames)`);
  } else {
    mkdirSync(path.dirname(out), { recursive: true });
    const from = Number(opt('from', '0')), to = Math.min(state.duration, Number(opt('to', String(state.duration))));
    const jpeg = scale < 1 || has('jpeg');
    const audio = path.join(root, 'audio', variant, 'mix.wav');
    const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', jpeg ? 'mjpeg' : 'png', '-i', 'pipe:0',
      ...(has('noaudio') ? [] : ['-ss', String(from), '-i', audio]),
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', opt('preset', jpeg ? 'veryfast' : 'slow'), '-crf', opt('crf', jpeg ? '23' : '16'), '-pix_fmt', 'yuv420p',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
      ...(has('noaudio') ? [] : ['-c:a', 'aac', '-b:a', '320k']), '-t', String(to - from), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = once(ff, 'close');
    ff.stdin.on('error', (e) => console.error('encoder pipe:', e.message));
    const n0 = Math.round(from * fps), n1 = Math.round(to * fps), t0 = performance.now();
    for (let n = n0; n < n1; n++) {
      if (ff.exitCode !== null) throw new Error(`encoder exited ${ff.exitCode}`);
      const bytes = Buffer.from(await frame(n / fps, samples, jpeg ? 'image/jpeg' : 'image/png', .93), 'base64');
      if (!ff.stdin.write(bytes)) await once(ff.stdin, 'drain');
      if ((n - n0) % 120 === 0) console.log(`${n - n0}/${n1 - n0} frames, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    }
    ff.stdin.end(); const [code] = await done; if (code !== 0) throw new Error(`ffmpeg failed ${code}`);
    console.log(`wrote ${out}: ${n1 - n0} frames at ${fps} fps, ${samples} sub-frames, ${state.w}x${state.h}, ${((performance.now() - t0) / 1000).toFixed(0)} s`);
  }
} finally {
  await browser?.close();
  if (process.platform === 'win32') Bun.spawnSync(['taskkill', '/T', '/F', '/PID', String(server.pid)], { stdout: 'ignore', stderr: 'ignore' });
  else server.kill();
}
