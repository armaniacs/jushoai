// Single owner of the bounded async call (PBI-191): classify-transport and
// background-gateway carried a verbatim 16-line sendWithTimeout copy each, so
// every timer flush order or abort cleanup fix had to land in two places by
// hand. Both callers go through this one module now; the error wording
// ('timeout' / 'aborted'), the reject order and the cleanup are unchanged.
//
// A stalled Service Worker reply must not leave the caller pending forever.
// The optional signal links the wait to preview disposal (PBI-33): an abort
// rejects the in-flight call so the caller's loop stops without sending more.
export function sendWithTimeout(msg: unknown, ms: number, signal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, ms);
    const onAbort = () => { clearTimeout(timer); cleanup(); reject(new Error('aborted')); };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
    (chrome.runtime.sendMessage(msg) as Promise<unknown>).then(
      (v) => { clearTimeout(timer); cleanup(); resolve(v); },
      (e) => { clearTimeout(timer); cleanup(); reject(e); },
    );
  });
}
