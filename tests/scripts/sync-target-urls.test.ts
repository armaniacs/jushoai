import { describe, it, expect } from 'vitest';
import { parseRegistry, stampRegistry } from '../../scripts/sync-target-urls.mjs';

describe('sync-target-urls registry', () => {
  const md = `# Target URLs\n\n- https://example.com/a → a.html\n- https://example.com/b\n`;
  it('parses mapped and unmapped URLs', () => {
    expect(parseRegistry(md)).toEqual([
      { url: 'https://example.com/a', file: 'a.html' },
      { url: 'https://example.com/b', file: null },
    ]);
  });
  it('stamps the mapping onto the bare line', () => {
    const next = stampRegistry(md, 'https://example.com/b', 'b.html');
    expect(next).toContain('- https://example.com/b → b.html');
    expect(parseRegistry(next)).toContainEqual({ url: 'https://example.com/b', file: 'b.html' });
  });
  it('appends unknown URLs', () => {
    expect(stampRegistry(md, 'https://example.com/c', 'c.html')).toContain('- https://example.com/c → c.html');
  });
});
