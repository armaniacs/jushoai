import clipsDismiss from './clips-dismiss.json';
import { FPS, type DemoClip, type Marks } from './timeline';

export { FPS };

// Dismiss-and-register demo (v0.1.34): the X on the banner, the small dialog,
// 「この配下全体」 registration, and the settings proof. No audio; Japanese
// captions only. Total is exactly 15s: Hook 2 + Demo1 5 + Demo2 5 + CTA 3.
//
// The clip below is addressed in VIDEO seconds, not script marks: the
// recording lags the record script's clock (extension first launch +
// navigation happen before the first recorded frame). Measured on this clip
// (X click: script 6.511 = video ~5.0; settings paint: script 12.69 = video
// ~11.18): VIDEO = SCRIPT - LAG with LAG ~1.51. If the clip is re-recorded,
// re-measure the lag (X-click frame vs `aim` mark) and shift the anchors.
// Script marks live in clips-dismiss.json for reference.
const M = (clipsDismiss as { dismiss: Marks }).dismiss;
void M;

// Video-relative anchors (seconds into clip-dismiss.webm).
const CLICK = 5.0; // X press: banner disappears right after
const DIALOG = 5.2; // small dialog painted bottom-right
const SELECT = 8.02; // 「この配下全体」 radio selected
const REG = 9.5; // 「起動しないURLに登録する」 pressed (dialog closes)
const SETTINGS = 10.8; // options page painted with the appended URL

const sec = (s: number) => Math.round(s * FPS);

const seg = (
  file: string,
  src: number,
  dur: number,
  rate: number,
  subtitles: DemoClip['subtitles'],
  zoom: DemoClip['zoom'],
): DemoClip => ({
  file,
  start: src,
  duration: dur,
  subtitles,
  zoom,
  segments: [{ src, out: 0, dur, rate }],
});

const NO_ZOOM: DemoClip['zoom'] = { from: 0, to: 0, scale: 1, origin: '50% 50%', ramp: 0 };

// Hook 0-2s: the banner overlapping the dense form. @1x.
const HOOK_SRC = 0.84;
const HOOK: DemoClip = seg(
  'clip-dismiss.webm',
  HOOK_SRC,
  2,
  1,
  [{ from: 0, to: 2, text: 'バナーがフォームに重なるときは' }],
  NO_ZOOM,
);

// Demo1 2-7s: hover the X, press it, banner vanishes, dialog appears. Full
// frame so the top banner and the bottom-right dialog stay visible together.
const DEMO1_SRC = 0.84;
const DEMO1_DUR = 5;
const DEMO1_RATE = (6.3 - DEMO1_SRC) / DEMO1_DUR; // ~1.09
const CLICK_T = (CLICK - DEMO1_SRC) / DEMO1_RATE;
const DEMO1: DemoClip = seg(
  'clip-dismiss.webm',
  DEMO1_SRC,
  DEMO1_DUR,
  DEMO1_RATE,
  [
    { from: 0, to: CLICK_T, text: '右上の × でバナーを隠せます' },
    { from: CLICK_T, to: DEMO1_DUR, text: '隠すと小さなダイアログが出ます' },
  ],
  NO_ZOOM,
);

// Demo2 7-12s: pick この配下全体, register, settings page shows the appended
// URL. Zooms into the bottom-right corner for the dialog interaction, then
// ramps back out to full frame for the settings page.
const DEMO2_SRC = 6.3;
const DEMO2_DUR = 5;
const DEMO2_RATE = (12.6 - DEMO2_SRC) / DEMO2_DUR; // 1.26
const SELECT_T = (SELECT - DEMO2_SRC) / DEMO2_RATE;
const REG_T = (REG - DEMO2_SRC) / DEMO2_RATE;
const SETTINGS_T = (SETTINGS - DEMO2_SRC) / DEMO2_RATE;
const DEMO2: DemoClip = seg(
  'clip-dismiss.webm',
  DEMO2_SRC,
  DEMO2_DUR,
  DEMO2_RATE,
  [
    { from: 0, to: SELECT_T, text: '「この配下全体」を選びます' },
    { from: SELECT_T, to: REG_T, text: '「起動しないURLに登録する」を押します' },
    { from: REG_T, to: SETTINGS_T, text: '設定ページを開きます' },
    { from: SETTINGS_T, to: DEMO2_DUR, text: '「起動しないURL」に追加されました' },
  ],
  { from: 0.3, to: 2.8, scale: 1.7, origin: '100% 100%', ramp: 0.8 },
);

void DIALOG;

export const DISMISS_SCENES = (() => {
  let at = 0;
  const place = (frames: number) => {
    const s = { from: at, frames };
    at += frames;
    return s;
  };
  const hook = { ...place(sec(HOOK.duration)), demo: HOOK };
  const demo1 = { ...place(sec(DEMO1.duration)), demo: DEMO1 };
  const demo2 = { ...place(sec(DEMO2.duration)), demo: DEMO2 };
  const outro = place(sec(3));
  return { hook, demo1, demo2, outro, total: at };
})();
