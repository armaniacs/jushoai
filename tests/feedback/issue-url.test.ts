import { describe, it, expect } from 'vitest';
import { buildFeedbackIssueUrl, buildPartialIssueUrl, sanitizePageUrl } from '../../src/feedback/issue-url';
import type { PublicUrl } from '../../src/feedback/issue-url';
import type { FieldMeta } from '../../src/core/types';

const meta = (id: string): FieldMeta => ({
  id, tag: 'input', type: 'text', name: 'sei', htmlId: 'sei',
  autocomplete: '', label: 'お名前', placeholder: '未来', nearby: '',
  maxLength: null, pattern: '', options: [], readOnly: false, disabled: false,
  value: 'SECRET-PAGE-VALUE',
});

describe('sanitizePageUrl', () => {
  it('strips query and hash', () => {
    expect(sanitizePageUrl('https://example.com/form?a=1#top')).toBe('https://example.com/form');
  });
});

describe('buildFeedbackIssueUrl', () => {
  it('builds a prefilled issue url without profile values', () => {
    const url = buildFeedbackIssueUrl('https://github.com/armaniacs/jushoai', {
      pageHref: 'https://pro.form-mailer.jp/fms/abc?token=secret#x',
      provider: 'openai',
      version: '0.1.2',
      before: new Map([['jai-0', { category: 'unknown', source: 'rule' }]]),
      after: new Map([['jai-0', { category: 'lastName', source: 'llm' }]]),
      fields: [meta('jai-0')],
    });
    const u = new URL(url);
    expect(`${u.origin}${u.pathname}`).toBe('https://github.com/armaniacs/jushoai/issues/new');
    expect(u.searchParams.get('labels')).toBe('feedback');
    const body = u.searchParams.get('body') ?? '';
    expect(body).toContain('初回では入力できなかったが、AIで分析したら成功した');
    expect(body).toContain('開発に報告する');
    expect(body).not.toContain('FB');
    expect(body).toContain('https://pro.form-mailer.jp/fms');
    expect(body).not.toContain('/fms/abc');
    expect(body).not.toContain('token=secret');
    expect(body).not.toContain('SECRET-PAGE-VALUE');
    expect(body).toContain('unknown (rule)');
    expect(body).toContain('lastName (llm)');
  });

  it('uses AI wording without LLM in title and body', () => {
    const url = buildFeedbackIssueUrl('https://github.com/armaniacs/jushoai', {
      pageHref: 'https://example.com/form?x=1',
      provider: 'openai',
      version: '0.1.7',
      before: new Map([['jai-0', { category: 'unknown', source: 'rule' }]]),
      after: new Map([['jai-0', { category: 'email', source: 'llm' }]]),
      fields: [meta('jai-0')],
    });
    const u = new URL(url);
    expect(u.searchParams.get('title')).toContain('AIで分析');
    expect(u.searchParams.get('title')).toContain('開発に報告');
    expect(u.searchParams.get('title')).not.toContain('FB');
    expect(u.searchParams.get('title')).not.toContain('LLM');
    expect(u.searchParams.get('body')).not.toContain('LLM');
  });
});

describe('buildPartialIssueUrl', () => {
  it('builds a breakdown-only issue without values, snapshots, or metadata', () => {
    const url = buildPartialIssueUrl('https://github.com/armaniacs/jushoai/', {
      pageHref: 'https://pro.form-mailer.jp/fms/abc?token=secret#x',
      provider: 'none',
      version: '0.1.20',
      filled: 1,
      unapplied: 2,
      total: 3,
      byResult: { filled: 1, 'skipped-status': 1, 'already-filled': 1, 'no-option': 0, error: 0 },
    });
    const u = new URL(url);
    expect(`${u.origin}${u.pathname}`).toBe('https://github.com/armaniacs/jushoai/issues/new');
    expect(u.searchParams.get('labels')).toBe('feedback');
    const title = u.searchParams.get('title') ?? '';
    expect(title).toContain('部分適用の内訳報告');
    const body = u.searchParams.get('body') ?? '';
    expect(body).toContain('Applied: 1 / 3');
    expect(body).toContain('見送り（仕様どおり）: 1件');
    expect(body).toContain('入力済みのため見送り: 1件');
    // Zero-count reasons stay out; no PII-bearing sections exist.
    expect(body).not.toContain('no-option');
    expect(body).not.toContain('Before');
    expect(body).not.toContain('Field metadata');
    expect(body).not.toContain('SECRET');
    expect(body).not.toContain('token=secret');
  });
});

describe('PublicUrl (PBI-63)', () => {
  it('rejects raw hrefs and audit-style strings at compile time', () => {
    const raw = 'https://example.com/form?token=secret';
    // @ts-expect-error: raw hrefs must go through publicPageLabel first
    const _: PublicUrl = raw;
    expect(_).toBe(raw);
  });
});
