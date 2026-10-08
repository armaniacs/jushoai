import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WebDriver } from 'selenium-webdriver';
import {
  By, OPTIONS_URL, clickInShadow, closeExtensionPage, openExtensionPage, seedProfile, startDriver, startPageServer, valueOf, type PageServer,
} from './harness';

let driver: WebDriver;
let pages: PageServer;

beforeAll(async () => {
  pages = await startPageServer();
  driver = await startDriver();
  await seedProfile(driver);
});

afterAll(async () => {
  await driver?.quit();
  await pages?.close();
});

describe('firefox: fill flow', () => {
  it('fills a split Japanese form through button, preview and apply', async () => {
    await driver.get(`${pages.origin}/split-form.html`);
    await clickInShadow(driver, 'button:not(.badge)');
    await clickInShadow(driver, 'button.primary');
    expect(await valueOf(driver, 'ln')).toBe('山田');
    expect(await valueOf(driver, 'fn')).toBe('太郎');
    expect(await valueOf(driver, 'zip')).toBe('100-0001');
    expect(await driver.findElement(By.id('pref')).getAttribute('value')).toBe('13');
  });

  it('does not overwrite a filled field and does not truncate past maxlength', async () => {
    await driver.get(`${pages.origin}/prefilled.html`);
    await clickInShadow(driver, 'button:not(.badge)');
    await clickInShadow(driver, 'button.primary');
    expect(await valueOf(driver, 'ln')).toBe('佐藤');
    expect(await valueOf(driver, 'fn')).toBe('');
    expect(await valueOf(driver, 'em')).toBe('taro@example.com');
  });
});

describe('firefox: settings page', () => {
  it('offers only the cloud providers and none', async () => {
    const home = await driver.getWindowHandle();
    await openExtensionPage(driver, OPTIONS_URL);
    const values = (await driver.executeScript(
      `return Array.from(document.querySelectorAll('select option'), (o) => o.value);`,
    )) as string[];
    expect(values).toContain('openai');
    expect(values).toContain('gemini');
    expect(values).not.toContain('built-in');
    await closeExtensionPage(driver, home);
  });

  it('stores and reads the profile through the background-independent storage API', async () => {
    const home = await driver.getWindowHandle();
    await openExtensionPage(driver, OPTIONS_URL);
    const stored = (await driver.executeAsyncScript(
      `const done = arguments[arguments.length - 1];
       browser.storage.local.get('jushoai:data').then((r) => done(r['jushoai:data']));`,
    )) as { profiles: { lastName: string }[] };
    await closeExtensionPage(driver, home);
    expect(stored.profiles[0]!.lastName).toBe('山田');
  });
});
