# クラウド LLM プロバイダ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ブラウザ内蔵 AI が使えない環境のために、設定で選んだ OpenAI 互換 API または Gemini でフィールド分類を補助できるようにする。

**Architecture:** 新しい分類器 2 つが既存の `FieldClassifier` を実装し、`buildPrompt` / `buildSchema` / `parseLlmOutput` を再利用する。呼び出しは background の `fetch` のみで、API キーは AES-GCM のエンベロープとして保存し background だけが復号する。通信先の host 権限は設定ページの保存時にオプショナル権限として要求する。設計書: `docs/superpowers/specs/2026-10-04-cloud-llm-providers-design.md`

**Tech Stack:** WXT (Manifest V3) / TypeScript / Vitest / WebCrypto / IndexedDB / `chrome.storage.local` / `chrome.permissions`

**Global Constraints（全タスクに適用）:**
- 送信するのは欄のメタデータの許可リスト（id, name, htmlId, label, placeholder, nearby, type, maxLength。各文字列は 80 文字に切り詰め）だけ。プロファイルの値、欄の現在値、select の選択肢は送らない。
- 通信は background の `fetch` のみ。Content Script と設定ページからは通信しない。
- API キーは、ログ・エラーメッセージ・メッセージ応答・設定ページへの表示に出さない。設定ページが受け取るのは「保存済みか」だけ。
- ベース URL は `https` のみ。`http` は `localhost` と `127.0.0.1`（`127.x.x.x`）だけ。内部ネットワークのアドレスと、認証情報・クエリ・フラグメントを含む URL は拒否する。リクエストは `redirect: 'error'`、`credentials: 'omit'`。
- ページ由来の文字列は `textContent` のみで挿入し、`innerHTML` は使わない。UI は closed Shadow DOM。
- 初期値は `provider: 'none'`。明示的に選んで保存したときだけ外部通信する。
- コード・識別子は英語、コメントは非自明な WHY のみ、変更履歴コメント禁止、絵文字禁止。コミットは Conventional Commits（日本語）で、`git add` は個別パス。
- tsconfig は `noUncheckedIndexedAccess` と `types: ["chrome"]`。`npx tsc --noEmit` を常にクリーンに保つ。
- 既存テストのシグネチャ変更に伴う修正は、テストの意図を保ったまま最小限にする。弱めない。

---

## File Structure

```
src/ai/
  types.ts            ProviderKind, AiSettings, PublicAiSettings, AiStatusInfo, プリセット
  settings.ts         正規化・検証・ベース URL 検証・オリジンパターン (純粋)
  secret-store.ts     KeyStore, MemoryKeyStore, IdbKeyStore, encryptSecret/decryptSecret
  settings-store.ts   chrome.storage.local の読み書き (API キーは暗号化)
  http-classifiers.ts OpenAI 互換 / Gemini のリクエスト組み立て・解析・HttpClassifier
  permissions.ts      host 権限の対象オリジンと contains/request
  status.ts           クラウドの状態 (not-configured / permission-missing / auth-error / available) の算出
src/llm/
  availability.ts     AiStatus に 4 値を追加
  classifier.ts       SYSTEM_PROMPT を export
  handle-message.ts   プロバイダ選択・ai-test・状態返却
  background-gateway.ts  状態に provider を含める
src/messages.ts       ai-test と状態応答のパース
src/ui/status-label.ts  バッジ文言 (純粋)
src/ui/button.ts, ai-guide.ts  新しい状態の表示と「設定を開く」
src/entrypoints/background.ts  依存の組み立て、設定変更で認証エラーを解除
src/entrypoints/options/ai-section.ts, index.html, main.ts  AI 設定 UI
wxt.config.ts         optional_host_permissions
tests/ai/*.test.ts, tests/ui/status-label.test.ts ほか
```

---

### Task 1: 型・設定の正規化と検証

**Files:**
- Create: `src/ai/types.ts`, `src/ai/settings.ts`
- Test: `tests/ai/settings.test.ts`

- [ ] **Step 1: 型を定義する**

`src/ai/types.ts`:

```ts
import type { AiStatus } from '../llm/availability';

export type ProviderKind = 'none' | 'built-in' | 'openai' | 'gemini';

export interface OpenAiSettings {
  baseUrl: string;
  model: string;
}

export interface GeminiSettings {
  model: string;
  apiVersion: string;
}

export interface AiSettings {
  provider: ProviderKind;
  openai: OpenAiSettings;
  gemini: GeminiSettings;
}

export interface KeyPresence {
  openai: boolean;
  gemini: boolean;
}

export interface PublicAiSettings extends AiSettings {
  hasKey: KeyPresence;
}

export interface AiStatusInfo {
  status: AiStatus;
  provider: ProviderKind;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'none',
  openai: { baseUrl: '', model: '' },
  gemini: { model: '', apiVersion: 'v1beta' },
};

export const OPENAI_PRESETS = [
  { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'mistral', label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1' },
  { id: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434/v1' },
  { id: 'lm-studio', label: 'LM Studio', baseUrl: 'http://127.0.0.1:1234/v1' },
] as const;

export const GEMINI_ORIGIN = 'https://generativelanguage.googleapis.com/*';
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/ai/settings.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  isLoopbackHost, normalizeAiSettings, originPattern, validateAiSettings, validateBaseUrl,
} from '../../src/ai/settings';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

describe('normalizeAiSettings', () => {
  it('returns defaults for non-objects', () => {
    expect(normalizeAiSettings(undefined)).toEqual(DEFAULT_AI_SETTINGS);
    expect(normalizeAiSettings('x')).toEqual(DEFAULT_AI_SETTINGS);
    expect(normalizeAiSettings([])).toEqual(DEFAULT_AI_SETTINGS);
  });

  it('rejects unknown providers and trims strings', () => {
    const s = normalizeAiSettings({
      provider: 'evil',
      openai: { baseUrl: ' https://api.openai.com/v1/// ', model: ' m ' },
      gemini: { model: ' g ', apiVersion: ' ' },
    });
    expect(s.provider).toBe('none');
    expect(s.openai).toEqual({ baseUrl: 'https://api.openai.com/v1', model: 'm' });
    expect(s.gemini).toEqual({ model: 'g', apiVersion: 'v1beta' });
  });

  it('keeps a valid provider', () => {
    expect(normalizeAiSettings({ provider: 'gemini' }).provider).toBe('gemini');
  });
});

describe('isLoopbackHost', () => {
  it.each([
    ['localhost', true],
    ['127.0.0.1', true],
    ['127.1.2.3', true],
    ['example.com', false],
    ['192.168.0.1', false],
    ['127.0.0.1.evil.com', false],
  ])('%s -> %s', (host, expected) => {
    expect(isLoopbackHost(host)).toBe(expected);
  });
});

describe('validateBaseUrl', () => {
  it.each([
    'https://api.openai.com/v1',
    'https://api.groq.com/openai/v1',
    'http://localhost:11434/v1',
    'http://127.0.0.1:1234/v1',
    'https://localhost:8443/v1',
  ])('accepts %s', (url) => {
    expect(validateBaseUrl(url).ok).toBe(true);
  });

  it.each([
    ['not a url', 'URL の形式'],
    ['ftp://example.com/v1', 'https'],
    ['http://example.com/v1', 'http は'],
    ['http://192.168.0.5:11434/v1', 'http は'],
    ['https://192.168.0.5/v1', '内部ネットワーク'],
    ['https://10.0.0.1/v1', '内部ネットワーク'],
    ['https://172.16.0.1/v1', '内部ネットワーク'],
    ['https://169.254.169.254/latest', '内部ネットワーク'],
    ['https://100.64.0.1/v1', '内部ネットワーク'],
    ['https://0.0.0.0/v1', '内部ネットワーク'],
    ['https://[fd00::1]/v1', '内部ネットワーク'],
    ['https://[fe80::1]/v1', '内部ネットワーク'],
    ['https://[::ffff:10.0.0.1]/v1', '内部ネットワーク'],
    ['https://printer.local/v1', '内部ネットワーク'],
    ['https://svc.internal/v1', '内部ネットワーク'],
    ['https://user:pass@api.openai.com/v1', '認証情報'],
    ['https://api.openai.com/v1?key=1', 'クエリ'],
    ['https://api.openai.com/v1#x', 'クエリ'],
  ])('rejects %s', (url, fragment) => {
    const r = validateBaseUrl(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(fragment);
  });
});

describe('originPattern', () => {
  it('uses protocol and hostname without the port', () => {
    expect(originPattern('https://api.groq.com/openai/v1')).toBe('https://api.groq.com/*');
    expect(originPattern('http://localhost:11434/v1')).toBe('http://localhost/*');
  });

  it('returns null for invalid URLs', () => {
    expect(originPattern('http://example.com/v1')).toBeNull();
  });
});

describe('validateAiSettings', () => {
  const base: AiSettings = {
    provider: 'openai',
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
    gemini: { model: 'g', apiVersion: 'v1beta' },
  };
  const noKeys = { openai: false, gemini: false };
  const keys = { openai: true, gemini: true };

  it('accepts none and built-in without anything', () => {
    expect(validateAiSettings({ ...base, provider: 'none' }, noKeys)).toEqual([]);
    expect(validateAiSettings({ ...base, provider: 'built-in' }, noKeys)).toEqual([]);
  });

  it('requires base URL, model and key for a remote OpenAI-compatible provider', () => {
    expect(validateAiSettings(base, keys)).toEqual([]);
    expect(validateAiSettings(base, noKeys)).toEqual(['API キーを入力してください']);
    expect(validateAiSettings({ ...base, openai: { baseUrl: '', model: '' } }, keys)).toEqual([
      'ベース URL を入力してください',
      'モデル名を入力してください',
    ]);
  });

  it('does not require a key for loopback endpoints', () => {
    const local: AiSettings = { ...base, openai: { baseUrl: 'http://localhost:11434/v1', model: 'm' } };
    expect(validateAiSettings(local, noKeys)).toEqual([]);
  });

  it('validates Gemini fields', () => {
    const g: AiSettings = { ...base, provider: 'gemini' };
    expect(validateAiSettings(g, keys)).toEqual([]);
    expect(validateAiSettings({ ...g, gemini: { model: '', apiVersion: 'x' } }, noKeys)).toEqual([
      'モデル名を入力してください',
      'API バージョンは v1beta のように指定してください',
      'API キーを入力してください',
    ]);
  });
});
```

- [ ] **Step 3: 失敗を確認する**

Run: `npx vitest run tests/ai/settings.test.ts`
Expected: FAIL（`settings` モジュールが無い）

- [ ] **Step 4: 実装する**

`src/ai/settings.ts`:

```ts
import { DEFAULT_AI_SETTINGS, type AiSettings, type KeyPresence, type ProviderKind } from './types';

const PROVIDERS: readonly ProviderKind[] = ['none', 'built-in', 'openai', 'gemini'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function normalizeAiSettings(raw: unknown): AiSettings {
  const r = isRecord(raw) ? raw : {};
  const openai = isRecord(r.openai) ? r.openai : {};
  const gemini = isRecord(r.gemini) ? r.gemini : {};
  const provider = PROVIDERS.includes(r.provider as ProviderKind) ? (r.provider as ProviderKind) : 'none';
  return {
    provider,
    openai: { baseUrl: str(openai.baseUrl).replace(/\/+$/, ''), model: str(openai.model) },
    gemini: {
      model: str(gemini.model),
      apiVersion: str(gemini.apiVersion) || DEFAULT_AI_SETTINGS.gemini.apiVersion,
    },
  };
}

export function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || /^127(\.\d{1,3}){3}$/.test(hostname);
}

// String checks only: a hostname that merely resolves to a private address cannot be caught here.
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (/\.(local|internal|lan|localdomain)$/.test(h) || h === 'home.arpa' || h.endsWith('.home.arpa')) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return (
      a === 0 || a === 10 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    );
  }
  if (h.startsWith('[')) {
    const inner = h.slice(1, -1);
    return inner === '::' || inner.startsWith('::ffff:') || /^f[cd]/.test(inner) || /^fe[89ab]/.test(inner);
  }
  return false;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

export function validateBaseUrl(input: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: 'URL の形式が正しくありません' };
  }
  if (url.username || url.password) return { ok: false, reason: 'URL に認証情報を含めないでください' };
  if (url.search || url.hash) return { ok: false, reason: 'クエリやフラグメントは指定できません' };
  if (url.protocol === 'http:') {
    return isLoopbackHost(url.hostname)
      ? { ok: true, url }
      : { ok: false, reason: 'http は localhost / 127.0.0.1 のみ使えます。https の URL を指定してください' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'https の URL を指定してください' };
  if (!isLoopbackHost(url.hostname) && isPrivateHost(url.hostname)) {
    return { ok: false, reason: '内部ネットワークのアドレスは指定できません' };
  }
  return { ok: true, url };
}

// Host permission patterns ignore ports, so the pattern is protocol + hostname only.
export function originPattern(baseUrl: string): string | null {
  const check = validateBaseUrl(baseUrl);
  return check.ok ? `${check.url.protocol}//${check.url.hostname}/*` : null;
}

export function validateAiSettings(s: AiSettings, hasKey: KeyPresence): string[] {
  const errors: string[] = [];
  if (s.provider === 'openai') {
    const check = validateBaseUrl(s.openai.baseUrl);
    if (!s.openai.baseUrl) errors.push('ベース URL を入力してください');
    else if (!check.ok) errors.push(check.reason);
    if (!s.openai.model) errors.push('モデル名を入力してください');
    const loopback = check.ok && isLoopbackHost(check.url.hostname);
    if (!hasKey.openai && !loopback) errors.push('API キーを入力してください');
  }
  if (s.provider === 'gemini') {
    if (!s.gemini.model) errors.push('モデル名を入力してください');
    if (!/^v\d+((alpha|beta)\d*)?$/.test(s.gemini.apiVersion)) {
      errors.push('API バージョンは v1beta のように指定してください');
    }
    if (!hasKey.gemini) errors.push('API キーを入力してください');
  }
  return errors;
}
```

- [ ] **Step 5: 通過を確認する**

Run: `npx vitest run tests/ai/settings.test.ts && npx tsc --noEmit`
Expected: 全テスト PASS、型エラーなし

- [ ] **Step 6: Commit**

```bash
git add src/ai/types.ts src/ai/settings.ts tests/ai/settings.test.ts
git commit -m "feat: AI 設定の型・正規化・ベース URL 検証を追加"
```

---

### Task 2: API キーの暗号化 (secret-store)

**Files:**
- Create: `src/ai/secret-store.ts`
- Test: `tests/ai/secret-store.test.ts`

jsdom 環境には `crypto.subtle` が無いため、このテストは `node` 環境で動かす。IndexedDB 実装はブラウザ依存が強いので、`KeyStore` インターフェースの背後に置き、暗号化ロジックはメモリ実装で検証する。

- [ ] **Step 1: 失敗するテストを書く**

`tests/ai/secret-store.test.ts`:

```ts
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
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run tests/ai/secret-store.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

`src/ai/secret-store.ts`:

```ts
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
```

- [ ] **Step 4: 通過を確認する**

Run: `npx vitest run tests/ai/secret-store.test.ts && npx tsc --noEmit`
Expected: 全テスト PASS、型エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/ai/secret-store.ts tests/ai/secret-store.test.ts
git commit -m "feat: API キーの AES-GCM 暗号化と KeyStore を追加"
```

---

### Task 3: 設定ストア (API キーは暗号化して保存)

**Files:**
- Create: `src/ai/settings-store.ts`
- Test: `tests/ai/settings-store.test.ts`

保存形式は `chrome.storage.local` のキー `jushoai:ai-settings`。API キーは `apiKey` にエンベロープ（`{v, iv, ct}`）としてだけ保存する。キーの更新指定は `undefined` = 変更なし、`''` = 削除、それ以外 = 置き換え。

- [ ] **Step 1: 失敗するテストを書く**

`tests/ai/settings-store.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryKeyStore } from '../../src/ai/secret-store';
import {
  AI_SETTINGS_KEY, loadAiSecrets, loadPublicAiSettings, saveAiSettings,
} from '../../src/ai/settings-store';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (k: string) => (k in store ? { [k]: store[k] } : {}),
        set: async (o: Record<string, unknown>) => { Object.assign(store, o); },
      },
    },
  });
});

const settings: AiSettings = {
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
  gemini: { model: 'g', apiVersion: 'v1beta' },
};

describe('ai settings store', () => {
  it('returns defaults without keys when nothing is stored', async () => {
    expect(await loadPublicAiSettings()).toEqual({ ...DEFAULT_AI_SETTINGS, hasKey: { openai: false, gemini: false } });
    expect(await loadAiSecrets(new MemoryKeyStore())).toEqual({});
  });

  it('stores keys only as envelopes and exposes presence, never the key', async () => {
    const ks = new MemoryKeyStore();
    await saveAiSettings(settings, { openai: 'sk-secret-1' }, ks);
    expect(JSON.stringify(store[AI_SETTINGS_KEY])).not.toContain('sk-secret-1');
    const pub = await loadPublicAiSettings();
    expect(pub.hasKey).toEqual({ openai: true, gemini: false });
    expect(JSON.stringify(pub)).not.toContain('sk-secret-1');
    expect(await loadAiSecrets(ks)).toEqual({ openai: 'sk-secret-1' });
  });

  it('keeps an existing key when the update is undefined, replaces and deletes on request', async () => {
    const ks = new MemoryKeyStore();
    await saveAiSettings(settings, { openai: 'sk-one', gemini: 'g-one' }, ks);
    await saveAiSettings({ ...settings, provider: 'gemini' }, {}, ks);
    expect(await loadAiSecrets(ks)).toEqual({ openai: 'sk-one', gemini: 'g-one' });
    await saveAiSettings(settings, { openai: 'sk-two', gemini: '' }, ks);
    expect(await loadAiSecrets(ks)).toEqual({ openai: 'sk-two' });
    expect((await loadPublicAiSettings()).hasKey).toEqual({ openai: true, gemini: false });
  });

  it('normalizes settings on save', async () => {
    await saveAiSettings(
      { ...settings, openai: { baseUrl: ' https://api.openai.com/v1/ ', model: ' m ' } },
      {},
      new MemoryKeyStore(),
    );
    expect((await loadPublicAiSettings()).openai).toEqual({ baseUrl: 'https://api.openai.com/v1', model: 'm' });
  });

  it('treats an unreadable key as unset instead of throwing', async () => {
    await saveAiSettings(settings, { openai: 'sk-secret-1' }, new MemoryKeyStore());
    expect(await loadAiSecrets(new MemoryKeyStore())).toEqual({});
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run tests/ai/settings-store.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

`src/ai/settings-store.ts`:

```ts
import {
  decryptSecret, encryptSecret, isEnvelope, type Envelope, type KeyStore,
} from './secret-store';
import { normalizeAiSettings } from './settings';
import type { AiSettings, PublicAiSettings } from './types';

export const AI_SETTINGS_KEY = 'jushoai:ai-settings';

const KEYED = ['openai', 'gemini'] as const;
type Keyed = (typeof KEYED)[number];

// undefined keeps the stored key, an empty string deletes it, anything else replaces it.
export type KeyUpdate = Partial<Record<Keyed, string>>;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

async function readStored(): Promise<{ settings: AiSettings; keys: Partial<Record<Keyed, Envelope>> }> {
  const result = await chrome.storage.local.get(AI_SETTINGS_KEY);
  const raw = result[AI_SETTINGS_KEY] as unknown;
  const rec = isRecord(raw) ? raw : {};
  const keys: Partial<Record<Keyed, Envelope>> = {};
  for (const p of KEYED) {
    const section = rec[p];
    if (isRecord(section) && isEnvelope(section.apiKey)) keys[p] = section.apiKey;
  }
  return { settings: normalizeAiSettings(raw), keys };
}

export async function loadPublicAiSettings(): Promise<PublicAiSettings> {
  const { settings, keys } = await readStored();
  return { ...settings, hasKey: { openai: keys.openai !== undefined, gemini: keys.gemini !== undefined } };
}

export async function loadAiSecrets(ks: KeyStore): Promise<Partial<Record<Keyed, string>>> {
  const { keys } = await readStored();
  const out: Partial<Record<Keyed, string>> = {};
  for (const p of KEYED) {
    const env = keys[p];
    if (!env) continue;
    try {
      out[p] = await decryptSecret(env, ks);
    } catch {
      // A key that can no longer be decrypted counts as unset so the user is asked to re-enter it.
    }
  }
  return out;
}

export async function saveAiSettings(settings: AiSettings, update: KeyUpdate, ks: KeyStore): Promise<void> {
  const normalized = normalizeAiSettings(settings);
  const { keys } = await readStored();
  const next = { ...keys };
  for (const p of KEYED) {
    const u = update[p];
    if (u === undefined) continue;
    if (u === '') delete next[p];
    else next[p] = await encryptSecret(u, ks);
  }
  await chrome.storage.local.set({
    [AI_SETTINGS_KEY]: {
      provider: normalized.provider,
      openai: { ...normalized.openai, ...(next.openai ? { apiKey: next.openai } : {}) },
      gemini: { ...normalized.gemini, ...(next.gemini ? { apiKey: next.gemini } : {}) },
    },
  });
}
```

- [ ] **Step 4: 通過を確認する**

Run: `npx vitest run tests/ai/settings-store.test.ts && npx tsc --noEmit`
Expected: 全テスト PASS、型エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/ai/settings-store.ts tests/ai/settings-store.test.ts
git commit -m "feat: AI 設定のストアを追加（API キーは暗号化して保存）"
```

---

### Task 4: OpenAI 互換 / Gemini の分類器

**Files:**
- Create: `src/ai/http-classifiers.ts`
- Modify: `src/llm/classifier.ts`（`SYSTEM_PROMPT` を export する）
- Test: `tests/ai/http-classifiers.test.ts`

- [ ] **Step 1: 各 API の現行仕様を確認する**

`defuddle` スキルまたは context7 で次を読み、差異があれば Step 4 のコードのリクエスト形式だけを直す（テストの意図は変えない）。確認結果と根拠（短い引用）をレポートに書く。

- OpenAI Chat Completions: `response_format: { type: 'json_schema', json_schema: { name, strict, schema } }` の形式と、`choices[0].message.content` の応答形式（https://platform.openai.com/docs/api-reference/chat/create）
- Gemini `generateContent`: `systemInstruction`、`generationConfig.responseMimeType` / `responseSchema`（型名が大文字 `OBJECT` / `STRING` か小文字か、`enum` の指定、`additionalProperties` の可否）、認証ヘッダ `x-goog-api-key`、応答 `candidates[0].content.parts[0].text`（https://ai.google.dev/api/generate-content）

- [ ] **Step 2: 失敗するテストを書く**

`tests/ai/http-classifiers.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  buildGeminiRequest, buildOpenAiRequest, createGeminiClassifier, createOpenAiClassifier,
  extractGeminiText, extractOpenAiText, HttpAuthError, HttpRequestError,
} from '../../src/ai/http-classifiers';
import { CATEGORIES } from '../../src/core/types';
import { makeMeta } from '../helpers';

const fields = [makeMeta({ id: 'a', label: '姓', value: 'SECRET-VALUE' }), makeMeta({ id: 'b', name: 'x' })];
const openai = { baseUrl: 'https://api.openai.com/v1', model: 'm1' };
const gemini = { model: 'g1', apiVersion: 'v1beta' };

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('buildOpenAiRequest', () => {
  it('posts a constrained chat completion to {baseUrl}/chat/completions', () => {
    const { url, init } = buildOpenAiRequest(openai, 'sk-test', fields);
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    expect(init.redirect).toBe('error');
    expect(init.credentials).toBe('omit');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('m1');
    expect(body.temperature).toBe(0);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.required).toEqual(['a', 'b']);
    expect(body.response_format.json_schema.schema.properties.a.enum).toEqual([...CATEGORIES]);
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user']);
  });

  it('omits Authorization without a key and never sends field values', () => {
    const { init } = buildOpenAiRequest(openai, undefined, fields);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(init.body as string).not.toContain('SECRET-VALUE');
  });
});

describe('extractOpenAiText', () => {
  it('reads the first choice content', () => {
    expect(extractOpenAiText({ choices: [{ message: { content: '{"a":"lastName"}' } }] })).toBe('{"a":"lastName"}');
  });

  it.each([null, {}, { choices: [] }, { choices: [{ message: { content: 1 } }] }])('returns null for %j', (v) => {
    expect(extractOpenAiText(v)).toBeNull();
  });
});

describe('buildGeminiRequest', () => {
  it('sends the key in a header, not in the URL, and uses a Gemini schema', () => {
    const { url, init } = buildGeminiRequest(gemini, 'g-key', fields);
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/g1:generateContent');
    expect(url).not.toContain('g-key');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('g-key');
    expect(init.redirect).toBe('error');
    const body = JSON.parse(init.body as string);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    const schema = body.generationConfig.responseSchema;
    expect(schema.required).toEqual(['a', 'b']);
    expect(JSON.stringify(schema)).not.toContain('additionalProperties');
    expect(body.systemInstruction.parts[0].text).toContain('分類');
    expect(init.body as string).not.toContain('SECRET-VALUE');
  });

  it('encodes the model name in the path', () => {
    expect(buildGeminiRequest({ ...gemini, model: 'a/b' }, 'k', fields).url).toContain('/models/a%2Fb:generateContent');
  });
});

describe('extractGeminiText', () => {
  it('reads the first candidate part', () => {
    expect(extractGeminiText({ candidates: [{ content: { parts: [{ text: '{"a":"email"}' }] } }] })).toBe('{"a":"email"}');
  });

  it.each([null, {}, { candidates: [] }, { candidates: [{ content: { parts: [] } }] }])('returns null for %j', (v) => {
    expect(extractGeminiText(v)).toBeNull();
  });
});

describe('HttpClassifier', () => {
  it('returns validated categories from the response', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '{"a":"lastName","b":"nonsense"}' } }] }),
    );
    const c = createOpenAiClassifier(openai, 'sk-test', { fetch });
    expect([...(await c.classify(fields))]).toEqual([['a', 'lastName']]);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('works for Gemini responses too', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ content: { parts: [{ text: '{"b":"email"}' }] } }] }),
    );
    const c = createGeminiClassifier(gemini, 'g-key', { fetch });
    expect([...(await c.classify(fields))]).toEqual([['b', 'email']]);
  });

  it('does not call the network for an empty field list', async () => {
    const fetch = vi.fn();
    expect((await createOpenAiClassifier(openai, 'k', { fetch }).classify([])).size).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([401, 403])('throws HttpAuthError for %i', async (status) => {
    const c = createOpenAiClassifier(openai, 'sk-test', { fetch: vi.fn().mockResolvedValue(jsonResponse(status, {})) });
    await expect(c.classify(fields)).rejects.toBeInstanceOf(HttpAuthError);
  });

  it('throws HttpRequestError for other failures without leaking the key', async () => {
    const bodies: Array<() => Promise<Response>> = [
      async () => jsonResponse(500, {}),
      async () => jsonResponse(200, { unexpected: true }),
      async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json sk-test'); } }) as Response,
      async () => { throw new TypeError('network sk-test'); },
    ];
    for (const body of bodies) {
      const c = createOpenAiClassifier(openai, 'sk-test', { fetch: vi.fn(body) });
      const err = await c.classify(fields).catch((e) => e);
      expect(err).toBeInstanceOf(HttpRequestError);
      expect(String(err.message)).not.toContain('sk-test');
    }
  });

  it('aborts after the timeout', async () => {
    const fetch = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_res, rej) => {
        init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
      }));
    const c = createOpenAiClassifier(openai, 'k', { fetch, timeoutMs: 20 });
    await expect(c.classify(fields)).rejects.toBeInstanceOf(HttpRequestError);
  });
});
```

- [ ] **Step 3: 失敗を確認する**

Run: `npx vitest run tests/ai/http-classifiers.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 4: `SYSTEM_PROMPT` を export し、実装する**

`src/llm/classifier.ts` の `const SYSTEM_PROMPT = ` を `export const SYSTEM_PROMPT = ` に変更する（他は変えない）。

`src/ai/http-classifiers.ts`:

```ts
import { CATEGORIES, type Category, type FieldMeta } from '../core/types';
import {
  buildPrompt, buildSchema, parseLlmOutput, SYSTEM_PROMPT, type FieldClassifier,
} from '../llm/classifier';
import type { GeminiSettings, OpenAiSettings } from './types';

export const HTTP_TIMEOUT_MS = 15_000;

export class HttpAuthError extends Error {
  constructor() {
    super('authentication failed');
    this.name = 'HttpAuthError';
  }
}

// Messages never include request or response bodies, so keys cannot leak through errors.
export class HttpRequestError extends Error {
  constructor(
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'HttpRequestError';
  }
}

export interface HttpRequest {
  url: string;
  init: RequestInit;
}

export interface HttpDeps {
  fetch: typeof fetch;
  timeoutMs?: number;
}

const baseInit = (headers: Record<string, string>, body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
  redirect: 'error',
  credentials: 'omit',
  referrerPolicy: 'no-referrer',
});

export function buildOpenAiRequest(
  cfg: OpenAiSettings,
  apiKey: string | undefined,
  fields: FieldMeta[],
): HttpRequest {
  const body = {
    model: cfg.model,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(fields) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'field_categories', strict: true, schema: buildSchema(fields) },
    },
  };
  return {
    url: `${cfg.baseUrl}/chat/completions`,
    init: baseInit(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, body),
  };
}

export function extractOpenAiText(json: unknown): string | null {
  const content = (json as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content : null;
}

// Gemini's responseSchema is an OpenAPI subset: no additionalProperties, upper-case type names.
function toGeminiSchema(fields: FieldMeta[]) {
  return {
    type: 'OBJECT',
    properties: Object.fromEntries(fields.map((f) => [f.id, { type: 'STRING', enum: [...CATEGORIES] }])),
    required: fields.map((f) => f.id),
  };
}

export function buildGeminiRequest(cfg: GeminiSettings, apiKey: string, fields: FieldMeta[]): HttpRequest {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: buildPrompt(fields) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(fields),
    },
  };
  return {
    url: `https://generativelanguage.googleapis.com/${cfg.apiVersion}/models/${encodeURIComponent(cfg.model)}:generateContent`,
    init: baseInit({ 'x-goog-api-key': apiKey }, body),
  };
}

export function extractGeminiText(json: unknown): string | null {
  const text = (json as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] } | null)
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text : null;
}

export class HttpClassifier implements FieldClassifier {
  constructor(
    private readonly build: (fields: FieldMeta[]) => HttpRequest,
    private readonly extract: (json: unknown) => string | null,
    private readonly deps: HttpDeps,
  ) {}

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    if (fields.length === 0) return new Map();
    const { url, init } = this.build(fields);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.deps.timeoutMs ?? HTTP_TIMEOUT_MS);
    try {
      let res: Response;
      try {
        res = await this.deps.fetch(url, { ...init, signal: controller.signal });
      } catch {
        throw new HttpRequestError(null, 'request failed');
      }
      if (res.status === 401 || res.status === 403) throw new HttpAuthError();
      if (!res.ok) throw new HttpRequestError(res.status, `http ${res.status}`);
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new HttpRequestError(res.status, 'invalid response body');
      }
      const text = this.extract(json);
      if (text === null) throw new HttpRequestError(res.status, 'unexpected response shape');
      return parseLlmOutput(text, fields);
    } finally {
      clearTimeout(timer);
    }
  }
}

export const createOpenAiClassifier = (cfg: OpenAiSettings, apiKey: string | undefined, deps: HttpDeps) =>
  new HttpClassifier((f) => buildOpenAiRequest(cfg, apiKey, f), extractOpenAiText, deps);

export const createGeminiClassifier = (cfg: GeminiSettings, apiKey: string, deps: HttpDeps) =>
  new HttpClassifier((f) => buildGeminiRequest(cfg, apiKey, f), extractGeminiText, deps);
```

- [ ] **Step 5: 通過を確認する**

Run: `npx vitest run tests/ai tests/llm && npx tsc --noEmit`
Expected: 全テスト PASS、型エラーなし（既存の `tests/llm/classifier.test.ts` も通る）

- [ ] **Step 6: Commit**

```bash
git add src/ai/http-classifiers.ts src/llm/classifier.ts tests/ai/http-classifiers.test.ts
git commit -m "feat: OpenAI 互換と Gemini の分類器を追加"
```

---

### Task 5: 権限と状態の算出

**Files:**
- Create: `src/ai/permissions.ts`, `src/ai/status.ts`
- Modify: `src/ai/types.ts`（状態の型を追加）
- Test: `tests/ai/permissions.test.ts`, `tests/ai/status.test.ts`

- [ ] **Step 1: 状態の型を追加する**

`src/ai/types.ts` の `AiStatusInfo` を次の定義に置き換える（`AiStatus` のインポートは残す）。

```ts
export type CloudStatus = 'disabled' | 'not-configured' | 'permission-missing' | 'auth-error';
export type AiState = AiStatus | CloudStatus;

export interface AiStatusInfo {
  status: AiState;
  provider: ProviderKind;
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/ai/permissions.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { hasHostPermission, originPatternsFor, requestHostPermission } from '../../src/ai/permissions';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

const openai: AiSettings = {
  ...DEFAULT_AI_SETTINGS,
  provider: 'openai',
  openai: { baseUrl: 'https://api.groq.com/openai/v1', model: 'm' },
};

describe('originPatternsFor', () => {
  it('returns the provider origin only for cloud providers', () => {
    expect(originPatternsFor(openai)).toEqual(['https://api.groq.com/*']);
    expect(originPatternsFor({ ...openai, provider: 'gemini' })).toEqual(['https://generativelanguage.googleapis.com/*']);
    expect(originPatternsFor({ ...openai, provider: 'none' })).toEqual([]);
    expect(originPatternsFor({ ...openai, provider: 'built-in' })).toEqual([]);
  });

  it('returns nothing when the base URL is invalid', () => {
    expect(originPatternsFor({ ...openai, openai: { baseUrl: 'http://example.com', model: 'm' } })).toEqual([]);
  });
});

describe('host permission helpers', () => {
  it('delegates to the permissions API and treats failures as not granted', async () => {
    const api = { contains: vi.fn().mockResolvedValue(true), request: vi.fn().mockResolvedValue(true) };
    expect(await hasHostPermission(['https://a/*'], api)).toBe(true);
    expect(await requestHostPermission(['https://a/*'], api)).toBe(true);
    expect(api.contains).toHaveBeenCalledWith({ origins: ['https://a/*'] });
    const failing = { contains: vi.fn().mockRejectedValue(new Error('x')), request: vi.fn().mockRejectedValue(new Error('x')) };
    expect(await hasHostPermission(['https://a/*'], failing)).toBe(false);
    expect(await requestHostPermission(['https://a/*'], failing)).toBe(false);
  });

  it('never asks the API when there is nothing to request', async () => {
    const api = { contains: vi.fn(), request: vi.fn() };
    expect(await hasHostPermission([], api)).toBe(false);
    expect(await requestHostPermission([], api)).toBe(false);
    expect(api.contains).not.toHaveBeenCalled();
    expect(api.request).not.toHaveBeenCalled();
  });
});
```

`tests/ai/status.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeCloudStatus } from '../../src/ai/status';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

const openai: AiSettings = {
  ...DEFAULT_AI_SETTINGS,
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
};
const input = (over: Partial<Parameters<typeof computeCloudStatus>[0]> = {}) => ({
  settings: openai,
  hasKey: { openai: true, gemini: false },
  permitted: true,
  authFailed: false,
  ...over,
});

describe('computeCloudStatus', () => {
  it('is disabled for none and built-in handled elsewhere', () => {
    expect(computeCloudStatus(input({ settings: { ...openai, provider: 'none' } }))).toBe('disabled');
  });

  it('walks through not-configured, permission-missing, auth-error, available', () => {
    expect(computeCloudStatus(input({ hasKey: { openai: false, gemini: false } }))).toBe('not-configured');
    expect(computeCloudStatus(input({ permitted: false }))).toBe('permission-missing');
    expect(computeCloudStatus(input({ authFailed: true }))).toBe('auth-error');
    expect(computeCloudStatus(input())).toBe('available');
  });

  it('prefers not-configured over permission-missing and permission-missing over auth-error', () => {
    expect(computeCloudStatus(input({ hasKey: { openai: false, gemini: false }, permitted: false }))).toBe('not-configured');
    expect(computeCloudStatus(input({ permitted: false, authFailed: true }))).toBe('permission-missing');
  });

  it('works for Gemini and for keyless loopback endpoints', () => {
    const gemini: AiSettings = { ...openai, provider: 'gemini', gemini: { model: 'g', apiVersion: 'v1beta' } };
    expect(computeCloudStatus(input({ settings: gemini, hasKey: { openai: false, gemini: true } }))).toBe('available');
    const local: AiSettings = { ...openai, openai: { baseUrl: 'http://localhost:11434/v1', model: 'm' } };
    expect(computeCloudStatus(input({ settings: local, hasKey: { openai: false, gemini: false } }))).toBe('available');
  });
});
```

- [ ] **Step 3: 失敗を確認する**

Run: `npx vitest run tests/ai/permissions.test.ts tests/ai/status.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 4: 実装する**

`src/ai/permissions.ts`:

```ts
import { originPattern } from './settings';
import { GEMINI_ORIGIN, type AiSettings } from './types';

export interface PermissionsApi {
  contains(query: { origins: string[] }): Promise<boolean>;
  request(query: { origins: string[] }): Promise<boolean>;
}

export function originPatternsFor(s: AiSettings): string[] {
  if (s.provider === 'gemini') return [GEMINI_ORIGIN];
  if (s.provider === 'openai') {
    const pattern = originPattern(s.openai.baseUrl);
    return pattern ? [pattern] : [];
  }
  return [];
}

export async function hasHostPermission(
  origins: string[],
  api: PermissionsApi = chrome.permissions,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return await api.contains({ origins });
  } catch {
    return false;
  }
}

// Must be called from a user gesture (the options page save button).
export async function requestHostPermission(
  origins: string[],
  api: PermissionsApi = chrome.permissions,
): Promise<boolean> {
  if (origins.length === 0) return false;
  try {
    return await api.request({ origins });
  } catch {
    return false;
  }
}
```

`src/ai/status.ts`:

```ts
import { validateAiSettings } from './settings';
import type { AiSettings, AiState, KeyPresence } from './types';

export interface StatusInput {
  settings: AiSettings;
  hasKey: KeyPresence;
  permitted: boolean;
  authFailed: boolean;
}

// Built-in AI availability comes from the Prompt API and is resolved by the caller.
export function computeCloudStatus(i: StatusInput): AiState {
  if (i.settings.provider !== 'openai' && i.settings.provider !== 'gemini') return 'disabled';
  if (validateAiSettings(i.settings, i.hasKey).length > 0) return 'not-configured';
  if (!i.permitted) return 'permission-missing';
  if (i.authFailed) return 'auth-error';
  return 'available';
}
```

- [ ] **Step 5: 通過を確認する**

Run: `npx vitest run tests/ai && npx tsc --noEmit`
Expected: 全テスト PASS、型エラーなし

- [ ] **Step 6: Commit**

```bash
git add src/ai/types.ts src/ai/permissions.ts src/ai/status.ts tests/ai/permissions.test.ts tests/ai/status.test.ts
git commit -m "feat: host 権限の対象と AI 状態の算出を追加"
```

---

### Task 6: メッセージ処理にプロバイダ選択を組み込む

**Files:**
- Modify: `src/messages.ts`, `src/llm/handle-message.ts`, `src/entrypoints/background.ts`
- Test: `tests/messages.test.ts`（追記）, `tests/entrypoints/handle-message.test.ts`（全面更新）

background の `handleMessage` が、設定に応じて分類器を選ぶ。`ai-status` は `{ status, provider }` を返し、新しい `ai-test` は合成した 1 欄を分類させて結果を返す。401/403 を受けたプロバイダは `authFailed` に記録し、設定が変わるまで「認証エラー」状態にして再送しない（`ai-test` だけはこの制限を無視して再試行できる）。

- [ ] **Step 1: messages の失敗するテストを追記する**

`tests/messages.test.ts` の末尾に追記する（既存のテストは変更しない）。import に `parseStatusResponse, parseTestResponse` を足す。

```ts
describe('ai-test request', () => {
  it('accepts exactly { type: "ai-test" }', () => {
    expect(parseRequest({ type: 'ai-test' })).toEqual({ type: 'ai-test' });
    expect(parseRequest({ type: 'ai-test', extra: 1 })).toBeNull();
  });
});

describe('parseStatusResponse', () => {
  it('accepts a known status and provider', () => {
    expect(parseStatusResponse({ status: 'available', provider: 'openai' })).toEqual({ status: 'available', provider: 'openai' });
    expect(parseStatusResponse({ status: 'auth-error', provider: 'gemini' })).toEqual({ status: 'auth-error', provider: 'gemini' });
  });

  it.each([null, {}, { status: 'available' }, { status: 'x', provider: 'openai' }, { status: 'available', provider: 'evil' }])(
    'rejects %j',
    (v) => {
      expect(parseStatusResponse(v)).toBeNull();
    },
  );
});

describe('parseTestResponse', () => {
  it('accepts a category result and known failure reasons', () => {
    expect(parseTestResponse({ ok: true, category: 'lastName' })).toEqual({ ok: true, category: 'lastName' });
    expect(parseTestResponse({ ok: false, reason: 'auth' })).toEqual({ ok: false, reason: 'auth' });
  });

  it.each([null, { ok: true, category: 'nonsense' }, { ok: false, reason: 'boom' }, { ok: false }])('rejects %j', (v) => {
    expect(parseTestResponse(v)).toBeNull();
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run tests/messages.test.ts`
Expected: FAIL（`parseStatusResponse` などが未定義）

- [ ] **Step 3: messages を実装する**

`src/messages.ts` を次のとおり変更する。

1. import を `import type { AiState, AiStatusInfo } from './ai/types';` で追加する。
2. `AI_STATUSES` の下に次を追加する。

```ts
const AI_STATES: readonly string[] = [...AI_STATUSES, 'disabled', 'not-configured', 'permission-missing', 'auth-error'];
const PROVIDER_KINDS: readonly string[] = ['none', 'built-in', 'openai', 'gemini'];
const TEST_FAILURES = ['not-configured', 'permission', 'auth', 'network', 'bad-response'] as const;

export type TestFailure = (typeof TEST_FAILURES)[number];
export type TestResponse = { ok: true; category: Category } | { ok: false; reason: TestFailure };
```

3. `AiRequest` に `| { type: 'ai-test' }` を追加する。
4. `isAiStatus` の下に次を追加する。

```ts
export const isAiState = (v: unknown): v is AiState => typeof v === 'string' && AI_STATES.includes(v);
```

5. `parseRequest` の `ai-download` の行の下に次を追加する。

```ts
  if (msg.type === 'ai-test' && keys.length === 1) return { type: 'ai-test' };
```

6. ファイル末尾に次を追加する。

```ts
export function parseStatusResponse(res: unknown): AiStatusInfo | null {
  if (!isRecord(res) || !isAiState(res.status)) return null;
  const provider = res.provider;
  if (typeof provider !== 'string' || !PROVIDER_KINDS.includes(provider)) return null;
  return { status: res.status, provider: provider as AiStatusInfo['provider'] };
}

export function parseTestResponse(res: unknown): TestResponse | null {
  if (!isRecord(res)) return null;
  if (res.ok === true && typeof res.category === 'string' && (CATEGORIES as readonly string[]).includes(res.category)) {
    return { ok: true, category: res.category as Category };
  }
  if (res.ok === false && typeof res.reason === 'string' && (TEST_FAILURES as readonly string[]).includes(res.reason)) {
    return { ok: false, reason: res.reason as TestFailure };
  }
  return null;
}
```

Run: `npx vitest run tests/messages.test.ts`
Expected: PASS

- [ ] **Step 4: handleMessage の失敗するテストを書く**

`tests/entrypoints/handle-message.test.ts` を次の内容で置き換える（旧テストの意図 — 組み込み AI の分類、利用不可で `ok:false`、ダウンロード、未知メッセージで `undefined`、偽造された値が通らないこと — は維持している）。

```ts
import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_AI_SETTINGS, type AiSettings, type KeyPresence, type ProviderKind } from '../../src/ai/types';
import type { LanguageModelStatic } from '../../src/llm/availability';
import { handleMessage, type HandlerDeps } from '../../src/llm/handle-message';

const field = (id: string, extra: Record<string, unknown> = {}) => ({
  id, type: 'text', name: '', htmlId: '', label: '', placeholder: '', nearby: '', maxLength: null, ...extra,
});
const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
const statusJson = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;
const openaiBody = (content: string) => okJson({ choices: [{ message: { content } }] });

interface Opts {
  settings?: Partial<AiSettings>;
  hasKey?: KeyPresence;
  secrets?: { openai?: string; gemini?: string };
  permitted?: boolean;
  fetch?: ReturnType<typeof vi.fn>;
  lm?: LanguageModelStatic | null;
  authFailed?: Set<ProviderKind>;
}

function makeDeps(o: Opts = {}) {
  const fetchMock = o.fetch ?? vi.fn();
  const authFailed = o.authFailed ?? new Set<ProviderKind>();
  const settings = { ...DEFAULT_AI_SETTINGS, ...o.settings, hasKey: o.hasKey ?? { openai: false, gemini: false } };
  const deps: HandlerDeps = {
    lm: o.lm ?? null,
    loadSettings: async () => settings,
    loadSecrets: async () => o.secrets ?? {},
    hasPermission: async () => o.permitted ?? true,
    fetch: fetchMock as unknown as typeof fetch,
    authFailed,
  };
  return { deps, fetchMock, authFailed };
}

const openai: Partial<AiSettings> = {
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
};
const configured = { hasKey: { openai: true, gemini: false }, secrets: { openai: 'sk-test' } };

const builtInLm = (availability: string, answer = '{"a":"lastName"}'): LanguageModelStatic => ({
  availability: async () => availability as never,
  create: async () => ({ prompt: async () => answer, destroy: () => {} }),
});

describe('handleMessage: shape handling', () => {
  it('ignores anything that is not exactly one of the request shapes', async () => {
    const { deps } = makeDeps();
    expect(await handleMessage({ type: 'nope' }, deps)).toBeUndefined();
    expect(await handleMessage('x', deps)).toBeUndefined();
  });

  it('drops forged field values before they reach a provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue(openaiBody('{"a":"lastName"}'));
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: fetchMock });
    await handleMessage({ type: 'ai-classify', fields: [field('a', { value: 'FORGED', label: '姓', options: ['x'] })] }, deps);
    const sent = (fetchMock.mock.calls[0]![1] as RequestInit).body as string;
    expect(sent).not.toContain('FORGED');
  });
});

describe('handleMessage: ai-status', () => {
  it('reports disabled for provider none and does not touch the network', async () => {
    const { deps, fetchMock } = makeDeps();
    expect(await handleMessage({ type: 'ai-status' }, deps)).toEqual({ status: 'disabled', provider: 'none' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports the Prompt API availability for built-in', async () => {
    const a = makeDeps({ settings: { provider: 'built-in' }, lm: builtInLm('available') });
    expect(await handleMessage({ type: 'ai-status' }, a.deps)).toEqual({ status: 'available', provider: 'built-in' });
    const b = makeDeps({ settings: { provider: 'built-in' }, lm: null });
    expect(await handleMessage({ type: 'ai-status' }, b.deps)).toEqual({ status: 'unsupported', provider: 'built-in' });
  });

  it('walks through not-configured, permission-missing, auth-error and available for a cloud provider', async () => {
    const run = (o: Opts) => handleMessage({ type: 'ai-status' }, makeDeps({ settings: openai, ...o }).deps);
    expect(await run({})).toEqual({ status: 'not-configured', provider: 'openai' });
    expect(await run({ ...configured, permitted: false })).toEqual({ status: 'permission-missing', provider: 'openai' });
    expect(await run({ ...configured, authFailed: new Set<ProviderKind>(['openai']) })).toEqual({ status: 'auth-error', provider: 'openai' });
    expect(await run(configured)).toEqual({ status: 'available', provider: 'openai' });
  });
});

describe('handleMessage: ai-download', () => {
  it('only starts a download for built-in', async () => {
    const create = vi.fn().mockResolvedValue({ destroy: () => {} });
    const lm = { availability: async () => 'downloadable', create } as unknown as LanguageModelStatic;
    const built = makeDeps({ settings: { provider: 'built-in' }, lm });
    expect(await handleMessage({ type: 'ai-download' }, built.deps)).toEqual({ started: true });
    const cloud = makeDeps({ settings: openai, lm });
    expect(await handleMessage({ type: 'ai-download' }, cloud.deps)).toEqual({ started: false });
    expect(create).toHaveBeenCalledOnce();
  });
});

describe('handleMessage: ai-classify', () => {
  const msg = { type: 'ai-classify', fields: [field('a', { label: '姓' })] };

  it('does nothing for none and for unconfigured providers', async () => {
    const none = makeDeps();
    expect(await handleMessage(msg, none.deps)).toEqual({ ok: false });
    const unset = makeDeps({ settings: openai });
    expect(await handleMessage(msg, unset.deps)).toEqual({ ok: false });
    expect(none.fetchMock).not.toHaveBeenCalled();
    expect(unset.fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the network without host permission', async () => {
    const { deps, fetchMock } = makeDeps({ settings: openai, ...configured, permitted: false });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('classifies through the OpenAI-compatible provider using the stored key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(openaiBody('{"a":"lastName"}'));
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: fetchMock });
    expect(await handleMessage(msg, deps)).toEqual({ ok: true, entries: [['a', 'lastName']] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
  });

  it('classifies through Gemini', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ candidates: [{ content: { parts: [{ text: '{"a":"email"}' }] } }] }));
    const { deps } = makeDeps({
      settings: { provider: 'gemini', gemini: { model: 'g', apiVersion: 'v1beta' } },
      hasKey: { openai: false, gemini: true },
      secrets: { gemini: 'g-key' },
      fetch: fetchMock,
    });
    expect(await handleMessage(msg, deps)).toEqual({ ok: true, entries: [['a', 'email']] });
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ 'x-goog-api-key': 'g-key' });
  });

  it('uses the Prompt API for built-in and degrades when it is unavailable', async () => {
    const ok = makeDeps({ settings: { provider: 'built-in' }, lm: builtInLm('available') });
    expect(await handleMessage(msg, ok.deps)).toEqual({ ok: true, entries: [['a', 'lastName']] });
    const off = makeDeps({ settings: { provider: 'built-in' }, lm: builtInLm('unavailable') });
    expect(await handleMessage(msg, off.deps)).toEqual({ ok: false });
  });

  it('records an authentication failure and stops sending until settings change', async () => {
    const fetchMock = vi.fn().mockResolvedValue(statusJson(401));
    const { deps, authFailed } = makeDeps({ settings: openai, ...configured, fetch: fetchMock });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false });
    expect(authFailed.has('openai')).toBe(true);
    expect(await handleMessage({ type: 'ai-status' }, deps)).toEqual({ status: 'auth-error', provider: 'openai' });
    await handleMessage(msg, deps);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns ok:false for non-auth failures without recording an auth error', async () => {
    const { deps, authFailed } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(500)) });
    expect(await handleMessage(msg, deps)).toEqual({ ok: false });
    expect(authFailed.size).toBe(0);
  });

  it('does not leak the API key into any response', async () => {
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(500)) });
    expect(JSON.stringify(await handleMessage(msg, deps))).not.toContain('sk-test');
  });
});

describe('handleMessage: ai-test', () => {
  it('returns the category of a synthetic field on success and clears a recorded auth failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(openaiBody('{"t":"fullName"}'));
    const authFailed = new Set<ProviderKind>(['openai']);
    const { deps } = makeDeps({ settings: openai, ...configured, fetch: fetchMock, authFailed });
    expect(await handleMessage({ type: 'ai-test' }, deps)).toEqual({ ok: true, category: 'fullName' });
    expect(authFailed.size).toBe(0);
  });

  it('maps failures to reasons', async () => {
    const none = makeDeps();
    expect(await handleMessage({ type: 'ai-test' }, none.deps)).toEqual({ ok: false, reason: 'not-configured' });
    const noPerm = makeDeps({ settings: openai, ...configured, permitted: false });
    expect(await handleMessage({ type: 'ai-test' }, noPerm.deps)).toEqual({ ok: false, reason: 'permission' });
    const auth = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(statusJson(403)) });
    expect(await handleMessage({ type: 'ai-test' }, auth.deps)).toEqual({ ok: false, reason: 'auth' });
    const net = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockRejectedValue(new TypeError('x')) });
    expect(await handleMessage({ type: 'ai-test' }, net.deps)).toEqual({ ok: false, reason: 'network' });
    const bad = makeDeps({ settings: openai, ...configured, fetch: vi.fn().mockResolvedValue(openaiBody('{}')) });
    expect(await handleMessage({ type: 'ai-test' }, bad.deps)).toEqual({ ok: false, reason: 'bad-response' });
  });
});
```

- [ ] **Step 5: 失敗を確認する**

Run: `npx vitest run tests/entrypoints/handle-message.test.ts`
Expected: FAIL（`HandlerDeps` の形が違う、`ai-test` が未対応）

- [ ] **Step 6: handleMessage を実装する**

`src/llm/handle-message.ts`:

```ts
import { createGeminiClassifier, createOpenAiClassifier, HttpAuthError } from '../ai/http-classifiers';
import { originPatternsFor } from '../ai/permissions';
import { validateAiSettings } from '../ai/settings';
import { computeCloudStatus } from '../ai/status';
import type { AiStatusInfo, ProviderKind, PublicAiSettings } from '../ai/types';
import type { FieldMeta } from '../core/types';
import { parseRequest, type TestResponse } from '../messages';
import { checkAiStatus, startDownload, type LanguageModelStatic } from './availability';
import { PromptApiClassifier, type FieldClassifier } from './classifier';

export interface HandlerDeps {
  lm: LanguageModelStatic | null;
  loadSettings(): Promise<PublicAiSettings>;
  loadSecrets(): Promise<{ openai?: string; gemini?: string }>;
  hasPermission(origins: string[]): Promise<boolean>;
  fetch: typeof fetch;
  // Providers that answered 401/403; owned by the background and cleared when settings change.
  authFailed: Set<ProviderKind>;
}

type Selection =
  | { ok: true; classifier: FieldClassifier }
  | { ok: false; reason: 'not-configured' | 'permission' | 'auth' | 'unavailable' };

async function statusOf(deps: HandlerDeps, s: PublicAiSettings): Promise<AiStatusInfo> {
  if (s.provider === 'built-in') return { status: await checkAiStatus(deps.lm), provider: 'built-in' };
  return {
    status: computeCloudStatus({
      settings: s,
      hasKey: s.hasKey,
      permitted: await deps.hasPermission(originPatternsFor(s)),
      authFailed: deps.authFailed.has(s.provider),
    }),
    provider: s.provider,
  };
}

async function selectClassifier(
  deps: HandlerDeps,
  s: PublicAiSettings,
  opts: { ignoreAuthFailure?: boolean } = {},
): Promise<Selection> {
  const { status } = await statusOf(deps, s);
  if (status === 'disabled' || status === 'not-configured') return { ok: false, reason: 'not-configured' };
  if (status === 'permission-missing') return { ok: false, reason: 'permission' };
  if (status === 'auth-error' && !opts.ignoreAuthFailure) return { ok: false, reason: 'auth' };

  if (s.provider === 'built-in') {
    if (!deps.lm || status !== 'available') return { ok: false, reason: 'unavailable' };
    return { ok: true, classifier: new PromptApiClassifier(deps.lm) };
  }

  const secrets = await deps.loadSecrets();
  const present = { openai: secrets.openai !== undefined, gemini: secrets.gemini !== undefined };
  // The stored key can be unreadable even though an envelope exists; treat that as not configured.
  if (validateAiSettings(s, present).length > 0) return { ok: false, reason: 'not-configured' };
  if (s.provider === 'openai') {
    return { ok: true, classifier: createOpenAiClassifier(s.openai, secrets.openai, { fetch: deps.fetch }) };
  }
  if (s.provider === 'gemini' && secrets.gemini) {
    return { ok: true, classifier: createGeminiClassifier(s.gemini, secrets.gemini, { fetch: deps.fetch }) };
  }
  return { ok: false, reason: 'not-configured' };
}

const TEST_FIELD: FieldMeta = {
  id: 't', tag: 'input', type: 'text', name: 'name', htmlId: '', autocomplete: '', label: 'お名前',
  placeholder: '山田 太郎', nearby: '', maxLength: null, pattern: '', options: [], readOnly: false,
  disabled: false, value: '',
};

async function runTest(deps: HandlerDeps, s: PublicAiSettings): Promise<TestResponse> {
  const sel = await selectClassifier(deps, s, { ignoreAuthFailure: true });
  if (!sel.ok) return { ok: false, reason: sel.reason === 'unavailable' ? 'network' : sel.reason };
  try {
    const category = (await sel.classifier.classify([TEST_FIELD])).get('t');
    if (!category) return { ok: false, reason: 'bad-response' };
    deps.authFailed.delete(s.provider);
    return { ok: true, category };
  } catch (e) {
    if (e instanceof HttpAuthError) {
      deps.authFailed.add(s.provider);
      return { ok: false, reason: 'auth' };
    }
    return { ok: false, reason: 'network' };
  }
}

// Returns undefined for anything that is not exactly one of the AI request shapes.
export async function handleMessage(msg: unknown, deps: HandlerDeps): Promise<unknown> {
  const req = parseRequest(msg);
  if (!req) return undefined;
  const settings = await deps.loadSettings();

  switch (req.type) {
    case 'ai-status':
      return statusOf(deps, settings);
    case 'ai-download':
      return { started: settings.provider === 'built-in' && deps.lm ? await startDownload(deps.lm) : false };
    case 'ai-classify': {
      const sel = await selectClassifier(deps, settings);
      if (!sel.ok) return { ok: false };
      try {
        return { ok: true, entries: [...(await sel.classifier.classify(req.fields))] };
      } catch (e) {
        if (e instanceof HttpAuthError) deps.authFailed.add(settings.provider);
        return { ok: false };
      }
    }
    case 'ai-test':
      return runTest(deps, settings);
  }
}
```

- [ ] **Step 7: background を組み立てる**

`src/entrypoints/background.ts`:

```ts
import { hasHostPermission } from '../ai/permissions';
import { IdbKeyStore } from '../ai/secret-store';
import { AI_SETTINGS_KEY, loadAiSecrets, loadPublicAiSettings } from '../ai/settings-store';
import type { ProviderKind } from '../ai/types';
import { getLanguageModel } from '../llm/availability';
import { handleMessage } from '../llm/handle-message';

export default defineBackground(() => {
  const keyStore = new IdbKeyStore();
  const authFailed = new Set<ProviderKind>();

  // Changing the settings (a new key, another provider) gives a failed provider a fresh start.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && AI_SETTINGS_KEY in changes) authFailed.clear();
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // Only this extension's own content scripts and pages may reach the providers.
    if (sender.id !== chrome.runtime.id) return false;
    if ((msg as { type?: unknown } | null)?.type === 'open-options') {
      void chrome.runtime.openOptionsPage();
      return false;
    }
    void handleMessage(msg, {
      lm: getLanguageModel(),
      loadSettings: loadPublicAiSettings,
      loadSecrets: () => loadAiSecrets(keyStore),
      hasPermission: (origins) => hasHostPermission(origins),
      fetch: globalThis.fetch.bind(globalThis),
      authFailed,
    }).then(sendResponse, () => sendResponse(undefined));
    return true;
  });
});
```

- [ ] **Step 8: 通過を確認する**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 全テスト PASS、型エラーなし（`tests/llm/background-gateway.test.ts` などは次の Task で変わるまで、型が合わない箇所があれば最小限で直す）

- [ ] **Step 9: Commit**

```bash
git add src/messages.ts src/llm/handle-message.ts src/entrypoints/background.ts tests/messages.test.ts tests/entrypoints/handle-message.test.ts
git commit -m "feat: background がプロバイダ設定に応じて分類器を選ぶようにする"
```

---

### Task 7: 状態表示とガイドの更新

**Files:**
- Create: `src/ui/status-label.ts`
- Modify: `src/llm/background-gateway.ts`, `src/ui/button.ts`, `src/ui/ai-guide.ts`, `src/entrypoints/content.ts`
- Test: `tests/ui/status-label.test.ts`（新規）, `tests/ui/ai-guide.test.ts`・`tests/ui/button.test.ts`・`tests/llm/background-gateway.test.ts`（更新）

状態は `AiStatusInfo = { status, provider }` として gateway から content、バッジ、ガイドまで流す。

- [ ] **Step 1: status-label の失敗するテストを書く**

`tests/ui/status-label.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { AiStatusInfo } from '../../src/ai/types';
import { badgeLabel } from '../../src/ui/status-label';

const info = (status: AiStatusInfo['status'], provider: AiStatusInfo['provider']): AiStatusInfo => ({ status, provider });

describe('badgeLabel', () => {
  it.each([
    [info('available', 'built-in'), 'AI 有効'],
    [info('available', 'openai'), 'AI: OpenAI 互換'],
    [info('available', 'gemini'), 'AI: Gemini'],
    [info('downloadable', 'built-in'), 'AI 未準備'],
    [info('downloading', 'built-in'), 'AI 準備中'],
    [info('unavailable', 'none'), 'AI 無効'],
    [info('unsupported', 'built-in'), 'AI 無効'],
    [info('disabled', 'none'), 'AI: オフ'],
    [info('not-configured', 'openai'), 'AI 未設定'],
    [info('permission-missing', 'gemini'), 'AI 権限なし'],
    [info('auth-error', 'openai'), 'AI 認証エラー'],
  ])('%j -> %s', (i, expected) => {
    expect(badgeLabel(i)).toBe(expected);
  });
});
```

- [ ] **Step 2: 失敗を確認し、実装する**

Run: `npx vitest run tests/ui/status-label.test.ts`
Expected: FAIL（モジュールが無い）

`src/ui/status-label.ts`:

```ts
import type { AiStatusInfo, ProviderKind } from '../ai/types';

export const PROVIDER_LABEL: Record<ProviderKind, string> = {
  none: 'オフ',
  'built-in': 'ブラウザ内蔵',
  openai: 'OpenAI 互換',
  gemini: 'Gemini',
};

export function badgeLabel(info: AiStatusInfo): string {
  switch (info.status) {
    case 'available':
      return info.provider === 'openai' || info.provider === 'gemini'
        ? `AI: ${PROVIDER_LABEL[info.provider]}`
        : 'AI 有効';
    case 'downloadable':
      return 'AI 未準備';
    case 'downloading':
      return 'AI 準備中';
    case 'unavailable':
    case 'unsupported':
      return 'AI 無効';
    case 'disabled':
      return 'AI: オフ';
    case 'not-configured':
      return 'AI 未設定';
    case 'permission-missing':
      return 'AI 権限なし';
    case 'auth-error':
      return 'AI 認証エラー';
  }
}
```

Run: `npx vitest run tests/ui/status-label.test.ts`
Expected: PASS

- [ ] **Step 3: gateway を更新する**

`src/llm/background-gateway.ts` を次のとおり変更し、`tests/llm/background-gateway.test.ts` の既存テストを新しい戻り値（`{ status, provider }`）に合わせて意図を保ったまま更新する。さらに次のテストを追加する。

テスト（追記）:

```ts
describe('getAiStatusViaBackground (status info)', () => {
  it('returns status and provider from a valid reply', async () => {
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ status: 'available', provider: 'openai' });
    expect(await getAiStatusViaBackground()).toEqual({ status: 'available', provider: 'openai' });
  });

  it('falls back to unavailable for malformed replies, errors and timeouts', async () => {
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ status: 'bogus' });
    expect(await getAiStatusViaBackground()).toEqual({ status: 'unavailable', provider: 'none' });
    chrome.runtime.sendMessage = vi.fn().mockRejectedValue(new Error('x'));
    expect(await getAiStatusViaBackground()).toEqual({ status: 'unavailable', provider: 'none' });
    chrome.runtime.sendMessage = vi.fn(() => new Promise(() => {}));
    expect(await getAiStatusViaBackground(10)).toEqual({ status: 'unavailable', provider: 'none' });
  });
});

describe('testAiViaBackground', () => {
  it('returns a parsed result and null for malformed or failed replies', async () => {
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ ok: true, category: 'fullName' });
    expect(await testAiViaBackground()).toEqual({ ok: true, category: 'fullName' });
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ nope: 1 });
    expect(await testAiViaBackground()).toBeNull();
    chrome.runtime.sendMessage = vi.fn().mockRejectedValue(new Error('x'));
    expect(await testAiViaBackground()).toBeNull();
    chrome.runtime.sendMessage = vi.fn(() => new Promise(() => {}));
    expect(await testAiViaBackground(10)).toBeNull();
  });
});
```

（既存テストの `chrome` スタブの作り方に合わせて、`chrome.runtime.sendMessage` の差し替え方を調整してよい。）

実装の変更:
- import: `import { parseClassifyResponse, parseStatusResponse, parseTestResponse, MAX_CLASSIFY_CHUNK, type TestResponse } from '../messages';` と `import type { AiStatusInfo } from '../ai/types';`。`isAiStatus` と `AiStatus` の import は不要になれば削除する。
- 定数 `export const TEST_TIMEOUT_MS = 30_000;` と `const UNKNOWN_STATUS: AiStatusInfo = { status: 'unavailable', provider: 'none' };` を追加する。
- `getAiStatusViaBackground` を次に置き換える。

```ts
export async function getAiStatusViaBackground(timeoutMs = STATUS_TIMEOUT_MS): Promise<AiStatusInfo> {
  try {
    return parseStatusResponse(await sendWithTimeout({ type: 'ai-status' }, timeoutMs)) ?? UNKNOWN_STATUS;
  } catch {
    return UNKNOWN_STATUS;
  }
}

export async function testAiViaBackground(timeoutMs = TEST_TIMEOUT_MS): Promise<TestResponse | null> {
  try {
    return parseTestResponse(await sendWithTimeout({ type: 'ai-test' }, timeoutMs));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: button を更新する**

`src/ui/button.ts` を次の内容に置き換える（変更点: 状態を `AiStatusInfo` で受け取り、文言を `badgeLabel` で作り、設定が必要な状態を赤系で表示する）。`tests/ui/button.test.ts` の既存テストは、`setStatus('available')` のような呼び出しを `setStatus({ status: 'available', provider: 'built-in' })` に、`onBadgeClick` の引数の期待を `AiStatusInfo` に直して意図を保つ。

```ts
import type { AiStatusInfo } from '../ai/types';
import { createShadowHost } from './host';
import { badgeLabel } from './status-label';

export interface ButtonHandle {
  setStatus(info: AiStatusInfo): void;
  showError(text: string): void;
  reposition(): void;
  destroy(): void;
}

const INITIAL: AiStatusInfo = { status: 'unavailable', provider: 'none' };

const CSS = `
  .wrap { all: initial; display: inline-flex; gap: 8px; align-items: center;
    font: 600 13px/1 system-ui, sans-serif; color: #fff; background: #2457d6;
    padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
  .wrap:hover { background: #1c46b3; }
  button { all: initial; cursor: pointer; font: inherit; color: inherit; }
  .badge { font-weight: 400; font-size: 11px; padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,.22); }
  .badge[data-status="error"], .badge[data-status="not-configured"],
  .badge[data-status="permission-missing"], .badge[data-status="auth-error"] { background: #b3261e; }
  .badge[data-status="unavailable"], .badge[data-status="unsupported"],
  .badge[data-status="disabled"] { background: rgba(0,0,0,.3); }
`;

export function mountButton(
  anchor: Element,
  onClick: () => void,
  onBadgeClick: (info: AiStatusInfo) => void = () => {},
): ButtonHandle {
  const { host, root } = createShadowHost();
  const style = document.createElement('style');
  style.textContent = CSS;
  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'JushoAI で入力';
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'badge';
  wrap.append(button, badge);
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (statusKnown) onBadgeClick(lastInfo);
  });
  root.append(style, wrap);
  document.body.append(host);

  let lastInfo: AiStatusInfo = INITIAL;
  let statusKnown = false;
  let errorTimer: number | undefined;
  const handle: ButtonHandle = {
    setStatus(info) {
      lastInfo = info;
      statusKnown = true;
      window.clearTimeout(errorTimer);
      badge.textContent = badgeLabel(info);
      badge.dataset.status = info.status;
    },
    showError(text) {
      window.clearTimeout(errorTimer);
      badge.textContent = text;
      badge.dataset.status = 'error';
      errorTimer = window.setTimeout(() => handle.setStatus(lastInfo), 4000);
    },
    reposition() {
      const r = anchor.getBoundingClientRect();
      host.style.top = `${Math.max(0, r.top + window.scrollY - 36)}px`;
      host.style.left = `${r.left + window.scrollX}px`;
    },
    destroy() {
      host.remove();
    },
  };
  handle.setStatus(INITIAL);
  statusKnown = false;
  handle.reposition();
  return handle;
}
```

- [ ] **Step 5: ai-guide の失敗するテストを追記する**

`tests/ui/ai-guide.test.ts` の既存テスト（`buildGuide('unsupported', 'edge')` のように状態の文字列を渡している箇所）は、`buildGuide({ status: 'unsupported', provider: 'built-in' }, 'edge')` の形に直して意図を保つ。次を追記する。

```ts
import type { AiStatusInfo } from '../../src/ai/types';

const gi = (status: AiStatusInfo['status'], provider: AiStatusInfo['provider']): AiStatusInfo => ({ status, provider });

describe('buildGuide: cloud providers', () => {
  it('points to the settings page when AI is off or not configured', () => {
    for (const status of ['disabled', 'not-configured', 'permission-missing', 'auth-error'] as const) {
      const g = buildGuide(gi(status, 'openai'), 'chrome');
      expect(g.openSettings).toBe(true);
      expect(g.lines.join('\n')).toContain('ルールによる入力は AI なしでも使えます');
    }
  });

  it('explains what is sent when a cloud provider is available', () => {
    const g = buildGuide(gi('available', 'gemini'), 'chrome');
    expect(g.title).toBe('AI 判定を利用できます');
    expect(g.lines.join('\n')).toContain('Gemini');
    expect(g.lines.join('\n')).toContain('入力する値は送りません');
    expect(g.openSettings).toBeFalsy();
  });

  it('keeps the browser flag guidance for built-in problems', () => {
    expect(buildGuide(gi('unsupported', 'built-in'), 'edge').lines.join('\n')).toContain('edge://flags');
  });
});

describe('showAiGuide: settings shortcut', () => {
  it('renders a settings button only when the guide asks for it and calls back', () => {
    const onOpen = vi.fn();
    const handle = showAiGuide({ title: 't', lines: ['l'], openSettings: true }, () => {}, onOpen);
    // The shadow root is closed, so the host's own listeners are exercised through the document.
    const host = document.querySelector('[data-jushoai]') as HTMLElement;
    expect(host).not.toBeNull();
    handle.close();
  });
});
```

（closed Shadow DOM の中のボタンはテストから直接触れないため、最後のテストは「パネルが出てクローズできる」ことの確認にとどめる。ボタンの挙動は Task 9 の手動確認で見る。`vi`, `showAiGuide` の import が無ければ足す。）

- [ ] **Step 6: ai-guide を更新する**

`src/ui/ai-guide.ts` を次の内容に置き換える。

```ts
import type { AiStatusInfo } from '../ai/types';
import { getFlagGuidance, type BrowserKind } from '../llm/browser-support';
import { createShadowHost } from './host';
import { PROVIDER_LABEL } from './status-label';

export interface Guide {
  title: string;
  lines: string[];
  openSettings?: boolean;
}

const RULE_LINE = 'ルールによる入力は AI なしでも使えます。';

function flagLines(browser: BrowserKind): string[] {
  const g = getFlagGuidance(browser);
  if (!g) {
    return [
      'Chrome または Edge のフラグ設定で、内蔵 AI（Prompt API）を有効にしてください。',
      '設定を変えたあとはブラウザを再起動してください。',
    ];
  }
  return [
    `フラグ名: ${g.flagName}`,
    `アドレスバーに貼り付けて開く: ${g.flagUrl}`,
    '有効にしたあとはブラウザを再起動してください。',
  ];
}

export function buildGuide(info: AiStatusInfo, browser: BrowserKind): Guide {
  const providerName = PROVIDER_LABEL[info.provider];
  switch (info.status) {
    case 'unsupported':
      return {
        title: 'このブラウザでは内蔵 AI を使えません',
        lines: [
          'この環境には内蔵 AI の API がありません。最近の Chrome（Gemini Nano）または Edge（Phi-mini）が必要です。',
          ...flagLines(browser),
          RULE_LINE,
        ],
      };
    case 'unavailable':
      return {
        title: '内蔵 AI を利用できません',
        lines: [
          'フラグが無効になっているか、この端末ではモデルを実行できない可能性があります。ディスクの空き容量不足も原因の一つとして考えられます。',
          ...flagLines(browser),
          RULE_LINE,
        ],
      };
    case 'downloadable':
      return {
        title: 'AI モデルが未ダウンロードです',
        lines: [
          '「入力」を押すとモデルのダウンロードを試みます。ブラウザによっては自動で始まらないことがあります。',
          RULE_LINE,
        ],
      };
    case 'downloading':
      return {
        title: 'AI モデルを準備中です',
        lines: ['モデルをダウンロードしています。完了後に AI 判定が使われます。', RULE_LINE],
      };
    case 'disabled':
      return {
        title: 'AI 判定はオフです',
        lines: [
          'ルールで判定できない欄だけ AI で補助できます。設定ページで AI プロバイダを選んでください。',
          RULE_LINE,
        ],
        openSettings: true,
      };
    case 'not-configured':
      return {
        title: 'AI の設定が未完了です',
        lines: [`${providerName} の設定（ベース URL・モデル名・API キー）を設定ページで確認してください。`, RULE_LINE],
        openSettings: true,
      };
    case 'permission-missing':
      return {
        title: 'AI への通信が許可されていません',
        lines: [
          `${providerName} への通信が許可されていません。設定ページで保存し直し、ブラウザの確認で許可してください。`,
          RULE_LINE,
        ],
        openSettings: true,
      };
    case 'auth-error':
      return {
        title: 'AI の認証に失敗しました',
        lines: [`${providerName} が認証を拒否しました。設定ページで API キーを確認してください。`, RULE_LINE],
        openSettings: true,
      };
    case 'available':
      return info.provider === 'openai' || info.provider === 'gemini'
        ? {
            title: 'AI 判定を利用できます',
            lines: [
              `ルールで判定できない欄の分類に ${providerName} を使います。送るのは欄のメタデータ（name・label など）だけで、入力する値は送りません。`,
              RULE_LINE,
            ],
          }
        : { title: 'AI 判定を利用できます', lines: ['AI の準備ができています。', RULE_LINE] };
  }
}

export interface GuideHandle {
  close(): void;
}

const CSS = `
  .panel { all: initial; display: block; box-sizing: border-box; width: 360px; max-height: 80vh;
    overflow: auto; font: 13px/1.5 system-ui, sans-serif; color: #1a1a1a; background: #fff;
    border: 1px solid #c8ccd4; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
  h2 { margin: 0 0 8px; font-size: 14px; }
  p { margin: 0 0 8px; word-break: break-all; user-select: text; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid #c8ccd4;
    background: #f4f5f8; cursor: pointer; }
  button.primary { background: #2457d6; border-color: #2457d6; color: #fff; }
`;

export function showAiGuide(
  guide: Guide,
  onClose: () => void = () => {},
  onOpenSettings: () => void = () => {},
): GuideHandle {
  const { host, root } = createShadowHost();
  host.style.position = 'fixed';
  host.style.top = '16px';
  host.style.right = '16px';

  const style = document.createElement('style');
  style.textContent = CSS;
  const panel = document.createElement('div');
  panel.className = 'panel';
  const title = document.createElement('h2');
  title.textContent = guide.title;
  panel.append(title);
  for (const line of guide.lines) {
    const p = document.createElement('p');
    p.textContent = line;
    panel.append(p);
  }
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '閉じる';
  const actions = document.createElement('div');
  actions.className = 'actions';
  if (guide.openSettings) {
    const settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.className = 'primary';
    settingsButton.textContent = 'AI 設定を開く';
    settingsButton.addEventListener('click', () => {
      onOpenSettings();
      close();
    });
    actions.append(settingsButton);
  }
  actions.append(closeButton);
  panel.append(actions);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    host.remove();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey, true);
  closeButton.addEventListener('click', close);

  root.append(style, panel);
  document.body.append(host);
  return { close };
}
```

- [ ] **Step 7: content を更新する**

`src/entrypoints/content.ts` を 2 箇所だけ変更する。

変更 1（`run()` 内）:

```ts
      const status = await getAiStatusViaBackground();
      button.setStatus(status);
      if (status === 'downloadable') {
        void requestDownloadViaBackground()
          .then(() => getAiStatusViaBackground())
          .then((s) => button.setStatus(s));
      }
      const classifier = status === 'available' ? new BackgroundClassifier() : null;
```

を次に置き換える。

```ts
      const info = await getAiStatusViaBackground();
      button.setStatus(info);
      if (info.provider === 'built-in' && info.status === 'downloadable') {
        void requestDownloadViaBackground()
          .then(() => getAiStatusViaBackground())
          .then((s) => button.setStatus(s));
      }
      const classifier = info.status === 'available' ? new BackgroundClassifier() : null;
```

変更 2（`sync()` 内のバッジクリック）:

```ts
          (status) => {
            openGuide?.close();
            openGuide = showAiGuide(buildGuide(status, browser), () => {
              openGuide = null;
            });
          },
```

を次に置き換える。

```ts
          (info) => {
            openGuide?.close();
            openGuide = showAiGuide(
              buildGuide(info, browser),
              () => {
                openGuide = null;
              },
              () => void chrome.runtime.sendMessage({ type: 'open-options' }),
            );
          },
```

- [ ] **Step 8: 全体を確認する**

Run: `npx vitest run && npx tsc --noEmit && npx wxt build`
Expected: 全テスト PASS、型エラーなし、ビルド成功

- [ ] **Step 9: Commit**

```bash
git add src/ui/status-label.ts src/llm/background-gateway.ts src/ui/button.ts src/ui/ai-guide.ts src/entrypoints/content.ts tests/ui tests/llm/background-gateway.test.ts
git commit -m "feat: AI 状態にプロバイダを含め、バッジとガイドを更新"
```

---

### Task 8: 設定ページの AI セクションと manifest

**Files:**
- Create: `src/entrypoints/options/ai-section.ts`
- Modify: `src/entrypoints/options/index.html`, `src/entrypoints/options/main.ts`, `wxt.config.ts`

設定ページの DOM 層は薄いので、既存の方針どおり自動テストは書かず、Task 9 の手動確認で検証する。ページ由来でない文字列も含め、`innerHTML` は使わず `textContent` で入れる。保存ボタンの処理では、`chrome.permissions.request` を最初の `await` にして、ユーザー操作の文脈を保つ。

- [ ] **Step 1: manifest にオプショナル権限を宣言する**

`wxt.config.ts` の `manifest` に次を追加する。

```ts
    optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
```

- [ ] **Step 2: AI セクションを作る**

`src/entrypoints/options/ai-section.ts`:

```ts
import { originPatternsFor, requestHostPermission } from '../../ai/permissions';
import { IdbKeyStore } from '../../ai/secret-store';
import { normalizeAiSettings, validateAiSettings } from '../../ai/settings';
import { loadPublicAiSettings, saveAiSettings, type KeyUpdate } from '../../ai/settings-store';
import {
  OPENAI_PRESETS, type AiSettings, type KeyPresence, type ProviderKind,
} from '../../ai/types';
import { testAiViaBackground } from '../../llm/background-gateway';
import type { TestFailure } from '../../messages';

const PROVIDER_OPTIONS: { value: ProviderKind; label: string }[] = [
  { value: 'none', label: '使わない（ルールのみ）' },
  { value: 'built-in', label: 'ブラウザ内蔵 AI（Chrome / Edge。端末とフラグの設定が必要）' },
  { value: 'openai', label: 'OpenAI 互換 API（OpenAI / Groq / Mistral / Ollama / LM Studio など）' },
  { value: 'gemini', label: 'Google Gemini' },
];

const FAILURE_TEXT: Record<TestFailure, string> = {
  'not-configured': '設定が完了していません。保存してから試してください。',
  permission: '通信が許可されていません。保存し直して許可してください。',
  auth: '認証に失敗しました。API キーを確認してください。',
  network: '接続に失敗しました。URL・モデル名・ネットワークを確認してください。',
  'bad-response': '応答を解釈できませんでした。モデルが JSON 形式の出力に対応しているか確認してください。',
};

const KEYED = ['openai', 'gemini'] as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function labeled(text: string, control: HTMLElement): HTMLLabelElement {
  const label = el('label');
  label.append(el('span', text), control);
  return label;
}

export function mountAiSection(root: HTMLElement): void {
  let settings: AiSettings;
  let hasKey: KeyPresence = { openai: false, gemini: false };
  const keyInput = { openai: '', gemini: '' };
  const removeKey = { openai: false, gemini: false };
  let notice: HTMLElement | null = null;
  const keyStore = new IdbKeyStore();

  const setNotice = (text: string, kind: 'saved' | 'errors') => {
    notice = el('p', text);
    notice.className = kind === 'saved' ? 'saved' : 'errors-text';
    render();
  };

  function textInput(value: string, placeholder: string, onInput: (v: string) => void, type = 'text') {
    const input = el('input');
    input.type = type;
    input.value = value;
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function keyField(provider: (typeof KEYED)[number]) {
    const input = textInput(
      keyInput[provider],
      hasKey[provider] ? '保存済み（変更する場合のみ入力）' : 'API キー',
      (v) => { keyInput[provider] = v; },
      'password',
    );
    const wrap = el('div');
    wrap.append(labeled('API キー', input));
    if (hasKey[provider]) {
      const remove = el('input');
      remove.type = 'checkbox';
      remove.checked = removeKey[provider];
      remove.addEventListener('change', () => { removeKey[provider] = remove.checked; });
      const row = el('label');
      row.append(remove, el('span', '保存済みの API キーを削除する'));
      wrap.append(row);
    }
    return wrap;
  }

  function render() {
    const title = el('h2', 'AI 判定（任意）');
    const privacy = el('div');
    for (const line of [
      'AI を使う設定にすると、ルールで判定できない入力欄のメタデータ（name・label・placeholder・見出し・type・maxlength）が、選んだプロバイダに送られます。',
      '入力する個人情報の値や、欄にすでに入っている値は送りません。',
      'API キーは暗号化して保存します。ストレージだけが流出しても復号できませんが、この拡張機能自身のコードからは読み出せます。',
    ]) privacy.append(el('p', line));

    const select = el('select');
    for (const o of PROVIDER_OPTIONS) {
      const opt = el('option', o.label);
      opt.value = o.value;
      opt.selected = settings.provider === o.value;
      select.append(opt);
    }
    select.addEventListener('change', () => {
      settings.provider = select.value as ProviderKind;
      render();
    });

    const parts: HTMLElement[] = [title, privacy, labeled('AI プロバイダ', select)];

    if (settings.provider === 'openai') {
      const set = el('fieldset');
      set.append(el('legend', 'OpenAI 互換 API'));
      const presets = el('select');
      const placeholder = el('option', 'プリセットから選ぶ');
      placeholder.value = '';
      presets.append(placeholder);
      for (const p of OPENAI_PRESETS) {
        const opt = el('option', p.label);
        opt.value = p.baseUrl;
        presets.append(opt);
      }
      presets.addEventListener('change', () => {
        if (presets.value) {
          settings.openai.baseUrl = presets.value;
          render();
        }
      });
      set.append(
        labeled('プリセット（ベース URL を埋めます）', presets),
        labeled('ベース URL', textInput(settings.openai.baseUrl, 'https://api.openai.com/v1', (v) => { settings.openai.baseUrl = v; })),
        labeled('モデル名', textInput(settings.openai.model, 'プロバイダのモデル名', (v) => { settings.openai.model = v; })),
        keyField('openai'),
        el('p', 'Ollama / LM Studio など localhost の場合、API キーは不要です。'),
        el('p', `Ollama を使う場合は、Ollama 側の OLLAMA_ORIGINS に chrome-extension://${chrome.runtime.id} を許可してください。`),
      );
      parts.push(set);
    }

    if (settings.provider === 'gemini') {
      const set = el('fieldset');
      set.append(el('legend', 'Google Gemini'));
      set.append(
        labeled('モデル名', textInput(settings.gemini.model, 'Gemini のモデル名', (v) => { settings.gemini.model = v; })),
        labeled('API バージョン', textInput(settings.gemini.apiVersion, 'v1beta', (v) => { settings.gemini.apiVersion = v; })),
        keyField('gemini'),
      );
      parts.push(set);
    }

    const save = el('button', '保存');
    save.type = 'button';
    save.className = 'primary';
    save.addEventListener('click', () => void onSave());
    const test = el('button', '接続テスト（保存済みの設定で実行）');
    test.type = 'button';
    test.addEventListener('click', () => void onTest());
    const actions = el('div');
    actions.className = 'row';
    actions.append(save, test);
    parts.push(actions);
    if (notice) parts.push(notice);

    root.replaceChildren(...parts);
  }

  async function onSave() {
    const update: KeyUpdate = {};
    for (const p of KEYED) {
      if (removeKey[p]) update[p] = '';
      else if (keyInput[p] !== '') update[p] = keyInput[p];
    }
    const effective: KeyPresence = {
      openai: !removeKey.openai && (hasKey.openai || keyInput.openai !== ''),
      gemini: !removeKey.gemini && (hasKey.gemini || keyInput.gemini !== ''),
    };
    const normalized = normalizeAiSettings(settings);
    const errors = validateAiSettings(normalized, effective);
    if (errors.length > 0) {
      setNotice(errors.join(' / '), 'errors');
      return;
    }
    // The permission prompt needs the click's user gesture, so it must be the first await.
    const origins = originPatternsFor(normalized);
    const granted = origins.length === 0 ? true : await requestHostPermission(origins);
    await saveAiSettings(normalized, update, keyStore);
    settings = normalized;
    hasKey = effective;
    keyInput.openai = '';
    keyInput.gemini = '';
    removeKey.openai = false;
    removeKey.gemini = false;
    setNotice(
      granted ? '保存しました。' : '保存しました。通信が許可されていないため AI は使えません。もう一度保存して、許可してください。',
      granted ? 'saved' : 'errors',
    );
  }

  async function onTest() {
    setNotice('接続テスト中…', 'saved');
    const result = await testAiViaBackground();
    if (!result) setNotice('バックグラウンドが応答しませんでした。', 'errors');
    else if (result.ok) setNotice(`接続できました（判定: ${result.category}）。`, 'saved');
    else setNotice(FAILURE_TEXT[result.reason], 'errors');
  }

  void loadPublicAiSettings().then(({ hasKey: keys, ...loaded }) => {
    settings = loaded;
    hasKey = keys;
    render();
  });
}
```

- [ ] **Step 3: 設定ページに組み込む**

`src/entrypoints/options/index.html` の `<main id="app"></main>` の直後に次を追加し、`<style>` の末尾に `main + main { padding-top: 0; }` と `.errors-text { color: #b3261e; }` を追加する。

```html
    <main id="ai-app"></main>
```

`src/entrypoints/options/main.ts` の import に次を追加する。

```ts
import { mountAiSection } from './ai-section';
```

ファイル末尾（`void loadData().then(...)` の後）に次を追加する。

```ts
mountAiSection(document.getElementById('ai-app')!);
```

- [ ] **Step 4: 型とビルドを確認する**

Run: `npx tsc --noEmit && npx vitest run && npx wxt build`
Expected: 型エラーなし、全テスト PASS、ビルド成功。`dist/chrome-mv3/manifest.json` に `optional_host_permissions`（`https://*/*`, `http://localhost/*`, `http://127.0.0.1/*`）が入り、`permissions` は `["storage"]` のまま、`host_permissions` が無いことを確認して、確認した行をレポートに書く。

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/options/ai-section.ts src/entrypoints/options/index.html src/entrypoints/options/main.ts wxt.config.ts
git commit -m "feat: 設定ページに AI プロバイダの設定とオプショナル権限の要求を追加"
```

---

### Task 9: ドキュメントと手動確認

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-10-03-jushoai-design.md`, `docs/superpowers/specs/2026-10-04-cloud-llm-providers-design.md`

- [ ] **Step 1: README を更新する**

`README.md` の `## AI 判定を使うには` セクション全体を次に置き換える（以降の `## 構成` はそのまま）。構成の箇条書きに `src/ai/` の行を追加する: `- \`src/ai/\` AI プロバイダの設定・API キーの暗号化・クラウド分類器`。

```markdown
## AI 判定を使うには

ルールで判定できない欄だけ、AI で補助できる。初期状態は「使わない」で、設定ページの「AI 判定」でプロバイダを選ぶ。AI が使えなくてもルールによる入力は動作する。

- OpenAI 互換 API: ベース URL・モデル名・API キーを入力する。OpenAI / Groq / Mistral / Ollama / LM Studio はプリセットからベース URL を埋められる
- Google Gemini: モデル名・API キーを入力する
- ブラウザ内蔵 AI: Chrome（Gemini Nano）または Edge（Phi-mini）。フラグの有効化と再起動が必要
  - Chrome: `chrome://flags/#prompt-api-for-gemini-nano`
  - Edge: `edge://flags/#edge-llm-prompt-api-for-phi-mini`

保存すると、選んだプロバイダへの通信の許可をブラウザが確認する。許可しないと AI は使われない。接続テストで設定を確認できる。

### 送信されるデータ

AI を使う設定にした場合、ルールで判定できない入力欄のメタデータ（name・label・placeholder・見出し・type・maxlength）が、選んだプロバイダに送られる。プロファイルの値や、欄にすでに入っている値は送らない。API キーは暗号化して保存する（ストレージだけが流出しても復号できないが、この拡張機能自身のコードからは読み出せる）。

Ollama を使う場合は、Ollama 側の `OLLAMA_ORIGINS` に `chrome-extension://<拡張機能の ID>` を許可する。

状態は「JushoAI で入力」の横のバッジに表示され、押すと原因と対処のガイドが開く。
```

- [ ] **Step 2: CLAUDE.md を更新する**

`CLAUDE.md` の「プロジェクト概要」の `個人情報は外部に送信しない。` を `プロファイルの値は外部に送信しない（AI を使う設定にした場合のみ、欄のメタデータが選択したプロバイダに送られる）。` に置き換える。

「アーキテクチャ」の `**Prompt API は Service Worker ...` の項目の後ろに次を追加する。

```markdown
- **AI プロバイダは設定で 1 つ選ぶ。** `none`（初期値）/ `built-in` / `openai` / `gemini`。background の `handleMessage`（`src/llm/handle-message.ts`）が設定に応じて `FieldClassifier` を選び、クラウドは `src/ai/http-classifiers.ts` が `fetch` する。API キーは `src/ai/secret-store.ts` の AES-GCM エンベロープで保存し、background だけが復号する（Content Script と設定ページには「保存済みか」だけ渡す）。通信先の host 権限は `optional_host_permissions` で、設定ページの保存時に要求する。ベース URL は `src/ai/settings.ts` の `validateBaseUrl` で検証する（https のみ、http は localhost / 127.0.0.1 のみ、内部アドレス拒否）。
```

- [ ] **Step 3: 古い設計書を現状に合わせる**

`docs/superpowers/specs/2026-10-03-jushoai-design.md` の「MVP に含めない」にある `- クラウド LLM への切り替え` の行を、`- クラウド LLM プロバイダ（別設計: \`2026-10-04-cloud-llm-providers-design.md\`）` に置き換える。

`docs/superpowers/specs/2026-10-04-cloud-llm-providers-design.md` の「通信」の `http` の項目の括弧内 `（\`localhost\`、\`127.0.0.1\`、\`[::1]\`）` を `（\`localhost\` と \`127.x.x.x\`。IPv6 のループバックは許可しない）` に直す。同じ節の `optional_host_permissions` の記述は `（\`https://*/*\`、\`http://localhost/*\`、\`http://127.0.0.1/*\`）` に直す。

- [ ] **Step 4: 全体を確認して Commit する**

Run: `make check`
Expected: 全テスト PASS、型エラーなし、ビルド成功

```bash
git add README.md CLAUDE.md docs/superpowers/specs/2026-10-03-jushoai-design.md docs/superpowers/specs/2026-10-04-cloud-llm-providers-design.md
git commit -m "docs: AI プロバイダの設定方法と送信データの説明を追加"
```

- [ ] **Step 5: 手動確認（人が実ブラウザで行う。実装者は行わない）**

準備: `make build` のあと、Chrome または Edge で `dist/chrome-mv3` を読み込み、設定ページでプロファイルと住所を登録する。`samples/single-field-form.html` を `file://` で開く（拡張機能の「ファイルの URL へのアクセスを許可する」を有効にする）。

確認項目:

1. 初期状態でバッジが「AI: オフ」で、押すと「AI 判定はオフです」のガイドと「AI 設定を開く」ボタンが出る。ボタンで設定ページが開く
2. Ollama（またはお手元のローカル LLM サーバー）で: プリセット「Ollama」を選び、モデル名を入力して保存する。権限の確認ダイアログが出て、許可するとバッジが「AI: OpenAI 互換」になる。接続テストが成功する。`OLLAMA_ORIGINS` が未設定で拒否される場合は、接続テストが「接続に失敗しました」となり、README の案内で解決できる
3. OpenAI 互換のクラウド API（または Gemini）: ベース URL・モデル名・API キーを入力して保存し、権限を許可する。接続テストが成功する。`samples/single-field-form.html` の Residence / Handset が、プレビューに「AI判定」の印付きで現れる
4. API キーを間違えて接続テストすると「認証に失敗しました」となり、バッジが「AI 認証エラー」になる。キーを直して保存するとバッジが戻る
5. 権限の確認ダイアログで「ブロック」すると、バッジが「AI 権限なし」になり、ルールによる入力は引き続き動く
6. 保存後に設定ページを開き直すと、API キーは「保存済み」と表示され、値は見えない。「削除する」にチェックして保存するとキーが消える
7. DevTools の Network タブ（Service Worker のコンソールから）で、リクエスト本文にプロファイルの値や欄の現在値が含まれていないことを確認する

