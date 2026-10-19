import type { Category, FieldMeta } from '../core/types';
import { fillResultLabel } from '../dom/fill-plan';
import { META_CLIP_LENGTH, encodeFieldMeta, type MetaWire } from '../messages';

export const FEEDBACK_REPO = 'https://github.com/armaniacs/jushoai';

export interface FeedbackSnapshot {
  category: Category;
  source: 'rule' | 'llm';
}

export interface FeedbackInput {
  pageHref: string;
  provider: string;
  version: string;
  before: Map<string, FeedbackSnapshot>;
  after: Map<string, FeedbackSnapshot>;
  fields: FieldMeta[];
}

export function sanitizePageUrl(href: string): string {
  try {
    const u = new URL(href);
    return u.origin + u.pathname;
  } catch {
    return '';
  }
}

// Branded public URL (PBI-63): the minimized label for issue bodies is a
// distinct type from raw hrefs and audit-log URLs, so mixing them into a
// public body is a compile error instead of a silent leak. The minimization
// functions themselves are intentionally NOT unified (different consumers
// need different policies); only the handoff is typed.
declare const publicUrlBrand: unique symbol;
export type PublicUrl = string & { readonly [publicUrlBrand]: 'PublicUrl' };

// The public issue body carries less than the local audit log: only the
// origin and the first path segment, so deep path identifiers never leave
// the machine. nearby/label text can still hold page-rendered personal data,
// which the consent wording calls out instead of trying to detect.
export function publicPageLabel(href: string): PublicUrl {
  try {
    const u = new URL(href);
    const first = u.pathname.split('/').filter(Boolean)[0];
    const label = first ? `${u.origin}/${first}` : u.origin;
    return label as PublicUrl;
  } catch {
    return 'unknown' as PublicUrl;
  }
}

function clippedMeta(m: FieldMeta): MetaWire {
  const w = encodeFieldMeta(m);
  const clip = (s: string) => s.slice(0, META_CLIP_LENGTH);
  return {
    ...w,
    name: clip(w.name),
    htmlId: clip(w.htmlId),
    label: clip(w.label),
    placeholder: clip(w.placeholder),
    nearby: clip(w.nearby),
  };
}

function fieldLine(meta: FieldMeta, snap: FeedbackSnapshot | undefined): string {
  const hint = [meta.label, meta.placeholder, meta.name].filter(Boolean).join(' / ').slice(0, META_CLIP_LENGTH);
  const cat = snap ? `${snap.category} (${snap.source})` : 'unknown';
  return `- ${meta.id}: ${hint} -> ${cat}`;
}

// Best-effort eTLD+1 without an external PSL: for 2-letter ccTLDs with a
// short second level (e.g. co.jp), keep 3 labels; otherwise keep 2.
function etldPlusOne(hostname: string): string {
  const labels = hostname.split('.');
  if (labels.length <= 2) return hostname;
  const tld = labels.at(-1) ?? '';
  const sld = labels.at(-2) ?? '';
  if (tld.length === 2 && sld.length <= 3) return labels.slice(-3).join('.');
  return labels.slice(-2).join('.');
}

// FNV-1a (32-bit) hex: deterministic, non-reversible short label for host
// names that have no meaningful eTLD+1 (intranet single labels, .local,
// literal IPs). Port-independent: callers pass URL.hostname, never .host.
function hashedHost(hostname: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < hostname.length; i++) {
    h ^= hostname.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `hash-${(h >>> 0).toString(16).padStart(8, '0')}`;
}

const NO_ETLD_SUFFIXES = new Set([
  'local',
  'internal',
  'intranet',
  'lan',
  'localdomain',
  'home',
  'corp',
  'test',
  'example',
  'invalid',
]);

// Minimized host label for the public issue title: eTLD+1 when it carries
// meaning, otherwise a short hash. Never includes the port (URL.hostname
// is used, not .host) and never returns the full hostname for subdomains.
export function titleHostLabel(href: string): string {
  let hostname: string;
  try {
    hostname = new URL(href).hostname.toLowerCase();
  } catch {
    return 'unknown';
  }
  if (hostname.endsWith('.')) hostname = hostname.slice(0, -1);
  if (!hostname) return 'unknown';
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  const isIpv6 = hostname.includes(':');
  if (isIpv4 || isIpv6) return hashedHost(hostname);
  const labels = hostname.split('.');
  if (labels.length < 2) return hashedHost(hostname);
  if (NO_ETLD_SUFFIXES.has(labels.at(-1) ?? '')) return hashedHost(hostname);
  return etldPlusOne(hostname);
}

export function buildFeedbackIssueUrl(repo: string, input: FeedbackInput): string {
  // Typed handoff (PBI-63): only a minimized public label reaches the body.
  const page: PublicUrl = publicPageLabel(input.pageHref);
  const host = titleHostLabel(input.pageHref);
  const title = `開発に報告: 初回NG→AIで分析OK (${host})`;
  const lines: string[] = [
    '初回では入力できなかったが、AIで分析したら成功した。「開発に報告する」から送る報告です。',
    '',
    `- Page: ${page}`,
    `- Provider: ${input.provider}`,
    `- Extension version: ${input.version}`,
    '',
    '### Before (初回分類)',
    ...input.fields.map((m) => fieldLine(m, input.before.get(m.id))),
    '',
    '### After (AIで分析)',
    ...input.fields.map((m) => fieldLine(m, input.after.get(m.id))),
    '',
    '### Field metadata (profile values are never included)',
    '```json',
    JSON.stringify(
      input.fields.map((m) => clippedMeta(m)),
      null,
      2,
    ),
    '```',
  ];
  const params = new URLSearchParams({
    title,
    body: lines.join('\n'),
    labels: 'feedback',
  });
  return `${repo.replace(/\/$/, '')}/issues/new?${params.toString()}`;
}

export function buildSettingsReportUrl(repo: string, version: string): string {
  const lines: string[] = [
    '設定画面または入力結果の問題を報告します。',
    '',
    `- Extension version: ${version || 'unknown'}`,
    '- 再現手順:',
    '  1. ',
    '  2. ',
    '- 期待する動作: ',
    '- 実際の動作: ',
    '',
    '注意: 公開 issue が開きます。プロファイルの値や住所の値は書かないでください。ページに表示された氏名・会員情報が欄の見出しに含まれる場合は削除してください。',
  ];
  const params = new URLSearchParams({
    title: '設定画面からの不具合報告',
    body: lines.join('\n'),
    labels: 'feedback',
  });
  return `${repo.replace(/\/$/, '')}/issues/new?${params.toString()}`;
}

// Partial-apply breakdown report (PBI-55): opened from the post-apply
// preview's report button with one click. The body carries the countable
// breakdown only (FillSummary.byResult) plus minimal context
// (page/provider/version) — no classification snapshots, no field metadata,
// and never profile values (counts cannot leak them by construction).
export interface PartialReportInput {
  pageHref: string;
  provider: string;
  version: string;
  filled: number;
  unapplied: number;
  total: number;
  // PBI-57: read-only — the report only reads the shared summary, so callers
  // cannot mutate a reused object through this input.
  byResult: Readonly<Record<string, number>>;
}

export function buildPartialIssueUrl(repo: string, input: PartialReportInput): string {
  const host = titleHostLabel(input.pageHref);
  const title = `部分適用の内訳報告 (${host})`;
  // Typed handoff (PBI-63): only a minimized public label reaches the body.
  const page: PublicUrl = publicPageLabel(input.pageHref);
  const breakdown = Object.entries(input.byResult)
    .filter(([, n]) => n > 0)
    .map(([result, n]) => `- ${fillResultLabel(result)}: ${n}件`);
  const lines: string[] = [
    '部分適用の内訳報告です。適用後プレビューの「内訳をissueで報告」から送る報告です。',
    '',
    `- Applied: ${input.filled} / ${input.total} (unapplied: ${input.unapplied})`,
    `- Page: ${page}`,
    `- Provider: ${input.provider}`,
    `- Extension version: ${input.version}`,
    '',
    '### Breakdown',
    ...breakdown,
  ];
  const params = new URLSearchParams({
    title,
    body: lines.join('\n'),
    labels: 'feedback',
  });
  return `${repo.replace(/\/$/, '')}/issues/new?${params.toString()}`;
}
