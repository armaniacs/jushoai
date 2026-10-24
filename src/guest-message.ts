// Guest message (PBI-144): chrome-free shape shared by the popup (sender) and
// the content script (receiver). The guest values themselves never cross a
// message: the popup only asks the tab to open the entry panel, and the typed
// values stay in the content script's memory.
export const GUEST_MESSAGE_TYPE = 'guest-fill' as const;
export const GUEST_MESSAGE = { type: GUEST_MESSAGE_TYPE } as const;

export type GuestResponse = { ok: true } | { ok: false };
