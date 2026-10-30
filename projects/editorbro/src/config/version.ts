// Active version of this reel. v1 reads SCENE_TIMINGS.json; a v2 re-voice writes SCENE_TIMINGS.v2.json (keep v1 intact).
import v1 from '../../SCENE_TIMINGS.json';

export const VERSION = 'v1' as 'v1' | 'v2';
export const TIMINGS = v1;
