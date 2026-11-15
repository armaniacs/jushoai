import { AbsoluteFill } from 'remotion';
import { Demo, Scene } from './Promo';
import { DISMISS_SCENES, FPS } from './timeline-dismiss';

void FPS;

const FONT = '-apple-system, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif';

// CTA 12-15s: end card with the store link text (no audio in this video).
const STORE_URL = 'https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl';

const Cta: React.FC = () => (
  <AbsoluteFill style={{ background: '#0b1020', fontFamily: FONT, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
    <div style={{ color: '#fff', fontSize: 76, fontWeight: 800 }}>Chrome ウェブストアで公開中</div>
    <div style={{ color: '#aab6e0', fontSize: 44, fontWeight: 600 }}>JushoAI v0.1.34 — バナーの × から除外登録</div>
    <div style={{ color: '#d6e0ff', fontSize: 27, fontWeight: 400 }}>{STORE_URL}</div>
  </AbsoluteFill>
);

export const DismissDemo: React.FC = () => (
  <AbsoluteFill style={{ background: '#0b1020' }}>
    <Scene from={DISMISS_SCENES.hook.from} frames={DISMISS_SCENES.hook.frames}>
      <Demo clip={DISMISS_SCENES.hook.demo} />
    </Scene>
    <Scene from={DISMISS_SCENES.demo1.from} frames={DISMISS_SCENES.demo1.frames}>
      <Demo clip={DISMISS_SCENES.demo1.demo} />
    </Scene>
    <Scene from={DISMISS_SCENES.demo2.from} frames={DISMISS_SCENES.demo2.frames}>
      <Demo clip={DISMISS_SCENES.demo2.demo} />
    </Scene>
    <Scene {...DISMISS_SCENES.outro}>
      <Cta />
    </Scene>
  </AbsoluteFill>
);
