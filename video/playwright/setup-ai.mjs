// Prepares the browser profile used to record the AI scenes: saves the Gemini provider, model and key through the
// real settings page, so the key is encrypted by the extension itself. Run it yourself; the key is read from the
// GEMINI_API_KEY environment variable and is never printed.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(new URL('../remotion/package.json', import.meta.url));
const { chromium } = require('playwright');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const EXT = path.resolve(HERE, '../ext');
const PROFILE_DIR = path.join(HERE, '.work', 'profile-ai');
const MODEL = 'gemini-3.5-flash';
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) throw new Error('GEMINI_API_KEY is not set');

// The optional host permission prompt is browser UI that automation cannot click, so this recording-only copy of the
// build declares the Gemini host up front. The product manifest is not touched.
fs.rmSync(EXT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'dist/chrome-mv3'), EXT, { recursive: true });
const manifestPath = path.join(EXT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.host_permissions = ['https://generativelanguage.googleapis.com/*'];
fs.writeFileSync(manifestPath, JSON.stringify(manifest));

const PROFILE = {
  id: 'p1', label: 'テスト用', lastName: '試験', firstName: '太郎', lastNameKana: 'シケン', firstNameKana: 'タロウ',
  lastNameRomaji: 'Shiken', firstNameRomaji: 'Taro', gender: '', birthday: '1990-05-05', school: '', department: '',
  email: 'shiken@example.com', tel: '09012345678',
};
const ADDRESS = {
  id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1',
  building: 'サンプルビル101', country: 'Japan', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
fs.mkdirSync(PROFILE_DIR, { recursive: true });
const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1600, height: 1000 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
try {
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  await sw.evaluate((d) => chrome.storage.local.set(d), { 'jushoai:data': { profiles: [PROFILE], addresses: [ADDRESS] } });

  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${id}/options.html#ai`);
  await page.waitForTimeout(800);
  await page.locator('select').last().selectOption('gemini');
  await page.waitForTimeout(300);
  const gemini = page.locator('fieldset', { has: page.locator('legend', { hasText: 'Google Gemini' }) });
  await gemini.locator('input').nth(0).fill(MODEL);
  await gemini.locator('input').nth(2).fill(KEY);
  const notice = () => page.locator('.saved, .errors-text').last().innerText().catch(() => '(none)');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('save :', await notice());
  await page.getByRole('button', { name: /接続テスト/ }).click();
  await page.waitForTimeout(8000);
  console.log('test :', await notice());
  console.log('model:', MODEL);

  // Diagnostics, both free of the real key. The audit log has no key either: it records host, model, result and
  // HTTP status only. The probe uses a dummy key to see whether the extension context can reach the API at all.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
    page.getByRole('button', { name: /TSV でダウンロード/ }).click().catch(() => null),
  ]);
  if (download) {
    const tsv = fs.readFileSync(await download.path(), 'utf8');
    console.log('--- audit log (TSV) ---');
    console.log(tsv.trim());
  } else {
    console.log('--- audit log: nothing downloaded ---');
  }
  const probe = await page.evaluate(async (model) => {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': 'dummy', 'content-type': 'application/json' },
        body: '{}',
      });
      return `reachable: HTTP ${res.status}`;
    } catch (e) {
      return `blocked: ${e && e.name}: ${e && e.message}`;
    }
  }, MODEL);
  console.log('--- probe with a dummy key ---');
  console.log(probe);
} finally {
  await ctx.close();
}
