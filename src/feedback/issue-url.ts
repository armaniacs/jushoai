import type { Category, FieldMeta } from '../core/types';
import { META_CLIP_LENGTH, toWireMeta, type MetaWire } from '../messages';

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

// The public issue body carries less than the local audit log: only the
// origin and the first path segment, so deep path identifiers never leave
// the machine. nearby/label text can still hold page-rendered personal data,
// which the consent wording calls out instead of trying to detect.
export function publicPageLabel(href: string): string {
  try {
    const u = new URL(href);
    const first = u.pathname.split('/').filter(Boolean)[0];
    return first ? `${u.origin}/${first}` : u.origin;
  } catch {
    return 'unknown';
  }
}

function clippedMeta(m: FieldMeta): MetaWire {
  const w = toWireMeta(m);
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

export function buildFeedbackIssueUrl(repo: string, input: FeedbackInput): string {
  const page = publicPageLabel(input.pageHref);
  const host = (() => {
    try {
      return new URL(input.pageHref).host;
    } catch {
      return 'unknown';
    }
  })();
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
