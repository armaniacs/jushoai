// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderMarkdown, slugify, videoFacade } from '../../site/lib/markdown.ts';

const opts = { base: '/', copyLabel: 'コピー', copiedLabel: 'コピーしました', copyFailLabel: 'コピーできませんでした', tableLabel: '表', codeLabel: 'コード' };
const enOpts = { base: '/', copyLabel: 'Copy', copiedLabel: 'Copied', copyFailLabel: 'Copy failed', tableLabel: 'table', codeLabel: 'code' };

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
    const r = renderMarkdown('```bash\nmake <build> && echo "x"\n```', enOpts);
    expect(r.html).toContain('<div class="code">');
    expect(r.html).toContain('<button class="copy" type="button" data-copy data-done="Copied" data-fail="Copy failed">Copy</button>');
    expect(r.html).toContain('>Copy</button><span class="tip" role="status"></span>');
    expect(r.html).toContain('make &lt;build&gt; &amp;&amp; echo &quot;x&quot;');
  });

  it('exposes the scrolling pre as a named region including the fence language', () => {
    const r = renderMarkdown('```bash\necho hi\n```', opts);
    expect(r.html).toContain('<pre tabindex="0" role="region" aria-label="コード: bash"><code>');
  });

  it('falls back to a neutral label when the fence has no language', () => {
    const r = renderMarkdown('```\nplain\n```', opts);
    expect(r.html).toContain('<pre tabindex="0" role="region" aria-label="コード"><code>');
  });

  it('escapes the fence language used in the region name', () => {
    const r = renderMarkdown('```a"b\nx\n```', opts);
    expect(r.html).toContain('aria-label="コード: a&quot;b"');
  });

  it('numbers repeated fence regions within one page', () => {
    const r = renderMarkdown('```bash\na\n```\n\n```bash\nb\n```\n\n```\nc\n```\n', opts);
    expect(r.html).toContain('aria-label="コード: bash"><code>');
    expect(r.html).toContain('aria-label="コード: bash 2"><code>');
    expect(r.html).toContain('aria-label="コード"><code>');
  });

  it('uses the English code label on en pages (same code path)', () => {
    const r = renderMarkdown('```bash\na\n```', enOpts);
    expect(r.html).toContain('aria-label="code: bash"><code>');
  });
});

describe('renderMarkdown: copy button label', () => {
  it('escapes the done label attribute', () => {
    const r = renderMarkdown('```\nx\n```', { base: '/', copyLabel: 'c', copiedLabel: 'a"<b', copyFailLabel: 'f', tableLabel: 'table', codeLabel: 'code' });
    expect(r.html).toContain('data-done="a&quot;&lt;b"');
  });

  it('emits the escaped failure label and an empty live-region tip', () => {
    const r = renderMarkdown('```\nx\n```', { base: '/', copyLabel: 'c', copiedLabel: 'd', copyFailLabel: 'a"<b', tableLabel: 'table', codeLabel: 'code' });
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

  it('rejects invalid ids inside videoFacade itself (defense in depth)', () => {
    expect(() => videoFacade('bad', 'Title')).toThrow(/invalid youtube video id/);
    expect(() => videoFacade('9gHt4KeipHc" onload="x', 'Title')).toThrow(/invalid youtube video id/);
    expect(videoFacade('9gHt4KeipHc', 'T')).toContain('youtube-nocookie.com/embed/9gHt4KeipHc');
  });
});

describe('renderMarkdown: links', () => {
  it('prefixes absolute site paths with the base and collects raw hrefs', () => {
    const r = renderMarkdown('[a](/guides/privacy/) [b](#x) [c](mailto:a@b.c)', { base: '/JushoAI/', copyLabel: 'c', copiedLabel: 'd', copyFailLabel: 'f', tableLabel: 'table', codeLabel: 'code' });
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

  it('falls back to the per-language label when no headers can be derived', () => {
    const r = renderMarkdown('|  |  |\n|---|---|\n| a | b |\n', opts);
    expect(r.html).toContain('<div class="table-wrapper" tabindex="0" role="region" aria-label="表"><table>');
  });

  it('numbers duplicate region names within one page', () => {
    const r = renderMarkdown('|  |  |\n|---|---|\n| a | b |\n\n|  |  |\n|---|---|\n| c | d |\n', opts);
    expect(r.html).toContain('aria-label="表"><table>');
    expect(r.html).toContain('aria-label="表 2"><table>');
  });

  it('numbers repeated header-derived names too', () => {
    const r = renderMarkdown('| 分類 | 欄 |\n|---|---|\n| 氏名 | 姓 |\n\n| 分類 | 欄 |\n|---|---|\n| 名 | 名 |\n', opts);
    expect(r.html).toContain('aria-label="分類, 欄"><table>');
    expect(r.html).toContain('aria-label="分類, 欄 2"><table>');
  });

  it('uses the English table label on en pages (same code path)', () => {
    const r = renderMarkdown('|  |  |\n|---|---|\n| a | b |\n\n|  |  |\n|---|---|\n| c | d |\n', enOpts);
    expect(r.html).toContain('aria-label="table"><table>');
    expect(r.html).toContain('aria-label="table 2"><table>');
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
    const r = renderMarkdown('[a](//example.com/x)', { base: '/JushoAI/', copyLabel: 'c', copiedLabel: 'd', copyFailLabel: 'f', tableLabel: 'table', codeLabel: 'code' });
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
