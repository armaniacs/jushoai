// PBI-156: one guarded dispatcher for the tab-bound chrome.runtime messages.
// The type guard, the exclusion gate, and the response plumbing live here, so
// a new tab message cannot re-copy them (the analyze, import-draft, and guest
// listeners each used to repeat the same three steps). The gate runs after the
// type guard and before the handler body: an excluded page answers the
// excluded response and nothing else (no panel, no run).

export interface TabMessageOptions {
  // When true the exclusion gate runs before the handler body.
  gate?: boolean;
  // The response an excluded page receives; defaults to { ok: false }.
  excludedResponse?: unknown;
  // The handler body. Returns the chrome.runtime.onMessage listener flag:
  // true keeps the response channel open for an asynchronous reply.
  handler(msg: object, sendResponse: (res: unknown) => void): boolean;
}

export type RuntimeListener = (
  msg: unknown,
  sender: unknown,
  sendResponse: (res: unknown) => void,
) => boolean;

export interface TabDispatcherDeps {
  // The exclusion gate of the running tab. An excluded page answers nothing.
  isExcluded(): boolean;
  // The runtime listener registration; injectable so unit tests can dispatch
  // without a real chrome.runtime.
  addListener(listener: RuntimeListener): void;
}

export function createTabDispatcher(deps: TabDispatcherDeps): (
  type: string,
  opts: TabMessageOptions,
) => void {
  return function registerTabMessage(type: string, opts: TabMessageOptions): void {
    deps.addListener((msg, _sender, sendResponse) => {
      if (typeof msg !== 'object' || msg === null || (msg as { type?: unknown }).type !== type) {
        return false;
      }
      if (opts.gate === true && deps.isExcluded()) {
        sendResponse(opts.excludedResponse ?? { ok: false });
        return false;
      }
      return opts.handler(msg as object, sendResponse);
    });
  };
}
