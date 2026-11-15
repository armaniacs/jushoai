import { Composition } from 'remotion';
import { Promo } from './Promo';
import { FPS, SCENES } from './timeline';
import { DragDemo } from './DragDemo';
import { DRAG_SCENES } from './timeline-drag';
import { DismissDemo } from './DismissDemo';
import { DISMISS_SCENES, FPS as DISMISS_FPS } from './timeline-dismiss';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="PromoVideo"
      component={Promo}
      durationInFrames={SCENES.total}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="DragDemo"
      component={DragDemo}
      durationInFrames={DRAG_SCENES.total}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="DismissVideo"
      component={DismissDemo}
      durationInFrames={DISMISS_SCENES.total}
      fps={DISMISS_FPS}
      width={1920}
      height={1080}
    />
  </>
);
