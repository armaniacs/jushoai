import type { ProviderKind } from '../ai/types';

// How long a recorded 401 blocks the network before self-healing: transient
// provider-side blips recover without manual action. Settings changes and
// successful connection tests clear immediately, regardless of this window.
export const AUTH_BLOCK_RETRY_MS = 5 * 60 * 1000;

// One retry policy behind block/isBlocked/clear: the timestamps live here next
// to the blocked set, so callers never juggle two containers. Entries seeded
// from outside (an injected pre-filled set) carry no timestamp and never
// expire; only failures recorded here self-heal.
export interface AuthBlock {
  record(p: ProviderKind): void;
  clear(p: ProviderKind): void;
  clearAll(): void;
  // Mutation-on-read by design: a recorded block past its window is cleared
  // and reported unblocked, so the single call site never needs a separate
  // heal step. Reads are idempotent afterwards (a healed entry stays cleared).
  isBlocked(p: ProviderKind): boolean;
}

export function createAuthBlock(
  store: Set<ProviderKind>,
  retryMs: number = AUTH_BLOCK_RETRY_MS,
  now: () => number = Date.now,
): AuthBlock {
  const at = new Map<ProviderKind, number>();
  return {
    record(p: ProviderKind): void {
      store.add(p);
      at.set(p, now());
    },
    clear(p: ProviderKind): void {
      store.delete(p);
      at.delete(p);
    },
    clearAll(): void {
      store.clear();
      at.clear();
    },
    isBlocked(p: ProviderKind): boolean {
      if (!store.has(p)) return false;
      const blockedAt = at.get(p);
      // No timestamp: seeded from outside, not recorded here. Never expires.
      if (blockedAt === undefined) return true;
      if (now() - blockedAt >= retryMs) {
        store.delete(p);
        at.delete(p);
        return false;
      }
      return true;
    },
  };
}
