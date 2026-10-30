// Word cues: film frames of spoken words, from the active version's caption timings. The picture follows the voice
// (Liam take or guide voice alike), so nothing here is a hand-placed frame number.
import { TIMINGS } from '../config/version';
const FPS = 60;

interface Word { w: string; t0: number; t1: number }
interface Cap { line: string; words: Word[] }
export const CAPS: Cap[] = (TIMINGS as unknown as { variants: { reel: { captions: Cap[] } } }).variants.reel.captions;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]/g, '');

/** film frame at which the nth occurrence of `word` in narration line `line` starts */
export function wf(line: string, word: string, nth = 0): number {
  const hits = CAPS.filter((c) => c.line === line).flatMap((c) => c.words).filter((w) => norm(w.w) === norm(word));
  if (hits.length <= nth) throw new Error(`word cue "${word}" #${nth} not in line ${line}`);
  return Math.round(hits[nth].t0 * FPS);
}
/** like wf, but searching every line; null when absent (optional cues) */
export function wfAny(word: string, from = 0, to = Infinity): number | null {
  for (const c of CAPS) for (const w of c.words) {
    const fr = Math.round(w.t0 * FPS);
    if (fr >= from && fr < to && norm(w.w) === norm(word)) return fr;
  }
  return null;
}
