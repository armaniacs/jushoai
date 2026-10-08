import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(new URL('../remotion/package.json', import.meta.url));
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(HERE, '../../dist/chrome-mv3');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const BASE = 'http://127.0.0.1:4180/';

const PROFILE = {
  id: 'p1', label: 'テスト用', lastName: '試験', firstName: '太郎', lastNameKana: 'シケン', firstNameKana: 'タロウ',
  lastNameRomaji: 'Shiken', firstNameRomaji: 'Taro', gender: '', birthday: '1990-05-05', school: '', department: '',
  email: 'shiken@example.com', tel: '09012345678',
};
const ADDRESS = {
  id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1',
  building: 'サンプルビル101', country: 'Japan', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

// The recorded video has no pointer, so a fake one is drawn on the page. It is re-appended on every move
// to stay above the extension's overlay, which is added to the DOM after document load.
const CURSOR_SCRIPT = `
(() => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;display:none;transform:translate(-4px,-3px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
  el.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2l15 9-6.5 1.6L9.8 19z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const mount = () => document.documentElement.appendChild(el);
  document.addEventListener('mousemove', (e) => {
    el.style.display = 'block';
    el.style.left = e.clientX + 'px';
    el.style.top = e.clientY + 'px';
    mount();
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

async function launch(name) {
  const dir = fs.mkdtempSync(path.join(WORK, `prof-${name}-`));
  const ctx = await chromium.launchPersistentContext(dir, {
    headless: false,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: path.join(WORK, `rec-${name}`), size: { width: 1920, height: 1080 } },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  await sw.evaluate((d) => chrome.storage.local.set(d), { 'jushoai:data': { profiles: [PROFILE], addresses: [ADDRESS] } });
  await ctx.addInitScript(CURSOR_SCRIPT);
  return { ctx, dir };
}

// Closed shadow roots are invisible to locators but not to CDP with pierce, so extension buttons are located there.
async function buttonCenter(page, cdp, text) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const textOf = (n) => (n.nodeType === 3 ? n.nodeValue : (n.children || []).concat(n.shadowRoots || [], n.contentDocument ? [n.contentDocument] : []).map(textOf).join(''));
  const found = [];
  const walk = (n) => {
    if (n.nodeName === 'BUTTON' && textOf(n).includes(text)) found.push(n.nodeId);
    for (const c of [...(n.children || []), ...(n.shadowRoots || []), ...(n.contentDocument ? [n.contentDocument] : [])]) walk(c);
  };
  walk(root);
  if (!found.length) throw new Error(`button not found: ${text}`);
  const { model } = await cdp.send('DOM.getBoxModel', { nodeId: found[0] });
  const q = model.content;
  return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
}

async function moveTo(page, from, to, ms) {
  const n = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await sleep(16);
  }
  return to;
}

async function record(name, file, script) {
  const { ctx } = await launch(name);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const ev = {};
  const mark = (k) => { ev[k] = (Date.now() - t0) / 1000; };
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await page.goto(BASE + file);
  await page.waitForTimeout(1800);
  mark('ready');
  let pos = { x: 1500, y: 900 };
  const click = async (c) => { await page.mouse.down(); await sleep(90); await page.mouse.up(); void c; };
  await script({ page, cdp, mark, sleep, move: async (to, ms) => { pos = await moveTo(page, pos, to, ms); return pos; }, click, find: (t) => buttonCenter(page, cdp, t) });
  mark('end');
  const video = page.video();
  await ctx.close();
  const dest = path.join(PUBLIC, `${name}.webm`);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(await video.path(), dest);
  return ev;
}

// Row sweep over the preview panel, from just under its title down to just above its buttons.
async function sweepRows(h, ms) {
  const apply = await h.find('入力する');
  const x = apply.x - 150;
  await h.move({ x, y: 95 }, 500);
  await h.move({ x, y: apply.y - 60 }, ms);
  return apply;
}

const clips = {};

clips.a = await record('clip-a', 'demo-registration.html', async (h) => {
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
});

clips.b = await record('clip-b', 'demo-shop-checkout.html', async (h) => {
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
});

clips.c = await record('clip-c', 'demo-request-info.html', async (h) => {
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
});

fs.writeFileSync(path.join(HERE, '../remotion/src/clips.json'), JSON.stringify(clips, null, 2));
console.log(JSON.stringify(clips, null, 2));
