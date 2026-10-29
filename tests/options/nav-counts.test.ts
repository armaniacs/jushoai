// PBI-168: nav count badges. The badge rides the section label as a suffix
// span, 0 stays visible (an explicit (0) is the signal that nothing is
// registered), a section whose count was never set (a failed read) keeps the
// bare label, and later setSectionCount calls update the badge in place.
// Counts set before the nav is built ride the stored value via buildNav.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ADDRESSES_SECTION_ID, AI_SECTION_ID, AUDIT_SECTION_ID, PROFILES_SECTION_ID,
  buildNav, setSectionCount, setSectionCounts,
} from '../../src/entrypoints/options/nav';

beforeEach(() => {
  document.body.innerHTML = '<div id="side"></div>';
});

const buildSideNav = (): void => {
  buildNav(document.getElementById('side')!);
};

const anchorOf = (id: string): HTMLAnchorElement =>
  document.querySelector<HTMLAnchorElement>(`#side nav a[data-section="${id}"]`)!;

describe('nav count badges (PBI-168)', () => {
  it('renders the count next to the label', () => {
    buildSideNav();
    setSectionCount(PROFILES_SECTION_ID, 2);
    expect(anchorOf(PROFILES_SECTION_ID).textContent).toBe('プロファイル (2)');
    expect(anchorOf(PROFILES_SECTION_ID).querySelector('.nav-count')).not.toBeNull();
  });

  it('shows a zero count instead of hiding the badge', () => {
    buildSideNav();
    setSectionCount(ADDRESSES_SECTION_ID, 0);
    expect(anchorOf(ADDRESSES_SECTION_ID).textContent).toBe('住所 (0)');
    expect(anchorOf(ADDRESSES_SECTION_ID).querySelector('.nav-count')).not.toBeNull();
  });

  it('keeps the bare label when no count was set (failed read)', () => {
    buildSideNav();
    setSectionCount(PROFILES_SECTION_ID, 3);
    // The AI section never gets a count in this file, so it pins the
    // label-only rendering of an unset (unreadable) count.
    expect(anchorOf(AI_SECTION_ID).textContent).toBe('AI 判定');
    expect(anchorOf(AI_SECTION_ID).querySelector('.nav-count')).toBeNull();
  });

  it('updates the badge in place on later calls', () => {
    buildSideNav();
    setSectionCount(PROFILES_SECTION_ID, 2);
    setSectionCount(PROFILES_SECTION_ID, 1);
    expect(anchorOf(PROFILES_SECTION_ID).textContent).toBe('プロファイル (1)');
    expect(anchorOf(PROFILES_SECTION_ID).querySelectorAll('.nav-count')).toHaveLength(1);
  });

  it('renders a count set before the nav was built', () => {
    setSectionCount(AUDIT_SECTION_ID, 5);
    buildSideNav();
    expect(anchorOf(AUDIT_SECTION_ID).textContent).toBe('通信の監査ログ (5)');
  });

  it('sets several sections through setSectionCounts', () => {
    buildSideNav();
    setSectionCounts({ [PROFILES_SECTION_ID]: 2, [ADDRESSES_SECTION_ID]: 1 });
    expect(anchorOf(PROFILES_SECTION_ID).textContent).toBe('プロファイル (2)');
    expect(anchorOf(ADDRESSES_SECTION_ID).textContent).toBe('住所 (1)');
  });

  it('renders boundary counts as-is (cap counts, no truncation)', () => {
    buildSideNav();
    // 10 = the profile/address cap (MAX_ITEMS); 1000 = the audit log cap. The
    // badge renders the given count unchanged.
    setSectionCount(PROFILES_SECTION_ID, 10);
    setSectionCount(AUDIT_SECTION_ID, 1000);
    expect(anchorOf(PROFILES_SECTION_ID).textContent).toBe('プロファイル (10)');
    expect(anchorOf(AUDIT_SECTION_ID).textContent).toBe('通信の監査ログ (1000)');
  });
});
