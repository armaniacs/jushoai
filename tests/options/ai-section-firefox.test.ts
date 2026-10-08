import { describe, it, expect } from 'vitest';
import { extensionOriginHint, providerOptions } from '../../src/entrypoints/options/ai-section';

describe('providerOptions', () => {
  it('lists built-in outside Firefox', () => {
    expect(providerOptions(false).map((o) => o.value)).toEqual(['none', 'built-in', 'openai', 'gemini']);
  });

  it('omits built-in on Firefox', () => {
    expect(providerOptions(true).map((o) => o.value)).toEqual(['none', 'openai', 'gemini']);
  });
});

describe('extensionOriginHint', () => {
  it('names the origin for Ollama on Chromium', () => {
    expect(extensionOriginHint('chrome-extension://abc', false)).toBe(
      'Ollama を使う場合は、Ollama 側の OLLAMA_ORIGINS に chrome-extension://abc を許可してください。',
    );
  });

  it('warns on Firefox that the origin changes per install', () => {
    const text = extensionOriginHint('moz-extension://1234', true);
    expect(text).toContain('OLLAMA_ORIGINS に moz-extension://1234 を許可してください。');
    expect(text).toContain('インストールごとに変わる');
  });
});
