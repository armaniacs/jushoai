import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTabScopeMemory } from '../../src/content/tab-scope';
import type { GuestValues } from '../../src/core/guest';

// PBI-201: the tab-scoped memory owner. The one-shot guest (PBI-144), the
// wizard carryover (PBI-142) and the last AI failure used to live as three
// closure variables in content.ts main() with their lifetime rules scattered
// across comments and the FillFlow env callbacks. These tests pin the owner's
// peek/set/merge/consume surface and the rules that must keep holding: the
// one-shot consumption keyed by the run's snapshot, the replace-on-merge
// carryover (a run-start snapshot stays at its build-time value), and that
// nothing ever leaves the tab's memory.

const guest: GuestValues = {
  profile: { lastName: '山田', firstName: '太郎' },
  address: { zip: '1000001', prefecture: '東京都' },
};
const otherGuest: GuestValues = {
  profile: { lastName: '鈴木' },
  address: {},
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('guest: one-shot set/consume (PBI-144)', () => {
  it('peeks null until the guest panel sets a decision', () => {
    const mem = createTabScopeMemory();
    expect(mem.guest()).toBeNull();
    mem.setGuest(guest);
    expect(mem.guest()).toEqual(guest);
  });

  it('setGuest replaces the previous decision', () => {
    const mem = createTabScopeMemory();
    mem.setGuest(guest);
    mem.setGuest(otherGuest);
    expect(mem.guest()).toEqual(otherGuest);
  });

  it('the apply of a guest run consumes the snapshot it overlaid', () => {
    const mem = createTabScopeMemory();
    mem.setGuest(guest);
    // The run snapshots at bundle-build time; its apply consumes that
    // snapshot — the slot is empty afterwards (one-shot).
    const activeGuest = mem.guest();
    mem.consumeGuest(activeGuest);
    expect(mem.guest()).toBeNull();
  });

  it('a non-guest run never clears a guest set after its snapshot', () => {
    // The run snapshotted null; the guest lands while it is in flight; its
    // apply must not wipe the new guest (the snapshot stays authoritative).
    const mem = createTabScopeMemory();
    const activeGuest = mem.guest();
    mem.setGuest(guest);
    mem.consumeGuest(activeGuest);
    expect(mem.guest()).toEqual(guest);
  });

  it('stays consumed until the panel sets a new decision (one-shot)', () => {
    const mem = createTabScopeMemory();
    mem.setGuest(guest);
    const activeGuest = mem.guest();
    mem.consumeGuest(activeGuest);
    // A later apply (no guest snapshot left) cannot resurrect anything.
    mem.consumeGuest(mem.guest());
    expect(mem.guest()).toBeNull();
  });

  it('the run-side snapshot survives later owner writes', () => {
    // activeGuest keeps the run-start meaning: a guest set or consumed while
    // the run is in flight never changes what that run overlays.
    const mem = createTabScopeMemory();
    mem.setGuest(guest);
    const activeGuest = mem.guest();
    mem.setGuest(otherGuest);
    mem.consumeGuest(otherGuest);
    expect(activeGuest).toEqual(guest);
  });
});

describe('carryover: merge/peek (PBI-142)', () => {
  it('peeks empty until an apply records entries', () => {
    const mem = createTabScopeMemory();
    expect(mem.carryover()).toEqual({});
    mem.mergeCarryover([{ key: 'zip', value: '1000001' }]);
    expect(mem.carryover()).toEqual({ zip: '1000001' });
  });

  it('merges filled entries keyed by the signature, latest value wins', () => {
    const mem = createTabScopeMemory();
    mem.mergeCarryover([{ key: 'zip', value: '1000001' }, { key: 'email', value: 'a@b.jp' }]);
    mem.mergeCarryover([{ key: 'zip', value: '1020072' }]);
    expect(mem.carryover()).toEqual({ zip: '1020072', email: 'a@b.jp' });
  });

  it('mergeCarryover replaces the object — a run-start snapshot stays untouched', () => {
    // The fill-one deps read through the getter (always the latest), while
    // the run's input.carryover keeps its build-time value: a merge must
    // never mutate an object handed out earlier.
    const mem = createTabScopeMemory();
    mem.mergeCarryover([{ key: 'zip', value: '1000001' }]);
    const atRunStart = mem.carryover();
    mem.mergeCarryover([{ key: 'zip', value: '1020072' }]);
    expect(atRunStart).toEqual({ zip: '1000001' });
    expect(mem.carryover()).toEqual({ zip: '1020072' });
  });
});

describe('lastFailure: set/peek', () => {
  it('peeks null until a run stores a failure', () => {
    const mem = createTabScopeMemory();
    expect(mem.lastFailure()).toBeNull();
    mem.setLastFailure('bad-response');
    expect(mem.lastFailure()).toBe('bad-response');
  });

  it('success clears the stored failure (the guide falls back to "available")', () => {
    const mem = createTabScopeMemory();
    mem.setLastFailure('bad-response');
    mem.setLastFailure(null);
    expect(mem.lastFailure()).toBeNull();
  });

  it('a later failure replaces the earlier one', () => {
    const mem = createTabScopeMemory();
    mem.setLastFailure('bad-response');
    mem.setLastFailure('unavailable');
    expect(mem.lastFailure()).toBe('unavailable');
  });
});

describe('nothing leaves the tab (PBI-201)', () => {
  it('never writes chrome.storage, sends a runtime message or reaches the audit log', () => {
    const storageGet = vi.fn();
    const storageSet = vi.fn();
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', {
      storage: { local: { get: storageGet, set: storageSet } },
      runtime: { sendMessage },
    });
    const mem = createTabScopeMemory();
    mem.setGuest(guest);
    const activeGuest = mem.guest();
    mem.consumeGuest(activeGuest);
    mem.mergeCarryover([{ key: 'zip', value: '1000001' }]);
    mem.setLastFailure('bad-response');
    mem.setLastFailure(null);

    // Every value stayed in memory: no storage read or write (the audit log
    // rides the same chrome.storage.local), no runtime message, so nothing
    // can reach the export/import either.
    expect(storageGet).not.toHaveBeenCalled();
    expect(storageSet).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    // The values were never moved anywhere: they are still peekable here.
    expect(mem.guest()).toBeNull();
    expect(mem.carryover()).toEqual({ zip: '1000001' });
    expect(mem.lastFailure()).toBeNull();
  });

  it('exposes exactly the peek/set/merge/consume surface — no export path', () => {
    const mem = createTabScopeMemory();
    expect(Object.keys(mem).sort()).toEqual([
      'carryover', 'consumeGuest', 'guest', 'lastFailure', 'mergeCarryover',
      'setGuest', 'setLastFailure',
    ]);
  });
});
