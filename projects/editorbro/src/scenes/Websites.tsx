// Websites (27.9-41.7 s). After Keanu (tap an object on the desk, dive into the place) and Slate (UI on a floating phone).
//   27.9  "Aur sirf video nahi"    nine brand tiles land on a dark desk
//   29.83 "Brand sites" … 34.88 "automation"   each named niche dives into its demo, playing on a phone (demos.json at)
//   36.17 "Sab yahin se banta hai" a 3x3 wall of phones, all playing
//   39.0  (music)                  the WordPress theme and the corporate site on laptops
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { clamp, easeInCubic, easeOutQuint, invLerp } from '../animation/anim';
import cfg from '../config/demos.json';
import { C, FONT } from '../themes/tokens';
import { SceneProps } from './index';

interface Demo { slug: string; name: string; niche: string; accent: string; at: number; ready: boolean }
const DEMOS = (cfg as { demos: Demo[] }).demos;
const PHONES = DEMOS.slice(0, 7);              // the spoken niches, in VO order
const T_WALL = 36.1, T_LAPTOPS = 38.95, T_END = 41.7;

const Screen: React.FC<{ d: Demo; w: number; h: number; startFrom?: number; rate?: number }> = ({ d, w, h, startFrom = 108, rate = 1.5 }) =>
  d.ready ? (
    <OffthreadVideo src={staticFile(`clips/demo_${d.slug}.mp4`)} startFrom={startFrom} playbackRate={rate} muted style={{ width: w, height: h, objectFit: 'cover' }} />
  ) : (
    <div style={{ width: w, height: h, background: `linear-gradient(160deg, ${d.accent}55, #111 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div style={{ fontFamily: FONT.mono, fontSize: w * 0.05, color: C.warn, letterSpacing: 3 }}>PLACEHOLDER</div>
      <div style={{ fontFamily: FONT.brand, fontWeight: 800, fontSize: w * 0.1, color: '#fff', textAlign: 'center' }}>{d.name}</div>
    </div>
  );

export const Phone: React.FC<{ d: Demo; w: number; style?: React.CSSProperties; startFrom?: number; rate?: number }> = ({ d, w, style, startFrom, rate }) => {
  const h = w * 16 / 9, b = w * 0.032;
  return (
    <div style={{ width: w + b * 2, height: h + b * 2, borderRadius: w * 0.12, padding: b, background: 'linear-gradient(145deg, #3a3d42, #121315 40%, #2a2c30)',
      boxShadow: `0 ${w * 0.08}px ${w * 0.2}px rgba(0,0,0,0.6), 0 0 ${w * 0.25}px ${d.accent}33`, ...style }}>
      <div style={{ width: w, height: h, borderRadius: w * 0.1, overflow: 'hidden', position: 'relative', background: '#000' }}>
        <Screen d={d} w={w} h={h} startFrom={startFrom} rate={rate} />
        <div style={{ position: 'absolute', top: w * 0.025, left: '50%', width: w * 0.28, height: w * 0.07, marginLeft: -w * 0.14, borderRadius: w * 0.035, background: '#000' }} />
      </div>
    </div>
  );
};

const Laptop: React.FC<{ d: Demo; p: number; y: number; from: number }> = ({ d, p, y, from }) => (
  <div style={{ position: 'absolute', left: 90, top: y, width: 900, opacity: clamp(p * 2), transform: `translateX(${(1 - p) * from}px)` }}>
    <div style={{ borderRadius: '22px 22px 6px 6px', padding: 14, background: '#1b1c1f', boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>
      {d.ready ? <Img src={staticFile(`clips/demo_${d.slug}_desktop.png`)} style={{ width: 872, height: 545, display: 'block', objectFit: 'cover', borderRadius: 8 }} />
        : <div style={{ width: 872, height: 545, borderRadius: 8, background: `linear-gradient(160deg, ${d.accent}66, #111)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, color: C.warn, fontSize: 30 }}>PLACEHOLDER · {d.name}</div>}
    </div>
    <div style={{ height: 18, margin: '0 -40px', borderRadius: '0 0 30px 30px', background: 'linear-gradient(#2a2c30, #121315)' }} />
    <div style={{ marginTop: 18, display: 'flex', gap: 16, alignItems: 'baseline' }}>
      <span style={{ fontFamily: FONT.brand, fontWeight: 800, fontSize: 46, color: C.ink }}>{d.name}</span>
      <span style={{ fontFamily: FONT.mono, fontSize: 24, color: d.accent }}>{d.niche}</span>
    </div>
  </div>
);

export const Websites: React.FC<SceneProps> = ({ f, t0 }) => {
  const T = t0 + f / 60;
  const cur = PHONES.reduce((a, d, i) => (T >= d.at - 0.05 ? i : a), -1);   // which spoken demo is on
  const inWall = T >= T_WALL, inLaptops = T >= T_LAPTOPS;
  const deskOut = easeInCubic(invLerp(PHONES[0].at - 0.35, PHONES[0].at, T));
  return (
    <AbsoluteFill style={{ background: '#060708', overflow: 'hidden' }}>
      {/* the desk with the nine tiles */}
      {cur < 0 || deskOut < 1 ? (
        <AbsoluteFill style={{ perspective: 1400, opacity: 1 - deskOut }}>
          <div style={{ position: 'absolute', left: 60, top: 420, width: 960, height: 1100, transform: `rotateX(52deg) scale(${1 + deskOut * 0.8})`, transformOrigin: '50% 30%',
            background: 'radial-gradient(ellipse at 50% 30%, #1a1d21, #08090a 70%)', borderRadius: 40, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 26, padding: 40 }}>
            {DEMOS.map((d, i) => {
              const p = easeOutQuint(invLerp(27.95 + i * 0.1, 28.35 + i * 0.1, T));
              return (
                <div key={d.slug} style={{ borderRadius: 22, background: `linear-gradient(150deg, ${d.accent}, ${d.accent}55 60%, #111)`, opacity: p, transform: `translateY(${(1 - p) * -120}px)`,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ fontFamily: FONT.brand, fontWeight: 900, fontSize: 40, color: '#fff', lineHeight: 1 }}>{d.name}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 20, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>{d.niche}</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.display, fontStretch: '80%', fontWeight: 900, fontSize: 92, color: C.ink,
            opacity: easeOutQuint(invLerp(28.4, 28.8, T)) * (1 - deskOut) }}>NOT JUST VIDEO</div>
        </AbsoluteFill>
      ) : null}

      {/* one phone per spoken niche, each in its own Sequence so its clip starts when it appears */}
      {T < T_WALL + 0.15 ? PHONES.map((d, i) => {
        const from = Math.round((d.at - 0.05 - t0) * 60), to = Math.round(((PHONES[i + 1]?.at ?? T_WALL + 0.2) - 0.05 - t0) * 60);
        const dive = easeOutQuint(invLerp(d.at - 0.05, d.at + 0.35, T));
        return (
          <Sequence key={d.slug} from={from} durationInFrames={to - from} layout="none">
            <AbsoluteFill style={{ perspective: 1600 }}>
              <AbsoluteFill style={{ background: `radial-gradient(ellipse 700px 900px at 540px 760px, ${d.accent}44, transparent 70%)` }} />
              <div style={{ position: 'absolute', top: 236, left: 0, right: 0, textAlign: 'center', opacity: dive }}>
                <span style={{ fontFamily: FONT.brand, fontWeight: 900, fontSize: 56, color: C.ink }}>{d.name}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 26, color: d.accent, marginLeft: 18 }}>{d.niche}</span>
              </div>
              <div style={{ position: 'absolute', left: 540 - 306, top: 330, transform: `rotateX(${(1 - dive) * 28}deg) rotateY(${Math.sin(T * 1.3) * 4}deg) scale(${0.72 + 0.28 * dive})`, transformOrigin: '50% 40%' }}>
                <Phone d={d} w={580} />
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      }) : null}

      {/* the wall of all nine */}
      {inWall && T < T_LAPTOPS + 0.35 ? (
        <Sequence from={Math.round((T_WALL - t0) * 60)} layout="none">
        <AbsoluteFill style={{ perspective: 1800 }}>
          <div style={{ position: 'absolute', left: 30, top: 300, width: 1020, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22, justifyItems: 'center',
            transform: `rotateY(${-8 + 16 * clamp(invLerp(T_WALL, T_LAPTOPS, T))}deg) rotateX(6deg) scale(${1.25 - 0.25 * easeOutQuint(invLerp(T_WALL, T_WALL + 0.6, T))})` }}>
            {DEMOS.map((d, i) => (
              <div key={d.slug} style={{ opacity: 0.5 + 0.5 * easeOutQuint(invLerp(T_WALL + i * 0.04, T_WALL + 0.3 + i * 0.04, T)) }}>
                <Phone d={d} w={240} startFrom={60 + i * 12} rate={1} />
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', top: 236, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontSize: 28, color: C.ink2, opacity: easeOutQuint(invLerp(T_WALL + 0.3, T_WALL + 0.7, T)) }}>
            9 sites · fictional demo brands · all code
          </div>
        </AbsoluteFill>
        </Sequence>
      ) : null}

      {/* WordPress theme + corporate site */}
      {inLaptops ? (
        <AbsoluteFill style={{ opacity: 1 - easeInCubic(invLerp(T_END - 0.3, T_END, T)) }}>
          <Laptop d={DEMOS[7]} p={easeOutQuint(invLerp(DEMOS[7].at - 0.1, DEMOS[7].at + 0.4, T))} y={250} from={-900} />
          <Laptop d={DEMOS[8]} p={easeOutQuint(invLerp(DEMOS[8].at, DEMOS[8].at + 0.5, T))} y={870} from={900} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
