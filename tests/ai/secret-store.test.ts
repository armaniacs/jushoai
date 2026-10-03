// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { decryptSecret, encryptSecret, isEnvelope, MemoryKeyStore } from '../../src/ai/secret-store';

describe('secret-store', () => {
  it('round-trips a secret', async () => {
    const ks = new MemoryKeyStore();
    const env = await encryptSecret('sk-test-123', ks);
    expect(await decryptSecret(env, ks)).toBe('sk-test-123');
  });

  it('does not contain the plaintext and uses a fresh IV each time', async () => {
    const ks = new MemoryKeyStore();
    const a = await encryptSecret('sk-test-123', ks);
    const b = await encryptSecret('sk-test-123', ks);
    expect(JSON.stringify(a)).not.toContain('sk-test-123');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('rejects a tampered ciphertext', async () => {
    const ks = new MemoryKeyStore();
    const env = await encryptSecret('sk-test-123', ks);
    const bytes = Uint8Array.from(atob(env.ct), (c) => c.charCodeAt(0));
    bytes[0] = (bytes[0] ?? 0) ^ 0xff;
    const tampered = { ...env, ct: btoa(String.fromCharCode(...bytes)) };
    await expect(decryptSecret(tampered, ks)).rejects.toThrow();
  });

  it('cannot be decrypted with a different key', async () => {
    const env = await encryptSecret('sk-test-123', new MemoryKeyStore());
    await expect(decryptSecret(env, new MemoryKeyStore())).rejects.toThrow();
  });

  it('rejects values that are not envelopes', async () => {
    const ks = new MemoryKeyStore();
    await expect(decryptSecret('plain', ks)).rejects.toThrow();
    await expect(decryptSecret({ v: 2, iv: 'a', ct: 'b' }, ks)).rejects.toThrow();
    expect(isEnvelope({ v: 1, iv: 'a', ct: 'b' })).toBe(true);
    expect(isEnvelope(null)).toBe(false);
  });

  it('keeps one key per MemoryKeyStore', async () => {
    const ks = new MemoryKeyStore();
    expect(await ks.getKey()).toBe(await ks.getKey());
  });
});
