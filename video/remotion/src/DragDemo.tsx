import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { DRAG_SCENES, FPS } from './timeline-drag';
import { Demo, Info, Intro, Scene } from './Promo';

// Short BGM pass: unlike the promo (which loops the 99.8s track), the drag
// demo is ~20s, so the track plays once with a fade-out at the video end.
const BgmShort: React.FC<{ frames: number }> = ({ frames }) => (
  <Sequence from={0} durationInFrames={frames}>
    <Audio
      src={staticFile('bgm.mp3')}
      volume={(f) =>
        0.5 *
        Math.min(
          interpolate(f, [0, 2 * FPS], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          interpolate(f, [frames - 3 * FPS, frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        )
      }
    />
  </Sequence>
);

export const DragDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#0b1020' }}>
    <BgmShort frames={DRAG_SCENES.total} />
    <Scene {...DRAG_SCENES.intro}>
      <Intro title={<>ボタンが邪魔なときは<br />ドラッグで移動できます</>} sub="v0.1.28 から" />
    </Scene>
    <Scene from={DRAG_SCENES.demo.from} frames={DRAG_SCENES.demo.frames}>
      <Demo clip={DRAG_SCENES.demo.demo} />
    </Scene>
    <Scene {...DRAG_SCENES.outro}>
      <Info title="JushoAI で入力" sub="移動した位置は、スクロールやリサイズの後も保たれます" />
    </Scene>
  </AbsoluteFill>
);
