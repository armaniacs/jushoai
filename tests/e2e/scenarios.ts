import { describe, expect, it } from 'vitest';
import { Key, type WebDriver } from 'selenium-webdriver';
import {
  By, HOST_SELECTOR, OPTIONS_SELECTORS, PROFILE_DATA, badgeNotice, bannerHost, bannerWrap,
  clickApplyButton, clickFillButton, mountedHosts, panelChildTags, reportButton,
  resultPanelText, until, valueOf,
} from './harness';
import type { BrowserAdapter } from './adapter';

// Browser-independent e2e scenarios. Each run* function registers the same
// describes/its both browsers used to duplicate across chrome.e2e.ts and
// firefox.e2e.ts; the files now only pick an adapter and set the flags.
// Test and suite names are unchanged so the per-browser counts are preserved.

// Flags separating the genuinely browser-specific assertions:
// - expectBuiltInProvider: Chrome lists the built-in provider, Firefox hides
//   it (no Prompt API) and offers only the cloud providers.
// - includeTouchPointer: the touch-pointer drag path is pinned on Chrome only.
// - includePartialNotice: the unfillable-field report flow is covered on
//   Chrome only.
export interface BrowserScenarioOptions {
  label: string;
  expectBuiltInProvider: boolean;
  includeTouchPointer: boolean;
  includePartialNotice: boolean;
}

interface Box { top: number; left: number; right: number; bottom: number }

// Host box of the mounted banner plus every visible input/select rect, from
// the light DOM: the shadow root is closed, but the fixed host and the page
// fields are ordinary elements the test can measure. (The host attribute comes
// from the harness dictionary; the input/select scan is the fixture page's own
// structure, like the fixture field ids.)
const placementRects = (driver: WebDriver): Promise<{ banner: Box; width: number; inputs: Box[] }> =>
  driver.executeScript((hostSelector: string) => {
    const host = document.querySelector(hostSelector);
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
  }, HOST_SELECTOR);

const profileCardCount = async (driver: WebDriver): Promise<number> =>
  (await driver.findElements(By.css(OPTIONS_SELECTORS.profileCards))).length;

// Options buttons are text-matched xpaths scoped to their section holder (the
// same label exists in more than one section), located through the dictionary.
const clickOptionsButton = async (driver: WebDriver, xpath: string): Promise<void> => {
  await driver.findElement(By.xpath(xpath)).click();
};

// The trial notice and the save notice share one .float-toast element, so wait
// for the text to change instead of the element to appear.
const waitSavedContaining = async (driver: WebDriver, text: string): Promise<void> => {
  await driver.wait(async () => {
    const els = await driver.findElements(By.css(OPTIONS_SELECTORS.savedToast));
    if (els.length === 0) return false;
    return ((await els[0]!.getText()) ?? '').includes(text);
  }, 10_000, `no saved notice containing ${text}`);
};

const addExclusion = async (adapter: BrowserAdapter, value: string): Promise<void> => {
  await adapter.withOptionsPage('#exclusions', async () => {
    const { driver } = adapter;
    const input = await driver.findElement(By.css(OPTIONS_SELECTORS.exclusionInput));
    await input.sendKeys(value);
    await clickOptionsButton(driver, OPTIONS_SELECTORS.exclusionAddButton);
    await driver.findElement(By.css(OPTIONS_SELECTORS.exclusionApplyButton)).click();
    await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.exclusionSavedNotice)), 10_000);
  });
};

const removeFirstExclusion = async (adapter: BrowserAdapter): Promise<void> => {
  await adapter.withOptionsPage('#exclusions', async () => {
    const { driver } = adapter;
    await driver.findElement(By.css(OPTIONS_SELECTORS.exclusionRemoveButton)).click();
    await driver.findElement(By.css(OPTIONS_SELECTORS.exclusionApplyButton)).click();
    await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.exclusionSavedNotice)), 10_000);
  });
};

export function runFillFlow(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: fill flow`, () => {
    it('fills a split Japanese form through button, preview and apply', async () => {
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/split-form.html`);
      await clickFillButton(driver);
      await clickApplyButton(driver);
      expect(await valueOf(driver, 'ln')).toBe('山田');
      expect(await valueOf(driver, 'fn')).toBe('太郎');
      expect(await valueOf(driver, 'zip')).toBe('100-0001');
      expect(await driver.findElement(By.id('pref')).getAttribute('value')).toBe('13');
    });

    it('does not overwrite a filled field and does not truncate past maxlength', async () => {
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/prefilled.html`);
      await clickFillButton(driver);
      await clickApplyButton(driver);
      expect(await valueOf(driver, 'ln')).toBe('佐藤');
      expect(await valueOf(driver, 'fn')).toBe('');
      expect(await valueOf(driver, 'em')).toBe('taro@example.com');
    });
  });
}

export function runPartialNoticeFlow(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: partial fill notice (PBI-82, PBI-55)`, () => {
    it('guards unfillable fields and keeps the result with a report button', async () => {
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/partial-notice.html`);
      await clickFillButton(driver);
      await clickApplyButton(driver);
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
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/split-form.html`);
      await clickFillButton(driver);
      await clickApplyButton(driver);
      expect(await valueOf(driver, 'ln')).toBe('山田');
      // BDD scenario 1: a complete run raises no failure notice.
      expect((await badgeNotice(driver))?.status).not.toBe('error');
    });
  });
}

export function runFillOneKana(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: fill-one kana (PBI-150)`, () => {
    it('fills the kana value through Alt+J with the heading-first confirm dialog', async () => {
      const { driver, pages } = adapter;
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
      await clickApplyButton(driver);
      // The full-name join follows the fixture placeholder's separator
      // (detectNameSeparator): "ヤマダ　タロウ" here. The PBI-150 point is that a
      // kana value lands in the kana field, never the kanji name.
      expect(await furigana.getAttribute('value')).toBe('ヤマダ　タロウ');
    });
  });
}

export function runPartialBannerPersistence(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: partial banner persistence (PBI-152)`, () => {
    it('keeps the partial notice instead of rewriting it after seconds', async () => {
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/split-form.html`);
      await clickFillButton(driver);
      // Detach a planned field between planning and applying: its row fills as
      // 'detached', which counts as unapplied (by-design skips never warn), so
      // the persistent partial banner fires.
      await driver.executeScript(`document.getElementById('fn')?.remove()`);
      await clickApplyButton(driver);
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
}

export function runSettingsPage(
  adapter: BrowserAdapter, label: string, expectBuiltIn: boolean,
): void {
  describe(`${label}: settings page`, () => {
    it(expectBuiltIn
      ? 'offers the built-in provider alongside the cloud providers'
      : 'offers only the cloud providers and none', async () => {
      const values = await adapter.withOptionsPage('', async () => (
        await adapter.driver.executeScript((optionsSelector: string) => (
          Array.from(document.querySelectorAll(optionsSelector), (o) => (o as HTMLOptionElement).value)
        ), OPTIONS_SELECTORS.providerOptions)) as string[]);
      if (expectBuiltIn) {
        expect(values).toContain('built-in');
      } else {
        expect(values).not.toContain('built-in');
      }
      expect(values).toContain('openai');
      expect(values).toContain('gemini');
    });

    // PBI-168: the nav shows the saved counts next to each label. This runs
    // before runExcludedPages, so the learning stores are still empty here.
    it('shows the saved counts in the nav', async () => {
      await adapter.seed(PROFILE_DATA);
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        const badges = await driver.executeScript((navLinksSelector: string) => (
          Array.from(document.querySelectorAll(navLinksSelector), (a) => a.textContent)
        ), OPTIONS_SELECTORS.sideNavLinks) as string[];
        expect(badges).toContain('プロファイル (1)');
        expect(badges).toContain('住所 (1)');
        // Zero counts stay visible: (0) is the signal that nothing is
        // registered in that store yet.
        expect(badges).toContain('起動しないURL (0)');
        expect(badges).toContain('覚えた対応付け (0)');
        expect(badges).toContain('通信の監査ログ (0)');
      });
    });
  });
}

export function runExcludedPages(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: excluded pages`, () => {
    it('does not start on a registered URL and starts again once it is removed', async () => {
      const { driver, pages } = adapter;
      await addExclusion(adapter, `${pages.origin}/split-form.html`);
      try {
        await driver.get(`${pages.origin}/split-form.html`);
        // The fixture is loaded, so a missing host means the extension stayed out
        // rather than the page failing to render.
        await driver.findElement(By.id('ln'));
        await driver.sleep(1500);
        expect(await mountedHosts(driver)).toBe(0);
      } finally {
        await removeFirstExclusion(adapter);
      }
      await driver.get(`${pages.origin}/split-form.html`);
      await driver.wait(async () => (await mountedHosts(driver)) > 0, 10_000);
    });

    it('removes the button from a tab that is already open', async () => {
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/split-form.html`);
      await driver.wait(async () => (await mountedHosts(driver)) > 0, 10_000);
      await addExclusion(adapter, `${pages.origin}/split-form.html`);
      await driver.wait(async () => (await mountedHosts(driver)) === 0, 10_000);
      // Leave the stored list as it was for the other cases in this file.
      await removeFirstExclusion(adapter);
    });
  });
}

export function runButtonPlacement(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: button placement (PBI-161)`, () => {
    it('places the banner where it covers no input field on a dense two-column form', async () => {
      const { driver, pages } = adapter;
      // The reported bug: anchored right of the 姓 column, the banner covered the
      // 名 column. The placement must move it to a collision-free candidate.
      await driver.get(`${pages.origin}/two-column-form.html`);
      await driver.wait(async () => (await mountedHosts(driver)) > 0, 10_000);
      const rects = await placementRects(driver);
      expect(rects.width).toBeGreaterThan(0);
      for (const input of rects.inputs) {
        const covers = rects.banner.left < input.right && rects.banner.right > input.left
          && rects.banner.top < input.bottom && rects.banner.bottom > input.top;
        expect(covers, `banner ${JSON.stringify(rects.banner)} covers input ${JSON.stringify(input)}`).toBe(false);
      }
    });
  });
}

export function runBannerDrag(
  adapter: BrowserAdapter, label: string, includeTouchPointer: boolean,
): void {
  describe(`${label}: banner drag (PBI-163)`, () => {
    it('moves the banner by dragging and keeps the manual position on scroll', async () => {
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/split-form.html`);
      await driver.wait(async () => (await mountedHosts(driver)) > 0, 10_000);
      const boxOf = async (): Promise<Box> => (await placementRects(driver)).banner;
      const host = await bannerHost(driver);
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

    if (includeTouchPointer) {
      it('treats touch pointer events like mouse in the drag path', async () => {
        const { driver, pages } = adapter;
        // Real hardware feel (gesture smoothness) stays manual. What is provable
        // here: the drag handlers do not special-case mouse — a touch-pointer
        // gesture (pointerType: 'touch') moves the banner the same way. The
        // events are synthetic (isTrusted false), so this pins the code path,
        // not the hardware delivery. Dispatched on the wrap via WebDriver's
        // shadow access; the bubbling reaches the window-level drag listeners.
        await driver.get(`${pages.origin}/split-form.html`);
        await driver.wait(async () => (await mountedHosts(driver)) > 0, 10_000);
        const boxOf = async (): Promise<Box> => (await placementRects(driver)).banner;
        // Dispatched on the banner wrap read through the harness seam; the
        // bubbling reaches the window-level drag listeners.
        const wrap = (await bannerWrap(driver))!;
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
    }
  });
}

export function runTranslucentBanner(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: translucent banner (PBI-162)`, () => {
    it('renders the banner background translucent so covered fields stay readable', async () => {
      const { driver, pages } = adapter;
      await driver.get(`${pages.origin}/split-form.html`);
      // WebDriver reaches the closed shadow root through the host element; the
      // harness seam reads .wrap by intent.
      const bg = await driver.wait(async () => {
        const wrap = await bannerWrap(driver);
        return wrap ? wrap.getCssValue('background-color') : null;
      }, 10_000, 'no .wrap in the banner shadow root');
      // 0.9 alpha keeps a covered field readable and the blended background
      // over a white form measures 5.0:1 against the white text (WCAG AA); the
      // opaque hover/active states and the badge colors are unit-covered
      // (tests/ui/button.test.ts).
      expect(bg).toBe('rgba(36, 87, 214, 0.9)');
    });
  });
}

// Options save split and trial (PBI-161/162/163): the settings page is light
// DOM, so buttons and notices are reachable with plain selectors through the
// harness dictionary. Save buttons exist on both pages with the same label, so
// every xpath is scoped to its section (the hidden page's button is not
// interactable).
export function runOptionsSaveSplit(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: options save split (PBI-161)`, () => {
    it('saves a profile alone without address errors', async () => {
      // The reported bug: saving with only a profile showed address errors
      // from the invisible address section.
      await adapter.seed({ profiles: PROFILE_DATA.profiles, addresses: [] });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        await clickOptionsButton(driver, OPTIONS_SELECTORS.saveProfileButton);
        await waitSavedContaining(driver, '保存しました');
        expect(await driver.findElements(By.css(OPTIONS_SELECTORS.errorToast))).toHaveLength(0);
      });
    });
  });
}

export function runOptionsTrialInput(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: options trial input (PBI-162/163/166)`, () => {
    it('registers on one trial press without a manual save', async () => {
      await adapter.seed({ profiles: [], addresses: [] });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.trialBothButton),
        ).click();
        await waitSavedContaining(driver, '架空の名前として');
        expect(await profileCardCount(driver)).toBe(1);
        expect(await driver.findElements(By.css(OPTIONS_SELECTORS.errorToast))).toHaveLength(0);
      });
    });

    it('recovers through trial after deleting the last profile', async () => {
      await adapter.seed({ profiles: [], addresses: [] });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        const trial = By.xpath(OPTIONS_SELECTORS.trialBothButton);
        await driver.findElement(trial).click();
        await waitSavedContaining(driver, '架空の名前として');
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.deleteProfileButton),
        ).click();
        await driver.wait(async () => (await profileCardCount(driver)) === 0, 10_000, 'profile card was not deleted');
        // Only the profile is missing now, so the guide offers the per-side trial,
        // whose save toast is the generic one (no personalized trial toast).
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.trialProfileButton),
        ).click();
        await waitSavedContaining(driver, '保存しました');
        expect(await profileCardCount(driver)).toBe(1);
      });
    });

    it('navigates through the guide buttons', async () => {
      await adapter.seed({ profiles: [], addresses: [] });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.guideToAddressesButton),
        ).click();
        await driver.wait(async () =>
          (await driver.findElement(By.css(OPTIONS_SELECTORS.sideNavAddressesLink))
            .getAttribute('aria-current')) === 'true',
        10_000, 'did not switch to the addresses tab');
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.guideToProfilesButton),
        ).click();
        await driver.wait(async () =>
          (await driver.findElement(By.css(OPTIONS_SELECTORS.sideNavProfilesLink))
            .getAttribute('aria-current')) === 'true',
        10_000, 'did not switch back to the profiles tab');
      });
    });

    it('hides the guide for the session and shows it again on reload', async () => {
      await adapter.seed({ profiles: [], addresses: [] });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        await driver.findElement(By.css(OPTIONS_SELECTORS.guideCloseButton)).click();
        await driver.wait(async () =>
          (await driver.findElements(By.css(OPTIONS_SELECTORS.guide))).length === 0,
        10_000, 'guide did not hide');
        await driver.navigate().refresh();
        await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.profilesSection)), 10_000);
        await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.guide)), 10_000);
      });
    });
  });
}

export function runFloatNotice(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: float notice behavior (PBI-165)`, () => {
    it('auto-dismisses the success toast', async () => {
      await adapter.seed(PROFILE_DATA);
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        await clickOptionsButton(driver, OPTIONS_SELECTORS.saveProfileButton);
        await waitSavedContaining(driver, '保存しました');
        await driver.wait(async () =>
          (await driver.findElements(By.css(OPTIONS_SELECTORS.savedToast))).length === 0,
        10_000, 'success toast did not auto-dismiss');
      });
    });

    it('keeps the error until closed', async () => {
      await adapter.seed({ profiles: [], addresses: [] });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.trialBothButton),
        ).click();
        await driver.wait(async () => (await driver.findElements(By.css(OPTIONS_SELECTORS.savedToast))).length === 0, 10_000, 'trial toast did not dismiss');
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.deleteProfileButton),
        ).click();
        await clickOptionsButton(driver, OPTIONS_SELECTORS.saveProfileButton);
        await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.errorToast)), 10_000);
        await driver.sleep(4500);
        expect(await driver.findElements(By.css(OPTIONS_SELECTORS.errorToast))).toHaveLength(1);
        await driver.findElement(By.css(OPTIONS_SELECTORS.errorToastCloseButton)).click();
        await driver.wait(async () =>
          (await driver.findElements(By.css(OPTIONS_SELECTORS.errorToast))).length === 0,
        10_000, 'error banner did not close');
      });
    });
  });
}

export function runOptionsZeroCountTrial(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: options zero-count error trial (PBI-167)`, () => {
    it('offers a trial address from the empty-address error', async () => {
      await adapter.seed({ profiles: PROFILE_DATA.profiles, addresses: [] });
      await adapter.withOptionsPage('#addresses', async () => {
        const { driver } = adapter;
        await driver.findElement(By.xpath(OPTIONS_SELECTORS.saveAddressButton)).click();
        await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.errorToast)), 10_000);
        await driver.findElement(
          By.xpath(OPTIONS_SELECTORS.trialAddressButton),
        ).click();
        await waitSavedContaining(driver, '保存しました');
        expect(await driver.findElements(By.css(OPTIONS_SELECTORS.addressCards))).toHaveLength(1);
      });
    });
  });
}

export function runOptionsPerSideGuide(adapter: BrowserAdapter, label: string): void {
  describe(`${label}: options per-side guide (PBI-167)`, () => {
    it('offers a trial address when only the address is missing', async () => {
      await adapter.seed({ profiles: PROFILE_DATA.profiles, addresses: [] });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        const guide = await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.guide)), 10_000);
        expect(await guide.getText()).toContain('架空の住所を作って試す');
        expect(await guide.getText()).not.toContain('架空の名前と住所を作って試す');
      });
    });

    it('offers a trial profile when only the profile is missing', async () => {
      await adapter.seed({ profiles: [], addresses: PROFILE_DATA.addresses });
      await adapter.withOptionsPage('#profiles', async () => {
        const { driver } = adapter;
        const guide = await driver.wait(until.elementLocated(By.css(OPTIONS_SELECTORS.guide)), 10_000);
        expect(await guide.getText()).toContain('架空の名前を作って試す');
        expect(await guide.getText()).toContain('名前を登録する');
      });
    });
  });
}

// The full suite in the original file order. Chrome passes
// includePartialNotice + includeTouchPointer + expectBuiltInProvider;
// Firefox passes none of them.
export function runBrowserScenarios(adapter: BrowserAdapter, opts: BrowserScenarioOptions): void {
  // opts.labelは残すが表示名はadapter.labelに一本化（段階移行中・動作不変）。
  const label = adapter.label;
  runFillFlow(adapter, label);
  if (opts.includePartialNotice) runPartialNoticeFlow(adapter, label);
  runFillOneKana(adapter, label);
  runPartialBannerPersistence(adapter, label);
  runSettingsPage(adapter, label, opts.expectBuiltInProvider);
  runExcludedPages(adapter, label);
  runButtonPlacement(adapter, label);
  runBannerDrag(adapter, label, opts.includeTouchPointer);
  runTranslucentBanner(adapter, label);
  runOptionsSaveSplit(adapter, label);
  runOptionsTrialInput(adapter, label);
  runFloatNotice(adapter, label);
  runOptionsZeroCountTrial(adapter, label);
  runOptionsPerSideGuide(adapter, label);
}
