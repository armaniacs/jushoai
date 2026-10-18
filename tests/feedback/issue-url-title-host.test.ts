import { describe, it, expect } from 'vitest';
import {
  buildFeedbackIssueUrl,
  titleHostLabel,
  type FeedbackInput,
} from '../../src/feedback/issue-url';
import type { FieldMeta } from '../../src/core/types';

const meta = (id: string): FieldMeta => ({
  id, tag: 'input', type: 'text', name: 'sei', htmlId: 'sei',
  autocomplete: '', label: 'お名前', placeholder: '未来', nearby: '',
  maxLength: null, pattern: '', options: [], readOnly: false, disabled: false,
  value: 'SECRET-PROFILE-VALUE',
});

const input = (pageHref: string): FeedbackInput => ({
  pageHref,
  provider: 'openai',
  version: '0.1.9',
  before: new Map(),
  after: new Map(),
  fields: [meta('jai-0')],
});

const titleOf = (pageHref: string): string => {
  const u = new URL(buildFeedbackIssueUrl('https://github.com/armaniacs/jushoai', input(pageHref)));
  return u.searchParams.get('title') ?? '';
};

describe('titleHostLabel (PBI-17)', () => {
  it('通常ホストはそのまま残す', () => {
    expect(titleHostLabel('https://example.com/form')).toBe('example.com');
  });

  it('サブドメインはeTLD+1に最小化する', () => {
    expect(titleHostLabel('https://sub.example.com/x')).toBe('example.com');
  });

  it('ccTLDの第二レベル (co.jp相当) を保つ', () => {
    expect(titleHostLabel('https://pro.form-mailer.jp/fms/abc')).toBe('form-mailer.jp');
  });

  it('ポートを除去する', () => {
    expect(titleHostLabel('https://example.com:8080/x')).toBe('example.com');
  });

  it('社内単一ラベルはハッシュ化し完全形を残さない', () => {
    const label = titleHostLabel('http://intranet-app/form');
    expect(label).toMatch(/^hash-[0-9a-f]{8}$/);
    expect(label).not.toContain('intranet-app');
  });

  it('.localホストはハッシュ化する', () => {
    const label = titleHostLabel('http://printer.local/');
    expect(label).toMatch(/^hash-[0-9a-f]{8}$/);
    expect(label).not.toContain('printer.local');
  });

  it('IPリテラルはハッシュ化しポートを残さない', () => {
    const label = titleHostLabel('http://192.168.1.10:3000/');
    expect(label).toMatch(/^hash-[0-9a-f]{8}$/);
    expect(label).not.toContain('192.168.1.10');
    expect(label).not.toContain(':3000');
  });

  it('不正URL・空ホストはunknownフォールバックになる', () => {
    expect(titleHostLabel('not a url')).toBe('unknown');
    expect(titleHostLabel('')).toBe('unknown');
  });
});

describe('buildFeedbackIssueUrl title (PBI-17 BDD)', () => {
  it('題名から完全ホスト名とポートが除去される', () => {
    const title = titleOf('https://app.team.example.com:8443/entry/abc');
    expect(title).toContain('example.com');
    expect(title).not.toContain('app.team.example.com');
    expect(title).not.toContain(':8443');
  });

  it('社内名・ポート付きでも題名に完全形が残らない', () => {
    const title = titleOf('http://intranet-app:3000/form');
    expect(title).not.toContain('intranet-app');
    expect(title).not.toContain(':3000');
    expect(title).toMatch(/\(hash-[0-9a-f]{8}\)/);
  });

  it('不正URLでは題名が安全なフォールバックになる', () => {
    expect(titleOf('not a url')).toContain('(unknown)');
  });

  it('本文の最小表示は維持される (Page行はorigin+先頭セグメントのみ)', () => {
    const u = new URL(buildFeedbackIssueUrl('https://github.com/armaniacs/jushoai', input('https://pro.form-mailer.jp/fms/abc123?token=secret#x')));
    const body = u.searchParams.get('body') ?? '';
    expect(body).toContain('https://pro.form-mailer.jp/fms');
    expect(body).not.toContain('abc123');
    expect(body).not.toContain('token=secret');
  });

  it('同意文言と整合する (値は送らずURLの一部のみが含まれる)', () => {
    // preview.ts: 「プロファイルの値は送りませんが、ページの見出し文言と URL の一部が含まれます」
    const u = new URL(buildFeedbackIssueUrl('https://github.com/armaniacs/jushoai', input('https://example.com/form')));
    const title = u.searchParams.get('title') ?? '';
    const body = u.searchParams.get('body') ?? '';
    expect(title).toContain('開発に報告');
    expect(title).toContain('AIで分析');
    expect(title).not.toContain('SECRET-PROFILE-VALUE');
    expect(body).not.toContain('SECRET-PROFILE-VALUE');
  });
});
