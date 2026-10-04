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

export function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/, '');
}

export function isLoopbackHost(hostname: string): boolean {
  const h = normalizeHost(hostname);
  if (h.endsWith('.localhost')) return false;
  if (h === 'localhost') return true;
  return /^127(\.\d{1,3}){3}$/.test(h);
}

// String checks cannot catch DNS names that resolve to private addresses (e.g. nip.io) or DNS rebinding.
function isPrivateHost(hostname: string): boolean {
  const h = normalizeHost(hostname);
  if (h.endsWith('.localhost')) return true;
  if (/\.(local|internal|lan|localdomain)$/.test(h) || h === 'home.arpa' || h.endsWith('.home.arpa')) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return (
      a === 0 || a === 10 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) ||
      (a === 198 && b >= 18 && b <= 19) || a >= 224
    );
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
  if (url.search || url.hash || /[?#]/.test(input)) return { ok: false, reason: 'クエリやフラグメントは指定できません' };

  const hostname = url.hostname;
  if (hostname.startsWith('[')) {
    return { ok: false, reason: 'IPv6 アドレスは指定できません（内部ネットワークのアドレスを含むため）' };
  }

  if (hostname.replace(/\.$/, '').split('.').some((label) => label === '')) {
    return { ok: false, reason: 'URL の形式が正しくありません' };
  }

  if (url.protocol === 'http:') {
    return isLoopbackHost(hostname)
      ? { ok: true, url }
      : { ok: false, reason: 'http は localhost / 127.0.0.1 のみ使えます。https の URL を指定してください' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'https の URL を指定してください' };
  if (!isLoopbackHost(hostname) && isPrivateHost(hostname)) {
    return { ok: false, reason: '内部ネットワークのアドレスは指定できません' };
  }
  if (!isLoopbackHost(hostname) && !normalizeHost(hostname).includes('.')) {
    return { ok: false, reason: 'ホスト名にはドメイン名を指定してください（内部ネットワークのホスト名は使えません）' };
  }
  return { ok: true, url };
}

// Host permission patterns ignore ports, so the pattern is protocol + hostname only.
export function originPattern(baseUrl: string): string | null {
  const check = validateBaseUrl(baseUrl);
  return check.ok ? `${check.url.protocol}//${normalizeHost(check.url.hostname)}/*` : null;
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
