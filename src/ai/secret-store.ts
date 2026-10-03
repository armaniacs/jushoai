export interface KeyStore {
  getKey(): Promise<CryptoKey>;
}

export interface Envelope {
  v: 1;
  iv: string;
  ct: string;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const generateKey = () =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

export class MemoryKeyStore implements KeyStore {
  private key: Promise<CryptoKey> | null = null;

  getKey(): Promise<CryptoKey> {
    this.key ??= generateKey();
    return this.key;
  }
}

// The key is non-extractable: a leaked chrome.storage.local alone cannot decrypt the stored secrets.
export class IdbKeyStore implements KeyStore {
  constructor(
    private readonly dbName = 'jushoai-keys',
    private readonly storeName = 'keys',
  ) {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(this.storeName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private request<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const req = run(db.transaction(this.storeName, mode).objectStore(this.storeName));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getKey(): Promise<CryptoKey> {
    const db = await this.open();
    try {
      const existing = await this.request<CryptoKey | undefined>(db, 'readonly', (s) => s.get('kek'));
      if (existing) return existing;
      const created = await generateKey();
      // Re-check inside a write transaction so two contexts creating a key at once keep the first one.
      const raced = await this.request<CryptoKey | undefined>(db, 'readwrite', (s) => s.get('kek'));
      if (raced) return raced;
      await this.request(db, 'readwrite', (s) => s.put(created, 'kek'));
      return created;
    } finally {
      db.close();
    }
  }
}

export const isEnvelope = (v: unknown): v is Envelope =>
  typeof v === 'object' && v !== null && (v as Envelope).v === 1 &&
  typeof (v as Envelope).iv === 'string' && typeof (v as Envelope).ct === 'string';

export async function encryptSecret(plain: string, ks: KeyStore): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await ks.getKey(),
    new TextEncoder().encode(plain),
  );
  return { v: 1, iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

export async function decryptSecret(env: unknown, ks: KeyStore): Promise<string> {
  if (!isEnvelope(env)) throw new Error('invalid secret envelope');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(env.iv) },
    await ks.getKey(),
    fromBase64(env.ct),
  );
  return new TextDecoder().decode(plain);
}
