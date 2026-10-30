import path from 'path';
import { fileURLToPath } from 'url';
import { record, serveStatic } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EXT = path.resolve(ROOT, 'dist/chrome-mv3');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const PORT = 4182;
const BASE = `http://127.0.0.1:${PORT}/`;

// One scene for the README GIF: button click, preview, apply. The promo clips
// sweep the preview rows for the 2-minute video; this one keeps every wait
// short so the whole clip stays inside 20 seconds and the GIF needs no trim.
const server = await serveStatic([path.join(ROOT, 'samples')], PORT);
try {
  const { ev } = await record({
    workDir: WORK,
    extDir: EXT,
    publicDir: PUBLIC,
    name: 'readme-clip',
    file: 'demo-registration.html',
    base: BASE,
    waitMs: 1500,
    headless: true,
    channel: 'chromium',
    script: async (h) => {
      await h.sleep(2500);
      const btn = await h.find('JushoAI で入力');
      await h.move(btn, 700);
      await h.sleep(600);
      h.mark('open');
      await h.click();
      await h.sleep(1000);
      const apply = await h.find('入力する');
      await h.move(apply, 2600);
      await h.sleep(500);
      h.mark('apply');
      await h.click();
      await h.sleep(3500);
    },
  });
  console.log(JSON.stringify(ev));
} finally {
  server.close();
}
