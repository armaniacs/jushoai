// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IdbKeyStore, encryptSecret, decryptSecret } from '../../src/ai/secret-store';

describe('IdbKeyStore', () => {
  let dbCounter = 0;

  beforeEach(() => {
    dbCounter++;
  });

  it('two instances on the same db calling getKey() concurrently return compatible keys', async () => {
    const dbName = `test-db-${dbCounter}`;
    const ks1 = new IdbKeyStore(dbName);
    const ks2 = new IdbKeyStore(dbName);

    const [key1, key2] = await Promise.all([ks1.getKey(), ks2.getKey()]);

    // Keys should be usable for both encryption and decryption
    const env = await encryptSecret('test-secret', ks1);
    const decrypted = await decryptSecret(env, ks2);
    expect(decrypted).toBe('test-secret');
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
