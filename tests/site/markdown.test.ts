// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderMarkdown, slugify } from '../../site/lib/markdown.ts';

const opts = { base: '/', copyLabel: 'コピー', copiedLabel: 'コピーしました' };

describe('slugify', () => {
  it('keeps letters and digits including Japanese, joins words with hyphens', () => {
    expect(slugify('AI プロバイダ の 設定')).toBe('ai-プロバイダ-の-設定');
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('!!!')).toBe('section');
  });
});

describe('renderMarkdown: headings', () => {
  it('adds unique ids and reports headings', () => {
    const r = renderMarkdown('# A\n## B\n## B\n### C', opts);
    expect(r.headings).toEqual([
      { level: 1, text: 'A', id: 'a' },
      { level: 2, text: 'B', id: 'b' },
      { level: 2, text: 'B', id: 'b-2' },
      { level: 3, text: 'C', id: 'c' },
    ]);
    expect(r.html).toContain('<h2 id="b-2">B</h2>');
  });
});

describe('renderMarkdown: code blocks', () => {
  it('wraps fences with a copy button and escapes content', () => {
    const r = renderMarkdown('```bash\nmake <build> && echo "x"\n```', { base: '/', copyLabel: 'Copy', copiedLabel: 'Copied' });
    expect(r.html).toContain('<div class="code">');
    expect(r.html).toContain('<button class="copy" type="button" data-copy data-done="Copied">Copy</button>');
    expect(r.html).toContain('make &lt;build&gt; &amp;&amp; echo &quot;x&quot;');
  });
});

describe('renderMarkdown: links', () => {
  it('prefixes absolute site paths with the base and collects raw hrefs', () => {
    const r = renderMarkdown('[a](/guides/privacy/) [b](#x) [c](mailto:a@b.c)', { base: '/JushoAI/', copyLabel: 'c', copiedLabel: 'd' });
    expect(r.html).toContain('href="/JushoAI/guides/privacy/"');
    expect(r.html).toContain('href="#x"');
    expect(r.html).toContain('href="mailto:a@b.c"');
    expect(r.links).toEqual(['/guides/privacy/', '#x', 'mailto:a@b.c']);
  });

  it('keeps the root base unchanged and opens external links safely', () => {
    const r = renderMarkdown('[a](/guides/x/) [e](https://example.com/p)', opts);
    expect(r.html).toContain('href="/guides/x/"');
    expect(r.html).toContain('href="https://example.com/p" target="_blank" rel="noopener noreferrer"');
  });
});

describe('renderMarkdown: raw HTML', () => {
  it('escapes raw HTML instead of passing it through', () => {
    const r = renderMarkdown('<script>alert(1)</script>', opts);
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
  });
});
