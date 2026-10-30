// The reel: the scene under the playhead (from SCENE_TIMINGS) inside its own Sequence (so clips play from the scene
// start), a transition centred on each cut, word-level captions and the mix. Pure function of the frame.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import audio from '../config/audioManifest.json';
import { TIMINGS } from '../config/version';
import { Captions } from '../components/Captions';
import { Kind, Transition } from '../components/Transition';
import { sceneFor } from '../scenes';
import { C } from '../themes/tokens';
import { clamp, easeInOutCubic } from '../animation/anim';
import { noise1 } from '../animation/rng';

interface Scene { id: string; from: number; durationInFrames: number }
const SC: Scene[] = (TIMINGS as unknown as { variants: { reel: { scenes: Scene[] } } }).variants.reel.scenes;
export const TOTAL: number = (TIMINGS as unknown as { variants: { reel: { durationInFrames: number } } }).variants.reel.durationInFrames;

// transition INTO each scene; the hook -> flip handoff happens inside the captured world (the scan line), so it's a cut
const KIND: Record<string, Kind> = { prompt: 'scan', pipeline: 'flash', montage: 'flash', websites: 'flash', docs: 'flash', cta: 'flash' };
// where the caption pill sits per scene (off the hero of each room)
const CAP_TOP: Record<string, number> = { hook: 1440, flip: 1440, prompt: 1500, pipeline: 1470, montage: 1440, websites: 1470, docs: 1460, cta: 1500 };
const KEYWORD = /^(editorbro|editor|64|12|20\+?|code|fork|clone)/i;

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const i = Math.max(0, SC.findIndex((s) => frame >= s.from && frame < s.from + s.durationInFrames));
  const s = SC[i], S = sceneFor(s.id);
  const next = SC[i + 1], prevCut = s.from, nextCut = next?.from ?? 1e9;
  const k = frame - prevCut < nextCut - frame ? frame - prevCut : frame - nextCut;   // frames from the nearest cut
  const kind = (frame - prevCut < nextCut - frame ? KIND[s.id] : next && KIND[next.id]) ?? 'cut';
  const mix = (audio as { reel: string | null }).reel;
  const push = s.id === 'hook' || s.id === 'flip' ? 0.015 : 0.035;   // the captured world has its own camera
  return (
    <AbsoluteFill style={{ background: C.base }}>
      <AbsoluteFill style={{ transformOrigin: '540px 900px', transform: `scale(${1 + push * easeInOutCubic(clamp((frame - s.from) / s.durationInFrames))}) `
        + `translate(${5 * noise1(frame / 50, 11)}px, ${4 * noise1(frame / 55, 12)}px) rotate(${0.2 * noise1(frame / 70, 13)}deg)` }}>
        <Sequence from={s.from} durationInFrames={s.durationInFrames} layout="none">
          <S f={frame - s.from} n={s.durationInFrames} id={s.id} t0={s.from / 60} />
        </Sequence>
      </AbsoluteFill>
      <Transition kind={kind} k={k} />
      <Captions keyword={KEYWORD} top={CAP_TOP[s.id] ?? 1440} />
      {mix ? <Audio src={staticFile(mix)} /> : null}
    </AbsoluteFill>
  );
};
