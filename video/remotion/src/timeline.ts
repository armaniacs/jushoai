import clips from './clips.json';
import clipsAi from './clips-ai.json';

export const FPS = 30;
// The recorded video lags the script's own clock slightly (the panel shows ~0.2s after the click mark).
const VIDEO_LAG = 0.2;
const PAD_BEFORE = 0.2;
const HOOK = 4;
const BRIDGE = 5;
const INFO = 6;
const CTA = 5;

export interface Subtitle { from: number; to: number; text: string }
export interface Zoom { from: number; to: number; scale: number; origin: string; ramp?: number }
export interface Segment { src: number; out: number; dur: number; rate: number }
export interface DemoClip { file: string; start: number; duration: number; subtitles: Subtitle[]; zoom: Zoom; segments?: Segment[] }

interface Marks { ready: number; end: number; [k: string]: number }

// Cue times are anchored to the recorded marks so subtitles stay aligned if a clip is re-recorded.
function build(file: string, m: Marks, cues: [string, string][], zoom: (rel: (t: number) => number) => Zoom): DemoClip {
  const start = m.ready - PAD_BEFORE;
  const rel = (t: number) => t + VIDEO_LAG - start;
  const duration = m.end - start;
  const subtitles = cues.map(([key, text], i) => ({
    from: i === 0 ? 0 : rel(m[key]),
    to: i + 1 < cues.length ? rel(m[cues[i + 1][0]]) : duration,
    text,
  }));
  return { file, start, duration, subtitles, zoom: zoom(rel) };
}

// The preview panel sits in the top-right corner and is too small to read at full frame, so zoom there while it is open.
const panelZoom = (open: string, close: string) => (m: Marks) => (rel: (t: number) => number): Zoom =>
  ({ from: rel(m[open]), to: rel(m[close]), scale: 1.6, origin: '100% 0%' });

const A = clips.a as Marks;
const B = clips.b as Marks;
const C = clips.c as Marks;
const S = clipsAi.s as Marks;
const D = clipsAi.d as Marks;

const rules = (file: string, m: Marks, texts: [string, string, string]) =>
  build(file, m, [['ready', texts[0]], ['open', texts[1]], ['apply', texts[2]]], panelZoom('open', 'apply')(m));

export const DEMOS_RULES: DemoClip[] = [
  rules('clip-a.webm', A, ['細かく分かれたフォームも、1 クリックで', '入力前に、欄ごとの値をプレビューで確認', '承認すると、正しい欄に入力されます']),
  rules('clip-b.webm', B, ['サイトが変わっても、操作は同じです', '郵便番号・電話番号は、欄の書式に合わせて入力', '入力は、承認したあとだけ行われます']),
  rules('clip-c.webm', C, ['入力済みの欄は、上書きしません', 'プレビューにも、入力済みと表示されます', '対象外の欄には、触れません']),
];

// Plays a clip piecewise: each bound is [from, to, rate] in recording seconds. Cue and zoom times are given as
// recording marks and converted to the sped-up scene's own clock.
function segmented(
  file: string, m: Marks, bounds: [number, number, number][], cues: [string, string][],
  zoom: (outOf: (t: number) => number) => Zoom,
): DemoClip {
  const segments: Segment[] = [];
  let out = 0;
  for (const [from, to, rate] of bounds) {
    const dur = (to - from) / rate;
    segments.push({ src: from, out, dur, rate });
    out += dur;
  }
  const outOf = (t: number) => {
    const seg = segments.find((g) => t < g.src + g.dur * g.rate) ?? segments[segments.length - 1];
    return seg.out + (t - seg.src) / seg.rate;
  };
  const subtitles = cues.map(([key, text], i) => ({
    from: i === 0 ? 0 : outOf(m[key]),
    to: i + 1 < cues.length ? outOf(m[cues[i + 1][0]]) : out,
    text,
  }));
  return { file, start: bounds[0][0], duration: out, subtitles, segments, zoom: zoom(outOf) };
}

// Profile and address pages are only there to show what gets registered, so they play fast; the AI page keeps real time.
const FAST = 3;
export const DEMO_SETTINGS: DemoClip = segmented(
  'clip-s.webm', S,
  [[S.ready - PAD_BEFORE, S.address, FAST], [S.address, S.ai, FAST], [S.ai, S.end, 1]],
  [
    ['ready', 'まず、プロファイルを登録します'], ['address', '住所も、1 度だけ登録します'],
    ['ai', 'AI は任意。使うプロバイダとモデルを選びます'], ['privacy', '送るのは、欄の情報だけ。入力する値は送りません'],
  ],
  () => ({ from: 0, to: Number.POSITIVE_INFINITY, scale: 1.4, origin: '48% 12%', ramp: 0 }),
);

const WAIT_REAL = 2.5;
const WAIT_RATE = 8;
// A slow answer is shown briefly in real time and then fast-forwarded; a quick one needs no skipping at all.
const waitLong = D.preview - D.open > WAIT_REAL + 1;
const aiBounds: [number, number, number][] = waitLong
  ? [
    [D.ready - PAD_BEFORE, D.open, 1],
    [D.open, D.open + WAIT_REAL, 1],
    [D.open + WAIT_REAL, D.preview - 0.5, WAIT_RATE],
    [D.preview - 0.5, D.end, 1],
  ]
  : [[D.ready - PAD_BEFORE, D.end, 1]];
export const DEMO_AI: DemoClip = segmented(
  'clip-d.webm', D, aiBounds,
  [['ready', 'ラベルが曖昧なフォーム'], ['open', 'AI が欄を判定しています…'], ['preview', 'AI が判定した欄には、バッジが付きます'], ['apply', '値は、設定したプロファイルから入力されます']],
  (outOf) => ({ from: outOf(D.preview), to: outOf(D.apply), scale: 1.6, origin: '100% 0%' }),
);

const sec = (s: number) => Math.round(s * FPS);

export const SCENES = (() => {
  let at = 0;
  const place = (frames: number) => { const s = { from: at, frames }; at += frames; return s; };
  const hook = place(sec(HOOK));
  const rules = DEMOS_RULES.map((d) => ({ ...place(sec(d.duration)), demo: d }));
  const bridge = place(sec(BRIDGE));
  const settings = { ...place(sec(DEMO_SETTINGS.duration)), demo: DEMO_SETTINGS };
  const ai = { ...place(sec(DEMO_AI.duration)), demo: DEMO_AI };
  const info = place(sec(INFO));
  const cta = place(sec(CTA));
  return { hook, rules, bridge, settings, ai, info, cta, total: at };
})();
