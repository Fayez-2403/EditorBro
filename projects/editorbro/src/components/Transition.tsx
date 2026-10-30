// Transitions centred on each cut (k = frames from the cut; negative before it). Every cut has a reason:
//   scan  a teal scan line wipes the frame (into and out of the code world)
//   flash a hit (the montage, the Fork press)
//   dip   a fast dip through black (chapter change on the desk)
//   cut   nothing
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { clamp, easeInOutCubic } from '../animation/anim';
import { C } from '../themes/tokens';

export type Kind = 'cut' | 'scan' | 'flash' | 'dip';

export const Transition: React.FC<{ kind: Kind; k: number }> = ({ kind, k }) => {
  if (kind === 'cut' || k < -12 || k > 14) return null;
  if (kind === 'flash') {
    const a = k < 0 ? clamp((k + 5) / 5) * 0.72 : 0.72 * Math.exp(-k / 4);
    return <AbsoluteFill style={{ zIndex: 60, background: `radial-gradient(ellipse 700px 1000px at 540px 900px, rgba(255,248,232,${a}), rgba(255,248,232,${a * 0.25}) 100%)` }} />;
  }
  if (kind === 'dip') {
    const a = 0.85 * (k < 0 ? easeInOutCubic(clamp((k + 9) / 9)) : 1 - easeInOutCubic(clamp(k / 10)));
    return <AbsoluteFill style={{ zIndex: 60, background: `rgba(0,0,0,${a})` }} />;
  }
  // scan: a bright line sweeps top to bottom across the cut; above it the new scene, below it a dark wash
  const p = easeInOutCubic(clamp((k + 10) / 22));
  const y = -40 + p * 2000;
  return (
    <AbsoluteFill style={{ zIndex: 60, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: y - 3, height: 6, background: C.teal, boxShadow: `0 0 40px 12px ${C.teal}88, 0 0 120px 30px ${C.teal}33` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: y, bottom: 0, background: `rgba(0,0,0,${0.55 * (1 - p)})` }} />
    </AbsoluteFill>
  );
};
