// Cover (1080x1920): a 2-6 word headline, the big subject, the logo bottom-right at ~75 % opacity. Instagram's grid crops
// to the centre 3:4 (y 240..1680): keep the headline and subject there. Real frames only (credited), never fake UI.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, FONT, ink } from '../themes/tokens';

export const Cover: React.FC = () => (
  <AbsoluteFill style={{ background: C.base }}>
    <div style={{ position: 'absolute', left: 90, right: 90, top: 300, textAlign: 'center', fontFamily: FONT.display, fontWeight: 900,
      fontStretch: '78%', fontSize: 150, lineHeight: 0.95, color: C.ink, textTransform: 'uppercase' }}>
      {'{{TITLE}}'}
    </div>
    <div style={{ position: 'absolute', left: 140, right: 140, top: 760, height: 620, borderRadius: 36, background: C.card, border: `6px solid ${C.ink}`,
      boxShadow: ink(14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.mono, fontSize: 34, color: C.warn }}>
      PLACEHOLDER: big subject (real frame / product / hero)
    </div>
    <Img src={staticFile('brand/techpe-trek.jpg')} style={{ position: 'absolute', right: 90, bottom: 300, width: 140, height: 140, borderRadius: 26, opacity: 0.75 }} />
  </AbsoluteFill>
);
