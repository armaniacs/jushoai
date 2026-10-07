import { describe, it, expect } from 'vitest';
import { buildFeedbackIssueUrl, sanitizePageUrl, type FeedbackInput } from '../../src/feedback/issue-url';
import { META_CLIP_LENGTH } from '../../src/messages';
import type { FieldMeta } from '../../src/core/types';

// Locks the data-exposure surface flagged by Red Team (Medium) and
// Governance (Low) after the fix: the JSON metadata block clips human-text
// fields to META_CLIP_LENGTH like the display rows, and the public Page
// line carries only origin + first path segment (deep identifiers stay
// local). Short page-rendered text (nearby) can still appear; the consent
// wording tells the user to remove personal data before sending.

const meta = (id: string, extra: Partial<FieldMeta> = {}): FieldMeta => ({
  id, tag: 'input', type: 'text', name: 'sei', htmlId: 'sei',
  autocomplete: '', label: 'お名前', placeholder: '未来', nearby: '',
  maxLength: null, pattern: '', options: [], readOnly: false, disabled: false,
  value: 'SECRET-PROFILE-VALUE',
  ...extra,
});

const input = (pageHref: string, fields: FieldMeta[]): FeedbackInput => ({
  pageHref,
  provider: 'openai',
  version: '0.1.9',
  before: new Map(),
  after: new Map(),
  fields,
});

const bodyOf = (pageHref: string, fields: FieldMeta[]): string => {
  const u = new URL(buildFeedbackIssueUrl('https://github.com/armaniacs/jushoai', input(pageHref, fields)));
  return u.searchParams.get('body') ?? '';
};

describe('feedback JSON block clipping gap (Red Medium)', () => {
  it('clips the fieldLine display rows to META_CLIP_LENGTH', () => {
    const long = 'あ'.repeat(200);
    const body = bodyOf('https://example.com/form', [meta('jai-0', { label: long })]);
    const row = body.split('\n').find((l) => l.startsWith('- jai-0:')) ?? '';
    expect(row.length).toBeLessThanOrEqual(`- jai-0: ${'あ'.repeat(META_CLIP_LENGTH)} -> `.length + 'unknown'.length);
    expect(META_CLIP_LENGTH).toBe(80);
  });

  it('clips label/placeholder/nearby/name inside the JSON block too', () => {
    const long = 'あ'.repeat(200);
    const body = bodyOf('https://example.com/form', [
      meta('jai-0', { label: long, placeholder: long, nearby: long, name: long }),
    ]);
    // No 200-char run survives verbatim anywhere in the body.
    expect(body).not.toContain(long);
    expect(body).toContain('あ'.repeat(META_CLIP_LENGTH));
  });

  it('keeps short page-rendered text (consent wording covers removal)', () => {
    const body = bodyOf('https://example.com/form', [
      meta('jai-0', { nearby: '山田様の会員情報' }),
    ]);
    expect(body).toContain('山田様の会員情報');
  });
});

describe('public Page line carries origin + first segment only (Governance Low)', () => {
  it('strips query and hash (sanitizePageUrl keeps full path for the local audit log)', () => {
    expect(sanitizePageUrl('https://example.com/form?a=1#top')).toBe('https://example.com/form');
  });

  it('drops path-embedded identifiers from the public body', () => {
    const pageHref = 'https://example.com/entry/abc123?token=secret#x';
    const body = bodyOf(pageHref, [meta('jai-0')]);
    expect(body).toContain('https://example.com/entry');
    expect(body).not.toContain('abc123');
    expect(body).not.toContain('token=secret');
  });

  it('drops reset-style token paths from the public body', () => {
    const pageHref = 'https://example.com/reset/TOKEN-VALUE?x=1';
    const body = bodyOf(pageHref, [meta('jai-0')]);
    expect(body).toContain('https://example.com/reset');
    expect(body).not.toContain('TOKEN-VALUE');
  });
});

describe('profile values stay out of the feedback body', () => {
  it('never includes FieldMeta.value in title or body', () => {
    const url = buildFeedbackIssueUrl('https://github.com/armaniacs/jushoai', input('https://example.com/f', [meta('jai-0')]));
    const u = new URL(url);
    expect(u.searchParams.get('title')).not.toContain('SECRET-PROFILE-VALUE');
    expect(u.searchParams.get('body')).not.toContain('SECRET-PROFILE-VALUE');
  });
});
