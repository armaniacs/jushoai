import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import type { AddressInfo } from 'node:net';
import { Builder, By, until, type WebDriver, type WebElement } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import chrome from 'selenium-webdriver/chrome.js';
import { chromeLaunchArgs } from './chrome-flags';

export const GECKO_ID = 'jushoai@armaniacs.github.io';
// Pinning the UUID makes moz-extension://<uuid>/options.html addressable from the test.
export const EXT_UUID = '7a3c1f5e-2b4d-4c6e-8f90-a1b2c3d4e5f6';
const ADDON_DIR = resolve('dist/firefox-mv3');

const FIREFOX_CANDIDATES = [
  '/Applications/Firefox.app/Contents/MacOS/firefox',
  '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
];

function firefoxBinary(): string | undefined {
  return process.env.FIREFOX_BIN ?? FIREFOX_CANDIDATES.find((p) => existsSync(p));
}

const SESSION_RETRIES = 3;
const SESSION_RETRY_DELAY_MS = 2_000;
const sleep = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

async function buildSession(): Promise<WebDriver> {
  const options = new firefox.Options();
  const bin = firefoxBinary();
  if (bin) options.setBinary(bin);
  if (process.env.HEADLESS === '1') options.addArguments('-headless');
  options.setPreference('extensions.webextensions.uuids', JSON.stringify({ [GECKO_ID]: EXT_UUID }));
  // Chrome-context scripting (used to open moz-extension:// tabs) needs geckodriver's system-access flag.
  const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
  const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options)
    .setFirefoxService(service).build();
  await (driver as WebDriver & { installAddon(p: string, temporary: boolean): Promise<string> })
    .installAddon(ADDON_DIR, true);
  return driver;
}

export async function startDriver(): Promise<WebDriver> {
  if (!existsSync(ADDON_DIR)) throw new Error('dist/firefox-mv3 is missing: run `make build-firefox` first');
  // Firefox occasionally exits with status 0 right after geckodriver launches it
  // (seen in make e2e-firefox as "unexpectedly closed with status 0"), then a
  // working instance starts seconds later; retry this error class a bounded
  // number of times and let every other failure surface immediately.
  let lastError: unknown;
  for (let attempt = 1; attempt <= SESSION_RETRIES; attempt++) {
    try {
      return await buildSession();
    } catch (err) {
      lastError = err;
      if (attempt === SESSION_RETRIES || !`${err}`.includes('unexpectedly closed')) throw err;
      await sleep(SESSION_RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

export interface PageServer { origin: string; close(): Promise<void> }

// Serves the repo's samples/ and tests/e2e/pages/ over http: content scripts need a real http(s) origin.
export async function startPageServer(): Promise<PageServer> {
  const roots = [resolve('samples'), resolve('tests/e2e/pages')];
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
  };
  const server: Server = createServer((req, res) => {
    try {
      const name = decodeURIComponent((req.url ?? '/').split('?')[0]!.slice(1));
      const file = roots
        .map((r) => ({ root: r, path: resolve(r, name) }))
        .find((c) => c.path.startsWith(c.root + sep) && existsSync(c.path) && statSync(c.path).isFile());
      if (!file) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': types[extname(file.path)] ?? 'application/octet-stream' })
        .end(readFileSync(file.path));
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}

export const OPTIONS_URL = `moz-extension://${EXT_UUID}/options.html`;

export const PROFILE_DATA = {
  profiles: [{
    id: 'p1', label: 'メイン', lastName: '山田', firstName: '太郎',
    lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', lastNameRomaji: '', firstNameRomaji: '',
    gender: '', birthday: '', school: '', department: '', email: 'taro@example.com', tel: '09012345678',
  }],
  addresses: [{
    id: 'a1', label: '自宅', profileId: '', zip: '1000001', prefecture: '東京都',
    city: '千代田区', street: '千代田1-1', building: '', country: '',
    address1: '', address2: '', address3: '', address4: '', postalCode: '',
  }],
};

type ContextDriver = WebDriver & { setContext(c: unknown): Promise<void> };
const setContext = (d: WebDriver, c: unknown) => (d as ContextDriver).setContext(c);

// WebDriver refuses to navigate to moz-extension:// URLs, so the tab is opened from the chrome context.
// Callers get a dedicated tab; closeExtensionPage() returns to the original one.
export async function openExtensionPage(driver: WebDriver, url: string): Promise<void> {
  const before = await driver.getAllWindowHandles();
  await setContext(driver, firefox.Context.CHROME);
  try {
    await driver.executeScript(
      `const w = Services.wm.getMostRecentWindow('navigator:browser');
       w.gBrowser.selectedTab = w.gBrowser.addTab(arguments[0], { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });`,
      url,
    );
  } finally {
    await setContext(driver, firefox.Context.CONTENT);
  }
  let handle: string | undefined;
  await driver.wait(async () => {
    handle = (await driver.getAllWindowHandles()).find((h) => !before.includes(h));
    return handle !== undefined;
  }, 15_000, 'extension tab did not open');
  await driver.switchTo().window(handle!);
  await driver.wait(
    async () => (await driver.executeScript('return document.readyState')) === 'complete'
      && String(await driver.getCurrentUrl()).startsWith('moz-extension://'),
    15_000, 'extension page did not load',
  );
}

export async function closeExtensionPage(driver: WebDriver, home: string): Promise<void> {
  await driver.close();
  await driver.switchTo().window(home);
}

export async function seedProfile(driver: WebDriver): Promise<void> {
  const home = await driver.getWindowHandle();
  await openExtensionPage(driver, OPTIONS_URL);
  await driver.executeAsyncScript(
    `const done = arguments[arguments.length - 1];
     browser.storage.local.set({ 'jushoai:data': arguments[0] }).then(() => done());`,
    PROFILE_DATA,
  );
  await closeExtensionPage(driver, home);
}

const CHROME_ADDON_DIR = resolve('dist/chrome-mv3');

// Chrome: the extension id is assigned at install time, so it is resolved via
// BiDi webextension.install (no id is written down) and the options page is
// addressed with the returned id.
export async function startChromeDriver(): Promise<{ driver: WebDriver; extensionId: string }> {
  if (!existsSync(CHROME_ADDON_DIR)) throw new Error('dist/chrome-mv3 is missing: run `make build` first');
  const options = new chrome.Options();
  // Flag assembly lives in chrome-flags.ts: --no-sandbox is added only in a
  // container or CI, where the browser sandbox and /dev/shm are unavailable;
  // local runs keep the browser sandbox enabled.
  options.addArguments(...chromeLaunchArgs(process.env));
  options.enableBidi();
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  const ext = await (driver as WebDriver & { installWebExtension(p: string): Promise<{ id: string }> })
    .installWebExtension(CHROME_ADDON_DIR);
  return { driver, extensionId: ext.id };
}

export async function seedChromeProfile(driver: WebDriver, extensionId: string): Promise<void> {
  await driver.get(`chrome-extension://${extensionId}/options.html`);
  await driver.wait(
    async () => (await driver.executeScript('return document.readyState')) === 'complete',
    15_000, 'chrome options page did not load',
  );
  await driver.executeAsyncScript(
    `const done = arguments[arguments.length - 1];
     chrome.storage.local.set({ 'jushoai:data': arguments[0] }).then(() => done());`,
    PROFILE_DATA,
  );
}

// ---------------------------------------------------------------------------
// Selector dictionary (intent-named)
// ---------------------------------------------------------------------------
// Every selector of the extension's own UI lives here and only here, named by
// intent, so a UI change edits one dictionary instead of sweeping scenarios.
// Sample-form fixture ids (#ln, #pref, ...) are the fixtures' own contract and
// stay in scenarios.

// Closed-shadow UI selectors. The values are contracts and stay as-is; only
// the names are new.
const SHADOW_SELECTORS = {
  // The fill trigger is any non-badge button in the banner (the badge is a
  // status label, not the fill action).
  fillButton: 'button:not(.badge)',
  // Primary action of the preview panel; the fill-one confirm dialog applies
  // through the same button.
  applyButton: 'button.primary',
  // Form button badge carrying data-status (the error notice included).
  badge: '.badge',
  // Result-mode report button (matched further by its text, see below).
  reportButton: 'button.report',
  // Preview panel (result mode included).
  panel: '.panel',
  // Banner wrapper: the translucent background and the drag event target.
  bannerWrap: '.wrap',
} as const;

// The report button is matched by text on top of its class: the undo button
// once shared the 'report' class and sat first, so a class-only selector
// landed on it. Contract value, asserted through reportButton().
const REPORT_BUTTON_TEXT = 'issueで報告';

// Options page is light DOM: buttons and notices are reachable with plain
// selectors. Save buttons exist in more than one section with the same label,
// so button xpaths stay scoped to their section holder. The holder ids
// (#app/#ai-app/#exclusion-app/#mapping-app/#audit-app) are the page's own
// structure and are kept as-is.
export const OPTIONS_SELECTORS = {
  // #exclusion-app: excluded-page list and its apply.
  exclusionInput: '#exclusion-app input',
  exclusionAddButton: `//*[@id='exclusion-app']//button[text()='追加']`,
  exclusionApplyButton: '#exclusion-app button.primary',
  exclusionRemoveButton: '#exclusion-app .exclusion-list button',
  exclusionSavedNotice: '#exclusion-app .saved',
  // #profiles / #addresses: card lists and per-section actions.
  profilesSection: '#profiles',
  profileCards: '#profiles fieldset',
  addressCards: '#addresses fieldset',
  saveProfileButton: `//*[@id='profiles']//button[text()='保存']`,
  saveAddressButton: `//*[@id='addresses']//button[text()='保存']`,
  deleteProfileButton: `//*[@id='profiles']//button[text()='このプロファイルを削除']`,
  // #float-root: guide buttons and notices.
  trialBothButton: `//*[@id='float-root']//button[text()='架空の名前と住所を作って試す']`,
  trialProfileButton: `//*[@id='float-root']//button[text()='架空の名前を作って試す']`,
  trialAddressButton: `//*[@id='float-root']//button[text()='架空の住所を作って試す']`,
  guideToAddressesButton: `//*[@id='float-root']//button[text()='住所を登録する']`,
  guideToProfilesButton: `//*[@id='float-root']//button[text()='名前を登録する']`,
  guide: '#float-root .float-guide',
  guideCloseButton: '#float-root .float-guide .float-close',
  savedToast: '#float-root .float-toast',
  errorToast: '#float-root .float-error',
  errorToastCloseButton: '#float-root .float-error .float-close',
  // #side: section navigation; aria-current pins the active tab.
  sideNavLinks: '#side nav a[data-section]',
  sideNavAddressesLink: '#side nav a[data-section="addresses"]',
  sideNavProfilesLink: '#side nav a[data-section="profiles"]',
  // Provider select options of the settings page.
  providerOptions: 'select option',
} as const;

// ---------------------------------------------------------------------------
// Closed-shadow read seam
// ---------------------------------------------------------------------------
// Every read of the JushoAI shadow UI goes through this seam and only through
// it: the div[data-jushoai] host scan lives here as one loop shared by all
// readers, each closed shadow root is opened through its host element, and
// every reader picks one of exactly three wait policies:
// - pollShadow:       driver.wait over the seam read, 15s, throws on timeout
//                     (clickInShadow: the click is required for the flow)
// - pollShadowOrNull: the same poll with the timeout caught into null
//                     (reportButton/badgeNotice: null IS the clean-apply
//                     result; a throwing wait makes those scenarios flaky)
// - no wait:          a single seam read the caller wraps in its own
//                     driver.wait (resultPanelText, panelChildTags, bannerWrap)

// The one mount hook of the extension UI: the content script drops one host
// element per page, and every closed-shadow read plus the light-DOM host
// helpers key off this attribute.
export const HOST_SELECTOR = 'div[data-jushoai]';
const SHADOW_WAIT_MS = 15_000;

// selenium's ShadowRoot type: closed shadow roots are reachable from tests
// only through the host element, so the type is derived from WebElement.
type ShadowRootOf = Awaited<ReturnType<WebElement['getShadowRoot']>>;

// One read inside one closed shadow root. Returning null moves the scan to
// the next host; a throw propagates to the reader.
type ShadowRead<T> = (root: ShadowRootOf) => Promise<T | null> | T | null;

// The seam's one host scan: every mounted JushoAI host in DOM order, each
// closed shadow root opened through its host element.
async function* shadowRootsOf(driver: WebDriver): AsyncGenerator<ShadowRootOf> {
  for (const host of await driver.findElements(By.css(HOST_SELECTOR))) {
    yield await host.getShadowRoot();
  }
}

// First non-null read across the host scan, or null when no host yields one.
async function firstFromShadow<T>(driver: WebDriver, read: ShadowRead<T>): Promise<T | null> {
  for await (const root of shadowRootsOf(driver)) {
    const found = await read(root);
    if (found !== null) return found;
  }
  return null;
}

// First element matching css inside one closed shadow root (the per-host
// lookup the pre-seam readers each re-implemented), or null.
async function firstIn(root: ShadowRootOf, css: string): Promise<WebElement | null> {
  const found = await root.findElements(By.css(css));
  return found[0] ?? null;
}

// Poll-then-throw wait policy: polls the seam read until it yields a value;
// on timeout the error carries `message`.
function pollShadow<T>(driver: WebDriver, read: ShadowRead<T>, message: string): Promise<T | null> {
  return driver.wait(() => firstFromShadow(driver, read), SHADOW_WAIT_MS, message);
}

// Poll-then-null wait policy: the same poll with any failure (timeout or a
// failing read) resolved as null.
async function pollShadowOrNull<T>(driver: WebDriver, read: ShadowRead<T>, message: string): Promise<T | null> {
  try {
    return await pollShadow(driver, read, message);
  } catch {
    return null;
  }
}

// Fill trigger of the banner: any non-badge button (the badge is a status
// label, not the fill action). The selector value is a contract.
export async function clickFillButton(driver: WebDriver): Promise<void> {
  await clickInShadow(driver, SHADOW_SELECTORS.fillButton);
}

// Apply button of the preview panel; the fill-one confirm dialog (PBI-150)
// applies through the same primary button.
export async function clickApplyButton(driver: WebDriver): Promise<void> {
  await clickInShadow(driver, SHADOW_SELECTORS.applyButton);
}

// Clicks one element of the shadow UI through the seam. The UI lives in closed
// shadow roots; WebDriver can still reach them through the host element. Wait
// policy (unchanged): poll 15s, then throw — the click is required for the flow.
export async function clickInShadow(driver: WebDriver, css: string): Promise<void> {
  await pollShadow(driver, async (root) => {
    const el = await firstIn(root, css);
    if (!el) return null;
    await el.click();
    return el;
  }, `no [data-jushoai] shadow element matched ${css}`);
}

export async function valueOf(driver: WebDriver, id: string): Promise<string> {
  return (await driver.findElement(By.id(id)).getAttribute('value')) ?? '';
}

// Number of banner hosts the content script mounted on the page. Light-DOM
// count: the host element is ordinary even though its shadow root is closed.
export async function mountedHosts(driver: WebDriver): Promise<number> {
  return (await driver.findElements(By.css(HOST_SELECTOR))).length;
}

// First mounted banner host, for actions that target the host element itself
// (the drag gesture bubbles from the host to the window-level listeners).
export async function bannerHost(driver: WebDriver): Promise<WebElement> {
  return driver.findElement(By.css(HOST_SELECTOR));
}

// Reads the PBI-55 result-mode report button out of the shadow DOM. Resolves
// null when the preview closed (clean apply) instead of entering result mode.
// Wait policy (unchanged): poll 15s, then catch the timeout into null.
export async function reportButton(driver: WebDriver): Promise<WebElement | null> {
  // Matches by text, not just the button class: the undo button once shared
  // the 'report' class and sat first, so a class-only selector landed on it.
  return pollShadowOrNull(driver, async (root) => {
    for (const el of await root.findElements(By.css(SHADOW_SELECTORS.reportButton))) {
      if ((await el.getText())?.includes(REPORT_BUTTON_TEXT)) return el;
    }
    return null;
  }, 'no [data-jushoai] report button found');
}

// Visible text of the preview panel (result mode included), for asserting the
// PBI-55 breakdown without following the report link anywhere. No-wait
// policy: a single seam read; the caller wraps it in driver.wait when needed.
// The read never stops the scan early: the text aggregates across all hosts.
export async function resultPanelText(driver: WebDriver): Promise<string> {
  const texts: string[] = [];
  for await (const root of shadowRootsOf(driver)) {
    for (const panel of await root.findElements(By.css(SHADOW_SELECTORS.panel))) {
      texts.push((await panel.getText()) ?? '');
    }
  }
  return texts.join('\n');
}

// Reads the form button badge (status + text) out of the shadow DOM. The
// partial-application banner (PBI-82) lands here via showError as
// data-status="error"; a clean run leaves a non-error status. Wait policy
// (unchanged): poll 15s, then catch the timeout into null.
export async function badgeNotice(driver: WebDriver): Promise<{ status: string | null; text: string } | null> {
  return pollShadowOrNull(driver, async (root) => {
    const badge = await firstIn(root, SHADOW_SELECTORS.badge);
    if (!badge) return null;
    return {
      status: await badge.getAttribute('data-status'),
      text: (await badge.getText()) ?? '',
    };
  }, 'no [data-jushoai] badge found');
}

// Direct-child tags of the first .panel in any JushoAI shadow root, for
// pinning panel assembly order in a real browser (heading first, actions
// last — the DOM order is the visual order). Resolves [] when no panel exists.
// No-wait policy: a single seam read; the caller wraps it in driver.wait.
export async function panelChildTags(driver: WebDriver): Promise<string[]> {
  return (await firstFromShadow(driver, async (root) => {
    const panels = await root.findElements(By.css(SHADOW_SELECTORS.panel));
    if (panels.length === 0) return null;
    const tags: string[] = [];
    for (const kid of await panels[0]!.findElements(By.xpath('./*'))) {
      const tag = (await kid.getTagName()).toLowerCase();
      const cls = await kid.getAttribute('class');
      tags.push(cls ? `${tag}.${cls}` : tag);
    }
    return tags;
  })) ?? [];
}

// Banner wrapper element (.wrap): carries the translucent background and
// receives the drag events. No-wait policy: a single seam read; the caller
// wraps it in driver.wait when the banner may still be mounting.
export async function bannerWrap(driver: WebDriver): Promise<WebElement | null> {
  return firstFromShadow(driver, (root) => firstIn(root, SHADOW_SELECTORS.bannerWrap));
}

export { By, until };
