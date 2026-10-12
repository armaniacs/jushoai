import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WebDriver } from 'selenium-webdriver';
import {
  By, OPTIONS_URL, clickInShadow, closeExtensionPage, openExtensionPage, seedProfile, startDriver, startPageServer, until, valueOf, type PageServer,
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
    try {
      const values = (await driver.executeScript(
        `return Array.from(document.querySelectorAll('select option'), (o) => o.value);`,
      )) as string[];
      expect(values).toContain('openai');
      expect(values).toContain('gemini');
      expect(values).not.toContain('built-in');
    } finally {
      await closeExtensionPage(driver, home);
    }
  });
});

const hosts = async (): Promise<number> => (await driver.findElements(By.css('div[data-jushoai]'))).length;

// The options page is only reachable through the browser chrome context, so every
// interaction opens it in its own tab and returns to the calling tab.
const withExclusionPage = async <T>(fn: () => Promise<T>): Promise<T> => {
  const home = await driver.getWindowHandle();
  await openExtensionPage(driver, `${OPTIONS_URL}#exclusions`);
  try {
    await driver.wait(until.elementLocated(By.css('#exclusion-app input')), 10_000);
    return await fn();
  } finally {
    await closeExtensionPage(driver, home);
  }
};

const addExclusion = (value: string): Promise<void> => withExclusionPage(async () => {
  const input = await driver.findElement(By.css('#exclusion-app input'));
  await input.sendKeys(value);
  await driver.findElement(By.xpath("//*[@id='exclusion-app']//button[text()='追加']")).click();
  await driver.findElement(By.css('#exclusion-app button.primary')).click();
  await driver.wait(until.elementLocated(By.css('#exclusion-app .saved')), 10_000);
});

const removeFirstExclusion = (): Promise<void> => withExclusionPage(async () => {
  await driver.findElement(By.css('#exclusion-app .exclusion-list button')).click();
  await driver.findElement(By.css('#exclusion-app button.primary')).click();
  await driver.wait(until.elementLocated(By.css('#exclusion-app .saved')), 10_000);
});

describe('firefox: excluded pages', () => {
  it('does not start on a registered URL and starts again once it is removed', async () => {
    await addExclusion(`${pages.origin}/split-form.html`);
    try {
      await driver.get(`${pages.origin}/split-form.html`);
      await driver.findElement(By.id('ln'));
      await driver.sleep(1500);
      expect(await hosts()).toBe(0);
    } finally {
      await removeFirstExclusion();
    }
    await driver.get(`${pages.origin}/split-form.html`);
    await driver.wait(async () => (await hosts()) > 0, 10_000);
  });

  it('removes the button from a tab that is already open', async () => {
    await driver.get(`${pages.origin}/split-form.html`);
    await driver.wait(async () => (await hosts()) > 0, 10_000);
    await addExclusion(`${pages.origin}/split-form.html`);
    await driver.wait(async () => (await hosts()) === 0, 10_000);
    await removeFirstExclusion();
  });
});
