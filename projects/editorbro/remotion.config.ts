// Remotion CLI defaults for this film. Rendering uses Chrome's ANGLE backend so Three.js scenes run on the GPU.
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(94);
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(3);
Config.setDelayRenderTimeoutInMilliseconds(120000);
