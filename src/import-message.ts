// Import draft message (PBI-127): chrome-free shape shared by the options page
// (sender) and the content script (receiver). The reply carries only the
// page's own filled values and travels over chrome.tabs.sendMessage — it never
// leaves the device.
export const IMPORT_DRAFT_MESSAGE_TYPE = 'import-draft' as const;
export const IMPORT_DRAFT_MESSAGE = { type: IMPORT_DRAFT_MESSAGE_TYPE } as const;

export type ImportDraftResponse =
  | { ok: true; draft: ImportDraftWire }
  | { ok: false };

// Wire shape mirrors core/import-draft's ImportDraft (flat key → value maps).
export interface ImportDraftWire {
  profile: Record<string, string>;
  address: Record<string, string>;
}
