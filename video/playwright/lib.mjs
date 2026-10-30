// Shared recording skeleton for video/playwright/record*.mjs.
//
// Canonical home of the duplicated backbone (CURSOR_SCRIPT / sleep / ease /
// launch / buttonCenter / moveTo / record): scenario scripts keep only their
// own steps and call into these helpers. Differences between the recordings
// are expressed as options:
// - record.mjs: headed, fresh temp profile, seeded storage, auto-navigates.
// - record-drag.mjs: headless full Chromium build (channel: 'chromium'),
//   own static server, drag steps via h.drag.
// - record-ai.mjs: persistent profile dir (setup-ai.mjs prepares it),
//   no seeding, script navigates itself (no file/base), needs extension id.
import { createRequire } from 'module';
import fs from 'fs';
import http from 'http';
import path from 'path';

const require = createRequire(new URL('../remotion/package.json', import.meta.url));
const { chromium } = require('playwright');

export const PROFILE = {
  id: 'p1', label: 'テスト用', lastName: '試験', firstName: '太郎', lastNameKana: 'シケン', firstNameKana: 'タロウ',
  lastNameRomaji: 'Shiken', firstNameRomaji: 'Taro', gender: '', birthday: '1990-05-05', school: '', department: '',
  email: 'shiken@example.com', tel: '09012345678',
};
export const ADDRESS = {
  id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1',
  building: 'サンプルビル101', country: 'Japan', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

// The recorded video has no pointer, so a fake one is drawn on the page. It is re-appended on every move
// to stay above the extension's overlay, which is added to the DOM after document load.
export const CURSOR_SCRIPT = `
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

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export async function launch({ workDir, extDir, name, headless = false, channel, profileDir = null, seed = true }) {
  fs.mkdirSync(workDir, { recursive: true });
  const dir = profileDir ?? fs.mkdtempSync(path.join(workDir, `prof-${name}-`));
  if (profileDir) fs.mkdirSync(profileDir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, {
    ...(channel ? { channel } : {}),
    headless,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: path.join(workDir, `rec-${name}`), size: { width: 1920, height: 1080 } },
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  if (seed) {
    await sw.evaluate((d) => chrome.storage.local.set(d), { 'jushoai:data': { profiles: [PROFILE], addresses: [ADDRESS] } });
  }
  await ctx.addInitScript(CURSOR_SCRIPT);
  return { ctx, dir, id };
}

// Closed shadow roots are invisible to locators but not to CDP with pierce, so extension buttons are located there.
// With strict: false returns null instead of throwing (the AI recording polls for async UI).
export async function buttonCenter(page, cdp, text, { strict = true } = {}) {
  void page;
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const kids = (n) => [...(n.children || []), ...(n.shadowRoots || []), ...(n.contentDocument ? [n.contentDocument] : [])];
  const textOf = (n) => (n.nodeType === 3 ? n.nodeValue : kids(n).map(textOf).join(''));
  const found = [];
  const walk = (n) => {
    if (n.nodeName === 'BUTTON' && textOf(n).includes(text)) found.push(n.nodeId);
    kids(n).forEach(walk);
  };
  walk(root);
  if (!found.length) {
    if (!strict) return null;
    throw new Error(`button not found: ${text}`);
  }
  const { model } = await cdp.send('DOM.getBoxModel', { nodeId: found[0] });
  const q = model.content;
  return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
}

export async function waitButton(cdp, text, ms) {
  const end = Date.now() + ms;
  for (;;) {
    const c = await buttonCenter(null, cdp, text, { strict: false }).catch(() => null);
    if (c) return c;
    if (Date.now() >= end) throw new Error(`button not found within ${ms}ms: ${text}`);
    await sleep(250);
  }
}

export async function moveTo(page, from, to, ms) {
  const n = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n);
    await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    await sleep(16);
  }
  return to;
}

async function saveVideo(ctx, page, dest) {
  const video = page.video();
  const src = await video.path();
  await ctx.close();
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
}

// Static file server for recordings that serve their own fixture pages
// (the drag demo serves samples/ and tests/e2e/pages on 127.0.0.1:4181).
export function serveStatic(roots, port, fallback = 'split-form.html') {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || fallback;
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
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

// Canonical recording skeleton (record.mjs equivalent). When file/base are
// given the page auto-navigates and 'ready' is marked after waitMs; otherwise
// the script navigates itself and marks 'ready' when it is actually ready
// (record-ai). The finished clip is saved as publicDir/<name>.webm.
export async function record({
  workDir, extDir, publicDir, name, file = null, base = null, waitMs = 1800,
  headless = false, channel, profileDir = null, seed = true, outName = null, script,
}) {
  const { ctx, id } = await launch({ workDir, extDir, name, headless, channel, profileDir, seed });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const ev = {};
  const mark = (k) => { ev[k] = (Date.now() - t0) / 1000; };
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  if (file) {
    await page.goto(base + file);
    await page.waitForTimeout(waitMs);
    mark('ready');
  }
  let pos = { x: 1500, y: 900 };
  const move = async (to, ms) => { pos = await moveTo(page, pos, to, ms); return pos; };
  const click = async () => { await page.mouse.down(); await sleep(90); await page.mouse.up(); };
  const drag = async (from, to, ms) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await sleep(120);
    pos = await moveTo(page, from, to, ms);
    await page.mouse.up();
    return pos;
  };
  const scroll = async (dy, ms) => {
    const n = Math.max(2, Math.round(ms / 16));
    for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await sleep(16); }
  };
  await script({
    page, cdp, id, mark, sleep, move, click, drag, scroll,
    find: (t) => buttonCenter(page, cdp, t),
    waitFind: (t, ms) => waitButton(cdp, t, ms),
    getPos: () => pos,
  });
  mark('end');
  await saveVideo(ctx, page, path.join(publicDir, outName ?? `${name}.webm`));
  return { ev, id };
}
