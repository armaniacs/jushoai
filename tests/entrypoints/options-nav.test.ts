import { describe, it, expect, afterEach } from 'vitest';
import {
  OPTION_SECTIONS, buildNav, getActivePage, setActivePage, applyActivePage,
  PROFILES_SECTION_ID, ADDRESSES_SECTION_ID, AI_SECTION_ID, AUDIT_SECTION_ID,
} from '../../src/entrypoints/options/nav';
import { buildSettingsReportUrl } from '../../src/feedback/issue-url';

afterEach(() => {
  document.body.innerHTML = '';
  window.location.hash = '';
  setActivePage('profiles');
});

describe('OPTION_SECTIONS', () => {
  it('has profile, address, AI and audit entries', () => {
    expect(OPTION_SECTIONS.map((s) => s.id)).toEqual(['profiles', 'addresses', 'ai', 'audit']);
  });

  it('shares one id source with the rendered headings', () => {
    expect(OPTION_SECTIONS.map((s) => s.id)).toEqual(
      [PROFILES_SECTION_ID, ADDRESSES_SECTION_ID, AI_SECTION_ID, AUDIT_SECTION_ID],
    );
  });
});

describe('buildNav', () => {
  it('renders section links and a report link at the bottom', () => {
    const root = document.createElement('div');
    const nav = buildNav(root);
    const links = [...nav.querySelectorAll('a[data-section]')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#profiles', '#addresses', '#ai', '#audit']);
    expect(links.map((a) => a.textContent)).toEqual(['プロファイル', '住所', 'AI 判定', '通信の監査ログ']);
    const report = root.querySelector('.report a');
    expect(report?.textContent).toBe('不具合報告');
    expect(report?.getAttribute('target')).toBe('_blank');
    const url = new URL((report as HTMLAnchorElement).href);
    expect(`${url.origin}${url.pathname}`).toBe('https://github.com/armaniacs/jushoai/issues/new');
    expect(url.searchParams.get('labels')).toBe('feedback');
  });

  it('renders a brand logo linking to the documentation site', () => {
    const root = document.createElement('div');
    buildNav(root);
    const brand = root.querySelector('a.brand') as HTMLAnchorElement | null;
    expect(brand?.getAttribute('href')).toBe('https://armaniacs.github.io/jushoai/');
    expect(brand?.getAttribute('target')).toBe('_blank');
    expect(brand?.getAttribute('rel')).toBe('noopener');
    expect(brand?.querySelector('img')?.alt).toBe('JushoAI ロゴ');
    expect(brand?.textContent).toContain('JushoAI');
  });
});

describe('buildSettingsReportUrl', () => {
  it('contains no profile values and warns about public issues', () => {
    const url = buildSettingsReportUrl('https://github.com/armaniacs/jushoai', '0.1.6');
    const body = new URL(url).searchParams.get('body') ?? '';
    expect(body).toContain('0.1.6');
    expect(body).toContain('公開 issue');
    expect(body).toContain('値は書かないでください');
    expect(body).not.toContain('山田');
  });
});

describe('page switching', () => {
  function fixture() {
    const side = document.createElement('div');
    side.id = 'side';
    const content = document.createElement('div');
    content.className = 'content';
    const app = document.createElement('main');
    app.id = 'app';
    const profiles = document.createElement('div');
    profiles.id = 'profiles';
    const addresses = document.createElement('div');
    addresses.id = 'addresses';
    app.append(profiles, addresses);
    const aiApp = document.createElement('main');
    aiApp.id = 'ai-app';
    const ai = document.createElement('div');
    ai.id = 'ai';
    aiApp.append(ai);
    const auditApp = document.createElement('main');
    auditApp.id = 'audit-app';
    const audit = document.createElement('div');
    audit.id = 'audit';
    auditApp.append(audit);
    content.append(app, aiApp, auditApp);
    document.body.append(side, content);
    return side;
  }

  it('shows only the active page', () => {
    fixture();
    setActivePage('addresses');
    expect(getActivePage()).toBe('addresses');
    expect(document.getElementById('addresses')?.hidden).toBe(false);
    expect(document.getElementById('profiles')?.hidden).toBe(true);
    expect(document.getElementById('app')?.hidden).toBe(false);
    expect(document.getElementById('ai-app')?.hidden).toBe(true);
    expect(document.getElementById('audit-app')?.hidden).toBe(true);
  });

  it('hides the profile/address container on the AI page', () => {
    fixture();
    setActivePage('ai');
    expect(document.getElementById('app')?.hidden).toBe(true);
    expect(document.getElementById('ai-app')?.hidden).toBe(false);
    expect(document.getElementById('ai')?.hidden).toBe(false);
    expect(document.getElementById('audit-app')?.hidden).toBe(true);
  });

  it('shows only the audit page content on the audit page', () => {
    fixture();
    setActivePage('audit');
    expect(getActivePage()).toBe('audit');
    expect(document.getElementById('app')?.hidden).toBe(true);
    expect(document.getElementById('ai-app')?.hidden).toBe(true);
    expect(document.getElementById('audit-app')?.hidden).toBe(false);
    expect(document.getElementById('audit')?.hidden).toBe(false);
    expect(document.getElementById('ai')?.hidden).toBe(true);
  });

  it('marks the active menu entry', () => {
    const side = fixture();
    buildNav(side);
    setActivePage('audit');
    const current = [...document.querySelectorAll('#side nav a[aria-current="true"]')];
    expect(current.map((a) => a.getAttribute('href'))).toEqual(['#audit']);
  });

  it('is a no-op when the page skeleton is absent', () => {
    expect(() => applyActivePage()).not.toThrow();
  });

  it('follows hash changes and ignores unknown hashes', async () => {
    const { mountNav } = await import('../../src/entrypoints/options/nav');
    mountNav(document.createElement('div'));
    window.location.hash = '#ai';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(getActivePage()).toBe('ai');
    window.location.hash = '#audit';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(getActivePage()).toBe('audit');
    window.location.hash = '#nope';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(getActivePage()).toBe('audit');
  });
});
