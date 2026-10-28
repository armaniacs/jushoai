import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Key, type WebDriver } from 'selenium-webdriver';
import {
  By, OPTIONS_URL, PROFILE_DATA, badgeNotice, clickInShadow, closeExtensionPage, openExtensionPage, panelChildTags, seedProfile, startDriver, startPageServer, until, valueOf, type PageServer,
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

interface Box { top: number; left: number; right: number; bottom: number }

// Host box of the mounted banner plus every visible input/select rect, from
// the light DOM: the shadow root is closed, but the fixed host and the page
// fields are ordinary elements the test can measure.
const placementRects = (): Promise<{ banner: Box; width: number; inputs: Box[] }> =>
  driver.executeScript(() => {
    const host = document.querySelector('div[data-jushoai]');
    const box = host!.getBoundingClientRect();
    const inputs = Array.from(document.querySelectorAll('input, select'))
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ top: r.top, left: r.left, right: r.right, bottom: r.bottom }));
    return {
      banner: { top: box.top, left: box.left, right: box.right, bottom: box.bottom },
      width: box.width,
      inputs,
    };
  });

describe('firefox: button placement (PBI-161)', () => {
  it('places the banner where it covers no input field on a dense two-column form', async () => {
    // Same scenario as the chrome suite: the reported bug covered the 名 column.
    await driver.get(`${pages.origin}/two-column-form.html`);
    await driver.wait(async () => (await hosts()) > 0, 10_000);
    const rects = await placementRects();
    expect(rects.width).toBeGreaterThan(0);
    for (const input of rects.inputs) {
      const covers = rects.banner.left < input.right && rects.banner.right > input.left
        && rects.banner.top < input.bottom && rects.banner.bottom > input.top;
      expect(covers, `banner ${JSON.stringify(rects.banner)} covers input ${JSON.stringify(input)}`).toBe(false);
    }
  });
});

describe('firefox: banner drag (PBI-163)', () => {
  it('moves the banner by dragging and keeps the manual position on scroll', async () => {
    await driver.get(`${pages.origin}/split-form.html`);
    await driver.wait(async () => (await hosts()) > 0, 10_000);
    const boxOf = async (): Promise<Box> => (await placementRects()).banner;
    const host = await driver.findElement(By.css('div[data-jushoai]'));
    const before = await boxOf();
    await driver.actions().move({ origin: host, x: 10, y: 10 }).press()
      .move({ origin: host, x: 140, y: 70 }).release().perform();
    const after = await boxOf();
    expect(after.left).not.toBe(before.left);
    expect(after.top).not.toBe(before.top);
    // Manual placement wins: a scroll-triggered reposition must not re-anchor
    // the banner. dispatchEvent keeps the scroll path alive on a page too
    // short to scroll.
    await driver.executeScript('window.scrollTo(0, 300); window.dispatchEvent(new Event("scroll"));');
    await driver.sleep(300);
    const scrolled = await boxOf();
    expect(scrolled.left).toBe(after.left);
    expect(scrolled.top).toBe(after.top);
  });
});

describe('firefox: translucent banner (PBI-162)', () => {
  it('renders the banner background translucent so covered fields stay readable', async () => {
    await driver.get(`${pages.origin}/split-form.html`);
    // WebDriver reaches the closed shadow root through the host element.
    const bg = await driver.wait(async () => {
      for (const host of await driver.findElements(By.css('div[data-jushoai]'))) {
        const root = await host.getShadowRoot();
        const wrap = (await root.findElements(By.css('.wrap')))[0];
        if (wrap) return wrap.getCssValue('background-color');
      }
      return null;
    }, 10_000, 'no .wrap in the banner shadow root');
    expect(bg).toBe('rgba(36, 87, 214, 0.9)');
  });
});

// Options save split and trial (PBI-161/162/163): same scenarios as the
// chrome suite. The options page is only reachable through the browser
// chrome context, so each test seeds storage in one tab, then opens a fresh
// tab (boot reads the seeded storage) and closes it afterwards.
const setOptionsData = async (data: unknown): Promise<void> => {
  const home = await driver.getWindowHandle();
  await openExtensionPage(driver, OPTIONS_URL);
  try {
    await driver.executeAsyncScript(
      `const done = arguments[arguments.length - 1];
       browser.storage.local.set({ 'jushoai:data': arguments[0] }).then(() => done());`,
      data,
    );
  } finally {
    await closeExtensionPage(driver, home);
  }
};

const withProfilesPage = async <T>(fn: () => Promise<T>): Promise<T> => {
  const home = await driver.getWindowHandle();
  await openExtensionPage(driver, `${OPTIONS_URL}#profiles`);
  try {
    await driver.wait(until.elementLocated(By.css('#profiles')), 10_000);
    return await fn();
  } finally {
    await closeExtensionPage(driver, home);
  }
};

const profileCardCount = async (): Promise<number> =>
  (await driver.findElements(By.css('#profiles fieldset'))).length;

const clickProfilesButton = async (text: string): Promise<void> => {
  await driver.findElement(By.xpath(`//*[@id='profiles']//button[text()='${text}']`)).click();
};

const clickTrial = async (): Promise<void> => {
  await driver.findElement(By.css('#profiles .trial-banner button')).click();
};

// The trial notice and the save notice share one p.saved element, so wait
// for the text to change instead of the element to appear.
const waitSavedContaining = async (text: string): Promise<void> => {
  await driver.wait(async () => {
    const els = await driver.findElements(By.css('#float-root .float-toast'));
    if (els.length === 0) return false;
    return ((await els[0]!.getText()) ?? '').includes(text);
  }, 10_000, `no saved notice containing ${text}`);
};

describe('firefox: options save split (PBI-161)', () => {
  it('saves a profile alone without address errors', async () => {
    await setOptionsData({ profiles: PROFILE_DATA.profiles, addresses: [] });
    await withProfilesPage(async () => {
      await clickProfilesButton('保存');
      await waitSavedContaining('保存しました');
      expect(await driver.findElements(By.css('#float-root .float-error'))).toHaveLength(0);
    });
  });
});

describe('firefox: options trial input (PBI-162/163)', () => {
  it('creates cards from an empty state and saves them', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await withProfilesPage(async () => {
      await clickTrial();
      expect(await profileCardCount()).toBe(1);
      await clickProfilesButton('保存');
      await waitSavedContaining('保存しました');
    });
  });

  it('recovers through trial after deleting the last profile', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await withProfilesPage(async () => {
      await clickTrial();
      await clickProfilesButton('保存');
      await waitSavedContaining('保存しました');
      await driver.wait(async () => (await driver.findElements(By.css('#float-root .float-toast'))).length === 0, 10_000, 'trial toast did not dismiss');
      await driver.findElement(
        By.xpath("//*[@id='profiles']//button[text()='このプロファイルを削除']"),
      ).click();
      await driver.wait(async () => (await profileCardCount()) === 0, 10_000, 'profile card was not deleted');
      await clickTrial();
      expect(await profileCardCount()).toBe(1);
      await clickProfilesButton('保存');
      await waitSavedContaining('保存しました');
      expect(await driver.findElements(By.css('#float-root .float-error'))).toHaveLength(0);
    });
  });
});

describe('firefox: float notice behavior (PBI-165)', () => {
  it('auto-dismisses the success toast', async () => {
    await setOptionsData(PROFILE_DATA);
    await withProfilesPage(async () => {
      await clickProfilesButton('保存');
      await waitSavedContaining('保存しました');
      await driver.wait(async () =>
        (await driver.findElements(By.css('#float-root .float-toast'))).length === 0,
      10_000, 'success toast did not auto-dismiss');
    });
  });

  it('keeps the error until closed', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await withProfilesPage(async () => {
      await driver.findElement(By.css('#profiles .trial-banner button')).click();
      await driver.wait(async () => (await driver.findElements(By.css('#float-root .float-toast'))).length === 0, 10_000, 'trial toast did not dismiss');
      await driver.findElement(
        By.xpath("//*[@id='profiles']//button[text()='このプロファイルを削除']"),
      ).click();
      await clickProfilesButton('保存');
      await driver.wait(until.elementLocated(By.css('#float-root .float-error')), 10_000);
      await driver.sleep(4500);
      expect(await driver.findElements(By.css('#float-root .float-error'))).toHaveLength(1);
      await driver.findElement(By.css('#float-root .float-error .float-close')).click();
      await driver.wait(async () =>
        (await driver.findElements(By.css('#float-root .float-error'))).length === 0,
      10_000, 'error banner did not close');
    });
  });
});
