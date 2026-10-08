import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { Builder, By, until, type WebDriver, type WebElement } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

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

export async function startDriver(): Promise<WebDriver> {
  if (!existsSync(ADDON_DIR)) throw new Error('dist/firefox-mv3 is missing: run `make build-firefox` first');
  const options = new firefox.Options();
  const bin = firefoxBinary();
  if (bin) options.setBinary(bin);
  if (process.env.HEADLESS === '1') options.addArguments('-headless');
  options.setPreference('devtools.chrome.enabled', true);
  options.setPreference('devtools.debugger.remote-enabled', true);
  options.setPreference('extensions.webextensions.uuids', JSON.stringify({ [GECKO_ID]: EXT_UUID }));
  // Chrome-context scripting (used to open moz-extension:// tabs) needs geckodriver's system-access flag.
  const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
  const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options)
    .setFirefoxService(service).build();
  await (driver as WebDriver & { installAddon(p: string, temporary: boolean): Promise<string> })
    .installAddon(ADDON_DIR, true);
  return driver;
}

export interface PageServer { origin: string; close(): Promise<void> }

// Serves the repo's samples/ and tests/e2e/pages/ over http: content scripts need a real http(s) origin.
export async function startPageServer(): Promise<PageServer> {
  const roots = [resolve('samples'), resolve('tests/e2e/pages')];
  const server: Server = createServer((req, res) => {
    const name = decodeURIComponent((req.url ?? '/').slice(1)).replace(/\.\./g, '');
    const file = roots.map((r) => resolve(r, name)).find((p) => existsSync(p));
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(readFileSync(file));
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

async function shadowButton(host: WebElement, css: string): Promise<WebElement | null> {
  const root = await host.getShadowRoot();
  const found = await root.findElements(By.css(css));
  return found[0] ?? null;
}

// The UI lives in closed shadow roots; WebDriver can still reach them through the host element.
export async function clickInShadow(driver: WebDriver, css: string): Promise<void> {
  await driver.wait(async () => {
    for (const host of await driver.findElements(By.css('div[data-jushoai]'))) {
      const el = await shadowButton(host, css);
      if (el) {
        await el.click();
        return true;
      }
    }
    return false;
  }, 15_000, `no [data-jushoai] shadow element matched ${css}`);
}

export async function valueOf(driver: WebDriver, id: string): Promise<string> {
  return (await driver.findElement(By.id(id)).getAttribute('value')) ?? '';
}

export { By, until };
