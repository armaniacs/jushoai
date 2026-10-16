// Dialog semantics for mountPanel (finding H): role=dialog, focus move on
// open and restore on close. The seams Phase 5 needed are covered above;
// below pins the fixed behavior.
import { describe, expect, it } from 'vitest';
import { mountPanel } from '../../src/ui/panel';

const renderDialog = (_host: HTMLElement, root: ShadowRoot) => {
  const h2 = document.createElement('h2');
  h2.id = 'jushoai-title';
  h2.textContent = '入力内容の確認';
  const ok = document.createElement('button');
  ok.textContent = '適用する';
  root.append(h2, ok);
};

describe('mountPanel dialog testability', () => {
  it('exposes the rendered heading and actions through handle.root', () => {
    const panel = mountPanel(renderDialog);
    try {
      const h2 = panel.root.querySelector('h2');
      expect(h2?.textContent).toBe('入力内容の確認');
      // The accessible name is mirrored onto the host (aria-label), never an
      // idref across the closed shadow boundary.
      expect(panel.root.getElementById('jushoai-title')).toBe(h2);
      expect(panel.root.querySelector('button')?.textContent).toBe('適用する');
    } finally {
      panel.close();
    }
  });

  it('mounts the host in the document body (future role=dialog target)', () => {
    const panel = mountPanel(renderDialog);
    try {
      expect(document.body.contains(panel.host)).toBe(true);
    } finally {
      panel.close();
    }
  });

  it('labels the host dialog from the explicit argument, not the heading', () => {
    const panel = mountPanel(renderDialog, () => {}, { accessibleName: '指定された対話名' });
    try {
      // No cross-boundary idref and no heading scrape: the name lives on the
      // host itself, exactly as passed.
      expect(panel.host.hasAttribute('aria-labelledby')).toBe(false);
      expect(panel.host.getAttribute('aria-label')).toBe('指定された対話名');
    } finally {
      panel.close();
    }
  });

  it('leaves the host unnamed without an explicit name', () => {
    const panel = mountPanel(renderDialog);
    try {
      expect(panel.host.getAttribute('role')).toBe('dialog');
      expect(panel.host.hasAttribute('aria-label')).toBe(false);
    } finally {
      panel.close();
    }
  });

  it('moves focus into the panel on open', () => {
    const panel = mountPanel(renderDialog);
    try {
      expect(panel.root.activeElement?.textContent ?? document.activeElement?.textContent).toBe('適用する');
    } finally {
      panel.close();
    }
  });

  it('focuses the primary action even when it is not first in DOM order', () => {
    const panel = mountPanel((_host, root) => {
      const reanalyze = document.createElement('button');
      reanalyze.textContent = 'AI で分析';
      const cancel = document.createElement('button');
      cancel.textContent = 'キャンセル';
      const apply = document.createElement('button');
      apply.className = 'primary';
      apply.textContent = '入力する';
      root.append(reanalyze, cancel, apply);
    }, () => {}, { focus: 'primary' });
    try {
      expect(panel.root.activeElement?.textContent).toBe('入力する');
    } finally {
      panel.close();
    }
  });

  it('focuses the first button when asked explicitly', () => {
    const panel = mountPanel((_host, root) => {
      const cancel = document.createElement('button');
      cancel.textContent = 'キャンセル';
      const apply = document.createElement('button');
      apply.className = 'primary';
      apply.textContent = '入力する';
      root.append(cancel, apply);
    }, () => {}, { focus: 'first' });
    try {
      expect(panel.root.activeElement?.textContent).toBe('キャンセル');
    } finally {
      panel.close();
    }
  });

  it('tears down without residue when render throws', () => {
    const onClose = (() => { let calls = 0; return { fn: () => { calls += 1; }, calls: () => calls }; })();
    expect(() => mountPanel(() => { throw new Error('render boom'); }, onClose.fn)).toThrow('render boom');
    expect(onClose.calls()).toBe(0);
    expect(document.body.querySelector('[data-jushoai]')).toBeNull();
  });
});
