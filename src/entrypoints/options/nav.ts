import { FEEDBACK_REPO, buildSettingsReportUrl } from '../../feedback/issue-url';
import { el } from './dom';

export const PROFILES_SECTION_ID = 'profiles';
export const ADDRESSES_SECTION_ID = 'addresses';
export const AI_SECTION_ID = 'ai';
export const AUDIT_SECTION_ID = 'audit';

export const OPTION_SECTIONS = [
  { id: PROFILES_SECTION_ID, label: 'プロファイル' },
  { id: ADDRESSES_SECTION_ID, label: '住所' },
  { id: AI_SECTION_ID, label: 'AI 判定' },
  { id: AUDIT_SECTION_ID, label: '通信の監査ログ' },
] as const;

export type OptionsPageId = (typeof OPTION_SECTIONS)[number]['id'];

// Public documentation site (GitHub Pages for armaniacs/jushoai).
export const PAGES_URL = 'https://armaniacs.github.io/jushoai/';

function isPageId(value: string): value is OptionsPageId {
  return OPTION_SECTIONS.some((s) => s.id === value);
}

function readPageFromHash(): OptionsPageId | null {
  try {
    const hash = window.location.hash.replace(/^#/, '');
    return isPageId(hash) ? hash : null;
  } catch {
    // Non-browser environments fall through to the default page.
    return null;
  }
}

function initialPage(): OptionsPageId {
  return readPageFromHash() ?? PROFILES_SECTION_ID;
}

let activePage: OptionsPageId = initialPage();

export function getActivePage(): OptionsPageId {
  return activePage;
}

export function setActivePage(id: OptionsPageId): void {
  activePage = id;
  try {
    window.history.replaceState(null, '', `#${id}`);
  } catch {
    // History is unavailable in some environments.
  }
  applyActivePage();
}

// Shows only the active page and hides the rest. The profile/address
// sections live inside #app, the AI section inside #ai-app, the audit
// section inside #audit-app; renders recreate elements, so this runs after
// every render.
// Safe to call before any section exists.
export function applyActivePage(): void {
  const app = document.getElementById('app');
  const aiApp = document.getElementById('ai-app');
  const auditApp = document.getElementById('audit-app');
  if (!app || !aiApp || !auditApp) return;
  app.hidden = activePage !== PROFILES_SECTION_ID && activePage !== ADDRESSES_SECTION_ID;
  aiApp.hidden = activePage !== AI_SECTION_ID;
  auditApp.hidden = activePage !== AUDIT_SECTION_ID;
  for (const s of OPTION_SECTIONS) {
    const section = document.getElementById(s.id);
    if (section) section.hidden = s.id !== activePage;
  }
  const nav = document.querySelector('#side nav');
  if (nav) markActive(nav as HTMLElement, activePage);
}

export function buildBrand(): HTMLAnchorElement {
  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.setAttribute('href', PAGES_URL);
  brand.setAttribute('target', '_blank');
  brand.setAttribute('rel', 'noopener');
  const icon = document.createElement('img');
  try {
    icon.src = chrome.runtime.getURL('icon/32.png');
  } catch {
    icon.removeAttribute('src');
  }
  icon.alt = 'JushoAI ロゴ';
  icon.width = 32;
  icon.height = 32;
  const name = el('span', 'JushoAI');
  brand.append(icon, name);
  return brand;
}

export function buildNav(root: HTMLElement): HTMLElement {
  const nav = el('nav');
  for (const s of OPTION_SECTIONS) {
    const a = el('a', s.label);
    a.setAttribute('href', `#${s.id}`);
    a.dataset.section = s.id;
    nav.append(a);
  }
  const reportWrap = el('div');
  reportWrap.className = 'report';  const version = (() => {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return '';
    }
  })();
  const report = el('a', '不具合報告');
  report.setAttribute('href', buildSettingsReportUrl(FEEDBACK_REPO, version));
  report.setAttribute('target', '_blank');
  report.setAttribute('rel', 'noopener');
  const note = el('span', '公開 issue が開きます。値は送りません');
  note.className = 'report-note';
  reportWrap.append(report, note);
  const holder = el('div');
  holder.append(buildBrand(), nav, reportWrap);
  root.replaceChildren(holder);
  return nav;
}

function markActive(nav: HTMLElement, id: string): void {
  for (const a of nav.querySelectorAll('a[data-section]')) {
    if (a instanceof HTMLAnchorElement) {
      if (a.dataset.section === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }
}

export function mountNav(root: HTMLElement): HTMLElement {
  const nav = buildNav(root);
  applyActivePage();
  nav.addEventListener('click', (e) => {
    const anchor = (e.target as HTMLElement).closest?.('a[data-section]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const id = anchor.dataset.section ?? '';
    if (!isPageId(id)) return;
    e.preventDefault();
    setActivePage(id);
  });
  window.addEventListener('hashchange', () => {
    const hash = readPageFromHash();
    if (hash !== null && hash !== activePage) setActivePage(hash);
  });
  return nav;
}
