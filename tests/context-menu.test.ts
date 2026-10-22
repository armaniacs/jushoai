import { describe, it, expect, vi } from 'vitest';
import { registerFillOneMenu, FILL_ONE_MESSAGE, FILL_ONE_MENU_ID } from '../src/context-menu';

const fakeMenus = () => {
  const clickListeners: Array<(info: { menuItemId: string; tab?: { id?: number } | null }) => void> = [];
  const created: Array<{ id: string; title: string; contexts: string[] }> = [];
  return {
    clickListeners,
    created,
    create: vi.fn((props: { id: string; title: string; contexts: string[] }) => {
      created.push(props);
    }),
    removeAll: vi.fn((cb: () => void) => cb()),
    onClicked: { addListener: vi.fn((l: (info: { menuItemId: string; tab?: { id?: number } | null }) => void) => {
      clickListeners.push(l);
    }) },
  };
};

describe('registerFillOneMenu', () => {
  it('creates the editable-context menu once per install', () => {
    const menus = fakeMenus();
    const installed = { addListener: vi.fn() };
    registerFillOneMenu(installed, menus, vi.fn());
    expect(installed.addListener).toHaveBeenCalledOnce();
    expect(menus.onClicked.addListener).toHaveBeenCalledOnce();
    // The menu is created inside the onInstalled listener, not at call time.
    expect(menus.created).toHaveLength(0);
    installed.addListener.mock.calls[0]![0]!();
    expect(menus.created).toEqual([
      { id: FILL_ONE_MENU_ID, title: 'JushoAI: この欄に入力', contexts: ['editable'] },
    ]);
  });

  it('routes a menu click to the tab with the fill-one message', () => {
    const menus = fakeMenus();
    const installed = { addListener: vi.fn() };
    const send = vi.fn();
    registerFillOneMenu(installed, menus, send);
    menus.clickListeners[0]!({ menuItemId: FILL_ONE_MENU_ID, tab: { id: 7 } });
    expect(send).toHaveBeenCalledWith(7, FILL_ONE_MESSAGE);
  });

  it('ignores other menu items and tabs without an id', () => {
    const menus = fakeMenus();
    const installed = { addListener: vi.fn() };
    const send = vi.fn();
    registerFillOneMenu(installed, menus, send);
    menus.clickListeners[0]!({ menuItemId: 'other', tab: { id: 7 } });
    menus.clickListeners[0]!({ menuItemId: FILL_ONE_MENU_ID, tab: null });
    menus.clickListeners[0]!({ menuItemId: FILL_ONE_MENU_ID });
    expect(send).not.toHaveBeenCalled();
  });
});
