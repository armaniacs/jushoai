// Records the AI scenes with the profile prepared by setup-ai.mjs: the settings pages (profile, address, AI) and the
// ambiguous demo form. The saved key stays encrypted in the extension; this script never reads or prints it.
// Running it sends real Gemini requests (one classify call for the demo form).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(new URL('../remotion/package.json', import.meta.url));
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HERE, '../ext');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const PROFILE_DIR = path.join(WORK, 'profile-ai');
const BASE = 'http://127.0.0.1:4180/';

const CURSOR_SCRIPT = `
(() => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;display:none;transform:translate(-4px,-3px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
  el.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.8 19z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.addEventListener('mousemove', (e) => {
    el.style.display = 'block';
    el.style.left = e.clientX + 'px';
    el.style.top = e.clientY + 'px';
    document.documentElement.appendChild(el);
  }, true);
  // Click feedback lives in the recording itself, so viewers can see exactly when a button is pressed.
  document.addEventListener('mousedown', (e) => {
    el.style.transform = 'translate(-4px,-3px) scale(.82)';
    const ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:5px solid #fff;box-shadow:0 0 0 2px rgba(20,30,70,.55),0 0 14px rgba(20,30,70,.45);left:' + e.clientX + 'px;top:' + e.clientY + 'px;transition:transform .55s ease-out,opacity .55s ease-out';
    document.documentElement.appendChild(ring);
    requestAnimationFrame(() => { ring.style.transform = 'scale(6)'; ring.style.opacity = '0'; });
    setTimeout(() => ring.remove(), 700);
  }, true);
  document.addEventListener('mouseup', () => { el.style.transform = 'translate(-4px,-3px)'; }, true);
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

async function buttonCenter(cdp, text) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const kids = (n) => [...(n.children || []), ...(n.shadowRoots || []), ...(n.contentDocument ? [n.contentDocument] : [])];
  const textOf = (n) => (n.nodeType === 3 ? n.nodeValue : kids(n).map(textOf).join(''));
  const found = [];
  const walk = (n) => {
    if (n.nodeName === 'BUTTON' && textOf(n).includes(text)) found.push(n.nodeId);
    kids(n).forEach(walk);
  };
  walk(root);
  if (!found.length) return null;
  const { model } = await cdp.send('DOM.getBoxModel', { nodeId: found[0] });
  const q = model.content;
  return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
}

async function waitButton(cdp, text, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const c = await buttonCenter(cdp, text).catch(() => null);
    if (c) return c;
    await sleep(250);
  }
  throw new Error(`button not found within ${ms}ms: ${text}`);
}

async function record(name, script) {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: path.join(WORK, `rec-${name}`), size: { width: 1920, height: 1080 } },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  await ctx.addInitScript(CURSOR_SCRIPT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  const t0 = Date.now();
  const ev = {};
  const mark = (k) => { ev[k] = (Date.now() - t0) / 1000; };
  let pos = { x: 1500, y: 900 };
  const move = async (to, ms) => {
    const n = Math.max(2, Math.round(ms / 16));
    for (let i = 1; i <= n; i++) {
      const t = ease(i / n);
      await page.mouse.move(pos.x + (to.x - pos.x) * t, pos.y + (to.y - pos.y) * t);
      await sleep(16);
    }
    pos = to;
  };
  const click = async () => { await page.mouse.down(); await sleep(90); await page.mouse.up(); };
  const scroll = async (dy, ms) => {
    const n = Math.max(2, Math.round(ms / 16));
    for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await sleep(16); }
  };
  await script({ page, cdp, id, mark, sleep, move, click, scroll, getPos: () => pos });
  mark('end');
  const video = page.video();
  await ctx.close();
  const dest = path.join(PUBLIC, `${name}.webm`);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(await video.path(), dest);
  return ev;
}

// ONLY=d re-records the demo form alone; the previous result of the other clip is kept.
const ONLY = process.env.ONLY;
const JSON_PATH = path.join(HERE, '../remotion/src/clips-ai.json');
const out = fs.existsSync(JSON_PATH) ? JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) : {};

if (!ONLY || ONLY === 's') out.s = await record('clip-s', async (h) => {
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
});

if (!ONLY || ONLY === 'd') out.d = await record('clip-d', async (h) => {
  await h.page.goto(BASE + 'demo-ai-ambiguous.html');
  await h.sleep(2500);
  h.mark('ready');
  await h.sleep(2000);
  const btn = await waitButton(h.cdp, 'JushoAI で入力', 8000);
  await h.move(btn, 1100);
  await h.sleep(800);
  h.mark('open');
  await h.click();
  // The preview opens only after Gemini answers, so wait for its apply button instead of a fixed delay.
  const apply = await waitButton(h.cdp, '入力する', 40000);
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
});

fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
