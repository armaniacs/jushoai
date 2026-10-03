import { describe, expect, it } from 'vitest';
import { needsKeyReentry } from '../../src/ai/key-reentry';

const base = {
  savedBaseUrl: 'https://api.openai.com/v1',
  newBaseUrl: 'https://api.openai.com/v1',
  hadKey: true,
  typedKey: '',
  removing: false,
};

describe('needsKeyReentry', () => {
  it('same origin with a different path does not need re-entry', () => {
    expect(needsKeyReentry({ ...base, newBaseUrl: 'https://api.openai.com/v2/other' })).toBe(false);
  });
  it('different host needs re-entry', () => {
    expect(needsKeyReentry({ ...base, newBaseUrl: 'https://api.groq.com/openai/v1' })).toBe(true);
  });
  it('different port needs re-entry', () => {
    expect(needsKeyReentry({ ...base, newBaseUrl: 'https://api.openai.com:8443/v1' })).toBe(true);
  });
  it('different scheme needs re-entry', () => {
    expect(needsKeyReentry({ ...base, newBaseUrl: 'http://api.openai.com/v1' })).toBe(true);
  });
  it('no saved key does not need re-entry', () => {
    expect(needsKeyReentry({ ...base, hadKey: false, newBaseUrl: 'https://other.example/v1' })).toBe(false);
  });
  it('a newly typed key does not need re-entry', () => {
    expect(needsKeyReentry({ ...base, typedKey: 'sk-new', newBaseUrl: 'https://other.example/v1' })).toBe(false);
  });
  it('removing the key does not need re-entry', () => {
    expect(needsKeyReentry({ ...base, removing: true, newBaseUrl: 'https://other.example/v1' })).toBe(false);
  });
  it('unparsable URLs do not need re-entry', () => {
    expect(needsKeyReentry({ ...base, newBaseUrl: 'not a url' })).toBe(false);
    expect(needsKeyReentry({ ...base, savedBaseUrl: '' , newBaseUrl: 'https://other.example/v1' })).toBe(false);
  });
  it('trailing slash and case-only differences do not need re-entry', () => {
    expect(needsKeyReentry({ ...base, newBaseUrl: 'HTTPS://API.OPENAI.COM/v1/' })).toBe(false);
  });
});
