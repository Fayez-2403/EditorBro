// Compositions: EditorBro: Welcome to the Studio (1080x1920, 60 fps) and its cover still.
import React from 'react';
import { Composition, Still } from 'remotion';
import { Cover } from './compositions/Cover';
import { Reel, TOTAL } from './compositions/Reel';
import { FPS, H, W } from './themes/tokens';
import { loadFonts } from './themes/typography';

loadFonts();

export const Root: React.FC = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    <Still id="Cover" component={Cover} width={W} height={H} />
  </>
);
