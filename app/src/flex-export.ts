// Frame-exact export for Motion Flex (Claude cut): window.__flex.render(t) draws the same scene the
// preview shows, straight onto a 1080x1920 canvas (vector, no upscale). `samples` > 1 averages
// sub-frames across a 180-degree shutter for motion blur. Every frame is a pure function of t.
import Flex, { songOf, gridAt } from './scenes/flex';
import FlexIntro from './scenes/flex_intro';
import { AudioData } from './engine/audio';
import { Lyrics } from './engine/lyrics';
import { loadFonts } from './engine/type';
import type { SceneCtx } from './engine/scene';

declare global { interface Window { __flex: any } }

async function boot() {
  await loadFonts();
  const audio = await AudioData.load();
  const q = new URLSearchParams(location.search);
  const scale = Number(q.get('scale') ?? 1);
  const W = Math.round(1080 * scale), H = Math.round(1920 * scale);
  const ctx = (start: number, end: number) => ({ audio, lyrics: new Lyrics({ lines: [] } as any), start, end, params: {}, id: 'flex' } as unknown as SceneCtx);
  const reel = new Flex(ctx(0, audio.duration));
  await reel.init();
  const off = reel.cues.reel_offset;
  const intro = off > 0 ? new FlexIntro(ctx(0, off)) : null;
  if (intro) { intro.reel = reel; await intro.init(); }
  const canvas = document.getElementById('frame') as HTMLCanvasElement;
  canvas.width = W; canvas.height = H;
  const out = canvas.getContext('2d', { alpha: false })!;
  const work = document.createElement('canvas'); work.width = W; work.height = H;
  const c = work.getContext('2d', { alpha: false })!;
  // 608 x 1080 is not exactly 9:16: scale to the full height and crop the 0.9 px of overhang
  const k = H / 1080, ox = (W - 608 * k) / 2;
  const draw = (t: number) => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#121410'; c.fillRect(0, 0, W, H);
    c.setTransform(k, 0, 0, k, ox, 0);
    if (intro && t < off) intro.drawFrame(c, t); else reel.drawFrame(c, t - off);
  };
  // 16:9 director's cut (?wide=1): the reel in the centre, the score on the left, the beat on the right
  if (q.get('wide')) {
    canvas.width = work.width = Math.round(1920 * scale); canvas.height = work.height = Math.round(1080 * scale);
    const ks = canvas.width / 1920;
    const cues = reel.cues;
    const labels: Record<string, string> = { intro: 'how it is made', hook: 'what can you build', websites: 'websites', apps: 'apps', data: 'dashboards',
      product: 'product film', motion: 'motion graphics', stories: 'animated story', worlds: 'worlds from code', sound: 'sound you can see',
      idea: 'one idea', endless: 'endless possibilities', lockup: 'motion flex' };
    const wide = (t: number) => {
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0c0e0b'; c.fillRect(0, 0, canvas.width, canvas.height);
      c.setTransform(ks, 0, 0, ks, 656 * ks, 0);
      c.save(); c.beginPath(); c.rect(0, 0, 608, 1080); c.clip();
      if (intro && t < off) intro.drawFrame(c, t); else reel.drawFrame(c, t - off);
      c.restore();
      c.setTransform(ks, 0, 0, ks, 0, 0);
      const mono = (s: number, w = 500) => `${s}px "Plex-${w}"`;
      const ax = (s: number) => `${s}px "Archivo-1250-900"`;
      // left: the score, one row per bar-locked section, the current one lit
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillStyle = '#d8fa79'; c.font = mono(16, 600); c.fillText('// the score: one section per bar', 80, 150);
      c.fillStyle = '#efeee4'; c.font = ax(44); c.fillText('MOTION FLEX', 80, 214);
      c.fillStyle = 'rgba(239,238,228,.5)'; c.font = mono(15); c.fillText('built in code with Claude Opus 5.5', 80, 246);
      cues.sections.forEach((s, i) => {
        const on = t >= s.start && t < s.end, y = 312 + i * 46;
        if (on) { c.fillStyle = '#d8fa79'; c.fillRect(72, y - 26, 500, 38); }
        c.fillStyle = on ? '#121410' : 'rgba(239,238,228,.75)'; c.font = mono(16, on ? 700 : 500);
        c.fillText(s.start.toFixed(2).padStart(5, '0'), 86, y); c.fillText(labels[s.name] ?? s.name, 186, y);
        const p = Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start)));
        c.fillStyle = on ? 'rgba(18,20,16,.35)' : 'rgba(239,238,228,.15)'; c.fillRect(452, y - 9, 100, 4);
        c.fillStyle = on ? '#121410' : 'rgba(239,238,228,.5)'; c.fillRect(452, y - 9, 100 * p, 4);
      });
      // right: the measured beat, this bar's eighths, the waveform around the playhead, the frame number
      const x0 = 1350, w = 490;
      c.fillStyle = '#d8fa79'; c.font = mono(16, 600); c.fillText('// the beat, measured from the song', x0, 150);
      const gp = gridAt(cues, t), bar = gp.sec, ph = (gp.u - gp.sec * 8) / 8;
      c.fillStyle = '#efeee4'; c.font = ax(44); c.fillText(`BAR ${String(bar + 1).padStart(2, '0')}`, x0, 214);
      c.fillStyle = 'rgba(239,238,228,.5)'; c.font = mono(15); c.fillText(`${songOf(cues).tempo} · unit ${cues.eighth.toFixed(4)} s`, x0, 246);
      for (let i = 0; i < 8; i++) { const lit = Math.floor(ph * 8) === i; c.fillStyle = lit ? '#d8fa79' : 'rgba(239,238,228,.18)'; c.fillRect(x0 + i * 61, 286, 52, lit ? 52 : 12); }
      const span = 3, wy = 520;
      for (let i = 0; i < 245; i++) {
        const tt = t - span / 2 + i / 245 * span;
        const k = Math.max(0, Math.min(cues.wave.length - 1, Math.round(tt * cues.wave_rate)));
        const v = tt < 0 || tt > cues.duration ? 0 : cues.wave[k]!;
        c.fillStyle = tt <= t ? 'rgba(239,238,228,.8)' : 'rgba(239,238,228,.25)';
        c.fillRect(x0 + i * 2, wy - 6 - v * 90, 1.4, 12 + v * 180);
      }
      for (const [kt, s] of audio.onsets.kick ?? []) {
        if (s < .45 || Math.abs(kt - t) > span / 2) continue;
        c.fillStyle = '#ff6a3d'; c.beginPath(); c.arc(x0 + (kt - t + span / 2) / span * w, wy - 130, 6, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#d8fa79'; c.fillRect(x0 + w / 2 - 1, wy - 150, 2, 300);
      c.fillStyle = 'rgba(239,238,228,.75)'; c.font = mono(16, 600);
      c.fillText(`t = ${t.toFixed(3)} s`, x0, 740); c.fillText(`frame ${String(Math.round(t * 60)).padStart(4, '0')} / ${Math.round(cues.duration * 60)}`, x0, 772);
      c.fillStyle = 'rgba(239,238,228,.45)'; c.fillText('drawFrame(c, t): every frame is a function of t', x0, 804);
      c.fillStyle = 'rgba(239,238,228,.45)'; c.font = mono(14); c.fillText(`music: ${songOf(cues).credit}`, x0, 960);
      c.fillStyle = 'rgba(239,238,228,.45)'; c.fillText('demos shown are fictional', 80, 960);
    };
    const fps = Number(q.get('fps') ?? 60);
    window.__flex = {
      duration: audio.duration, offset: off, width: canvas.width, height: canvas.height,
      render(t: number, samples = 1, type = 'image/png', quality = .92) {
        for (let i = 0; i < Math.max(1, samples); i++) {
          const ts = samples <= 1 ? t : Math.min(audio.duration - 1e-4, Math.max(0, t + ((i + .5) / samples - .5) * (.5 / fps)));
          wide(ts); out.globalAlpha = 1 / (i + 1); out.drawImage(work, 0, 0);
        }
        out.globalAlpha = 1;
        return canvas.toDataURL(type, quality).split(',')[1];
      },
    };
    return;
  }
  const fps = Number(q.get('fps') ?? 60);
  window.__flex = {
    duration: audio.duration, offset: off, width: W, height: H,
    render(t: number, samples = 1, type = 'image/png', quality = .92) {
      if (samples <= 1) { draw(t); out.drawImage(work, 0, 0); }
      else {
        for (let i = 0; i < samples; i++) {
          const ts = Math.min(audio.duration - 1e-4, Math.max(0, t + ((i + .5) / samples - .5) * (.5 / fps)));
          draw(ts);
          out.globalAlpha = 1 / (i + 1); out.drawImage(work, 0, 0);
        }
        out.globalAlpha = 1;
      }
      return canvas.toDataURL(type, quality).split(',')[1];
    },
  };
}
boot().catch((e) => { console.error(e); window.__flex = { error: String(e?.stack ?? e) }; });
