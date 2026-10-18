import { IS_FIREFOX, selectableProviders } from './browser-target';
import {
  DEFAULT_AI_SETTINGS, type AiSettings, type KeyPresence, type ProviderKind,
} from './types';
import { includesLiteral } from '../core/literals';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function normalizeAiSettings(raw: unknown, isFirefox: boolean = IS_FIREFOX): AiSettings {
  const r = isRecord(raw) ? raw : {};
  const openai = isRecord(r.openai) ? r.openai : {};
  const gemini = isRecord(r.gemini) ? r.gemini : {};
  const provider = includesLiteral(selectableProviders(isFirefox), r.provider)
    ? r.provider
    : 'none';
  return {
    provider,
    openai: { baseUrl: str(openai.baseUrl).replace(/\/+$/, ''), model: str(openai.model) },
    gemini: {
      model: str(gemini.model),
      apiVersion: str(gemini.apiVersion) || DEFAULT_AI_SETTINGS.gemini.apiVersion,
    },
  };
}

// Firefox has no Prompt API, so a stored built-in choice is normalized to none.
// Returns true only for the normalize before/after gap (built-in -> none) on
// Firefox, which is the case the options page must surface as a notice.
export function detectBuiltInFallback(raw: unknown, isFirefox: boolean = IS_FIREFOX): boolean {
  if (!isFirefox) return false;
  const r = isRecord(raw) ? raw : {};
  if (r.provider !== 'built-in') return false;
  return normalizeAiSettings(raw, isFirefox).provider === 'none';
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
  return isPrivateIpv4(h);
}

// Shared range decision so a resolved address is judged against exactly the ranges the
// lexical gate claims to enforce.
function isPrivateIpv4(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return (
    a === 0 || a === 10 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) ||
    (a === 198 && b >= 18 && b <= 19) || a >= 224
  );
}

// Both lexical decisions combined, for addresses that came out of a resolution: the
// lexical gate keeps loopback ranges in isLoopbackHost, but the hostname being resolved
// is not a loopback literal, so a resolved 127/8 must still be blocked.
function isInternalIpv4(ip: string): boolean {
  return isLoopbackHost(ip) || isPrivateIpv4(ip);
}

function isPrivateIpv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/%.+$/, '');
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v);
  if (mapped) return isInternalIpv4(mapped[1] ?? '');
  const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v);
  if (hexMapped) {
    const hi = parseInt(hexMapped[1] ?? '', 16);
    const lo = parseInt(hexMapped[2] ?? '', 16);
    // An unparseable answer cannot be vouched for, so it counts as internal (fail-closed).
    if (Number.isNaN(hi) || Number.isNaN(lo)) return true;
    return isInternalIpv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  if (v === '::' || v === '::1' || v === '0:0:0:0:0:0:0:1') return true;
  const first = v.split(':')[0] ?? '';
  const n = parseInt(first, 16);
  if (Number.isNaN(n)) return true;
  return (n >= 0xfc00 && n <= 0xfdff) || (n >= 0xfe80 && n <= 0xfebf);
}

export function isPrivateIp(ip: string): boolean {
  return ip.includes(':') ? isPrivateIpv6(ip) : isInternalIpv4(ip);
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

// MV3 service workers have no DNS API, so resolution goes through a DoH JSON API pinned
// to a fixed trusted origin; a caller-chosen resolver would open a new SSRF surface.
export const DOH_ORIGIN = 'https://dns.google/resolve';
// The permission counterpart of DOH_ORIGIN: the resolver host as a match pattern. The dial
// only hits /resolve, but the requested grant is the resolver origin so the prompt names
// the host the extension actually needs to reach for verification.
export const DOH_PERMISSION_PATTERN = 'https://dns.google/*';
export const DOH_TIMEOUT_MS = 3_000;

export interface ResolveDeps {
  fetch: typeof fetch;
  timeoutMs?: number;
}

const DNS_TYPE_IDS = { A: 1, AAAA: 28 } as const;

// Empty or non-zero Status answers contribute no addresses; the caller fails closed on
// any request failure or when no address was confirmed public.
async function dohQuery(host: string, type: keyof typeof DNS_TYPE_IDS, deps: ResolveDeps): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? DOH_TIMEOUT_MS);
  try {
    const res = await deps.fetch(`${DOH_ORIGIN}?name=${encodeURIComponent(host)}&type=${type}`, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      headers: { accept: 'application/dns-json' },
    });
    if (!res.ok) throw new Error(`doh http ${res.status}`);
    const json = (await res.json()) as { Status?: number; Answer?: { type?: number; data?: unknown }[] };
    if (typeof json.Status === 'number' && json.Status !== 0) return [];
    return (json.Answer ?? [])
      .filter((a) => a.type === DNS_TYPE_IDS[type] && typeof a.data === 'string' && a.data !== '')
      .map((a) => a.data as string);
  } finally {
    clearTimeout(timer);
  }
}

async function resolveHostAddresses(host: string, deps: ResolveDeps): Promise<string[]> {
  const [v4, v6] = await Promise.allSettled([dohQuery(host, 'A', deps), dohQuery(host, 'AAAA', deps)]);
  // Any request failure or a name with no confirmed address throws, so the caller never
  // receives an answer set that was not confirmed public.
  if (v4.status === 'rejected' || v6.status === 'rejected') throw new Error('dns resolution failed');
  const addresses = [...v4.value, ...v6.value];
  if (addresses.length === 0) throw new Error('dns resolution failed');
  return addresses;
}

// The verdict shape both gates read. A resolved internal address is `internal`; an
// unresolvable result (unreachable, empty answer, timeout) follows EGRESS_UNVERIFIED_POLICY.
export type EgressVerdict = { ok: true } | { ok: false; internal: boolean };
export type EgressCheck = (url: URL) => Promise<EgressVerdict>;

// The single declaration of the egress policy: an unconfirmed resolution never dials
// (fail-closed). verdictOf reads this value, and tests/build/host-permission-coverage.build.ts
// asserts the declaration and the gate behavior agree. Switching to 'proceed' restores the
// pre-0.1.13 fail-open and fails those tests.
export type EgressUnverifiedPolicy = 'block' | 'proceed';
export const EGRESS_UNVERIFIED_POLICY: EgressUnverifiedPolicy = 'block';

// An empty answer set (nothing could be confirmed) blocks the dial just like an internal
// address, per EGRESS_UNVERIFIED_POLICY.
function verdictOf(addresses: string[]): EgressVerdict {
  if (addresses.some((ip) => isPrivateIp(ip))) return { ok: false, internal: true };
  if (addresses.length === 0) {
    return EGRESS_UNVERIFIED_POLICY === 'block' ? { ok: false, internal: false } : { ok: true };
  }
  return { ok: true };
}

// Dial-time gate over the same ranges as the lexical gate. Every call resolves the
// host again (per-call): a verdict is never carried into the next call, so a flip to
// an internal address after one check is caught by the next dial. The background keeps
// one check instance for wiring, but it holds no cache. One dial costs one resolution
// round trip (A + AAAA queries); a compat retry resolves again, so one classify costs
// at most two round trips. This cost is accepted: there is no cache to reintroduce.
//
// Residual risk (accepted, documented): the check resolves through the pinned DoH
// origin while fetch uses the platform resolver, and fetch cannot pin an IP, so a
// check-to-use gap remains within one attempt. An operator of the configured base
// URL who answers differently per resolver can slip through. Mitigations in place:
// the check runs immediately before its fetch with nothing awaited in between, and
// the settings page asks for trustworthy provider URLs only. Do not weaken either.
export function createEgressCheck(deps: ResolveDeps): EgressCheck {
  return async (url: URL): Promise<EgressVerdict> => {
    const host = normalizeHost(url.hostname);
    if (isLoopbackHost(host)) return { ok: true };
    if (isPrivateHost(host)) return { ok: false, internal: true };
    // Literal IPv4 hosts need no resolution; the lexical private ranges already cover them.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return { ok: true };
    // An unresolvable result (unreachable, empty answer, timeout) blocks the dial per the
    // policy above. Nothing is cached, so each dial pays its own resolution delay.
    let addresses: string[] = [];
    try {
      addresses = await resolveHostAddresses(host, deps);
    } catch {
      addresses = [];
    }
    return verdictOf(addresses);
  };
}

// The permission pattern is written without a port on purpose: the same code runs on
// Chrome and Firefox, and Firefox match patterns cannot include a port (bug 1362809).
// A port-less pattern matches every port on the host, so consenting to one endpoint
// grants the whole host. Actual sends stay limited to the saved base URL: fetch uses
// cfg.baseUrl as-is, and the key re-entry check compares full origins (port included).
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

const RESOLVED_INTERNAL_MESSAGE = '接続先が内部ネットワークのアドレスに解決されるため指定できません';
const RESOLVE_FAILED_MESSAGE = '接続先のアドレスを解決できなかったため、指定できません';

export async function validateBaseUrlResolved(input: string, deps: ResolveDeps): Promise<UrlCheck> {
  const lexical = validateBaseUrl(input);
  if (!lexical.ok) return lexical;
  const verdict = await createEgressCheck(deps)(lexical.url);
  // The save-time gate is fail-closed too: a resolved internal address is the internal
  // error, an unresolvable result is the resolve-failed error. Both reject the save
  // (there is no warn-and-proceed path).
  if (!verdict.ok) {
    return { ok: false, reason: verdict.internal ? RESOLVED_INTERNAL_MESSAGE : RESOLVE_FAILED_MESSAGE };
  }
  return lexical;
}

export interface ResolvedSettingsCheck {
  errors: string[];
}

// Save-time validation including the resolved-address gate. The sync validateAiSettings
// stays lexical because origin patterns and cloud status need its timing. Both a confirmed
// internal resolution and an unresolvable endpoint reject the save (fail-closed).
export async function validateAiSettingsResolved(
  s: AiSettings,
  hasKey: KeyPresence,
  deps: ResolveDeps,
): Promise<ResolvedSettingsCheck> {
  const errors = validateAiSettings(s, hasKey);
  if (s.provider !== 'openai' || !s.openai.baseUrl) return { errors };
  const check = await validateBaseUrlResolved(s.openai.baseUrl, deps);
  if (check.ok) return { errors };
  if (!errors.includes(check.reason)) errors.push(check.reason);
  return { errors };
}
