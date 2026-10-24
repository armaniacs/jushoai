// One-click single-field entry (PBI-137): the context-menu registration and
// its click routing. Both surfaces are injected so the wiring is testable
// with fakes and this module holds no chrome.* reference itself.
export const FILL_ONE_MENU_ID = 'jushoai-fill-one';

// The message the background sends to the content script on a menu click.
// One place owns the shape; the content script checks against this type.
export interface FillOneMessage {
  type: 'fill-one';
}
export const FILL_ONE_MESSAGE: FillOneMessage = { type: 'fill-one' };

interface MenuClickInfo {
  menuItemId: string | number;
  tab?: { id?: number } | null;
}

export interface ContextMenusApi {
  create(createProperties: { id: string; title: string; contexts: ['editable'] }): unknown;
  removeAll(callback: () => void): void;
  onClicked: {
    addListener(listener: (info: MenuClickInfo) => void): void;
  };
}

export interface InstalledEmitter {
  addListener(listener: () => void): void;
}

export function registerFillOneMenu(
  onInstalled: InstalledEmitter,
  menus: ContextMenusApi,
  send: (tabId: number, msg: FillOneMessage) => void,
): void {
  // Click routing registers once at call time; a second install event must
  // not add a second listener (double messages). Only the menu item itself
  // is recreated per install — contextMenus are per-profile persistent, so
  // an update keeps the old item and removeAll clears it before the create.
  menus.onClicked.addListener((info) => {
    if (info.menuItemId !== FILL_ONE_MENU_ID) return;
    const tabId = info.tab?.id;
    if (tabId == null) return;
    send(tabId, FILL_ONE_MESSAGE);
  });
  onInstalled.addListener(() => {
    menus.removeAll(() => {
      menus.create({ id: FILL_ONE_MENU_ID, title: 'JushoAI: この欄に入力', contexts: ['editable'] });
    });
  });
}
