import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WebDriver } from 'selenium-webdriver';
import {
  By, badgeNotice, clickInShadow, seedChromeProfile, startChromeDriver, startPageServer, until, valueOf, type PageServer,
} from './harness';

let driver: WebDriver;
let pages: PageServer;
let extensionId: string;

beforeAll(async () => {
  pages = await startPageServer();
  const started = await startChromeDriver();
  driver = started.driver;
  extensionId = started.extensionId;
  await seedChromeProfile(driver, extensionId);
});

afterAll(async () => {
  await driver?.quit();
  await pages?.close();
});

describe('chrome: fill flow', () => {
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

describe('chrome: partial fill notice (PBI-82)', () => {
  it('guards unfillable fields and stays silent for by-design skips', async () => {
    await driver.get(`${pages.origin}/partial-notice.html`);
    await clickInShadow(driver, 'button:not(.badge)');
    await clickInShadow(driver, 'button.primary');
    // Filled input is kept, maxlength-guarded input is skipped, email applies.
    expect(await valueOf(driver, 'ln')).toBe('佐藤');
    expect(await valueOf(driver, 'fn')).toBe('');
    expect(await valueOf(driver, 'em')).toBe('taro@example.com');
    // Designed behavior (fill-plan BY_DESIGN_RESULTS + PBI-08 residual):
    // planner-level skips (filled / maxlength / no-value) never raise the
    // partial banner; only unexpected runtime failures do. So the badge keeps
    // its normal status here. A user-visible notice for by-design skips needs
    // a product decision first (PBI-82 BDD box stays open for exactly that).
    const notice = await badgeNotice(driver);
    expect(notice?.status).not.toBe('error');
  });

  it('shows no error notice when everything applies', async () => {
    await driver.get(`${pages.origin}/split-form.html`);
    await clickInShadow(driver, 'button:not(.badge)');
    await clickInShadow(driver, 'button.primary');
    expect(await valueOf(driver, 'ln')).toBe('山田');
    // BDD scenario 1: a complete run raises no failure notice.
    expect((await badgeNotice(driver))?.status).not.toBe('error');
  });
});

describe('chrome: settings page', () => {
  it('offers the built-in provider alongside the cloud providers', async () => {
    await driver.get(`chrome-extension://${extensionId}/options.html`);
    const values = (await driver.executeScript(
      `return Array.from(document.querySelectorAll('select option'), (o) => o.value);`,
    )) as string[];
    expect(values).toContain('built-in');
    expect(values).toContain('openai');
    expect(values).toContain('gemini');
  });
});

const hosts = async (): Promise<number> => (await driver.findElements(By.css('div[data-jushoai]'))).length;

const openExclusionPage = async (): Promise<void> => {
  await driver.get(`chrome-extension://${extensionId}/options.html#exclusions`);
  await driver.wait(until.elementLocated(By.css('#exclusion-app input')), 10_000);
};

const addExclusion = async (value: string): Promise<void> => {
  await openExclusionPage();
  const input = await driver.findElement(By.css('#exclusion-app input'));
  await input.sendKeys(value);
  await driver.findElement(By.xpath("//*[@id='exclusion-app']//button[text()='追加']")).click();
  await driver.findElement(By.css('#exclusion-app button.primary')).click();
  await driver.wait(until.elementLocated(By.css('#exclusion-app .saved')), 10_000);
};

const removeFirstExclusion = async (): Promise<void> => {
  await openExclusionPage();
  await driver.findElement(By.css('#exclusion-app .exclusion-list button')).click();
  await driver.findElement(By.css('#exclusion-app button.primary')).click();
  await driver.wait(until.elementLocated(By.css('#exclusion-app .saved')), 10_000);
};

describe('chrome: excluded pages', () => {
  it('does not start on a registered URL and starts again once it is removed', async () => {
    await addExclusion(`${pages.origin}/split-form.html`);
    try {
      await driver.get(`${pages.origin}/split-form.html`);
      // The fixture is loaded, so a missing host means the extension stayed out
      // rather than the page failing to render.
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
    const home = await driver.getWindowHandle();
    await driver.switchTo().newWindow('tab');
    try {
      await addExclusion(`${pages.origin}/split-form.html`);
    } finally {
      await driver.close();
      await driver.switchTo().window(home);
    }
    await driver.wait(async () => (await hosts()) === 0, 10_000);
    // Leave the stored list as it was for the other cases in this file.
    await driver.switchTo().newWindow('tab');
    try {
      await removeFirstExclusion();
    } finally {
      await driver.close();
      await driver.switchTo().window(home);
    }
  });
});
