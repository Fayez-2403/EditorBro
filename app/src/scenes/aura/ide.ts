// The workstation: the user's real VS Code + Claude Code (their screenshots and screen recording), with the reel's six prompts
// composited into the real Claude Code input box. A clean base is made once from user_9.png: the old conversation, the
// attachments and the typed text are painted out (the real toolbar, model chip, send button, explorer and terminal stay), the
// session is retitled. Per frame the prompt types into it. Shots (data/aura/cues.json): rec (the real recording), model (the
// real model picker), check (BUILD CHECK: only capabilities this repo really has), prompt 1-4, stages (Claude's to-do list
// ticking on the beats), fix (a real frame of Render 04 from before its fix, the prompt, the real contact sheet), and the
// montage flashes: code (prompts 5 and 6) and term (commands and output this project really ran).
import { A, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, mono, txt, ax, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';
import { R1_CURSOR } from './r1_type';

export const PROMPTS = [
  'Build a beat-synced cinematic kinetic typography sequence. Frame-exact. 60 fps. Render and validate.',
  'Sharper timing. Stronger contrast. Next: premium product UI.',
  'Build a cinematic chrome-and-glass 3D brand reveal. Precise material animation. Multiple cameras. Frame-check the output.',
  'Fix reflection clipping. Reduce artifacts. Check frames again. Render final.',
  'Real-time cinematic volcano simulation, fluid-inspired smoke and dynamic lava.',
  'Cinematic procedural pit stop: an open-wheel race car, coordinated crew movement, physical camera motion, realistic timing, detailed materials.',
];
/** V3's one major prompt: the brief, motion-first, with the skills it attaches (all installed in this repo) and the beat map. */
export const MAJOR_PROMPT = 'Build THE EDITOR’S AURA: a 9:16, 60 fps reel locked to Dubplate’s measured beat grid. Seven renders, all code: kinetic type, a product UI film, audio-reactive shaders, a chrome + glass logo, a volcano, a pit stop, and a robot that breakdances on every kick. Springs, speed ramps, whip cuts. Frame-check everything.';
export const MAJOR_SKILLS = ['/reel-pipeline', '/music-to-video', '/10-music-video', '/hyperframes-animation', '/motion-effects', '/title-sequence-3d', '/02-3d-cgi', '/11-social-hook'];
export const MAJOR_FILES = ['song_map.json', 'song.wav'];
// geometry of user_9.png (2558x1490), measured from the pixels
const BOX = { x0: 924, y0: 837, x1: 2282, y1: 1222, div: 1148 }, TXT = { x: 958, y: 908, w: 990, lh: 58 }, SEND = { x: 2244, y: 1187 };
const UI = '"Segoe UI", "Segoe UI Variable", system-ui, sans-serif', MONO = '"Cascadia Mono", Consolas, "Courier New", monospace';
const BORDER = '#6FC3DF';
const STAGES: [string, string][] = [
  ['PLAN', '36 bars · 70 events on the eighth grid'], ['BUILD', 'app/src/scenes/aura/r1_type.ts'], ['PREVIEW', 'stills · 20.3 → 27.7 s'],
  ['CHECK', 'contact sheet · 0 events off the grid'], ['RENDER', '1080×1920 · 60 fps'],
];
const TODOS = ['Plan the beat map: 36 bars, 70 events on the grid', 'Build Render 01 (kinetic type + music machine)', 'Preview stills across the render',
  'Check a contact sheet against the beat', 'Render 1080×1920 at 60 fps'];
const CHECKS: [string, string][] = [
  ['Beat grid, measured', 'librosa · 95.002 BPM · fit 31.2 ms (95%)'], ['Frame-exact seek(t)', 'pdoom engine · every frame a function of t'],
  ['Spring motion system', 'spring() / springTo() · _vo.ts'], ['Canvas UI choreography', 'Layer2D · 2D canvas plates'],
  ['Three.js / WebGL 2', 'three 0.186 · shaders, PBR, particles'], ['FFmpeg render pipeline', 'render.ts · H.264 · yuv420p · bt709'],
  ['Synthesized SFX', 'foley from the cue sheet · aura_mix.py'], ['Frame QA', 'reel_qa.py · stills · contact sheets'],
];
const TERM: string[][] = [
  ['PS C:\\Users\\ce\\motion-as-code\\app> bun scripts/render.ts stills --variant aura --t 65.8,66.3,67.9 --out ../out/wip_aura/r5b',
    '..\\out\\wip_aura\\r5b\\f_0065.80.png', '..\\out\\wip_aura\\r5b\\f_0066.30.png', '..\\out\\wip_aura\\r5b\\f_0067.90.png'],
  ['PS C:\\Users\\ce\\motion-as-code> python analysis/aura_cues.py', '18 segments, 70 Dubplate events (0 off the eighth grid: []) + 16 intro events (measured words/hits), 11 intercuts, 121 foley cues',
    '   60.63- 70.74 r5      {}', '   70.74- 80.84 r6      {}'],
  ['PS C:\\Users\\ce\\motion-as-code> python analysis/aura_songmap.py', '95.002 BPM, eighth 0.31578 s, fit 95% within 31.2 ms',
    'window [100.947, 190.947]', 'anchors: final_slam 88.419, cut_to_black 89.682'],
];

type Rect = { x: number; y: number; w: number };
/** Draw a source-space painter into a rounded window: source rect (sx, sy, sw, sh) -> column rect (x, y, w, w*sh/sw). */
function view(c: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number, r: Rect, paint: (c: CanvasRenderingContext2D) => void, glow = 0.5) {
  const s = r.w / sw, h = sh * s;
  c.save(); c.shadowColor = alpha(A.teal, 0.35 * glow); c.shadowBlur = 36; fillRR(c, r.x, r.y, r.w, h, 14, '#000'); c.restore();
  c.save(); c.beginPath(); c.roundRect(r.x, r.y, r.w, h, 14); c.clip();
  c.translate(r.x, r.y); c.scale(s, s); c.translate(-sx, -sy); paint(c); c.restore();
  c.save(); c.beginPath(); c.roundRect(r.x + 0.5, r.y + 0.5, r.w - 1, h - 1, 14); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 1; c.stroke(); c.restore();
  return { s, h, map: (u: number, v: number): [number, number] => [r.x + (u - sx) * s, r.y + (v - sy) * s] };
}
function wrap(c: CanvasRenderingContext2D, s: string, w: number) {
  const out: string[] = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? line + ' ' + word : word; if (c.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}

export function ideWorld(): World {
  let x!: AuraCtx; let e8 = 0, beat = 0;
  let base!: HTMLCanvasElement, lines: string[][] = [], majorLines: string[] = [];
  const typed = (i: number, n: number, caret: boolean) => ({ i, n, caret });
  type In = { i: number; n: number; caret: boolean } | null;
  /** user_9 with our state on top: the prompt in the box, a send pulse, the conversation (a bubble + the to-do list), the terminal. */
  const paint9 = (st: { input: In; send?: number; conv?: { prompt: number; todo: number; t: number } }) => (c: CanvasRenderingContext2D) => {
    c.drawImage(base, 0, 0);
    if (st.input) {
      const L = lines[st.input.i]!; let n = st.input.n, cx = TXT.x, cy = TXT.y;
      c.font = `400 44px ${UI}`; c.fillStyle = '#F2F2F2'; c.textBaseline = 'alphabetic';
      for (let k = 0; k < L.length && n > 0; k++) {
        const s = L[k]!.slice(0, n); c.fillText(s, TXT.x, TXT.y + k * TXT.lh); n -= L[k]!.length + 1;
        cx = TXT.x + c.measureText(s).width + 4; cy = TXT.y + k * TXT.lh;
      }
      if (st.input.n === 0) { c.fillStyle = '#7A7A7A'; c.fillText('Queue another message…', TXT.x, TXT.y); cx = TXT.x; }
      if (st.input.caret) { c.fillStyle = '#FFFFFF'; c.fillRect(cx, cy - 38, 3, 50); }
    }
    if (st.send) { c.save(); c.globalAlpha = st.send; c.strokeStyle = '#FF8A65'; c.lineWidth = 6; c.beginPath(); c.arc(SEND.x, SEND.y, 30 + 70 * (1 - st.send), 0, Math.PI * 2); c.stroke(); c.restore(); }
    if (st.conv) {
      const { prompt, todo, t } = st.conv;
      c.font = `400 30px ${UI}`; const L = wrap(c, PROMPTS[prompt]!, 1640);
      c.beginPath(); c.roundRect(700, 250, 1780, 50 + L.length * 42, 10); c.strokeStyle = BORDER; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#F2F2F2'; L.forEach((l, k) => c.fillText(l, 728, 300 + k * 42));
      const y0 = 300 + L.length * 42 + 80;
      c.fillStyle = '#E8E8E8'; c.font = `600 30px ${UI}`; c.fillText('Update Todos', 730, y0);
      c.font = `400 30px ${UI}`;
      TODOS.forEach((s, k) => {
        const done = k < todo, y = y0 + 56 + k * 50;
        c.strokeStyle = done ? '#43D58A' : '#8A8A8A'; c.lineWidth = 2.5; c.strokeRect(742, y - 24, 26, 26);
        if (done) { c.strokeStyle = '#43D58A'; c.lineWidth = 4; c.beginPath(); c.moveTo(747, y - 11); c.lineTo(754, y - 3); c.lineTo(766, y - 20); c.stroke(); }
        c.fillStyle = done ? '#9AA3AD' : '#F2F2F2'; c.fillText(s, 790, y);
        if (done) { c.fillStyle = '#9AA3AD'; c.fillRect(790, y - 10, c.measureText(s).width, 2); }
      });
      const dots = '.'.repeat(1 + (Math.floor(t * 4) % 3));
      c.fillStyle = '#FF8A65'; c.font = `600 30px ${UI}`; c.fillText(todo < 5 ? `Working${dots}` : 'Done', 730, y0 + 56 + 5 * 50 + 30);
    }
  };
  /** The room behind the monitors: the placeholder backshot, blurred and graded (default cool, golden, night with the lamp). */
  const room = (c: CanvasRenderingContext2D, t: number, kind: string, t0: number) => {
    const lt = t - t0, at = kind === 'golden' ? 2.2 + lt * 0.35 : kind === 'night' ? 6.2 + lt * 0.35 : 8.6 + lt * 0.4;
    const f = x.frame('ph', Math.min(9.75, at));   // only the clip's first 10 s
    c.fillStyle = '#05070A'; c.fillRect(0, 0, FXW, FXH);
    if (f) { c.save(); c.filter = 'blur(9px) brightness(0.42) saturate(1.1)'; c.drawImage(f, -30, -50, FXW + 60, FXH + 100); c.restore(); }
    const tint = kind === 'golden' ? 'rgba(255,160,70,0.20)' : kind === 'night' ? 'rgba(18,34,86,0.42)' : 'rgba(20,70,90,0.16)';
    c.fillStyle = tint; c.fillRect(0, 0, FXW, FXH);
    if (kind === 'night') {   // the lamp switches on at rt3.lamp
      const k = ease.out(span(t, x.ev('rt3.lamp'), x.ev('rt3.lamp') + 0.25), 3);
      const g = c.createRadialGradient(80, 980, 10, 80, 980, 520); g.addColorStop(0, `rgba(255,190,110,${0.45 * k})`); g.addColorStop(1, 'rgba(255,190,110,0)');
      c.fillStyle = g; c.fillRect(0, 0, FXW, FXH);
    }
    const v = c.createRadialGradient(CX, 520, 200, CX, 520, 800); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = v; c.fillRect(0, 0, FXW, FXH);
  };
  const label = (c: CanvasRenderingContext2D, s: string, y: number, col: string = alpha(A.text, 0.7)) => txt(c, s, 18, y, mono(11, 600), col, 1.8, 'left');
  const corner = (c: CanvasRenderingContext2D) => { txt(c, 'BACKSHOT · AI PLACEHOLDER', FXW - 18, 1052, mono(9, 600), alpha(A.text, 0.35), 1.2, 'right'); };
  /** The two-up prompt layout: the whole IDE (the composite) above, the input box magnified below. */
  const promptShot = (c: CanvasRenderingContext2D, t: number, st: { input: In; send?: number }, idx: number, enter: number | null, pop: number) => {
    const k = spring(pop, 0.4, 0.75);
    c.save(); c.globalAlpha = sat(pop / 0.12);
    const mon = view(c, 0, 0, 2558, 1490, { x: 16, y: 150 + (1 - k) * 30, w: 576 }, paint9(st));
    label(c, 'VS CODE · CLAUDE CODE · OPUS 5.5 · THE USER\u2019S IDE', 138 + (1 - k) * 30);
    const mag = view(c, 900, 822, 1090, 410, { x: 16, y: 560 + (1 - k) * 50, w: 576 }, paint9(st), 1);
    // connectors from the box in the IDE to the magnified view
    const [a0, b0] = mon.map(BOX.x0, BOX.y1), [a1, b1] = mon.map(1990, BOX.y1);
    c.strokeStyle = alpha(A.teal, 0.35); c.lineWidth = 1; c.beginPath(); c.moveTo(a0, b0); c.lineTo(16, 560 + (1 - k) * 50); c.moveTo(a1, b1); c.lineTo(592, 560 + (1 - k) * 50); c.stroke();
    c.strokeStyle = alpha(A.teal, 0.8); c.lineWidth = 1.5; c.strokeRect(...mon.map(BOX.x0, BOX.y0), (1990 - BOX.x0) * mon.s, (BOX.y1 - BOX.y0) * mon.s);
    txt(c, `PROMPT ${String(idx + 1).padStart(2, '0')} / 06`, 18, 548 + (1 - k) * 50, mono(12, 700), A.teal, 2, 'left');
    if (enter !== null && t >= enter - 0.06) txt(c, '↵ ENTER', FXW - 18, 548 + (1 - k) * 50, mono(12, 700), alpha(A.amber, 1 - sat((t - enter) / 0.4)), 2, 'right');
    void mag; c.restore();
  };
  return {
    init(ctx) {
      x = ctx; e8 = x.cues.eighth; beat = x.cues.beat;
      const u9 = x.screens.user_9!.img;
      base = document.createElement('canvas'); base.width = 2558; base.height = 1490; const g = base.getContext('2d')!;
      g.drawImage(u9, 0, 0);
      g.fillStyle = '#000';
      g.fillRect(660, 188, 1885, 644);              // the old conversation
      g.fillRect(670, 133, 1030, 54);               // the session title
      g.fillRect(1112, 60, 318, 40);                // the tab label
      g.fillRect(927, 841, 1352, 305);              // the input box: attachments + text
      g.fillRect(660, 1334, 1885, 88);              // the terminal body
      g.fillStyle = '#F2F2F2'; g.font = `600 32px ${UI}`; g.fillText('Opus 5.5: The Editor\u2019s Aura', 681, 172);
      g.fillStyle = '#E6E6E6'; g.font = `400 28px ${UI}`; g.fillText('The Editor\u2019s Aura', 1117, 91);
      g.fillStyle = '#CCCCCC'; g.font = `400 30px ${MONO}`; g.fillText('PS C:\\Users\\ce\\motion-as-code>', 690, 1377);
      g.font = `400 44px ${UI}`; lines = PROMPTS.map((p) => wrap(g, p, TXT.w));
      g.font = `400 32px ${UI}`; majorLines = wrap(g, MAJOR_PROMPT, 990);
    },
    draw(c, t, p) {
      const shot = p.shot as string, montage = !!p.montage;
      if (shot === 'major') {   // V3: the one major prompt, its skills attached as chips, the box grown tall (V3 times in p)
        const t0 = p.t0 as number, ty0 = p.ty0 as number, ty1 = p.ty1 as number, en = p.enter as number;
        room(c, t, 'default', t0);
        const chips = [...MAJOR_SKILLS.map((s) => [s, 'skill']), ...MAJOR_FILES.map((s) => [s, 'file'])] as [string, string][];
        const nChip = Math.min(chips.length, Math.floor(Math.max(0, t - t0) / (e8 * 0.5)) + (t >= t0 ? 1 : 0));
        const n = Math.round(MAJOR_PROMPT.length * sat((t - ty0) / (ty1 - ty0))), sent = t >= en;
        const paintMajor = (g: CanvasRenderingContext2D) => {
          g.drawImage(base, 0, 0);
          g.fillStyle = '#000'; g.fillRect(925, 540, 1355, 606);
          g.beginPath(); g.roundRect(923.5, 540, 1358, 682, 16); g.strokeStyle = BORDER; g.lineWidth = 2; g.stroke();
          g.font = `500 25px ${UI}`; let cx = 958, cy = 566;
          chips.slice(0, sent ? chips.length : nChip).forEach(([s, kind]) => {
            const w = g.measureText(s).width + 58; if (cx + w > 1950) { cx = 958; cy += 60; }
            g.beginPath(); g.roundRect(cx, cy, w, 48, 8); g.fillStyle = '#161616'; g.fill(); g.strokeStyle = kind === 'skill' ? 'rgba(217,119,87,0.85)' : 'rgba(111,195,223,0.85)'; g.lineWidth = 2; g.stroke();
            g.fillStyle = kind === 'skill' ? '#D97757' : '#6FC3DF'; g.fillRect(cx + 14, cy + 15, 18, 18);
            g.fillStyle = '#E6E6E6'; g.fillText(s, cx + 42, cy + 33); cx += w + 12;
          });
          if (!sent) {
            g.font = `400 32px ${UI}`; g.fillStyle = '#F2F2F2'; let left = n, ly = 812, lastX = 958;
            for (const l of majorLines) { if (left <= 0) break; const ss = l.slice(0, left); g.fillText(ss, 958, ly); lastX = 958 + g.measureText(ss).width; left -= l.length + 1; ly += 42; }
            if (Math.floor(t * 2.5) % 2 === 0 || n < MAJOR_PROMPT.length) { g.fillStyle = '#FFFFFF'; g.fillRect(lastX + 3, ly - 42 - 30, 3, 40); }
          } else { g.font = `400 32px ${UI}`; g.fillStyle = '#7A7A7A'; g.fillText('Queue another message…', 958, 812); }
          if (t >= en - 0.06) { g.save(); g.globalAlpha = 1 - sat((t - en) / 0.4); g.strokeStyle = '#FF8A65'; g.lineWidth = 6; g.beginPath(); g.arc(SEND.x, SEND.y, 30 + 70 * sat((t - en) / 0.4), 0, Math.PI * 2); g.stroke(); g.restore(); }
        };
        const k = spring(t - t0, 0.4, 0.75);
        c.save(); c.globalAlpha = sat((t - t0) / 0.1);
        view(c, 0, 0, 2558, 1490, { x: 16, y: 110 + (1 - k) * 30, w: 576 }, paintMajor);
        label(c, 'VS CODE · CLAUDE CODE · OPUS 5.5 · THE USER’S IDE', 98 + (1 - k) * 30);
        view(c, 900, 528, 1090, 700, { x: 16, y: 468 + (1 - k) * 50, w: 576 }, paintMajor, 1);
        txt(c, 'THE PROMPT', 18, 456 + (1 - k) * 50, mono(12, 700), A.teal, 2, 'left');
        const ns = Math.min(MAJOR_SKILLS.length, nChip), nf = Math.max(0, Math.min(MAJOR_FILES.length, nChip - MAJOR_SKILLS.length));
        txt(c, `${sent ? MAJOR_SKILLS.length : ns} SKILLS + ${sent ? MAJOR_FILES.length : nf} FILES ATTACHED`, FXW - 18, 456 + (1 - k) * 50, mono(12, 700), '#D97757', 1.5, 'right');
        if (t >= en - 0.06) txt(c, '↵ ENTER', CX, 868, mono(13, 700), alpha(A.amber, 1 - sat((t - en) / 0.5)), 2, 'center');
        c.restore(); corner(c); return;
      }
      if (montage && shot === 'code') {   // prompts 5 and 6, flashed on the fast vocal
        room(c, t, 'night', 60.63);
        const i = p.k === 2 ? 5 : 4, n = p.k === 0 ? Math.round(lines[4]!.join(' ').length * (0.55 + 0.3 * sat((t - p.t0) / e8))) : 999;
        promptShot(c, t, { input: typed(i, n, true), send: p.k ? 1 - sat((t - p.t0) / e8) : 0 }, i, p.k ? p.t0 : null, 1);
        corner(c); return;
      }
      if (montage && shot === 'term') {   // the terminal, with commands this project ran
        room(c, t, 'night', 60.63);
        const L = TERM[Math.min(2, p.k)]!, k = sat((t - p.t0) / (e8 * 0.7));
        const r = view(c, 655, 1250, 1100, 84, { x: 16, y: 330, w: 576 }, (g) => g.drawImage(base, 0, 0), 1);
        fillRR(c, 16, 330 + r.h - 6, 576, 300, 10, '#000'); c.strokeStyle = 'rgba(255,255,255,0.14)'; c.strokeRect(16.5, 330 + r.h - 6, 575, 300);
        let y = 330 + r.h + 24, shown = 0; const all = L.flatMap((s) => { const out: string[] = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).length > 58 && line) { out.push(line); line = '  ' + w; } else line = line ? line + ' ' + w : w; } out.push(line); return out; });
        const nShow = Math.max(1, Math.round(all.length * (0.35 + 0.65 * k)));
        for (const s of all) { if (shown++ >= nShow) break; txt(c, s, 30, y, `400 13px ${MONO}`, s.startsWith('PS ') || shown === 1 ? '#F2F2F2' : '#BDBDBD', 0, 'left'); y += 20; }
        label(c, 'TERMINAL · THE USER\u2019S IDE', 318); corner(c); return;
      }
      if (shot === 'rec') {   // the real screen recording
        const t0 = x.ev('ide.in'), lt = t - t0, k = spring(lt, 0.4, 0.7);
        room(c, t, 'default', t0);
        const f = x.frame('rec', lt * 1.4), z = 1 + 0.35 * ease.inOut(span(lt, 0.2, 1.26), 2), sw = 1600 / z, sh = 934 / z;
        const sx = Math.max(0, Math.min(1600 - sw, 610 - sw / 2)), sy = (934 - sh) / 2;   // push in on the Claude Code panel
        view(c, sx, sy, sw, sh, { x: 16, y: 230 + (1 - k) * 40, w: 576 }, (g) => { if (f) g.drawImage(f, 0, 0); });
        label(c, 'THE USER\u2019S IDE · SCREEN RECORDING', 218 + (1 - k) * 40);
        ['VS CODE', 'CLAUDE CODE', 'OPUS 5.5'].forEach((s, i) => {
          const tk = t0 + i * beat, kk = spring(t - tk, 0.3, 0.6); if (t < tk) return;
          const w = 150, xx = 16 + i * 196;
          c.save(); c.globalAlpha = sat((t - tk) / 0.08); c.translate(xx + w / 2, 640); c.scale(kk, kk); fillRR(c, -w / 2, -26, w + 30, 52, 26, i === 2 ? A.teal : 'rgba(255,255,255,0.08)');
          txt(c, s, 15, 7, ax(17, 110, 800), i === 2 ? '#04191C' : A.text, 1.5, 'center'); c.restore();
        });
        corner(c); return;
      }
      if (shot === 'model') {   // the real model picker: Opus 5.5 is checked
        const t0 = x.ev('ide.model'), lt = t - t0;
        room(c, t, 'default', t0);
        const u11 = x.screens.user_11!.img, sw = 1390, sh = 480;
        const r = view(c, 0, 0, sw, sh, { x: 16, y: 220, w: 576 }, (g) => g.drawImage(u11, 0, 0), 1);
        const hk = ease.out(span(lt, e8, 2 * e8), 3);
        if (hk > 0) { c.save(); c.strokeStyle = alpha(A.teal, hk); c.lineWidth = 2.5; const [a, b] = r.map(22, 60); c.strokeRect(a, b, 1330 * r.s, 76 * r.s); c.restore(); }
        label(c, 'CLAUDE CODE · /model · THE USER\u2019S SCREEN', 208);
        const tk = t0 + 2 * e8, kk = spring(t - tk, 0.35, 0.55);
        if (t >= tk) {
          c.save(); c.translate(CX, 720); c.scale(kk, kk); txt(c, 'OPUS 5.5', 0, 0, ax(74, 125, 900), A.text, 2, 'center'); c.restore();
          txt(c, 'EFFORT · EXTRA HIGH', CX, 768, mono(14, 700), alpha(A.teal, sat((t - tk) / 0.15)), 3, 'center');
        }
        corner(c); return;
      }
      if (shot === 'check') {   // BUILD CHECK: each line a real capability of this repo
        const t0 = x.ev('check.0');
        room(c, t, 'default', t0);
        const k = spring(t - t0, 0.4, 0.75);
        c.save(); c.globalAlpha = sat((t - t0) / 0.1); c.translate(0, (1 - k) * 40);
        fillRR(c, 20, 150, 568, 676, 18, 'rgba(8,11,16,0.86)'); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.strokeRect(20.5, 150.5, 567, 675);
        txt(c, 'BUILD CHECK', 44, 200, ax(30, 125, 900), A.text, 2, 'left');
        txt(c, 'motion-as-code · only what this repo really has', 44, 226, mono(11, 600), A.dim, 0.8, 'left');
        CHECKS.forEach(([n, d], i) => {
          const tk = t0 + i * e8, ok = t >= tk, y = 270 + i * 68, kk = ok ? spring(t - tk, 0.25, 0.5) : 0;
          fillRR(c, 40, y, 528, 56, 10, ok ? 'rgba(63,214,224,0.07)' : 'rgba(255,255,255,0.03)');
          c.save(); c.translate(68, y + 28); c.scale(0.6 + 0.4 * kk, 0.6 + 0.4 * kk);
          c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fillStyle = ok ? A.green : 'rgba(255,255,255,0.08)'; c.fill();
          if (ok) { c.strokeStyle = '#04140B'; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, 0); c.lineTo(-1.5, 5); c.lineTo(6.5, -5); c.stroke(); }
          c.restore();
          txt(c, n, 96, y + 25, ax(18, 105, 800), ok ? A.text : A.faint, 0, 'left');
          txt(c, d, 96, y + 45, mono(11, 500), ok ? A.dim : alpha(A.faint, 0.6), 0, 'left');
          if (ok) c.fillStyle = alpha(A.teal, 0.5 * pulse(t, tk, 0.08)), c.fillRect(40, y, 528, 56);
        });
        const all = t >= t0 + 7 * e8;
        txt(c, all ? '8 / 8 READY' : `${Math.min(8, Math.floor((t - t0) / e8) + 1)} / 8`, 568, 200, mono(13, 700), all ? A.green : A.dim, 2, 'right');
        c.restore(); corner(c); return;
      }
      if (shot === 'prompt') {
        const i = (p.prompt as number) - 1, room0 = (p.room as string) ?? 'default';
        const key = i === 0 ? ['prompt1.type', 'prompt1.enter'] : i === 1 ? ['rt1.type', 'rt1.enter'] : ['rt3.type', 'rt3.enter'];
        const t0 = i === 0 ? x.ev('assets.in') : i === 1 ? x.ev('rt1.in') : x.ev('rt3.in'), ty = x.ev(key[0]!), en = x.ev(key[1]!);
        room(c, t, room0, t0);
        const len = PROMPTS[i]!.length, n = Math.round(len * sat((t - ty) / (en - e8 - ty)));
        promptShot(c, t, { input: typed(i, t < ty ? 0 : n, true), send: t >= en - 0.06 ? 1 : 0 }, i, en, t - t0);
        if (i === 1 && t < ty) {   // the caret from Render 01 travels into the box
          const kk = ease.inOut(span(t, t0, ty), 3), tx = 16 + (TXT.x - 900) * (576 / 1090), tyy = 560 + (TXT.y - 822) * (576 / 1090) - 18;
          c.fillStyle = A.teal; c.fillRect(R1_CURSOR.x + (tx - R1_CURSOR.x) * kk, R1_CURSOR.y + (tyy - R1_CURSOR.y) * kk - 22, 4, 30);
        }
        corner(c); return;
      }
      if (shot === 'stages') {   // Claude works: the to-do list ticks on the beats; the stage pills below
        const t0 = x.ev('stage.0');
        room(c, t, 'default', t0);
        const done = [0, 1, 2, 3, 4].filter((k) => t >= x.ev(`stage.${k}`) + e8 * 0.9).length;
        view(c, 0, 0, 2558, 1490, { x: 16, y: 150, w: 576 }, paint9({ input: typed(0, 0, false), conv: { prompt: 0, todo: done, t } }));
        view(c, 660, 200, 1300, 600, { x: 16, y: 500, w: 576 }, paint9({ input: typed(0, 0, false), conv: { prompt: 0, todo: done, t } }), 1);
        label(c, 'CLAUDE CODE · WORKING', 138);
        STAGES.forEach(([s, d], k) => {
          const tk = x.ev(`stage.${k}`), on = t >= tk, y = 802, xx = 18 + k * 115;
          const kk = on ? spring(t - tk, 0.25, 0.5) : 0;
          c.save(); c.translate(xx + 52, y); c.scale(0.85 + 0.15 * kk, 0.85 + 0.15 * kk);
          fillRR(c, -52, -22, 104, 44, 22, on ? (k === done - 1 || (k === 4 && on) ? A.teal : alpha(A.teal, 0.25)) : 'rgba(255,255,255,0.06)');
          txt(c, s, 0, 6, ax(14, 110, 800), on ? (k === 4 || k === done - 1 ? '#04191C' : A.text) : A.faint, 1.2, 'center'); c.restore();
          if (on && t < tk + beat) txt(c, d, CX, 848, mono(12, 600), alpha(A.text, 1 - sat((t - tk - beat * 0.7) / (beat * 0.3))), 0.8, 'center');
        });
        corner(c); return;
      }
      if (shot === 'fix') {   // the artifact (a real frame of Render 04 before its fix), the prompt, the real contact sheet
        const t0 = x.ev('rt4.in'), art = x.ev('rt4.artifact'), fx = x.ev('rt4.fix'), sh = x.ev('rt4.sheet'), ps = x.ev('rt4.pass'), dv = x.ev('rt4.dive');
        room(c, t, 'night', t0);
        const zoom = ease.in(span(t, dv, dv + e8), 2.5);
        c.save(); c.translate(CX, 470); c.scale(1 + 4 * zoom, 1 + 4 * zoom); c.translate(-CX, -470);
        if (t < sh) {
          const a = x.thumbs.r4_artifact, ak = spring(t - art, 0.35, 0.7), small = ease.inOut(span(t, fx, fx + 2 * e8), 3);
          if (a && t >= art) {
            const w = 300 - 150 * small, h = w * 540 / 304, ax0 = CX - w / 2 - 140 * small, ay = 150 + (1 - ak) * 40;
            c.save(); c.globalAlpha = sat((t - art) / 0.1); c.drawImage(a, ax0, ay, w, h);
            c.strokeStyle = A.red; c.lineWidth = 2.5; c.beginPath(); c.arc(ax0 + w * 0.5, ay + h * 0.66, w * 0.34, 0, Math.PI * 2); c.stroke();
            txt(c, 'ARTIFACT · R04 v1', ax0, ay - 10, mono(11, 700), A.red, 1.5, 'left');
            txt(c, 'chrome reflects black', ax0, ay + h + 18, mono(11, 600), alpha(A.text, 0.8), 0.5, 'left');
            c.restore();
          }
          if (t >= fx) {
            const n = Math.round(PROMPTS[3]!.length * sat((t - fx) / (sh - fx - e8)));
            const pk = spring(t - fx, 0.35, 0.75);
            c.save(); c.globalAlpha = sat((t - fx) / 0.1);
            view(c, 900, 822, 1090, 410, { x: 16, y: 600 + (1 - pk) * 40, w: 576 }, paint9({ input: typed(3, n, true), send: t >= sh - 0.08 ? 1 : 0 }), 1);
            txt(c, 'PROMPT 04 / 06', 18, 588 + (1 - pk) * 40, mono(12, 700), A.teal, 2, 'left');
            c.restore();
          }
        } else {
          const gk = spring(t - sh, 0.35, 0.7);
          txt(c, 'R04 v2 · CONTACT SHEET', 24, 168, mono(12, 700), A.teal, 2, 'left');
          for (let i = 0; i < 8; i++) {
            const im = x.thumbs[`sheet_${i}`], col = i % 4, row = Math.floor(i / 4), w = 134, h = w * 540 / 304;
            const xx = 24 + col * 142, yy = 186 + row * (h + 14) + (1 - gk) * (60 + i * 8);
            if (im) c.drawImage(im, xx, yy, w, h); else fillRR(c, xx, yy, w, h, 6, A.panel);
            const ok = t >= ps + i * e8 * 0.12;
            if (ok) { c.beginPath(); c.arc(xx + w - 16, yy + 16, 10, 0, Math.PI * 2); c.fillStyle = A.green; c.fill(); c.strokeStyle = '#04140B'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(xx + w - 21, yy + 16); c.lineTo(xx + w - 17, yy + 20); c.lineTo(xx + w - 11, yy + 12); c.stroke(); }
          }
          if (t >= ps) {
            const k2 = spring(t - ps, 0.3, 0.5);
            c.save(); c.translate(CX, 820); c.scale(k2, k2); c.rotate(-0.05);
            fillRR(c, -170, -34, 340, 68, 12, alpha(A.green, 0.16)); c.strokeStyle = A.green; c.lineWidth = 3; c.strokeRect(-170, -34, 340, 68);
            txt(c, 'FRAMES CHECKED · 8/8', 0, 9, ax(22, 110, 900), A.green, 2, 'center'); c.restore();
          }
        }
        c.restore();
        if (zoom > 0) { c.fillStyle = `rgba(255,200,150,${zoom * 0.9})`; c.fillRect(0, 0, FXW, FXH); }
        corner(c); return;
      }
      room(c, t, 'default', t);
    },
  };
}
