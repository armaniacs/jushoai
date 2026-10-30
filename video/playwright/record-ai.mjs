// Records the AI scenes with the profile prepared by setup-ai.mjs: the settings pages (profile, address, AI) and the
// ambiguous demo form. The saved key stays encrypted in the extension; this script never reads or prints it.
// Running it sends real Gemini requests (one classify call for the demo form).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { record } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HERE, '../ext');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const PROFILE_DIR = path.join(WORK, 'profile-ai');
const BASE = 'http://127.0.0.1:4180/';

const base = {
  workDir: WORK, extDir: EXT, publicDir: PUBLIC,
  headless: false, profileDir: PROFILE_DIR, seed: false,
};

// ONLY=d re-records the demo form alone; the previous result of the other clip is kept.
const ONLY = process.env.ONLY;
const JSON_PATH = path.join(HERE, '../remotion/src/clips-ai.json');
const out = fs.existsSync(JSON_PATH) ? JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) : {};

if (!ONLY || ONLY === 's') out.s = (await record({
  ...base, name: 'clip-s',
  script: async (h) => {
    const nav = async (label) => {
      const el = h.page.locator('a, button, li, div').filter({ hasText: new RegExp(`^${label}$`) }).first();
      const b = await el.boundingBox();
      await h.move({ x: b.x + b.width / 2, y: b.y + b.height / 2 }, 800);
      await h.click();
      await h.sleep(600);
    };
    await h.page.goto(`chrome-extension://${h.id}/options.html`);
    await h.sleep(1500);
    h.mark('ready');
    await h.move({ x: 1000, y: 500 }, 600);
    h.mark('profile');
    await h.scroll(620, 3600);
    await h.sleep(900);
    await h.page.evaluate(() => window.scrollTo(0, 0));
    await nav('住所');
    h.mark('address');
    await h.scroll(420, 2600);
    await h.sleep(1000);
    await h.page.evaluate(() => window.scrollTo(0, 0));
    await nav('AI 判定');
    h.mark('ai');
    await h.move({ x: 1080, y: 360 }, 1200);
    await h.sleep(3200);
    h.mark('privacy');
    await h.move({ x: 1080, y: 250 }, 1400);
    await h.sleep(2600);
  },
})).ev;

if (!ONLY || ONLY === 'd') out.d = (await record({
  ...base, name: 'clip-d',
  script: async (h) => {
    await h.page.goto(BASE + 'demo-ai-ambiguous.html');
    await h.sleep(2500);
    h.mark('ready');
    await h.sleep(2000);
    const btn = await h.waitFind('JushoAI で入力', 8000);
    await h.move(btn, 1100);
    await h.sleep(800);
    h.mark('open');
    await h.click();
    // The preview opens only after Gemini answers, so wait for its apply button instead of a fixed delay.
    const apply = await h.waitFind('入力する', 40000);
    h.mark('preview');
    await h.sleep(1200);
    const x = apply.x - 150;
    await h.move({ x, y: 95 }, 500);
    await h.move({ x, y: apply.y - 60 }, 5200);
    await h.sleep(500);
    await h.move(apply, 900);
    await h.sleep(800);
    h.mark('apply');
    await h.click();
    await h.sleep(5000);
  },
})).ev;

fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
