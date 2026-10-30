// Montage (18.3-27.9 s). After Imran's style-switch edit and Nixime's poster collage: our own renders (config/montage.json)
// as hard cuts on the VO words, a "20+ REELS" slam on "Bees" (23.15 s), then nine posters drop into retro windows on
// every half beat (0.3 s at 100 BPM) from 25.2 s until the desk takes over.
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { Gold, Land } from '../components/Type';
import { clamp, easeOutQuint, invLerp } from '../animation/anim';
import { mulberry32 } from '../animation/rng';
import edl from '../config/montage.json';
import { C, FONT } from '../themes/tokens';
import { SceneProps } from './index';

interface Clip { id: string; at: number; dur: number }
const CLIPS = (edl as { clips: Clip[] }).clips;
const POSTERS = (edl as { posters: unknown[] }).posters.length;
const WALL_T0 = 25.2, HALF = 0.3;

const Punch: React.FC<{ src: string; frames: number }> = ({ src, frames }) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    <AbsoluteFill style={{ transform: `scale(${1 + 0.06 * Math.exp(-frames / 6)})` }}>
      <OffthreadVideo src={staticFile(src)} muted style={{ width: 1080, height: 1920 }} />
    </AbsoluteFill>
  </AbsoluteFill>
);

const Window: React.FC<{ i: number; p: number }> = ({ i, p }) => {
  const r = mulberry32(300 + i);
  const col = i % 3, row = Math.floor(i / 3);
  const x = 60 + col * 330 + (r() - 0.5) * 30, y = 250 + row * 430 + (r() - 0.5) * 30, rot = (r() - 0.5) * 8;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 300, transform: `translateY(${(1 - p) * -260}px) rotate(${rot * p + (1 - p) * 18}deg) scale(${0.8 + 0.2 * p})`, opacity: clamp(p * 2),
      borderRadius: 14, overflow: 'hidden', background: '#EDE9E1', border: '3px solid #111', boxShadow: '10px 12px 0 rgba(0,0,0,0.55)' }}>
      <div style={{ height: 30, display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', borderBottom: '3px solid #111', background: ['#F2C35A', '#1FE5C8', '#E0262B'][i % 3] }}>
        {[0, 1, 2].map((k) => <div key={k} style={{ width: 10, height: 10, borderRadius: 5, background: '#111', opacity: 0.8 }} />)}
        <div style={{ marginLeft: 'auto', fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, color: '#111' }}>reel_{String(i + 1).padStart(2, '0')}.mp4</div>
      </div>
      <Img src={staticFile(`clips/poster_${i}.jpg`)} style={{ width: 300, height: 533, display: 'block', objectFit: 'cover' }} />
    </div>
  );
};

export const Montage: React.FC<SceneProps> = ({ f, t0 }) => {
  const T = t0 + f / 60;
  const wall = T >= WALL_T0 - 0.05;
  return (
    <AbsoluteFill style={{ background: '#0B0B0C' }}>
      {CLIPS.map((c) => {
        const from = Math.round((c.at - t0) * 60), dur = Math.round(c.dur * 60);
        return (
          <Sequence key={c.id} from={from} durationInFrames={dur} layout="none">
            <Punch src={`clips/m_${c.id}.mp4`} frames={f - from} />
          </Sequence>
        );
      })}
      {/* "Bees se zyada reels": the number slams over the rapid cuts */}
      {T >= 23.1 && T < 24.2 ? (
        <AbsoluteFill style={{ background: `rgba(0,0,0,${0.45 * easeOutQuint(invLerp(23.1, 23.25, T))})` }}>
          <Land T={T} at={23.12} out={24.05} from={1.4} style={{ position: 'absolute', top: 560, left: 0, right: 0, textAlign: 'center' }}>
            <Gold size={330}>20+</Gold>
            <div style={{ fontFamily: FONT.display, fontStretch: '80%', fontWeight: 900, fontSize: 110, color: C.ink, marginTop: 10, letterSpacing: 2 }}>REELS</div>
          </Land>
        </AbsoluteFill>
      ) : null}
      {/* the poster wall */}
      {wall ? (
        <AbsoluteFill style={{ background: C.paper, backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }}>
          {Array.from({ length: POSTERS }, (_, i) => <Window key={i} i={i} p={easeOutQuint(invLerp(WALL_T0 + i * HALF, WALL_T0 + i * HALF + 0.32, T))} />)}
          <div style={{ position: 'absolute', left: 60, bottom: 400, fontFamily: FONT.mono, fontSize: 24, color: '#111', opacity: 0.7 }}>out/ · our own reels, made in this repo</div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
