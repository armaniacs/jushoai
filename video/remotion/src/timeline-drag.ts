import clipsDrag from './clips-drag.json';
import { FPS, type DemoClip } from './timeline';

export { FPS };

// The recorded video lags the script's own clock slightly (same VIDEO_LAG as
// the promo timeline). Cue times are anchored to the recorded marks so the
// subtitles stay aligned if the clip is re-recorded.
const VIDEO_LAG = 0.2;
const PAD_BEFORE = 0.2;
const INTRO = 4;
const OUTRO = 4;

interface Marks { ready: number; end: number; [k: string]: number }

const D = (clipsDrag as { drag: Marks }).drag;

const start = D.ready - PAD_BEFORE;
const rel = (t: number) => t + VIDEO_LAG - start;
const duration = D.end - start;

const cues: [string, string][] = [
  ['ready', 'ボタンが入力欄に重なって邪魔なときは'],
  ['grab', 'ドラッグで好きな場所に移動できます'],
  ['moved', '移動した位置は、そのまま保たれます'],
  ['open', '移動したあとも、押せばプレビューが開きます'],
];

export const DRAG_CLIP: DemoClip = {
  file: 'clip-drag.webm',
  start,
  duration,
  subtitles: cues.map(([key, text], i) => ({
    from: i === 0 ? 0 : rel(D[key]),
    to: i + 1 < cues.length ? rel(D[cues[i + 1][0]]) : duration,
    text,
  })),
  zoom: { from: 0, to: Number.POSITIVE_INFINITY, scale: 1, origin: '0 0', ramp: 0 },
};

const sec = (s: number) => Math.round(s * FPS);

export const DRAG_SCENES = (() => {
  let at = 0;
  const place = (frames: number) => { const s = { from: at, frames }; at += frames; return s; };
  const intro = place(sec(INTRO));
  const demo = { ...place(sec(duration)), demo: DRAG_CLIP };
  const outro = place(sec(OUTRO));
  return { intro, demo, outro, total: at };
})();
