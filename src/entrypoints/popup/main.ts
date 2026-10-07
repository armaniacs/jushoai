import { isReady, loadData, loadLastUsed, type LastUsed } from '../../storage';
import type { Address, Profile, StoredData } from '../../core/types';
import { ANALYZE_MESSAGE_TYPE, isAnalyzeReason, type AnalyzeReason, type AnalyzeResponse } from '../../messages';
import { el } from '../options/dom';

export function openOptionsPage(): Promise<void> {
  return chrome.runtime.openOptionsPage();
}

const ANALYZE_NOTICE: Record<AnalyzeReason, string> = {
  'no-form': '入力できるフォームが見つかりませんでした。フォームのあるページでお試しください。',
  'no-tab': 'このタブでは実行できません。フォームのあるページでお試しください。',
  error: 'このタブでは実行できません。フォームのあるページでお試しください。',
};

export function analyzeNoticeFor(reason: AnalyzeReason): string {
  return ANALYZE_NOTICE[reason] ?? 'このタブでは実行できません。フォームのあるページでお試しください。';
}

// Asks the content script of the active tab to run the usual classify → preview
// flow. The popup itself never touches page DOM and sends no profile values.
export async function analyzeCurrentTab(): Promise<AnalyzeResponse> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const id = tabs[0]?.id;
    if (id == null) return { ok: false, reason: 'no-tab' };
    const res = (await chrome.tabs.sendMessage(id, { type: ANALYZE_MESSAGE_TYPE })) as AnalyzeResponse | undefined;
    if (res?.ok === true) return { ok: true };
    return { ok: false, reason: isAnalyzeReason(res?.reason) ? res.reason : 'no-form' };
  } catch {
    return { ok: false, reason: 'no-tab' };
  }
}

function profileName(p: Profile): string {
  return `${p.lastName} ${p.firstName}`.trim() || '(氏名未入力)';
}

function addressSummary(a: Address): string {
  return `${a.prefecture}${a.city}${a.street}${a.building}` || '(住所未入力)';
}

function profileItem(p: Profile, inUse: boolean): HTMLElement {
  const item = el('li');
  const name = el('span', `${p.label}: ${profileName(p)}`);
  name.className = 'name';
  item.append(name);
  if (inUse) {
    const badge = el('span', '使用中');
    badge.className = 'badge';
    item.append(badge);
  }
  const kana = `${p.lastNameKana} ${p.firstNameKana}`.trim();
  const contact = [p.tel, p.email].filter(Boolean).join(' / ');
  const sub = [kana, contact].filter(Boolean).join(' / ');
  if (sub) {
    const subLine = el('div', sub);
    subLine.className = 'sub';
    item.append(subLine);
  }
  return item;
}

function ownerLabel(data: StoredData, a: Address): string {
  if (!a.profileId) return '共通';
  const owner = data.profiles.find((p) => p.id === a.profileId);
  return owner ? owner.label || 'プロファイル' : '共通';
}

function addressItem(data: StoredData, a: Address, inUse: boolean): HTMLElement {
  const item = el('li');
  const name = el('span', `${a.label}: ${addressSummary(a)}`);
  name.className = 'name';
  item.append(name);
  if (inUse) {
    const badge = el('span', '使用中');
    badge.className = 'badge';
    item.append(badge);
  }
  const subs: string[] = [`使う人: ${ownerLabel(data, a)}`];
  if (a.zip) subs.push(`〒${a.zip}`);
  const sub = el('div', subs.join(' / '));
  sub.className = 'sub';
  item.append(sub);
  return item;
}

function emptyNotice(text: string): HTMLElement {
  const wrap = el('div');
  wrap.className = 'empty';
  wrap.append(el('p', text));
  const open = el('button', '設定を開く');
  open.type = 'button';
  open.addEventListener('click', () => void openOptionsPage());
  wrap.append(open);
  return wrap;
}

export function renderPopup(root: HTMLElement, data: StoredData, last: LastUsed): void {
  const header = el('div');
  header.className = 'header';
  const gear = el('button', '⚙');
  gear.type = 'button';
  gear.className = 'gear';
  gear.setAttribute('aria-label', '設定を開く');
  gear.title = '設定を開く';
  gear.addEventListener('click', () => void openOptionsPage());
  const analyze = el('button', 'AI で分析');
  analyze.type = 'button';
  analyze.className = 'analyze';
  const notice = el('p', '');
  notice.className = 'notice';
  notice.setAttribute('role', 'status');
  notice.hidden = true;
  analyze.addEventListener('click', () => {
    // Same entry condition as the in-page button: without saved data there is
    // nothing to fill, so go to settings instead of messaging the tab.
    if (!isReady(data)) {
      void openOptionsPage();
      return;
    }
    notice.hidden = true;
    void analyzeCurrentTab().then((res) => {
      if (res.ok) {
        window.close();
        return;
      }
      notice.textContent = analyzeNoticeFor(res.reason);
      notice.hidden = false;
    });
  });
  header.append(el('h1', '入力内容の確認'), analyze, gear);

  const profileTitle = el('h2', 'プロファイル');
  const profileList = el('ul');
  if (data.profiles.length === 0) {
    profileList.append(emptyNotice('プロファイルは未登録です。'));
  } else {
    const useId = last.profileId ?? data.profiles[0]?.id;
    for (const p of data.profiles) profileList.append(profileItem(p, p.id === useId));
  }

  const addressTitle = el('h2', '住所');
  const addressList = el('ul');
  if (data.addresses.length === 0) {
    addressList.append(emptyNotice('住所は未登録です。'));
  } else {
    const useId = last.addressId ?? data.addresses[0]?.id;
    for (const a of data.addresses) addressList.append(addressItem(data, a, a.id === useId));
  }

  root.replaceChildren(header, notice, profileTitle, profileList, addressTitle, addressList);
}

// Auto-render only as the popup entry (tests import renderPopup directly).
const mount = typeof document === 'undefined' ? null : document.getElementById('popup');
if (mount) {
  const root: HTMLElement = mount;
  void Promise.all([loadData(), loadLastUsed()]).then(([data, last]) => {
    renderPopup(root, data, last);
  });
}
