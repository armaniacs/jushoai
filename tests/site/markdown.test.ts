// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderMarkdown, slugify } from '../../site/lib/markdown.ts';

const opts = { base: '/', copyLabel: 'コピー', copiedLabel: 'コピーしました', copyFailLabel: 'コピーできませんでした' };

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
    const r = renderMarkdown('```bash\nmake <build> && echo "x"\n```', { base: '/', copyLabel: 'Copy', copiedLabel: 'Copied', copyFailLabel: 'Copy failed' });
    expect(r.html).toContain('<div class="code">');
    expect(r.html).toContain('<button class="copy" type="button" data-copy data-done="Copied" data-fail="Copy failed">Copy</button>');
    expect(r.html).toContain('>Copy</button><span class="tip" role="status"></span>');
    expect(r.html).toContain('make &lt;build&gt; &amp;&amp; echo &quot;x&quot;');
  });

  it('exposes the scrolling pre as a named region including the fence language', () => {
    const r = renderMarkdown('```bash\necho hi\n```', opts);
    expect(r.html).toContain('<pre tabindex="0" role="region" aria-label="code: bash"><code>');
  });

  it('falls back to a neutral label when the fence has no language', () => {
    const r = renderMarkdown('```\nplain\n```', opts);
    expect(r.html).toContain('<pre tabindex="0" role="region" aria-label="code"><code>');
  });

  it('escapes the fence language used in the region name', () => {
    const r = renderMarkdown('```a"b\nx\n```', opts);
    expect(r.html).toContain('aria-label="code: a&quot;b"');
  });
});

describe('renderMarkdown: copy button label', () => {
  it('escapes the done label attribute', () => {
    const r = renderMarkdown('```\nx\n```', { base: '/', copyLabel: 'c', copiedLabel: 'a"<b', copyFailLabel: 'f' });
    expect(r.html).toContain('data-done="a&quot;&lt;b"');
  });

  it('emits the escaped failure label and an empty live-region tip', () => {
    const r = renderMarkdown('```\nx\n```', { base: '/', copyLabel: 'c', copiedLabel: 'd', copyFailLabel: 'a"<b' });
    expect(r.html).toContain('data-fail="a&quot;&lt;b"');
    expect(r.html).toContain('<span class="tip" role="status"></span>');
  });
});

describe('renderMarkdown: youtube fence', () => {
  it('renders a click-to-load facade instead of the player iframe', () => {
    const r = renderMarkdown('```youtube 9gHt4KeipHc\nDemo title\n```', opts);
    expect(r.html).not.toContain('<iframe');
    expect(r.html).toContain('data-embed="https://www.youtube-nocookie.com/embed/9gHt4KeipHc?autoplay=1&amp;rel=0"');
    expect(r.html).toContain('data-title="Demo title"');
    expect(r.html).toContain('href="https://www.youtube.com/watch?v=9gHt4KeipHc"');
    expect(r.html).not.toContain('youtube.com/embed');
  });

  it('escapes the title and rejects invalid fences', () => {
    const r = renderMarkdown('```youtube 9gHt4KeipHc\na"<b\n```', opts);
    expect(r.html).toContain('data-title="a&quot;&lt;b"');
    expect(() => renderMarkdown('```youtube bad\nTitle\n```', { ...opts, source: 'x.md' })).toThrow(/invalid youtube fence/);
    expect(() => renderMarkdown('```youtube 9gHt4KeipHc\n\n```', opts)).toThrow(/invalid youtube fence/);
  });
});

describe('renderMarkdown: links', () => {
  it('prefixes absolute site paths with the base and collects raw hrefs', () => {
    const r = renderMarkdown('[a](/guides/privacy/) [b](#x) [c](mailto:a@b.c)', { base: '/JushoAI/', copyLabel: 'c', copiedLabel: 'd', copyFailLabel: 'f' });
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

describe('renderMarkdown: tables', () => {
  it('wraps tables in a keyboard-focusable region named by its headers', () => {
    const r = renderMarkdown('| 分類 | 欄 |\n|---|---|\n| 氏名 | 姓 |\n', opts);
    expect(r.html).toContain('<div class="table-wrapper" tabindex="0" role="region" aria-label="分類, 欄"><table>');
    expect(r.html).toContain('</table></div>');
    expect(r.html).toContain('<th>分類</th>');
  });

  it('escapes header text used in the region name', () => {
    const r = renderMarkdown('| a"b | c |\n|---|---|\n| x | y |\n', opts);
    expect(r.html).toContain('aria-label="a&quot;b, c"');
  });

  it('keeps the region name when columns use alignment syntax', () => {
    const r = renderMarkdown('| 左 | 中 | 右 |\n|:---|:---:|---:|\n| a | b | c |\n', opts);
    expect(r.html).toContain('aria-label="左, 中, 右"');
  });

  it('falls back to a neutral label when no headers can be derived', () => {
    const r = renderMarkdown('|  |  |\n|---|---|\n| a | b |\n', opts);
    expect(r.html).toContain('<div class="table-wrapper" tabindex="0" role="region" aria-label="table"><table>');
  });
});

describe('renderMarkdown: raw HTML', () => {
  it('escapes raw HTML instead of passing it through', () => {
    const r = renderMarkdown('<script>alert(1)</script>', opts);
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
  });
});

describe('renderMarkdown: edge cases', () => {
  it('treats protocol-relative hrefs as external, without base rewriting', () => {
    const r = renderMarkdown('[a](//example.com/x)', { base: '/JushoAI/', copyLabel: 'c', copiedLabel: 'd', copyFailLabel: 'f' });
    expect(r.html).toContain('href="//example.com/x" target="_blank" rel="noopener noreferrer"');
  });

  it('keeps heading ids unique when a suffixed slug collides', () => {
    const r = renderMarkdown('## B\n## B\n## B 2\n## B', opts);
    const ids = r.headings.map((h) => h.id);
    expect(new Set(ids).size).toBe(4);
    expect(r.html).toContain(`id="${ids[3]}"`);
  });

  it('numbers three duplicate headings', () => {
    const r = renderMarkdown('## B\n## B\n## B', opts);
    expect(r.headings.map((h) => h.id)).toEqual(['b', 'b-2', 'b-3']);
  });

  it('does not collect empty hrefs', () => {
    expect(renderMarkdown('[x]()', opts).links).toEqual([]);
  });

  it('renders a javascript: link as plain text', () => {
    const r = renderMarkdown('[x](javascript:alert(1))', opts);
    expect(r.html).not.toContain('<a');
    expect(r.html).toContain('[x](javascript:alert(1))');
  });
});
