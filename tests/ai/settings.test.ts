import { describe, it, expect } from 'vitest';
import {
  isLoopbackHost, normalizeAiSettings, originPattern, validateAiSettings, validateBaseUrl, normalizeHost,
} from '../../src/ai/settings';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

describe('normalizeAiSettings', () => {
  it('returns defaults for non-objects', () => {
    expect(normalizeAiSettings(undefined)).toEqual(DEFAULT_AI_SETTINGS);
    expect(normalizeAiSettings('x')).toEqual(DEFAULT_AI_SETTINGS);
    expect(normalizeAiSettings([])).toEqual(DEFAULT_AI_SETTINGS);
  });

  it('rejects unknown providers and trims strings', () => {
    const s = normalizeAiSettings({
      provider: 'evil',
      openai: { baseUrl: ' https://api.openai.com/v1/// ', model: ' m ' },
      gemini: { model: ' g ', apiVersion: ' ' },
    });
    expect(s.provider).toBe('none');
    expect(s.openai).toEqual({ baseUrl: 'https://api.openai.com/v1', model: 'm' });
    expect(s.gemini).toEqual({ model: 'g', apiVersion: 'v1beta' });
  });

  it('keeps a valid provider', () => {
    expect(normalizeAiSettings({ provider: 'gemini' }).provider).toBe('gemini');
  });
});

describe('isLoopbackHost', () => {
  it.each([
    ['localhost', true],
    ['127.0.0.1', true],
    ['127.1.2.3', true],
    ['example.com', false],
    ['192.168.0.1', false],
    ['127.0.0.1.evil.com', false],
  ])('%s -> %s', (host, expected) => {
    expect(isLoopbackHost(host)).toBe(expected);
  });
});

describe('validateBaseUrl', () => {
  it.each([
    'https://api.openai.com/v1',
    'https://api.groq.com/openai/v1',
    'http://localhost:11434/v1',
    'http://127.0.0.1:1234/v1',
    'https://localhost:8443/v1',
  ])('accepts %s', (url) => {
    expect(validateBaseUrl(url).ok).toBe(true);
  });

  it.each([
    ['not a url', 'URL の形式'],
    ['ftp://example.com/v1', 'https'],
    ['http://example.com/v1', 'http は'],
    ['http://192.168.0.5:11434/v1', 'http は'],
    ['https://192.168.0.5/v1', '内部ネットワーク'],
    ['https://10.0.0.1/v1', '内部ネットワーク'],
    ['https://172.16.0.1/v1', '内部ネットワーク'],
    ['https://169.254.169.254/latest', '内部ネットワーク'],
    ['https://100.64.0.1/v1', '内部ネットワーク'],
    ['https://0.0.0.0/v1', '内部ネットワーク'],
    ['https://[fd00::1]/v1', '内部ネットワーク'],
    ['https://[fe80::1]/v1', '内部ネットワーク'],
    ['https://[::ffff:10.0.0.1]/v1', '内部ネットワーク'],
    ['https://printer.local/v1', '内部ネットワーク'],
    ['https://svc.internal/v1', '内部ネットワーク'],
    ['https://user:pass@api.openai.com/v1', '認証情報'],
    ['https://api.openai.com/v1?key=1', 'クエリ'],
    ['https://api.openai.com/v1#x', 'クエリ'],
  ])('rejects %s', (url, fragment) => {
    const r = validateBaseUrl(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(fragment);
  });
});

describe('originPattern', () => {
  it('uses protocol and hostname without the port', () => {
    expect(originPattern('https://api.groq.com/openai/v1')).toBe('https://api.groq.com/*');
    expect(originPattern('http://localhost:11434/v1')).toBe('http://localhost/*');
  });

  it('returns null for invalid URLs', () => {
    expect(originPattern('http://example.com/v1')).toBeNull();
  });
});

describe('validateAiSettings', () => {
  const base: AiSettings = {
    provider: 'openai',
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
    gemini: { model: 'g', apiVersion: 'v1beta' },
  };
  const noKeys = { openai: false, gemini: false };
  const keys = { openai: true, gemini: true };

  it('accepts none and built-in without anything', () => {
    expect(validateAiSettings({ ...base, provider: 'none' }, noKeys)).toEqual([]);
    expect(validateAiSettings({ ...base, provider: 'built-in' }, noKeys)).toEqual([]);
  });

  it('requires base URL, model and key for a remote OpenAI-compatible provider', () => {
    expect(validateAiSettings(base, keys)).toEqual([]);
    expect(validateAiSettings(base, noKeys)).toEqual(['API キーを入力してください']);
    expect(validateAiSettings({ ...base, openai: { baseUrl: '', model: '' } }, keys)).toEqual([
      'ベース URL を入力してください',
      'モデル名を入力してください',
    ]);
  });

  it('does not require a key for loopback endpoints', () => {
    const local: AiSettings = { ...base, openai: { baseUrl: 'http://localhost:11434/v1', model: 'm' } };
    expect(validateAiSettings(local, noKeys)).toEqual([]);
  });

  it('validates Gemini fields', () => {
    const g: AiSettings = { ...base, provider: 'gemini' };
    expect(validateAiSettings(g, keys)).toEqual([]);
    expect(validateAiSettings({ ...g, gemini: { model: '', apiVersion: 'x' } }, noKeys)).toEqual([
      'モデル名を入力してください',
      'API バージョンは v1beta のように指定してください',
      'API キーを入力してください',
    ]);
  });
});

describe('normalizeHost', () => {
  it('lowercases and strips one trailing dot', () => {
    expect(normalizeHost('LOCALHOST')).toBe('localhost');
    expect(normalizeHost('LOCALHOST.')).toBe('localhost');
    expect(normalizeHost('localhost.')).toBe('localhost');
    expect(normalizeHost('API.OpenAI.COM.')).toBe('api.openai.com');
    expect(normalizeHost('localhost..')).toBe('localhost.');
  });
});

describe('isLoopbackHost - security bypass fixes', () => {
  it('recognizes localhost with trailing dot as loopback', () => {
    expect(isLoopbackHost('localhost.')).toBe(true);
    expect(isLoopbackHost('LOCALHOST.')).toBe(true);
  });

  it('rejects *.localhost subdomains', () => {
    expect(isLoopbackHost('foo.localhost')).toBe(false);
    expect(isLoopbackHost('api.localhost')).toBe(false);
    expect(isLoopbackHost('127.localhost')).toBe(false);
  });

  it('recognizes 127.x.x.x as loopback with normalization', () => {
    expect(isLoopbackHost('127.0.0.1.')).toBe(true);
    expect(isLoopbackHost('127.1.2.3.')).toBe(true);
  });
});

describe('validateBaseUrl - security bypass fixes', () => {
  it('rejects trailing-dot domain bypass for .local/.internal', () => {
    const r1 = validateBaseUrl('https://metadata.google.internal./v1');
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.reason).toContain('内部ネットワーク');
    const r2 = validateBaseUrl('https://printer.local./v1');
    expect(r2.ok).toBe(false);
  });

  it('rejects *.localhost subdomains consistently', () => {
    expect(validateBaseUrl('https://localhost./v1').ok).toBe(true);
    expect(validateBaseUrl('https://foo.localhost/v1').ok).toBe(false);
    expect(validateBaseUrl('http://foo.localhost/v1').ok).toBe(false);
  });

  it('rejects all bracketed IPv6 literals', () => {
    const ipv6Cases = [
      'https://[::1]/v1',
      'https://[::]/v1',
      'https://[fec0::1]/v1',
      'https://[64:ff9b::a00:1]/v1',
      'https://[::127.0.0.1]/v1',
      'https://[::7f00:1]/v1',
    ];
    ipv6Cases.forEach(url => {
      const r = validateBaseUrl(url);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toContain('内部ネットワーク');
    });
  });

  it('rejects special-use IPv4 ranges', () => {
    const specialRanges = [
      'https://192.0.0.1/v1',
      'https://192.0.0.254/v1',
      'https://198.18.0.1/v1',
      'https://198.19.255.254/v1',
      'https://224.0.0.1/v1',
      'https://240.0.0.1/v1',
      'https://255.255.255.255/v1',
    ];
    specialRanges.forEach(url => {
      const r = validateBaseUrl(url);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toContain('内部ネットワーク');
    });
  });

  it('accepts regression cases', () => {
    expect(validateBaseUrl('https://API.OPENAI.COM/v1').ok).toBe(true);
    expect(validateBaseUrl('https://api.openai.com:8443/v1').ok).toBe(true);
    expect(validateBaseUrl('https://api.openai.com/v1/').ok).toBe(true);
    expect(validateBaseUrl('https://xn--wgv71a.jp/v1').ok).toBe(true);
    expect(validateBaseUrl('https://172.32.0.1/v1').ok).toBe(true);
    expect(validateBaseUrl('https://100.128.0.1/v1').ok).toBe(true);
    expect(validateBaseUrl('https://2130706433/v1').ok).toBe(true);
    expect(validateBaseUrl('https://0xc0a80001/v1').ok).toBe(false);
    expect(validateBaseUrl('http://127.1/v1').ok).toBe(true);
  });

  it('normalizes hostnames in originPattern', () => {
    expect(originPattern('https://localhost./v1')).toBe('https://localhost/*');
    expect(originPattern('http://127.0.0.1:1234/v1')).toBe('http://127.0.0.1/*');
  });
});
