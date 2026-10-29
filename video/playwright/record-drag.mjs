// Drag-feature demo: records the floating button being dragged out of the way
// on the dense two-column form (the PBI-161 scenario), then clicked to prove it
// still opens the preview. Writes remotion/public/clip-drag.webm and
// remotion/src/clips-drag.json.
//
// The recording serves both samples/ and tests/e2e/pages/ from its own
// static server (127.0.0.1:4181), so no extra terminal is needed. Runs
// headless on the full Chromium build (channel: 'chromium'): the headless
// shell cannot load extensions, but headless=new on the full build can.
// Needs `make build` first (the recorded extension is dist/chrome-mv3).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { record, serveStatic, sleep } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EXT = path.resolve(ROOT, 'dist/chrome-mv3');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const PORT = 4181;
const BASE = `http://127.0.0.1:${PORT}/`;

const server = await serveStatic(
  [path.join(ROOT, 'samples'), path.join(ROOT, 'tests/e2e/pages')],
  PORT,
);
try {
  const { ev } = await record({
    workDir: WORK,
    extDir: EXT,
    publicDir: PUBLIC,
    name: 'clip-drag',
    file: 'two-column-form.html',
    base: BASE,
    waitMs: 2000,
    headless: true,
    channel: 'chromium',
    script: async (h) => {
      // Approach the button and hover: viewers see the grab cursor and the title hint.
      const btn = await h.find('JushoAI で入力');
      await h.move(btn, 1100);
      await sleep(900);
      h.mark('grab');
      // Press and drag it to a clear spot down-right; the eased steps keep the
      // movement readable instead of a teleport.
      const to = { x: btn.x + 300, y: btn.y + 170 };
      await h.drag(btn, to, 1400);
      h.mark('moved');
      // Linger: the banner must stay where it was dropped (manual wins).
      await sleep(1700);
      // Move away and back, then press: the banner still opens the preview.
      await h.move({ x: 1500, y: 950 }, 800);
      const btn2 = await h.find('JushoAI で入力');
      await h.move(btn2, 900);
      await h.sleep(600);
      await h.click();
      // The preview opens asynchronously (classification, then planning, then
      // rendering), so poll for its apply button instead of assuming one frame.
      await h.waitFind('入力する', 12000);
      h.mark('open');
      await h.sleep(2600);
    },
  });
  const clips = { drag: ev };
  fs.writeFileSync(path.join(HERE, '../remotion/src/clips-drag.json'), JSON.stringify(clips, null, 2));
  console.log(JSON.stringify(clips, null, 2));
} finally {
  server.close();
}
