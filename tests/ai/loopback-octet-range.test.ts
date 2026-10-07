import { describe, it, expect } from 'vitest';
import { isLoopbackHost, validateBaseUrl } from '../../src/ai/settings';

// Governance (Low): the loopback regex /^127(\.\d{1,3}){3}$/ does not validate
// the 0-255 octet range, so `http://127.999.999.999/` is accepted as a
// loopback http URL. `it.fails` encodes the DESIRED behavior without touching
// production code: Phase 5 applies the one-line Number() range check, then
// drops the `.fails` markers (vitest fails the suite if a `.fails` test
// starts passing, so the markers cannot be forgotten).

describe('isLoopbackHost octet range (Governance Low)', () => {
  it('accepts real 127/8 loopbacks', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('127.1.2.3')).toBe(true);
    expect(isLoopbackHost('localhost')).toBe(true);
  });

  it.fails('rejects out-of-range 127/8 octets', () => {
    expect(isLoopbackHost('127.999.999.999')).toBe(false);
  });

  it('rejects http URLs on out-of-range 127/8 hosts at URL-parse level', () => {
    // new URL('http://127.999.999.999/') itself throws, so validateBaseUrl
    // never reaches isLoopbackHost here — the regex flaw above is
    // defense-in-depth only, not reachable through this entry point.
    expect(validateBaseUrl('http://127.999.999.999/').ok).toBe(false);
  });

  it('still allows http on genuine loopbacks', () => {
    expect(validateBaseUrl('http://127.0.0.1:8080/').ok).toBe(true);
    expect(validateBaseUrl('http://localhost:8080/').ok).toBe(true);
  });
});
