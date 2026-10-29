import { mergeCarryover } from '../core/carryover';
import type { CarryEntry, Carryover } from '../core/carryover';
import type { GuestValues } from '../core/guest';
import type { ClassifyFailure } from '../messages';

// PBI-201: the content script's tab-scoped memory behind one owner. The
// one-shot guest (PBI-144), the wizard carryover (PBI-142) and the last AI
// failure used to live as three closure variables in main() with their
// lifetime rules spread over four-plus comments and the FillFlow env
// callbacks. This object is the single owner of all three, and this comment
// is the single place that states the rules they share:
//
// - Tab lifetime only. A tab close destroys every value below; nothing here
//   reaches chrome.storage (no write, no read), the audit log, or the
//   export/import. The module imports no store and sends no message — the
//   only way a value leaves is a peek return.
// - The guest (PBI-144) is one-shot: the guest panel sets it, a run
//   snapshots it into the session's throwaway profile copies (guestProfile /
//   guestAddress), and the apply of the run that snapshotted a guest
//   consumes it. consumeGuest takes that run's snapshot, not a live read: a
//   run without a guest never clears a guest set after its snapshot.
// - The carryover (PBI-142) carries the earlier pages' approved values for
//   this tab. mergeCarryover REPLACES the carried object (the core copy
//   semantics) instead of mutating a previously returned one, so a snapshot
//   read at run start (FillBundle input.carryover) stays at its build-time
//   value while getter reads (the fill-one deps) always see the latest.
// - The last AI failure backs the badge guide (cleared on success): a
//   failed-while-available run still points at the AI判定画面の接続テスト
//   instead of saying "available" alone.

export interface TabScopeMemory {
  // The current one-shot guest, or null while none is set (peek).
  guest(): GuestValues | null;
  // The guest panel's decision replaces whatever was set before (set).
  setGuest(values: GuestValues | null): void;
  // One-shot consumption (consume): the apply of a run that snapshotted a
  // guest clears the slot. The argument is that run's activeGuest snapshot.
  consumeGuest(snapshot: GuestValues | null): void;
  // The carryover map for this tab (peek). Merges never mutate a previously
  // returned object, so a run-start snapshot keeps its build-time value.
  carryover(): Carryover;
  // The filled entries of an apply merge into the carryover, keyed by the
  // field signature; a signature learned twice keeps the latest value
  // (merge). A tab close destroys the map — nothing persists or is sent.
  mergeCarryover(entries: readonly CarryEntry[]): void;
  // The last AI failure behind the current status, or null after a clean
  // run (peek).
  lastFailure(): ClassifyFailure | null;
  // A failed run stores its reason; success stores null (set).
  setLastFailure(failure: ClassifyFailure | null): void;
}

export function createTabScopeMemory(): TabScopeMemory {
  let guest: GuestValues | null = null;
  let carryover: Carryover = {};
  let lastFailure: ClassifyFailure | null = null;

  return {
    guest: () => guest,
    setGuest: (values) => { guest = values; },
    consumeGuest: (snapshot) => { if (snapshot) guest = null; },
    carryover: () => carryover,
    mergeCarryover: (entries) => {
      carryover = mergeCarryover(carryover, entries);
    },
    lastFailure: () => lastFailure,
    setLastFailure: (failure) => { lastFailure = failure; },
  };
}
