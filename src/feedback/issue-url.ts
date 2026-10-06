import type { Category, FieldMeta } from '../core/types';

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

function fieldLine(meta: FieldMeta, snap: FeedbackSnapshot | undefined): string {
  const hint = [meta.label, meta.placeholder, meta.name].filter(Boolean).join(' / ').slice(0, 80);
  const cat = snap ? `${snap.category} (${snap.source})` : 'unknown';
  return `- ${meta.id}: ${hint} -> ${cat}`;
}

export function buildFeedbackIssueUrl(repo: string, input: FeedbackInput): string {
  const page = sanitizePageUrl(input.pageHref);
  const host = (() => {
    try {
      return new URL(input.pageHref).host;
    } catch {
      return 'unknown';
    }
  })();
  const title = `分類FB: 初回NG→LLM再分析OK (${host})`;
  const lines: string[] = [
    '初回では該当のURLは成功しなかったが、LLMで再分析したら成功した。',
    '',
    `- Page: ${page}`,
    `- Provider: ${input.provider}`,
    `- Extension version: ${input.version}`,
    '',
    '### Before (初回分類)',
    ...input.fields.map((m) => fieldLine(m, input.before.get(m.id))),
    '',
    '### After (LLM再分析)',
    ...input.fields.map((m) => fieldLine(m, input.after.get(m.id))),
    '',
    '### Field metadata (profile values are never included)',
    '```json',
    JSON.stringify(
      input.fields.map((m) => ({
        id: m.id,
        type: m.type,
        name: m.name,
        htmlId: m.htmlId,
        label: m.label,
        placeholder: m.placeholder,
        nearby: m.nearby,
        maxLength: m.maxLength,
      })),
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
    '注意: 公開 issue が開きます。プロファイルの値や住所の値は書かないでください。',
  ];
  const params = new URLSearchParams({
    title: '設定画面からの不具合報告',
    body: lines.join('\n'),
    labels: 'feedback',
  });
  return `${repo.replace(/\/$/, '')}/issues/new?${params.toString()}`;
}
