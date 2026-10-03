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
