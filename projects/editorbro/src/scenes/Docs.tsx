// Docs (41.7-46.5 s). After the Miracle Studios reel: Swiss editorial page, one red disc, one black-and-white cut-out,
// one giant word per beat. "Har step ka article likha hai" (41.85): the nine real article titles stack in as pages;
// "Prompt" (44.06) and "render" (45.18) land as giant words.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { clamp, easeInCubic, easeOutQuint, invLerp } from '../animation/anim';
import { C, FONT } from '../themes/tokens';
import { SceneProps } from './index';

export const ARTICLES = ['What EditorBro is', 'From prompt to reel', 'The skills map', 'The 12 gates', 'Engines', 'Sound and voice', "Measure, don't guess", 'Websites and apps', 'Case study: this reel'];

const Big: React.FC<{ T: number; at: number; text: string; color: string; top: number; left: number }> = ({ T, at, text, color, top, left }) => {
  const p = easeOutQuint(invLerp(at, at + 0.4, T));
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', top, left: left + (1 - p) * 220, fontFamily: FONT.display, fontStretch: '66%', fontWeight: 900, fontSize: 210, lineHeight: 0.85, color,
      letterSpacing: -6, opacity: clamp(p * 2), filter: `blur(${(1 - p) * 10}px)`, whiteSpace: 'nowrap' }}>{text}</div>
  );
};

export const Docs: React.FC<SceneProps> = ({ f, t0 }) => {
  const T = t0 + f / 60;
  const disc = easeOutQuint(invLerp(41.75, 42.3, T));
  const out = easeInCubic(invLerp(46.2, 46.5, T));
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden', transform: `translateY(${-out * 1920}px)` }}>
      <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
      {/* corner metadata */}
      <div style={{ position: 'absolute', top: 236, left: 70, fontFamily: FONT.mono, fontSize: 22, color: C.paperInk, lineHeight: 1.5 }}>EDITORBRO<br />docs/ · 9 articles</div>
      <div style={{ position: 'absolute', top: 236, right: 70, fontFamily: FONT.mono, fontSize: 22, color: C.paperInk, textAlign: 'right', lineHeight: 1.5 }}>prompt → reel<br />2026</div>
      {/* red disc + the billboard as a black-and-white cut-out */}
      <div style={{ position: 'absolute', left: 430, top: 380, width: 560, height: 560, borderRadius: 280, background: C.red, transform: `scale(${disc})` }} />
      <Img src={staticFile('clips/billboard_bw.jpg')} style={{ position: 'absolute', left: 380, top: 470, width: 640, filter: 'grayscale(1) contrast(1.25)', boxShadow: '18px 18px 0 rgba(0,0,0,0.85)',
        opacity: clamp(disc * 1.5), transform: `translateY(${(1 - disc) * 60}px) rotate(-3deg)` }} />
      {/* the nine articles stacking in */}
      {ARTICLES.map((a, i) => {
        const p = easeOutQuint(invLerp(41.85 + i * 0.13, 42.25 + i * 0.13, T));
        if (p <= 0) return null;
        return (
          <div key={a} style={{ position: 'absolute', left: 70 + i * 6, top: 400 + i * 50, width: 360, padding: '16px 20px', background: '#fff', border: '2.5px solid #111',
            boxShadow: '8px 8px 0 #111', transform: `translateX(${(1 - p) * -500}px) rotate(${(i % 2 ? 1 : -1) * 1.5}deg)`, fontFamily: FONT.display, fontStretch: '85%', fontWeight: 800, fontSize: 30, color: '#111' }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 20, color: C.red, marginRight: 12 }}>{String(i + 1).padStart(2, '0')}</span>{a}
          </div>
        );
      })}
      <Big T={T} at={44.0} text="PROMPT" color={C.paperInk} top={1000} left={50} />
      <Big T={T} at={45.12} text="→ RENDER" color={C.red} top={1190} left={50} />
    </AbsoluteFill>
  );
};
