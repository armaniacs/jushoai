import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launch, serveStatic, sleep, buttonCenter } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EXT = path.resolve(ROOT, 'dist/chrome-mv3');
const WORK = path.join(HERE, '.work');
const OUT = path.join(HERE, '.store-shots');
const PORT = 4183;
const BASE = `http://127.0.0.1:${PORT}/`;
const W = 1280;
const H = 800;

if (!fs.existsSync(EXT)) throw new Error(`dist/chrome-mv3 not found; run make build first`);

// Store screenshots (1280x800, max 5) from samples and the options page with
// the dummy profile. The files are never committed: they are uploaded to each
// store dashboard by hand (docs/store-listing.md).
fs.mkdirSync(OUT, { recursive: true });
const shot = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log(`shot: ${name}`);
};
const server = await serveStatic([path.join(ROOT, 'samples')], PORT);
try {
  // 1) Pre-fill form with the floating button and its badge (no seeded storage).
  const guide = await launch({ workDir: WORK, extDir: EXT, name: 'shots-guide', seed: false });
  const pg = await guide.ctx.newPage();
  await pg.setViewportSize({ width: W, height: H });
  await pg.goto(BASE + 'demo-registration.html');
  await sleep(3500);
  await shot(pg, '1-form-badge.png');
  await guide.ctx.close();

  // 2-3) Preview and filled form with the seeded dummy profile.
  const fill = await launch({ workDir: WORK, extDir: EXT, name: 'shots-fill' });
  const page = await fill.ctx.newPage();
  await page.setViewportSize({ width: W, height: H });
  const cdp = await fill.ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await page.goto(BASE + 'demo-registration.html');
  await sleep(3000);
  const btn = await buttonCenter(page, cdp, 'JushoAI で入力');
  await page.mouse.click(btn.x, btn.y);
  await sleep(1500);
  await shot(page, '2-preview.png');
  const apply = await buttonCenter(page, cdp, '入力する');
  await page.mouse.click(apply.x, apply.y);
  await sleep(2500);
  await shot(page, '3-form-after.png');

  // 4-5) Settings pages (profile, then the AI provider section).
  await page.goto(`chrome-extension://${fill.id}/options.html`);
  await sleep(1500);
  await shot(page, '4-profile-settings.png');
  const nav = page.locator('a, button, li, div').filter({ hasText: /^AI 判定$/ }).first();
  const b = await nav.boundingBox();
  if (!b) throw new Error('AI 判定 nav item not found on options.html');
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(1500);
  await shot(page, '5-ai-settings.png');
  await fill.ctx.close();
} finally {
  server.close();
}
