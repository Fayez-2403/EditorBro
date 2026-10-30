// The reel: the scene under the playhead (from SCENE_TIMINGS), a transition centred on each cut, word-level captions,
// and the mix from src/config/audioManifest.json. Pure function of the frame: no clocks, no unseeded randomness.
import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
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

// transition into each scene id (default 'cut'); vary them, every cut needs a reason
const KIND: Record<string, Kind> = { body: 'wipe', cta: 'flash' };
const KEYWORD = /^(techpe|trek)/i;   // caption words that take the accent colour

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const i = Math.max(0, SC.findIndex((s) => frame >= s.from && frame < s.from + s.durationInFrames));
  const s = SC[i], S = sceneFor(s.id);
  const next = SC[i + 1], prevCut = s.from, nextCut = next?.from ?? 1e9;
  const k = frame - prevCut < nextCut - frame ? frame - prevCut : frame - nextCut;   // frames from the nearest cut
  const kind = (frame - prevCut < nextCut - frame ? KIND[s.id] : next && KIND[next.id]) ?? 'cut';
  const mix = (audio as { reel: string | null }).reel;
  return (
    <AbsoluteFill style={{ background: C.base }}>
      {/* the camera: a slow push-in across every scene plus a small drift, so no shot ever freezes (motionmaxxing: no dead frame) */}
      <AbsoluteFill style={{ transformOrigin: '540px 900px', transform: `scale(${1 + 0.045 * easeInOutCubic(clamp((frame - s.from) / s.durationInFrames))}) `
        + `translate(${6 * noise1(frame / 50, 11)}px, ${5 * noise1(frame / 55, 12)}px) rotate(${0.25 * noise1(frame / 70, 13)}deg)` }}>
        <S f={frame - s.from} n={s.durationInFrames} id={s.id} />
      </AbsoluteFill>
      <Transition kind={kind} k={k} />
      <Captions keyword={KEYWORD} />
      {mix ? <Audio src={staticFile(mix)} /> : null}
    </AbsoluteFill>
  );
};
