import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Key, type WebDriver } from 'selenium-webdriver';
import {
  By, PROFILE_DATA, badgeNotice, clickInShadow, panelChildTags, reportButton, resultPanelText, seedChromeProfile, startChromeDriver, startPageServer, until, valueOf, type PageServer,
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

describe('chrome: partial fill notice (PBI-82, PBI-55)', () => {
  it('guards unfillable fields and keeps the result with a report button', async () => {
    await driver.get(`${pages.origin}/partial-notice.html`);
    await clickInShadow(driver, 'button:not(.badge)');
    await clickInShadow(driver, 'button.primary');
    // Filled input is kept, maxlength-guarded input is skipped, email applies.
    expect(await valueOf(driver, 'ln')).toBe('佐藤');
    expect(await valueOf(driver, 'fn')).toBe('');
    expect(await valueOf(driver, 'em')).toBe('taro@example.com');
    // PBI-55 + PBI-60: the report click must reach the content-script
    // handler. window.open cannot be stubbed from the page world (content
    // scripts run isolated), so the click-through is proven by the tab it
    // opens: the new tab carries the prefilled issue URL, then it is closed
    // so no external navigation escapes the test run. URL correctness
    // itself is unit-covered (buildPartialIssueUrl).
    const report = await reportButton(driver);
    expect(report).not.toBeNull();
    const panelText = await resultPanelText(driver);
    expect(panelText).toContain('入力結果');
    expect(panelText).toContain('適用済み');
    expect(panelText).toContain('内訳をissueで報告');
    const home = await driver.getWindowHandle();
    await report!.click();
    let opened: string | null = null;
    await driver.wait(async () => {
      const handles = await driver.getAllWindowHandles();
      const next = handles.find((h) => h !== home);
      if (!next) return false;
      await driver.switchTo().window(next);
      opened = await driver.getCurrentUrl();
      return true;
    }, 15_000, 'report click did not open a tab');
    const url = new URL(opened!);
    // Headless runs are never authenticated, so GitHub bounces issues/new
    // to /login (dropping the prefilled params). Reaching github.com proves
    // the click opened exactly the URL the handler built — its shape
    // (issues/new + labels + title + body) is pinned by unit tests.
    // NOTE: this assertion needs network access to github.com (an offline
    // run lands on chrome-error:// and fails here); the rest of the suite
    // stays hermetic on localhost fixtures.
    expect(`${url.origin}/`).toBe('https://github.com/');
    await driver.close();
    await driver.switchTo().window(home);
    expect(await driver.getCurrentUrl()).toContain('/partial-notice.html');
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

describe('chrome: fill-one kana (PBI-150)', () => {
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

describe('chrome: partial banner persistence (PBI-152)', () => {
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

describe('chrome: button placement (PBI-161)', () => {
  it('places the banner where it covers no input field on a dense two-column form', async () => {
    // The reported bug: anchored right of the 姓 column, the banner covered the
    // 名 column. The placement must move it to a collision-free candidate.
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

describe('chrome: banner drag (PBI-163)', () => {
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
    // the banner (it would re-introduce the overlap the placement avoids).
    // dispatchEvent keeps the scroll path alive on a page too short to scroll.
    await driver.executeScript('window.scrollTo(0, 300); window.dispatchEvent(new Event("scroll"));');
    await driver.sleep(300);
    const scrolled = await boxOf();
    expect(scrolled.left).toBe(after.left);
    expect(scrolled.top).toBe(after.top);
  });

  it('treats touch pointer events like mouse in the drag path', async () => {
    // Real hardware feel (gesture smoothness) stays manual. What is provable
    // here: the drag handlers do not special-case mouse — a touch-pointer
    // gesture (pointerType: 'touch') moves the banner the same way. The
    // events are synthetic (isTrusted false), so this pins the code path,
    // not the hardware delivery. Dispatched on the wrap via WebDriver's
    // shadow access; the bubbling reaches the window-level drag listeners.
    await driver.get(`${pages.origin}/split-form.html`);
    await driver.wait(async () => (await hosts()) > 0, 10_000);
    const boxOf = async (): Promise<Box> => (await placementRects()).banner;
    const host = await driver.findElement(By.css('div[data-jushoai]'));
    const root = await host.getShadowRoot();
    const wrap = (await root.findElements(By.css('.wrap')))[0]!;
    const before = await boxOf();
    await driver.executeScript(`
      const el = arguments[0];
      const b = el.getBoundingClientRect();
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      const touch = (type, cx, cy, button) =>
        new PointerEvent(type, {
          pointerType: 'touch', pointerId: 2, isPrimary: true,
          button, buttons: type === 'pointerup' ? 0 : 1,
          clientX: cx, clientY: cy, bubbles: true, composed: true,
        });
      el.dispatchEvent(touch('pointerdown', x, y, 0));
      el.dispatchEvent(touch('pointermove', x + 160, y + 90, -1));
      el.dispatchEvent(touch('pointerup', x + 160, y + 90, 0));
    `, wrap);
    await driver.sleep(150);
    const after = await boxOf();
    expect(after.left).not.toBe(before.left);
    expect(after.top).not.toBe(before.top);
  });
});

describe('chrome: translucent banner (PBI-162)', () => {
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
    // 0.9 alpha keeps a covered field readable and the blended background
    // over a white form measures 5.0:1 against the white text (WCAG AA); the
    // opaque hover/active states
    // and the badge colors are unit-covered (tests/ui/button.test.ts).
    expect(bg).toBe('rgba(36, 87, 214, 0.9)');
  });
});

// Options save split and trial (PBI-161/162/163): the settings page is light
// DOM, so buttons and notices are reachable with plain selectors. Save
// buttons exist on both pages with the same label, so every xpath is scoped
// to its section (the hidden page's button is not interactable).
const optionsUrl = (hash: string): string => `chrome-extension://${extensionId}/options.html${hash}`;

const setOptionsData = async (data: unknown): Promise<void> => {
  await driver.get(optionsUrl(''));
  await driver.executeAsyncScript(
    `const done = arguments[arguments.length - 1];
     chrome.storage.local.set({ 'jushoai:data': arguments[0] }).then(() => done());`,
    data,
  );
  // driver.get() to the same document with a different hash does not reload,
  // so refresh explicitly: boot re-reads storage on load.
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('#profiles')), 10_000);
};

const openProfilesPage = async (): Promise<void> => {
  await driver.get(optionsUrl('#profiles'));
  await driver.wait(until.elementLocated(By.css('#profiles')), 10_000);
};

const profileCardCount = async (): Promise<number> =>
  (await driver.findElements(By.css('#profiles fieldset'))).length;

const clickProfilesButton = async (text: string): Promise<void> => {
  await driver.findElement(By.xpath(`//*[@id='profiles']//button[text()='${text}']`)).click();
};

// The trial notice and the save notice share one .float-toast element, so wait
// for the text to change instead of the element to appear.
const waitSavedContaining = async (text: string): Promise<void> => {
  await driver.wait(async () => {
    const els = await driver.findElements(By.css('#float-root .float-toast'));
    if (els.length === 0) return false;
    return ((await els[0]!.getText()) ?? '').includes(text);
  }, 10_000, `no saved notice containing ${text}`);
};

describe('chrome: options save split (PBI-161)', () => {
  it('saves a profile alone without address errors', async () => {
    // The reported bug: saving with only a profile showed address errors
    // from the invisible address section.
    await setOptionsData({ profiles: PROFILE_DATA.profiles, addresses: [] });
    await openProfilesPage();
    await clickProfilesButton('保存');
    await waitSavedContaining('保存しました');
    expect(await driver.findElements(By.css('#float-root .float-error'))).toHaveLength(0);
  });
});

describe('chrome: options trial input (PBI-162/163/166)', () => {
  it('registers on one trial press without a manual save', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(
      By.xpath("//*[@id='float-root']//button[text()='架空の名前と住所を作って試す']"),
    ).click();
    await waitSavedContaining('架空の名前として');
    expect(await profileCardCount()).toBe(1);
    expect(await driver.findElements(By.css('#float-root .float-error'))).toHaveLength(0);
  });

  it('recovers through trial after deleting the last profile', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    const trial = By.xpath("//*[@id='float-root']//button[text()='架空の名前と住所を作って試す']");
    await driver.findElement(trial).click();
    await waitSavedContaining('架空の名前として');
    await driver.findElement(
      By.xpath("//*[@id='profiles']//button[text()='このプロファイルを削除']"),
    ).click();
    await driver.wait(async () => (await profileCardCount()) === 0, 10_000, 'profile card was not deleted');
    await driver.findElement(trial).click();
    await waitSavedContaining('架空の名前として');
    expect(await profileCardCount()).toBe(1);
  });

  it('navigates through the guide buttons', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(
      By.xpath("//*[@id='float-root']//button[text()='住所を登録する']"),
    ).click();
    await driver.wait(async () =>
      (await driver.findElement(By.css('#side nav a[data-section="addresses"]'))
        .getAttribute('aria-current')) === 'true',
    10_000, 'did not switch to the addresses tab');
    await driver.findElement(
      By.xpath("//*[@id='float-root']//button[text()='名前を登録する']"),
    ).click();
    await driver.wait(async () =>
      (await driver.findElement(By.css('#side nav a[data-section="profiles"]'))
        .getAttribute('aria-current')) === 'true',
    10_000, 'did not switch back to the profiles tab');
  });

  it('hides the guide for the session and shows it again on reload', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(By.css('#float-root .float-guide .float-close')).click();
    await driver.wait(async () =>
      (await driver.findElements(By.css('#float-root .float-guide'))).length === 0,
    10_000, 'guide did not hide');
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('#float-root .float-guide')), 10_000);
  });
});

describe('chrome: float notice behavior (PBI-165)', () => {
  it('auto-dismisses the success toast', async () => {
    await setOptionsData(PROFILE_DATA);
    await openProfilesPage();
    await clickProfilesButton('保存');
    await waitSavedContaining('保存しました');
    await driver.wait(async () =>
      (await driver.findElements(By.css('#float-root .float-toast'))).length === 0,
    10_000, 'success toast did not auto-dismiss');
  });

  it('keeps the error until closed', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(
      By.xpath("//*[@id='float-root']//button[text()='架空の名前と住所を作って試す']"),
    ).click();
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
