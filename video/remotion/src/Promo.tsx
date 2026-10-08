import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS, SCENES, type DemoClip } from './timeline';

const FONT = '-apple-system, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';
const BLUE = '#2f55d4';
const FADE = 10;

const Fade: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, FADE, frames - FADE, frames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const Brand: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }}>
    <Img src={staticFile('icon.png')} style={{ width: size, height: size, borderRadius: size * 0.2 }} />
    <span style={{ fontSize: size * 0.62, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>JushoAI</span>
  </div>
);

const Intro: React.FC<{ sub?: string }> = ({ sub }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: f - 6, fps, config: { damping: 200 } });
  const y = interpolate(rise, [0, 1], [30, 0]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${BLUE}, #1e3a9e)`, fontFamily: FONT, alignItems: 'center', justifyContent: 'center', gap: 56 }}>
      <Brand size={120} />
      <div style={{ opacity: rise, transform: `translateY(${y}px)`, color: '#fff', fontSize: 84, fontWeight: 800, textAlign: 'center', lineHeight: 1.3 }}>
        氏名・フリガナ・住所を<br />1 クリックで
      </div>
      {sub ? <div style={{ color: '#d6e0ff', fontSize: 36 }}>{sub}</div> : null}
    </AbsoluteFill>
  );
};

const Subtitles: React.FC<{ cues: DemoClip['subtitles'] }> = ({ cues }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const cue = cues.find((c) => t >= c.from && t < c.to);
  if (!cue) return null;
  const local = f - Math.round(cue.from * FPS);
  const opacity = interpolate(local, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity }}>
      <span style={{ color: '#fff', fontSize: 46, fontWeight: 700, fontFamily: FONT }}>{cue.text}</span>
    </div>
  );
};

const Demo: React.FC<{ clip: DemoClip }> = ({ clip }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const { from, to, scale: zs, origin, ramp = 0.8 } = clip.zoom;
  const zoom = ramp === 0
    ? zs
    : interpolate(t, [from - 0.2, from - 0.2 + ramp, to - ramp, to + 0.1], [1, zs, zs, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic),
    });
  const fastRate = clip.segments?.find((g) => t >= g.out && t < g.out + g.dur)?.rate ?? 1;
  const scale = 0.9;
  const w = 1920 * scale;
  const h = 1080 * scale;
  return (
    <AbsoluteFill style={{ background: '#0b1020' }}>
      <div style={{ position: 'absolute', left: (1920 - w) / 2, top: 20, width: w, height: h, borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.55)' }}>
        <div style={{ width: '100%', height: '100%', transform: `scale(${zoom})`, transformOrigin: origin }}>
          {clip.segments ? clip.segments.map((g) => (
            <Sequence key={g.src} from={Math.round(g.out * FPS)} durationInFrames={Math.max(1, Math.round(g.dur * FPS))}>
              <OffthreadVideo src={staticFile(clip.file)} startFrom={Math.round(g.src * FPS)} playbackRate={g.rate} style={{ width: '100%', height: '100%' }} muted />
            </Sequence>
          )) : (
            <OffthreadVideo src={staticFile(clip.file)} startFrom={Math.round(clip.start * FPS)} style={{ width: '100%', height: '100%' }} muted />
          )}
        </div>
        {fastRate > 1 ? (
          <div style={{ position: 'absolute', top: 24, right: 28, padding: '6px 18px', borderRadius: 999, background: 'rgba(11,16,32,.78)', color: '#fff', fontFamily: FONT, fontSize: 34, fontWeight: 800 }}>
            ×{fastRate}
          </div>
        ) : null}
      </div>
      <Subtitles cues={clip.subtitles} />
    </AbsoluteFill>
  );
};

const Info: React.FC<{ title: string; sub: string }> = ({ title, sub }) => (
  <AbsoluteFill style={{ background: '#0b1020', fontFamily: FONT, alignItems: 'center', justifyContent: 'center', gap: 36 }}>
    <div style={{ color: '#fff', fontSize: 76, fontWeight: 800 }}>{title}</div>
    <div style={{ color: '#aab6e0', fontSize: 52, fontWeight: 600 }}>{sub}</div>
  </AbsoluteFill>
);

const Scene: React.FC<{ from: number; frames: number; children: React.ReactNode }> = ({ from, frames, children }) => (
  <Sequence from={from} durationInFrames={frames}>
    <Fade frames={frames}>{children}</Fade>
  </Sequence>
);

// The track (99.8s) is shorter than the video, and its last ~13s are its own decaying ending. It is played twice:
// the second pass starts while the first one is still dying away, so the music never drops out.
const BGM_VOLUME = 0.5;
const BGM_SECOND_AT = Math.round(86 * FPS);
const bgmGain = (frame: number, frames: number, fadeIn: number, fadeOut: number) =>
  BGM_VOLUME * Math.min(
    interpolate(frame, [0, fadeIn * FPS], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(frame, [frames - fadeOut * FPS, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );

const Bgm: React.FC = () => {
  const second = SCENES.total - BGM_SECOND_AT;
  return (
    <>
      <Sequence from={0} durationInFrames={BGM_SECOND_AT + 6 * FPS}>
        <Audio src={staticFile('bgm.mp3')} volume={(f) => bgmGain(f, BGM_SECOND_AT + 6 * FPS, 2, 0.01)} />
      </Sequence>
      <Sequence from={BGM_SECOND_AT} durationInFrames={second}>
        <Audio src={staticFile('bgm.mp3')} volume={(f) => bgmGain(f, second, 3, 4)} />
      </Sequence>
    </>
  );
};

export const Promo: React.FC = () => (
  <AbsoluteFill style={{ background: '#0b1020' }}>
    <Bgm />
    <Scene {...SCENES.hook}><Intro /></Scene>
    {SCENES.rules.map((s) => (
      <Scene key={s.demo.file} from={s.from} frames={s.frames}><Demo clip={s.demo} /></Scene>
    ))}
    <Scene {...SCENES.bridge}>
      <Info title="ルールでは判定できない欄は、AI が補います" sub="AI は任意。使う設定にしたときだけ、欄の情報を送ります" />
    </Scene>
    <Scene from={SCENES.settings.from} frames={SCENES.settings.frames}><Demo clip={SCENES.settings.demo} /></Scene>
    <Scene from={SCENES.ai.from} frames={SCENES.ai.frames}><Demo clip={SCENES.ai.demo} /></Scene>
    <Scene {...SCENES.info}>
      <Info title="ルールが主体。AI は任意の補助" sub="初期設定では、外部に送りません" />
    </Scene>
    <Scene {...SCENES.cta}><Intro sub="Chrome 拡張機能" /></Scene>
  </AbsoluteFill>
);
