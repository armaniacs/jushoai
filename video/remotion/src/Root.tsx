import { Composition } from 'remotion';
import { Promo } from './Promo';
import { FPS, SCENES } from './timeline';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="PromoVideo"
    component={Promo}
    durationInFrames={SCENES.total}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
