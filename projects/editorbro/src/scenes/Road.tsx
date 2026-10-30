// The road: the captured Three.js highway (web/ reel.html, 0-8.7 s at 60 fps). hook = the GTA-style pan onto the
// billboard; flip = the same plate after the scan line: the world is wireframe, "100% CODE" lands on "code" (5.30 s),
// and the line `const cameraFrames = 0;` types while the VO says "camera se ek bhi frame nahi aaya" (6.50 s).
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { Gold, Land, Typed } from '../components/Type';
import { C, FONT } from '../themes/tokens';
import { SceneProps } from './index';

const Plate: React.FC<{ startFrom: number }> = ({ startFrom }) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile('clips/highway_hook.mp4')} startFrom={startFrom} muted style={{ width: 1080, height: 1920 }} />
  </AbsoluteFill>
);

export const Hook: React.FC<SceneProps> = () => <Plate startFrom={0} />;

export const Flip: React.FC<SceneProps> = ({ f, t0 }) => {
  const T = t0 + f / 60;
  return (
    <AbsoluteFill>
      <Plate startFrom={Math.round(t0 * 60)} />
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <Land T={T} at={5.22} out={8.42} style={{ position: 'absolute', top: 215, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ fontFamily: FONT.brand, fontWeight: 900, fontSize: 190, lineHeight: 0.9, color: C.teal, letterSpacing: -4,
            textShadow: `0 0 30px ${C.teal}99, 0 0 90px ${C.teal}55` }}>100%</div>
        </Land>
        <Land T={T} at={5.36} out={8.46} style={{ position: 'absolute', top: 385, left: 0, right: 0, textAlign: 'center' }}>
          <Gold size={160}>CODE</Gold>
        </Land>
        <Land T={T} at={5.62} out={8.5} from={1.08} style={{ position: 'absolute', top: 560, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ fontFamily: FONT.brand, fontStyle: 'italic', fontWeight: 400, fontSize: 46, color: C.ink, opacity: 0.92 }}>rendered, not filmed.</div>
        </Land>
        {T >= 6.3 ? (
          <div style={{ position: 'absolute', top: 1300, left: 0, right: 0, textAlign: 'center', fontSize: 42, opacity: T > 8.45 ? 0 : 1 }}>
            <span style={{ padding: '12px 26px', borderRadius: 14, background: 'rgba(0,0,0,0.78)', border: `1.5px solid ${C.teal}55` }}>
              <Typed T={T} t0={6.5} text="const cameraFrames = 0;" cps={18} color={C.teal} />
            </span>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
