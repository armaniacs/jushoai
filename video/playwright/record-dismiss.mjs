// Dismiss-and-register demo (v0.1.34): on the dense two-column form the banner
// overlaps a field, so the viewer sees why dismissal matters. The script
// clicks the translucent X, shows the small dialog, picks この配下全体,
// registers it, then opens the settings page where the URL was appended to
// 起動しないURL. Writes remotion/public/clip-dismiss.webm and
// remotion/src/clips-dismiss.json.
//
// Serves its own fixtures (127.0.0.1:4181, no extra terminal) and runs
// headless on the full Chromium build (channel: 'chromium'): the headless
// shell cannot load extensions. Needs `make build` first (dist/chrome-mv3).
// Registration lands in the throwaway recording profile only.
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

// The dismiss dialog's radios live in a closed shadow root, so a plain
// locator cannot reach them. Finds the LABEL whose text contains `text`,
// then its INPUT child, and returns both node ids (CDP pierce walk).
async function labelRadio(cdp, text) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const kids = (n) => [...(n.children || []), ...(n.shadowRoots || []), ...(n.contentDocument ? [n.contentDocument] : [])];
  const textOf = (n) => (n.nodeType === 3 ? n.nodeValue : kids(n).map(textOf).join(''));
  let label = null;
  const walk = (n) => {
    if (!label && n.nodeName === 'LABEL' && textOf(n).includes(text)) label = n;
    kids(n).forEach(walk);
  };
  walk(root);
  if (!label) throw new Error(`label not found: ${text}`);
  const input = kids(label).find((k) => k.nodeName === 'INPUT');
  if (!input) throw new Error(`radio input not found in label: ${text}`);
  return { label, input };
}

async function nodeCenter(cdp, nodeId) {
  const { model } = await cdp.send('DOM.getBoxModel', { nodeId });
  const q = model.content;
  return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
}

// Reads back the radio's checkedness through the node itself (no page-side
// query can pierce the closed shadow root). Fail fast if the click missed.
async function isChecked(cdp, nodeId) {
  const { object } = await cdp.send('DOM.resolveNode', { nodeId });
  const { result } = await cdp.send('Runtime.callFunctionOn', {
    objectId: object.objectId,
    functionDeclaration: 'function() { return this.checked; }',
    returnByValue: true,
  });
  return result.value === true;
}

// Exact-text BUTTON center (the dismiss affordance is a bare 'X'; a contains
// match would also hit the banner itself, whose subtree includes the X).
async function exactButtonCenter(cdp, text) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const kids = (n) => [...(n.children || []), ...(n.shadowRoots || []), ...(n.contentDocument ? [n.contentDocument] : [])];
  const textOf = (n) => (n.nodeType === 3 ? n.nodeValue : kids(n).map(textOf).join(''));
  const found = [];
  const walk = (n) => {
    if (n.nodeName === 'BUTTON' && textOf(n).trim() === text) found.push(n.nodeId);
    kids(n).forEach(walk);
  };
  walk(root);
  if (!found.length) return null;
  const { model } = await cdp.send('DOM.getBoxModel', { nodeId: found[0] });
  const q = model.content;
  return { x: (q[0] + q[2] + q[4] + q[6]) / 4, y: (q[1] + q[3] + q[5] + q[7]) / 4 };
}

async function waitAbsent(cdp, text, ms) {
  const end = Date.now() + ms;
  for (;;) {
    const c = await exactButtonCenter(cdp, text).catch(() => ({ x: 0, y: 0 }));
    if (!c) return;
    if (Date.now() >= end) throw new Error(`button still present after ${ms}ms: ${text}`);
    await sleep(250);
  }
}

const server = await serveStatic(
  [path.join(ROOT, 'samples'), path.join(ROOT, 'tests/e2e/pages')],
  PORT,
);
try {
  const { ev } = await record({
    workDir: WORK,
    extDir: EXT,
    publicDir: PUBLIC,
    name: 'dismiss',
    outName: 'clip-dismiss.webm',
    file: 'two-column-form.html',
    base: BASE,
    waitMs: 2000,
    headless: true,
    channel: 'chromium',
    script: async (h) => {
      const { page, cdp, id } = h;
      // Hook visual: the banner sits on the dense form (it overlaps a field).
      const btn = await h.find('JushoAI で入力');
      await h.move(btn, 1100);
      await sleep(900);
      // Demo1: hover makes the translucent X fully opaque, then press it.
      const x = await exactButtonCenter(cdp, 'X');
      if (!x) throw new Error('dismiss X not found');
      await h.move(x, 600);
      await h.sleep(400);
      h.mark('aim');
      await h.click();
      // The banner is gone and the small dialog is up (condition waits: the
      // dialog renders asynchronously after the click).
      await h.waitFind('今回だけ閉じる', 8000);
      h.mark('dismissed');
      await h.sleep(1600);
      // Demo2: pick この配下全体 (click the RADIO itself, not the label text:
      // the wrapped label's box center can land between lines and miss), then
      // register. The checkedness is read back through the node; fail fast.
      const prefix = await labelRadio(cdp, 'この配下全体');
      await h.move(await nodeCenter(cdp, prefix.input.nodeId), 800);
      await h.sleep(300);
      await h.click();
      if (!(await isChecked(cdp, prefix.input.nodeId))) {
        // Fall back to the label center once before giving up.
        await h.move(await nodeCenter(cdp, prefix.label.nodeId), 500);
        await h.sleep(300);
        await h.click();
      }
      if (!(await isChecked(cdp, prefix.input.nodeId))) throw new Error('prefix radio did not select');
      h.mark('chosen');
      await h.sleep(700);
      const reg = await h.find('起動しないURLに登録する');
      await h.move(reg, 600);
      await h.sleep(300);
      await h.click();
      // Registration closes the dialog (load → add → save → close chain).
      await waitAbsent(cdp, '起動しないURLに登録する', 8000);
      h.mark('registered');
      await h.sleep(1000);
      // Settings page proves the append: the prefix URL sits in 起動しないURL.
      await page.goto(`chrome-extension://${id}/options.html#exclusions`);
      await page.waitForFunction(
        () => document.body.innerText.includes('127.0.0.1'),
        null,
        { timeout: 12000 },
      );
      h.mark('settings');
      await h.sleep(2500);
    },
  });
  const clips = { dismiss: ev };
  fs.writeFileSync(path.join(HERE, '../remotion/src/clips-dismiss.json'), JSON.stringify(clips, null, 2));
  console.log(JSON.stringify(clips, null, 2));
} finally {
  server.close();
}
