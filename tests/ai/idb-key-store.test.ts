// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import type { KeyStore } from '../../src/ai/secret-store';
import { IdbKeyStore, encryptSecret, decryptSecret } from '../../src/ai/secret-store';

describe('IdbKeyStore', () => {
  let dbCounter = 0;

  beforeEach(() => {
    dbCounter++;
  });

  it('two instances on the same db calling getKey() concurrently return the same key', async () => {
    for (let i = 0; i < 20; i++) {
      const dbName = `test-db-${dbCounter}-race-${i}`;
      const ks1 = new IdbKeyStore(dbName);
      const ks2 = new IdbKeyStore(dbName);

      const [key1, key2] = await Promise.all([ks1.getKey(), ks2.getKey()]);

      // Create stubs to test with the actual returned keys
      const stub1: KeyStore = { getKey: async () => key1 };
      const stub2: KeyStore = { getKey: async () => key2 };

      // Encrypt with key1, decrypt with key2
      const env = await encryptSecret('test-secret', stub1);
      const decrypted = await decryptSecret(env, stub2);
      expect(decrypted).toBe('test-secret');

      // Reverse: encrypt with key2, decrypt with key1
      const env2 = await encryptSecret('reverse-secret', stub2);
      const decrypted2 = await decryptSecret(env2, stub1);
      expect(decrypted2).toBe('reverse-secret');
    }
  });

  it('persists key across instances on the same db', async () => {
    const dbName = `test-db-${dbCounter}`;
    const ks1 = new IdbKeyStore(dbName);

    // Encrypt with first instance
    const env = await encryptSecret('persisted-secret', ks1);

    // Create new instance and decrypt
    const ks2 = new IdbKeyStore(dbName);
    const decrypted = await decryptSecret(env, ks2);
    expect(decrypted).toBe('persisted-secret');
  });

  it('stores a non-extractable key', async () => {
    const dbName = `test-db-${dbCounter}`;
    const ks = new IdbKeyStore(dbName);
    const key = await ks.getKey();
    expect(key.extractable).toBe(false);
  });
});
