import type { WebDriver } from 'selenium-webdriver';
import {
  By, OPTIONS_URL, PROFILE_DATA, closeExtensionPage, openExtensionPage,
  seedChromeProfile, seedProfile, startChromeDriver, startDriver, startPageServer,
  until, type PageServer,
} from './harness';

// BrowserAdapter hides how each browser is launched and how its options page
// is reached: Chrome resolves the extension id via BiDi install and navigates
// to chrome-extension://... directly, while Firefox pins a moz-extension://
// UUID and must open it from the browser chrome context (harness.ts).
// Scenarios (scenarios.ts) only see this interface, so a new flow is written
// once and runs on both browsers.
export interface BrowserAdapter {
  readonly label: string;
  readonly driver: WebDriver;
  readonly pages: PageServer;
  readonly optionsBase: string;
  /** Launch the browser + page server. Must run inside beforeAll. */
  start(): Promise<void>;
  /** Seed jushoai:data (defaults to PROFILE_DATA). */
  seed(data?: unknown): Promise<void>;
  /**
   * Run fn with the options page open at hash ('#profiles', '#addresses',
   * '#exclusions', or ''), then return to the previous tab. The tab juggling
   * is what lets the excluded-pages scenarios keep the form tab open while
   * the list is edited from another tab.
   */
  withOptionsPage<T>(hash: string, fn: () => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

// The options page renders every section id in the DOM; the wait only picks
// which one must be present before fn runs.
function sectionSelector(hash: string): string {
  if (hash === '#exclusions') return '#exclusion-app input';
  if (hash === '#addresses') return '#addresses';
  return '#profiles';
}

const STORAGE_SET_CHROME = `const done = arguments[arguments.length - 1];
  chrome.storage.local.set({ 'jushoai:data': arguments[0] }).then(() => done());`;
const STORAGE_SET_FIREFOX = `const done = arguments[arguments.length - 1];
  browser.storage.local.set({ 'jushoai:data': arguments[0] }).then(() => done());`;

export class ChromeAdapter implements BrowserAdapter {
  readonly label = 'chrome';
  driver!: WebDriver;
  pages!: PageServer;
  optionsBase = '';
  private extensionId = '';
  private freshSeq = 0;

  async start(): Promise<void> {
    this.pages = await startPageServer();
    const started = await startChromeDriver();
    this.driver = started.driver;
    this.extensionId = started.extensionId;
    this.optionsBase = `chrome-extension://${this.extensionId}/options.html`;
  }

  async seed(data: unknown = PROFILE_DATA): Promise<void> {
    if (data === PROFILE_DATA) {
      // Initial seed keeps the exact harness path.
      await seedChromeProfile(this.driver, this.extensionId);
      return;
    }
    await this.driver.get(this.optionsBase);
    await this.driver.executeAsyncScript(STORAGE_SET_CHROME, data);
  }

  async withOptionsPage<T>(hash: string, fn: () => Promise<T>): Promise<T> {
    // Same-URL and fragment-only navigations do not reliably reboot the page,
    // so every visit carries a cache-busting query (boot reads the settled
    // seed; no later navigation can predate it). A fresh tab keeps the
    // caller's form tab open for the excluded-pages scenarios.
    const home = await this.driver.getWindowHandle();
    await this.driver.switchTo().newWindow('tab');
    try {
      this.freshSeq += 1;
      await this.driver.get(`${this.optionsBase}?fresh=${Date.now()}-${this.freshSeq}${hash}`);
      await this.driver.wait(until.elementLocated(By.css(sectionSelector(hash))), 10_000);
      return await fn();
    } finally {
      await this.driver.close();
      await this.driver.switchTo().window(home);
    }
  }

  async close(): Promise<void> {
    await this.driver?.quit();
    await this.pages?.close();
  }
}

export class FirefoxAdapter implements BrowserAdapter {
  readonly label = 'firefox';
  driver!: WebDriver;
  pages!: PageServer;
  readonly optionsBase = OPTIONS_URL;

  async start(): Promise<void> {
    this.pages = await startPageServer();
    this.driver = await startDriver();
  }

  async seed(data: unknown = PROFILE_DATA): Promise<void> {
    if (data === PROFILE_DATA) {
      // Initial seed keeps the exact harness path.
      await seedProfile(this.driver);
      return;
    }
    const home = await this.driver.getWindowHandle();
    await openExtensionPage(this.driver, OPTIONS_URL);
    try {
      await this.driver.executeAsyncScript(STORAGE_SET_FIREFOX, data);
    } finally {
      await closeExtensionPage(this.driver, home);
    }
  }

  async withOptionsPage<T>(hash: string, fn: () => Promise<T>): Promise<T> {
    const home = await this.driver.getWindowHandle();
    await openExtensionPage(this.driver, `${OPTIONS_URL}${hash}`);
    try {
      await this.driver.wait(until.elementLocated(By.css(sectionSelector(hash))), 10_000);
      return await fn();
    } finally {
      await closeExtensionPage(this.driver, home);
    }
  }

  async close(): Promise<void> {
    await this.driver?.quit();
    await this.pages?.close();
  }
}
