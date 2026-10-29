import clipsDrag from './clips-drag.json';
import { FPS, build, type DemoClip, type Marks } from './timeline';

export { FPS };

const INTRO = 4;
const OUTRO = 4;

const D = (clipsDrag as { drag: Marks }).drag;

// The demo page uses only the top-left of the 1920x1080 frame, so the drag
// action plays zoomed into that corner (scale 2 shows the top-left 960x540).
// The zoom ramps in on the hover and back out before the preview opens: the
// preview panel sits in the top-right corner and needs the full frame.
const ZOOM_SCALE = 2;
export const DRAG_CLIP: DemoClip = build(
  'clip-drag.webm',
  D,
  [
    ['ready', 'ボタンが入力欄に重なって邪魔なときは'],
    ['grab', 'ドラッグで好きな場所に移動できます'],
    ['moved', '移動した位置は、そのまま保たれます'],
    ['open', '移動したあとも、押せばプレビューが開きます'],
  ],
  (rel) => ({ from: rel(D.grab) - 0.5, to: rel(D.open) - 0.3, scale: ZOOM_SCALE, origin: '0% 0%' }),
);

const sec = (s: number) => Math.round(s * FPS);

export const DRAG_SCENES = (() => {
  let at = 0;
  const place = (frames: number) => { const s = { from: at, frames }; at += frames; return s; };
  const intro = place(sec(INTRO));
  const demo = { ...place(sec(DRAG_CLIP.duration)), demo: DRAG_CLIP };
  const outro = place(sec(OUTRO));
  return { intro, demo, outro, total: at };
})();
