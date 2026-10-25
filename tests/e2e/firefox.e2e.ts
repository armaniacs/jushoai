import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Key, type WebDriver } from 'selenium-webdriver';
import {
  By, OPTIONS_URL, badgeNotice, clickInShadow, closeExtensionPage, openExtensionPage, panelChildTags, seedProfile, startDriver, startPageServer, until, valueOf, type PageServer,
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

describe('firefox: fill-one kana (PBI-150)', () => {
  it('fills the kana value through Alt+J with the heading-first confirm dialog', async () => {
    await driver.get(`${pages.origin}/single-field-form.html`);
    const furigana = await driver.findElement(By.name('furigana'));
    await driver.actions().click(furigana).keyDown(Key.ALT).sendKeys('j').keyUp(Key.ALT).perform();
    // The confirm dialog assembles heading first, body in the middle, actions
    // last (the DOM order is the visual order). Pinned in a real browser
    // because the heading-after-body regression once slipped through unit tests.
    const tags = (await driver.wait(async () => {
      const t = await panelChildTags(driver);
      return t.length > 0 ? t : null;
    }, 15_000, 'no confirm dialog panel appeared'))!;
    expect(tags[0]).toBe('h2');
    expect(tags[tags.length - 1]).toBe('div.actions');
    await clickInShadow(driver, 'button.primary');
    // The full-name join follows the fixture placeholder's separator
    // (detectNameSeparator): "ヤマダ　タロウ" here. The PBI-150 point is that a
    // kana value lands in the kana field, never the kanji name.
    expect(await furigana.getAttribute('value')).toBe('ヤマダ　タロウ');
  });
});

describe('firefox: partial banner persistence (PBI-152)', () => {
  it('keeps the partial notice instead of rewriting it after seconds', async () => {
    await driver.get(`${pages.origin}/split-form.html`);
    await clickInShadow(driver, 'button:not(.badge)');
    // Detach a planned field between planning and applying: its row fills as
    // 'detached', which counts as unapplied (by-design skips never warn), so
    // the persistent partial banner fires.
    await driver.executeScript(`document.getElementById('fn')?.remove()`);
    await clickInShadow(driver, 'button.primary');
    // Poll for the error banner itself: the read must come after the apply
    // finishes, or it races the pre-apply badge status.
    const first = (await driver.wait(async () => {
      const b = await badgeNotice(driver);
      return b?.status === 'error' ? b : null;
    }, 15_000, 'no partial error banner appeared'))!;
    expect(first.text).toContain('一部のみ適用');
    // The old banner rewrote itself after ~4s; the persistent banner must read
    // the same past that window.
    await new Promise((r) => setTimeout(r, 5_500));
    expect((await badgeNotice(driver))?.text).toBe(first!.text);
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
