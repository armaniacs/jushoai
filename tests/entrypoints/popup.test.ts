import { describe, it, expect, afterEach, vi } from 'vitest';
import { analyzeNoticeFor, renderPopup } from '../../src/entrypoints/popup/main';
import { EMPTY_ADDRESS, EMPTY_PROFILE, type StoredData } from '../../src/core/types';

afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); });

function data(): StoredData {
  return {
    profiles: [
      { ...EMPTY_PROFILE, id: 'p1', label: '自宅用', lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ' },
      { ...EMPTY_PROFILE, id: 'p2', label: '会社用', lastName: '鈴木', firstName: '花子', lastNameKana: 'スズキ', firstNameKana: 'ハナコ' },
    ],
    addresses: [
      {
        ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001',
        prefecture: '東京都', city: '千代田区', street: '千代田1-1',
      },
    ],
  };
}

describe('renderPopup', () => {
  it('lists profiles and addresses with the last-used entry marked', () => {
    const root = document.createElement('div');
    renderPopup(root, data(), { profileId: 'p2', addressId: 'a1' });
    expect(root.textContent).toContain('入力内容の確認');
    expect(root.textContent).toContain('自宅用: 山田 太郎');
    expect(root.textContent).toContain('会社用: 鈴木 花子');
    expect(root.textContent).toContain('千代田区千代田1-1');
    const badges = [...root.querySelectorAll('.badge')].map((b) => b.textContent);
    expect(badges).toEqual(['使用中', '使用中']);
  });

  it('falls back to the first entry without last-used state', () => {
    const root = document.createElement('div');
    renderPopup(root, data(), {});
    const items = [...root.querySelectorAll('li')].map((li) => li.textContent);
    expect(items[0]).toContain('使用中');
  });

  it('shows the address owner', () => {
    const d = data();
    d.addresses[0] = { ...d.addresses[0]!, profileId: 'p1' };
    const root = document.createElement('div');
    renderPopup(root, d, {});
    expect(root.textContent).toContain('使う人: 自宅用');
    const shared = document.createElement('div');
    renderPopup(shared, data(), {});
    expect(shared.textContent).toContain('使う人: 共通');
  });

  it('shows empty guidance with a settings button', () => {
    const root = document.createElement('div');
    renderPopup(root, { profiles: [], addresses: [] }, {});
    expect(root.textContent).toContain('プロファイルは未登録です');
    expect(root.textContent).toContain('住所は未登録です');
    expect(root.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('opens the options page from the empty-state button', async () => {
    const open = vi.fn(async () => {});
    vi.stubGlobal('chrome', { runtime: { openOptionsPage: open } });
    const root = document.createElement('div');
    renderPopup(root, { profiles: [], addresses: [] }, {});
    (root.querySelector('.empty button') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('places an analyze button next to the gear', () => {
    const root = document.createElement('div');
    renderPopup(root, data(), {});
    const analyze = [...root.querySelectorAll('.header button')].find((b) => b.textContent === 'AI で分析');
    expect(analyze?.tagName).toBe('BUTTON');
  });

  function stubTabs(query: unknown, sendMessage: unknown) {
    const open = vi.fn(async () => {});
    vi.stubGlobal('chrome', {
      runtime: { openOptionsPage: open },
      tabs: { query: vi.fn(async () => query), sendMessage: vi.fn(sendMessage as never) },
    });
    return open;
  }

  function clickAnalyze(root: HTMLElement) {
    ( [...root.querySelectorAll('button')].find((b) => b.textContent === 'AI で分析') as HTMLButtonElement).click();
  }

  it('closes the popup when the tab starts the flow', async () => {
    stubTabs([{ id: 7 }], async () => ({ ok: true }));
    const close = vi.spyOn(window, 'close').mockImplementation(() => {});
    const root = document.createElement('div');
    renderPopup(root, data(), {});
    clickAnalyze(root);
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });

  it('shows a reason when the tab has no fillable form', async () => {
    stubTabs([{ id: 7 }], async () => ({ ok: false, reason: 'no-form' }));
    const root = document.createElement('div');
    renderPopup(root, data(), {});
    clickAnalyze(root);
    await vi.waitFor(() => {
      const notice = root.querySelector('.notice') as HTMLElement | null;
      expect(notice?.hidden).toBe(false);
    });
    expect((root.querySelector('.notice') as HTMLElement).textContent).toBe(analyzeNoticeFor('no-form'));
  });

  it('shows guidance when the tab cannot be messaged', async () => {
    stubTabs([{ id: 7 }], async () => { throw new Error('no listener'); });
    const root = document.createElement('div');
    renderPopup(root, data(), {});
    clickAnalyze(root);
    await vi.waitFor(() => {
      expect((root.querySelector('.notice') as HTMLElement | null)?.hidden).toBe(false);
    });
  });

  it('opens the options page instead of messaging when nothing is registered', async () => {
    const sendMessage = vi.fn(async () => ({ ok: true }));
    const open = vi.fn(async () => {});
    vi.stubGlobal('chrome', {
      runtime: { openOptionsPage: open },
      tabs: { query: vi.fn(async () => [{ id: 7 }]), sendMessage },
    });
    const root = document.createElement('div');
    renderPopup(root, { profiles: [], addresses: [] }, {});
    clickAnalyze(root);
    await Promise.resolve();
    expect(open).toHaveBeenCalledTimes(1);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('places a gear button opening the options page', async () => {
    const open = vi.fn(async () => {});
    vi.stubGlobal('chrome', { runtime: { openOptionsPage: open } });
    const root = document.createElement('div');
    renderPopup(root, data(), {});
    const gear = root.querySelector('.header .gear') as HTMLButtonElement | null;
    expect(gear?.tagName).toBe('BUTTON');
    expect(gear?.getAttribute('aria-label')).toBe('設定を開く');
    gear!.click();
    await Promise.resolve();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
