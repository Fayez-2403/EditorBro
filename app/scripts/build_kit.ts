// Builds kit/claude-opus 5.5 200IQ implementation.pdf: 9:16 pages (made to be read on a phone, from a DM) in the
// reel's look, printed by headless Chrome so links stay clickable. The prompt pages are generated from kit/prompt.md.
//   cd app; bun scripts/build_kit.ts            (writes the PDF and kit/src/preview/p_XX.png for review)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)), '..');
const kit = path.join(root, 'kit');
const fonts = pathToFileURL(path.join(root, 'app/public/fonts')).href;
const img = (f: string) => pathToFileURL(path.join(kit, 'src/img', f)).href;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- a small markdown -> html for the prompt (headings, lists, bold, code, links) ----
function inline(s: string) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');
}
function md(block: string) {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null, para: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of block.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); continue; }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^##\s+(.*)/))) { flushPara(); closeList(); out.push(`<h3>${inline(m[1]!)}</h3>`); continue; }
    if ((m = line.match(/^- (.*)/)) || (m = line.match(/^\d+\. (.*)/))) {
      flushPara(); const kind = line.startsWith('- ') ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(m[1]!)}`); continue;
    }
    if (/^\s{2,}\S/.test(line) && list) { out[out.length - 1] += ' ' + inline(line.trim()); continue; }
    closeList(); para.push(line.trim());
  }
  flushPara(); closeList();
  return out.join('\n').replace(/<li>(.*?)(?=\n<li>|\n<\/[uo]l>)/gs, '<li>$1</li>');
}
const promptMd = readFileSync(path.join(kit, 'prompt.md'), 'utf8');
const body = promptMd.slice(promptMd.indexOf('## ROLE'));
const sections = body.split(/\n(?=## )/);
const sec = (name: string) => sections.find((s) => s.startsWith(`## ${name}`)) ?? '';
const promptPages = [
  ['ROLE', 'THE BRIEF'], ['STEP 1', 'STEP 2'], ['STEP 3'], ['STEP 4'], ['STEP 5', 'STEP 6'], ['HONESTY', 'RESOURCES'],
].map((names) => names.map((n) => md(sec(n))).join('\n'));

// ---- pages ----
const SETUP = `Set up my computer for code-rendered motion
design. Do each step, check that it worked, and
tell me if anything fails.

1. Check these are installed; install whatever
   is missing for my OS: Node.js 22+, Bun, git,
   ffmpeg (with libx264), Google Chrome, and
   Python 3.10+ with numpy, scipy and librosa.

2. Install these skill packs for Claude Code.
   If a command opens a picker, choose Claude
   Code and all skills (or use --all / --yes):
   npx skills add charlie947/motion-graphics-skills
   npx skills add heygen-com/hyperframes --all
   npx skills add remotion-dev/skills
   npx skills@latest add emilkowalski/skills
   Then list the installed skills and confirm
   each one has a SKILL.md.

3. Make a folder ~/motion-lab and clone these
   references into it (read them, don't edit):
   git clone https://github.com/mexicat/pdoom-video
   git clone https://github.com/JohnHeibel/ClaudeAnimationBase

4. In pdoom-video/app run "bun install", then
   "bunx vite"; confirm the preview opens at
   http://localhost:5173, then stop it.

5. Read pdoom-video/docs/ENGINE.md,
   ClaudeAnimationBase/ANIMATION_GUIDE.md and
   the motion-effects skill's
   references/effects.md. Summarise in 10
   bullets what you will apply to a reel.

6. Say "Ready for the brief" and wait for my
   prompt.md.`;

const card = (name: string, url: string, what: string, open: string, lic: string) => `
  <div class="card"><div class="ct"><a href="${url}">${esc(name)}</a><span>${esc(lic)}</span></div>
  <div class="cu"><a href="${url}">${esc(url.replace('https://', ''))}</a></div>
  <p>${inline(what)}</p><p class="open">Open first: ${inline(open)}</p></div>`;

const chain: [string, string][] = [
  ['r_01.60.jpg', 'cube → type slabs'], ['r_03.90.jpg', 'slabs → browser'], ['r_06.95.jpg', 'browser → phone'], ['r_08.30.jpg', 'card → dashboard'],
  ['r_10.90.jpg', 'chart bar → product'], ['r_13.40.jpg', 'product → modules'], ['r_15.70.jpg', 'modules → character'], ['r_18.70.jpg', 'world → 3D city'],
  ['r_20.45.jpg', 'city → record'], ['r_23.50.jpg', 'record → one idea'], ['r_24.60.jpg', 'idea → every scene'], ['r_28.40.jpg', 'scenes → title'],
];

const page = (cls: string, inner: string, n?: number) =>
  `<section class="page ${cls}">${inner}${n ? `<div class="foot"><span>CLAUDE OPUS 5.5 · 200IQ IMPLEMENTATION</span><span>${String(n).padStart(2, '0')}</span></div>` : ''}</section>`;

let n = 1;
const pages: string[] = [];
pages.push(page('cover', `
  <div class="strip">${['r_01.60.jpg', 'r_10.90.jpg', 'r_18.70.jpg', 'r_20.45.jpg'].map((f) => `<img src="${img(f)}">`).join('')}</div>
  <div class="kick">// the kit behind the MOTION FLEX reel</div>
  <h1>CLAUDE<br>OPUS 5.5</h1>
  <div class="iq">200IQ<br><span>IMPLEMENTATION</span></div>
  <p class="lede">How to make a beat-synced motion reel entirely in code: no After Effects, no timeline, every frame written by Claude.</p>
  <div class="by">by <b>Techpe Trek</b></div>`));

pages.push(page('', `
  <div class="kick">// what's inside</div>
  <h2>Everything I used.<br>Nothing held back.</h2>
  <ol class="toc">
    <li><b>The one-paste setup</b><span>Paste it into Claude Code; it installs everything.</span></li>
    <li><b>The repos + skills</b><span>What each one is, and which file to open first.</span></li>
    <li><b>The beat-sync method</b><span>How every cut lands on the song.</span></li>
    <li><b>The 10 motion rules</b><span>What makes it look like a studio, not an AI slideshow.</span></li>
    <li><b>The continuous chain</b><span>How each scene becomes the next.</span></li>
    <li><b>The perfect prompt</b><span>Fill in the brackets, paste, direct.</span></li>
    <li><b>Export + posting checklist</b><span>Safe zone, codecs, loudness, music.</span></li>
  </ol>
  <div class="stats"><div><b>43 s</b><span>full reel</span></div><div><b>60</b><span>fps</span></div><div><b>2,619</b><span>frames</span></div><div><b>98.97</b><span>bpm, measured</span></div></div>
  <h3>How to use this kit</h3>
  <ol class="steps"><li>Do the <b>one-paste setup</b> once (page 3).</li><li>Fill in the <b>prompt</b> (pages 9–14) with your song and your idea.</li><li>Paste it into Claude Code on Opus 5.5. Review stills, give notes, approve the render.</li></ol>`, ++n));

pages.push(page('', `
  <div class="kick">// 01 · the one-paste setup</div>
  <h2>Paste this into<br>Claude Code. Once.</h2>
  <p class="small">Open a terminal, run <code>claude</code>, choose Opus 5.5, paste the whole box. Claude checks your machine, installs the skills and reads the references.</p>
  <pre class="box">${esc(SETUP)}</pre>`, ++n));

pages.push(page('', `
  <div class="kick">// 02 · the repos + skills (1/2)</div>
  <h2>The skills</h2>
  ${card('motion-graphics-skills', 'https://github.com/charlie947/motion-graphics-skills', 'Claude Code skills for motion: 16 UI morphs, kinetic type, particle logos, 3D titles, reel export. Brand-safe rules.', '`skills/motion-effects/references/effects.md`, `reel-export/SKILL.md`', 'MIT')}
  ${card('HyperFrames', 'https://github.com/heygen-com/hyperframes', 'HTML → MP4 video framework with the deepest library of motion rules: transitions, beat landing, easing, camera.', '`skills/music-to-video/references/motion-primitive-catalog.md`, `.claude/skills/cut-the-curve`', 'Apache-2.0')}
  ${card('Remotion skills', 'https://github.com/remotion-dev/skills', 'Official agent skills for Remotion: drive every animation from the frame, keep one audio clock.', '`skills/remotion-best-practices/SKILL.md`, `timing.md`', 'no licence file')}
  ${card('Emil Kowalski skills', 'https://github.com/emilkowalski/skills', 'Animation taste from a top UI engineer: springs, timing, reviewing motion.', '`apple-design`, `animate`, `review-animations`', 'MIT')}`, ++n));

pages.push(page('', `
  <div class="kick">// 02 · the repos + skills (2/2)</div>
  <h2>Engines, acting, taste</h2>
  ${card('pdoom-video', 'https://github.com/mexicat/pdoom-video', 'The engine this reel is built on: a music video where every frame is a pure function of song time, with audio analysis and motion blur.', '`docs/ENGINE.md`, `docs/TREATMENT.md`', 'MIT (code only)')}
  ${card('ClaudeAnimationBase', 'https://github.com/JohnHeibel/ClaudeAnimationBase', 'A cartoon starter with the best guide to character timing: eyes lead, then the body; anticipation; squash.', '`ANIMATION_GUIDE.md`', 'MIT')}
  ${card('three.js', 'https://github.com/mrdoob/three.js', '3D for the web. For reels: drive it from t, not from a clock.', '`InstancedMesh`, `AnimationMixer.setTime`', 'MIT')}
  ${card('Remotion', 'https://github.com/remotion-dev/remotion', 'Make videos in React. Mature, big ecosystem.', '`packages/core/src/spring`', 'Remotion licence')}
  <div class="mini"><b>Also:</b>
    <a href="https://github.com/anthropics/skills">anthropics/skills</a> (frontend-design: the "AI look" tells) ·
    <a href="https://github.com/alexgreensh/anidoodle">anidoodle</a> (motion-grammar.md) ·
    <a href="https://github.com/alchaincyf/huashu-art-motion">huashu-art-motion</a> (anti-slideshow gate) ·
    <a href="https://github.com/guanmo-ai/awesome-ai-motion">awesome-ai-motion</a> (inspiration)</div>`, ++n));

pages.push(page('', `
  <div class="kick">// 03 · the beat-sync method</div>
  <h2>Measure the song.<br>Then animate.</h2>
  <img class="wide" src="${img('intro_grid.jpg')}">
  <ol class="steps tight">
    <li><b>Use the exact audio you'll post.</b> My Short is a slower edit than the official "ultra slowed"; the tempo is different.</li>
    <li><b>Find the kicks:</b> the steepest rise of the 35–160 Hz energy, at about 3 ms resolution.</li>
    <li><b>Fit the eighth-note pulse</b> by robust least squares; hits more than 15 ms off are swing, so drop them.</li>
    <li><b>Mark the bars, the breakdowns</b> (bass drops out) <b>and the drops.</b></li>
    <li><b>Repeat whole phrases on bar lines</b> with 4 ms splices; never stretch the song. A whole number of phrases loops seamlessly.</li>
    <li><b>Write the score in bars + eighths.</b> Snap each hit to the measured onset within 70 ms.</li>
    <li><b>Moves land on the hit</b> (start early). Accents fire 0–45 ms after it. Cuts take 0 ms.</li>
    <li><b>Sound effects come from the same cue file.</b> Mix at −14 LUFS, true peak −1 dBTP or lower.</li>
  </ol>
  <div class="stats four"><div><b>0.3031 s</b><span>eighth</span></div><div><b>2.425 s</b><span>bar = 1 scene</span></div><div><b>9.70 s</b><span>drop 1: product</span></div><div><b>24.25 s</b><span>drop 2: title</span></div></div>`, ++n));

pages.push(page('', `
  <div class="kick">// 04 · the 10 motion rules</div>
  <h2>Studio, not slideshow.</h2>
  <ol class="rules">
    <li><b>One clock.</b> Every frame = f(t). Seeded randomness only.</li>
    <li><b>One object across every cut.</b> Change what it is mid-move. Never crossfade copies.</li>
    <li><b>New composition every scene.</b> Own layout, colour field, type treatment.</li>
    <li><b>Small overshoot.</b> Spring damping 0.8–1.0; no default bounce.</li>
    <li><b>Draw lines, never fade them.</b> Counters lock on the kick.</li>
    <li><b>Hits stack on one frame:</b> flash, 2 inverted frames, shake, ring.</li>
    <li><b>Audio drives behaviour.</b> The real waveform, the real bar; no EQ bars or orbs.</li>
    <li><b>One camera move per phrase.</b> One quiet moment before each drop.</li>
    <li><b>Real demos:</b> clicks, typing, loading, done. Label fictional brands.</li>
    <li><b>Safe zone + loop.</b> Words in y 360–1420, clear of the right 120 px; premise on frame 0; end on frame 0.</li>
  </ol>`, ++n));

pages.push(page('', `
  <div class="kick">// 05 · the continuous chain</div>
  <h2>Every scene becomes the next.</h2>
  <div class="grid">${chain.map(([f, s], i) => `<figure><img src="${img(f)}"><figcaption><b>${String(i + 1).padStart(2, '0')}</b> ${esc(s)}</figcaption></figure>`).join('')}</div>`, ++n));

promptPages.forEach((html, i) => {
  pages.push(page('prompt', `<div class="kick">// 06 · the perfect prompt (${i + 1}/${promptPages.length})</div>
    ${i === 0 ? '<h2>Fill in the [brackets].<br>Paste. Direct.</h2><p class="small">Also in <b>prompt.md</b>. The song is the one I used; swap in yours.</p>' : ''}
    <div class="md">${html}</div>`, ++n));
});

pages.push(page('', `
  <div class="kick">// 07 · export + posting checklist</div>
  <h2>Before you post</h2>
  <ul class="check">
    <li>1080×1920, 60 fps, H.264 High, yuv420p, BT.709 limited range, full colour tags, AAC 48 kHz, faststart.</li>
    <li>Every word in y 360–1420 and clear of the right 120 px. Headlines 90 px or more, labels 24 px or more.</li>
    <li>Determinism: render a set of times forwards and in reverse; the frames must match exactly.</li>
    <li>A contact sheet every 0.5 s, plus a strip at 0.05 s around every cut. Fix dead air and pops.</li>
    <li>Pull frames from the final MP4 and look at them; check the audio-to-cue offset is 0 ms.</li>
    <li>Music: add the track from Instagram's music library at your edit's start and lower the original audio; otherwise the reel may be muted.</li>
    <li>Cover: pick a frame with the hook and the title in the safe zone.</li>
    <li>Caption: the premise in line 1, one CTA keyword, 3–5 hashtags. Pin a comment with the keyword.</li>
  </ul>
  <img class="wide short" src="${img('intro_noae.jpg')}">`, ++n));

pages.push(page('end', `
  <div class="kick">// credits + honesty</div>
  <h2>Built in code with<br>Claude Opus 5.5.</h2>
  <p>Every scene, the timing script and the renderer setup were written by Claude Opus 5.5 in Claude Code, directed by Techpe Trek.</p>
  <ul class="check">
    <li>Render engine: <a href="https://github.com/mexicat/pdoom-video">pdoom-video</a> by mexicat (MIT).</li>
    <li>Fonts: Archivo and IBM Plex Mono (SIL OFL).</li>
    <li>Music: MATUSHKA ULTRAFUNK (ultra slowed edit) by satirin, FUNK DEMON, EVO. All rights belong to them.</li>
    <li>The website, app, dashboard data and the speaker in the reel are fictional demos.</li>
    <li>Every repo and skill here belongs to its authors. Star them if they help you.</li>
  </ul>
  <div class="iq small2">MADE SOMETHING WITH THIS?<br><span>Tag Techpe Trek. I'll share the best ones.</span></div>
  <div class="by">Follow <b>Techpe Trek</b> for more AI flex 🚀</div>`, ++n));

const css = `
@font-face{font-family:AxW;src:url(${fonts}/Archivo-w1250-900.ttf)}
@font-face{font-family:Ax9;src:url(${fonts}/Archivo-w1000-900.ttf)}
@font-face{font-family:Ax7;src:url(${fonts}/Archivo-w1000-700.ttf)}
@font-face{font-family:Ax5;src:url(${fonts}/Archivo-w1000-500.ttf)}
@font-face{font-family:Mono;src:url(${fonts}/src/IBMPlexMono-Medium.ttf)}
@font-face{font-family:MonoB;src:url(${fonts}/src/IBMPlexMono-SemiBold.ttf)}
@page{size:108mm 192mm;margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:#121410;color:#efeee4}
.page{width:108mm;height:192mm;padding:11mm 8mm 10mm;position:relative;overflow:hidden;page-break-after:always;font:8.4pt/1.42 Ax5}
a{color:#d8fa79;text-decoration:none}
b{font-family:Ax7;font-weight:normal}
code{font:7pt Mono;color:#d8fa79}
.kick{font:7.4pt MonoB;color:#d8fa79;margin-bottom:3.2mm}
h1{font:40pt/0.92 AxW;margin:0;letter-spacing:-.3pt}
h2{font:19pt/1.0 Ax9;margin:0 0 4mm;letter-spacing:-.2pt}
h3{font:10pt Ax9;margin:4mm 0 2mm;color:#d8fa79}
p{margin:0 0 2.4mm}
.small{font-size:7.6pt;color:#c9c9bd}
.foot{position:absolute;left:8mm;right:8mm;bottom:5mm;display:flex;justify-content:space-between;font:6pt Mono;color:#6d7363}
.cover{padding-top:9mm}
.cover .strip{display:flex;gap:2mm;margin:0 0 7mm}
.cover .strip img{width:21.5mm;height:38.2mm;object-fit:cover;border-radius:2mm}
.cover h1{color:#efeee4}
.cover .iq{font:30pt/0.95 AxW;color:#d8fa79;margin:2mm 0 5mm}
.iq span{font:13pt Ax9;color:#efeee4;letter-spacing:1.5pt}
.cover .lede{font:9.4pt/1.35 Ax5;color:#dcdccf;max-width:84mm}
.by{position:absolute;bottom:10mm;left:8mm;font:8pt Mono;color:#c9c9bd}
.by b{color:#d8fa79;font-family:MonoB}
.toc{list-style:none;padding:0;margin:0 0 4mm;counter-reset:t}
.toc li{counter-increment:t;padding:1.6mm 0;border-bottom:.3mm solid #2c3127;display:grid;grid-template-columns:7mm 1fr;column-gap:1mm}
.toc li:before{content:counter(t,decimal-leading-zero);font:7pt MonoB;color:#d8fa79;grid-row:span 2;padding-top:.6mm}
.toc li b{font:9pt Ax9}
.toc li span{font:7.2pt Ax5;color:#b9bbad}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1.5mm;margin:3mm 0}
.stats div{background:#1d211a;border-radius:2mm;padding:2.2mm 2mm}
.stats b{display:block;font:12pt Ax9;color:#d8fa79}
.stats span{font:6pt Mono;color:#a9ab9c}
.stats.four b{font-size:9.6pt}
.steps{padding-left:4.5mm;margin:0}
.steps li{margin-bottom:1.8mm}
.steps.tight li{margin-bottom:1.2mm;font-size:7.6pt}
.box{background:#1b1e18;border:.3mm solid #3a4034;border-radius:2.5mm;padding:3.2mm;font:6.4pt/1.46 Mono;color:#efeee4;white-space:pre-wrap;margin:0}
.card{background:#1b1e18;border-radius:2.5mm;padding:2.8mm 3.2mm;margin-bottom:2.4mm;border-left:.8mm solid #d8fa79}
.card .ct{display:flex;justify-content:space-between;align-items:baseline}
.card .ct a{font:10.5pt Ax9;color:#efeee4}
.card .ct span{font:6pt Mono;color:#ff6a3d}
.card .cu{font:6.4pt Mono;margin:.4mm 0 1.4mm}
.card p{font-size:7.6pt;margin:0 0 1mm;color:#dcdccf}
.card .open{font-size:6.8pt;color:#a9ab9c}
.mini{font-size:7.2pt;color:#c9c9bd;margin-top:2mm}
img.wide{width:100%;height:38mm;object-fit:cover;object-position:center 42%;border-radius:2.5mm;margin:0 0 3mm}
img.wide.short{height:44mm;margin-top:3mm;object-position:center 21%}
.rules{padding-left:0;list-style:none;counter-reset:r;margin:0}
.rules li{counter-increment:r;position:relative;padding:2.3mm 0 2.3mm 10mm;border-bottom:.3mm solid #2c3127;font-size:8.4pt}
.rules li:before{content:counter(r,decimal-leading-zero);position:absolute;left:0;top:2.1mm;font:12pt Ax9;color:#d8fa79;line-height:1}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}
.grid figure{margin:0}
.grid img{width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:1.6mm;display:block}
.grid figcaption{font:5.8pt/1.3 Mono;color:#c9c9bd;margin-top:.8mm}
.grid figcaption b{font-family:MonoB;color:#d8fa79}
.md{font-size:7.25pt;line-height:1.42}
.md h3{font-size:8.6pt;margin:3mm 0 1.4mm}
.md h3:first-child{margin-top:0}
.md ul,.md ol{padding-left:4.2mm;margin:0 0 1.6mm}
.md li{margin-bottom:1.1mm}
.md p{margin:0 0 1.6mm}
.md code{font-size:6.5pt}
.check{padding-left:4mm;margin:0}
.check li{margin-bottom:2mm;font-size:7.8pt}
.end .iq.small2{font:14pt/1.05 AxW;color:#d8fa79;margin:5mm 0}
.end .iq.small2 span{font:9pt Ax5;color:#efeee4;letter-spacing:0}
`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Claude Opus 5.5 · 200IQ Implementation</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`;
mkdirSync(path.join(kit, 'src/preview'), { recursive: true });
const htmlPath = path.join(kit, 'src/kit.html');
writeFileSync(htmlPath, html);

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
try {
  const pg = await browser.newPage({ viewport: { width: 408, height: 726 }, deviceScaleFactor: 2 });
  await pg.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  // report any page whose content overflows its 9:16 box
  const over = await pg.evaluate(() => Array.from(document.querySelectorAll('.page')).map((p, i) => {
    const el = p as HTMLElement; let max = 0;
    el.querySelectorAll('*').forEach((c) => { const r = (c as HTMLElement).getBoundingClientRect(); max = Math.max(max, r.bottom); });
    const box = el.getBoundingClientRect(); return { page: i + 1, overflowPx: Math.round(max - (box.bottom - 18)) };
  }).filter((x) => x.overflowPx > 0));
  console.log(over.length ? `overflow: ${JSON.stringify(over)}` : 'no page overflows');
  const handles = await pg.$$('.page');
  for (let i = 0; i < handles.length; i++) await handles[i]!.screenshot({ path: path.join(kit, 'src/preview', `p_${String(i + 1).padStart(2, '0')}.png`) });
  const pdf = path.join(kit, 'claude-opus 5.5 200IQ implementation.pdf');
  await pg.pdf({ path: pdf, width: '108mm', height: '192mm', printBackground: true, preferCSSPageSize: true });
  console.log(`wrote ${pdf} (${handles.length} pages)`);
} finally { await browser.close(); }
