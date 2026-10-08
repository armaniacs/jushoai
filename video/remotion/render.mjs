import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serveUrl = await bundle({ entryPoint: path.join(here, 'src', 'index.ts'), publicDir: path.join(here, 'public') });
const composition = await selectComposition({ serveUrl, id: 'PromoVideo' });
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: path.join(here, '..', 'output', 'promo.mp4'),
  onProgress: ({ progress }) => process.stdout.write(`\rRendering: ${Math.round(progress * 100)}%`),
});
console.log('\nDone');
