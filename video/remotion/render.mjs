import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

// Usage: node render.mjs [--comp PromoVideo|DragDemo] [--out <path>]
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const compId = opt('--comp') ?? 'PromoVideo';
if (!compId || compId.startsWith('--')) {
  console.error('Usage: node render.mjs [--comp PromoVideo|DragDemo] [--out <path>]');
  process.exit(2);
}
const DEFAULT_OUT = { PromoVideo: 'promo.mp4', DragDemo: 'drag-demo.mp4' };
const outArg = opt('--out');
const outputLocation = outArg
  ? (path.isAbsolute(outArg) ? outArg : path.resolve(here, outArg))
  : path.join(here, '..', 'output', DEFAULT_OUT[compId] ?? `${compId}.mp4`);
const serveUrl = await bundle({ entryPoint: path.join(here, 'src', 'index.ts'), publicDir: path.join(here, 'public') });
const composition = await selectComposition({ serveUrl, id: compId });
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation,
  onProgress: ({ progress }) => process.stdout.write(`\rRendering: ${Math.round(progress * 100)}%`),
});
console.log('\nDone');
