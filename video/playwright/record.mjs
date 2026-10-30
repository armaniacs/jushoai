import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { record } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HERE, '../../dist/chrome-mv3');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const BASE = 'http://127.0.0.1:4180/';

// Row sweep over the preview panel, from just under its title down to just above its buttons.
async function sweepRows(h, ms) {
  const apply = await h.find('入力する');
  const x = apply.x - 150;
  await h.move({ x, y: 95 }, 500);
  await h.move({ x, y: apply.y - 60 }, ms);
  return apply;
}

const base = { workDir: WORK, extDir: EXT, publicDir: PUBLIC, base: BASE, waitMs: 1800 };

const clips = {};

clips.a = (await record({
  ...base, name: 'clip-a', file: 'demo-registration.html',
  script: async (h) => {
    await h.sleep(4500);
    const btn = await h.find('JushoAI で入力');
    await h.move(btn, 1100);
    await h.sleep(800);
    h.mark('open');
    await h.click();
    await h.sleep(1200);
    const apply = await sweepRows(h, 5200);
    await h.sleep(500);
    await h.move(apply, 900);
    await h.sleep(800);
    h.mark('apply');
    await h.click();
    await h.sleep(5000);
  },
})).ev;

clips.b = (await record({
  ...base, name: 'clip-b', file: 'demo-shop-checkout.html',
  script: async (h) => {
    await h.sleep(3200);
    const btn = await h.find('JushoAI で入力');
    await h.move(btn, 1000);
    await h.sleep(800);
    h.mark('open');
    await h.click();
    await h.sleep(1000);
    const apply = await sweepRows(h, 3600);
    await h.sleep(400);
    await h.move(apply, 800);
    await h.sleep(800);
    h.mark('apply');
    await h.click();
    await h.sleep(4500);
  },
})).ev;

clips.c = (await record({
  ...base, name: 'clip-c', file: 'demo-request-info.html',
  script: async (h) => {
    await h.sleep(1800);
    const em = await h.page.locator('#em').boundingBox();
    await h.move({ x: em.x + 120, y: em.y + em.height / 2 }, 1000);
    await h.click();
    await h.page.keyboard.type('my-mail@example.com', { delay: 75 });
    await h.sleep(1800);
    const btn = await h.find('JushoAI で入力');
    await h.move(btn, 1000);
    await h.sleep(800);
    h.mark('open');
    await h.click();
    await h.sleep(1200);
    const apply = await sweepRows(h, 5200);
    await h.sleep(500);
    await h.move(apply, 800);
    await h.sleep(800);
    h.mark('apply');
    await h.click();
    await h.sleep(5000);
  },
})).ev;

fs.writeFileSync(path.join(HERE, '../remotion/src/clips.json'), JSON.stringify(clips, null, 2));
console.log(JSON.stringify(clips, null, 2));
