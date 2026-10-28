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
import { createRequire } from 'module';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(new URL('../remotion/package.json', import.meta.url));
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EXT = path.resolve(ROOT, 'dist/chrome-mv3');
const PUBLIC = path.resolve(HERE, '../remotion/public');
const WORK = path.join(HERE, '.work');
const PORT = 4181;
const BASE = `http://127.0.0.1:${PORT}/`;

const PROFILE = {
  id: 'p1', label: 'テスト用', lastName: '試験', firstName: '太郎', lastNameKana: 'シケン', firstNameKana: 'タロウ',
  lastNameRomaji: 'Shiken', firstNameRomaji: 'Taro', gender: '', birthday: '1990-05-05', school: '', department: '',
  email: 'shiken@example.com', tel: '09012345678',
};
const ADDRESS = {
  id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1',
  building: 'サンプルビル101', country: 'Japan', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

// Same fake cursor as record.mjs: the recorded video has no pointer, so one is
// drawn on the page (re-appended on every move to stay above the overlay).
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

function serve() {
  const roots = [path.join(ROOT, 'samples'), path.join(ROOT, 'tests/e2e/pages')];
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'split-form.html';
    for (const root of roots) {
      const p = path.join(root, name);
      if (p.startsWith(root) && fs.existsSync(p) && fs.statSync(p).isFile()) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(p));
        return;
      }
    }
    res.writeHead(404);
    res.end('not found');
  });
  return new Promise((ok) => server.listen(PORT, '127.0.0.1', () => ok(server)));
}

async function launch(name) {
  const dir = fs.mkdtempSync(path.join(WORK, `prof-${name}-`));
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: path.join(WORK, `rec-${name}`), size: { width: 1920, height: 1080 } },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  await sw.evaluate((d) => chrome.storage.local.set(d), { 'jushoai:data': { profiles: [PROFILE], addresses: [ADDRESS] } });
  await ctx.addInitScript(CURSOR_SCRIPT);
  return { ctx };
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

const server = await serve();
try {
  const { ctx } = await launch('drag');
  const page = await ctx.newPage();
  const t0 = Date.now();
  const ev = {};
  const mark = (k) => { ev[k] = (Date.now() - t0) / 1000; };
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await page.goto(`${BASE}two-column-form.html`);
  await page.waitForTimeout(2000);
  mark('ready');
  let pos = { x: 1500, y: 900 };
  const move = async (to, ms) => { pos = await moveTo(page, pos, to, ms); return pos; };
  // Approach the button and hover: viewers see the grab cursor and the title hint.
  const btn = await buttonCenter(page, cdp, 'JushoAI で入力');
  await move(btn, 1100);
  await sleep(900);
  mark('grab');
  // Press and drag it to a clear spot down-right; the eased steps keep the
  // movement readable instead of a teleport.
  await page.mouse.move(btn.x, btn.y);
  await page.mouse.down();
  await sleep(120);
  const to = { x: btn.x + 300, y: btn.y + 170 };
  const n = Math.max(2, Math.round(1400 / 16));
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    await page.mouse.move(btn.x + (to.x - btn.x) * t, btn.y + (to.y - btn.y) * t);
    await sleep(16);
    pos = { x: btn.x + (to.x - btn.x) * t, y: btn.y + (to.y - btn.y) * t };
  }
  await page.mouse.up();
  mark('moved');
  // Linger: the banner must stay where it was dropped (manual wins).
  await sleep(1700);
  // Move away and back, then press: the banner still opens the preview.
  await move({ x: 1500, y: 950 }, 800);
  const btn2 = await buttonCenter(page, cdp, 'JushoAI で入力');
  await move(btn2, 900);
  await sleep(600);
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
  // The preview opens asynchronously (classification, then planning, then
  // rendering), so poll for its apply button instead of assuming one frame.
  const deadline = Date.now() + 12000;
  for (;;) {
    try {
      await buttonCenter(page, cdp, '入力する');
      break;
    } catch {
      if (Date.now() > deadline) throw new Error('preview did not open after the moved click');
      await sleep(300);
    }
  }
  mark('open');
  await sleep(2600);
  mark('end');
  const video = page.video();
  await ctx.close();
  const dest = path.join(PUBLIC, 'clip-drag.webm');
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(await video.path(), dest);
  const clips = { drag: ev };
  fs.writeFileSync(path.join(HERE, '../remotion/src/clips-drag.json'), JSON.stringify(clips, null, 2));
  console.log(JSON.stringify(clips, null, 2));
} finally {
  server.close();
}
