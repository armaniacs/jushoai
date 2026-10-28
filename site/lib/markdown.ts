import MarkdownIt from 'markdown-it';

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export interface RenderOptions {
  base: string;
  copyLabel: string;
  copiedLabel: string;
  /** Guide file identity for build error messages (e.g. "ja/popup-and-fill.md"). */
  source?: string;
}

export interface Rendered {
  html: string;
  headings: Heading[];
  links: string[];
}

export function slugify(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-');
  return s || 'section';
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderMarkdown(src: string, { base, copyLabel, copiedLabel, source }: RenderOptions): Rendered {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]!;
    // ```youtube <11-char-id> with the iframe title on the content line
    // embeds the no-cookie player (same markup as the landing demo section).
    // Anything else renders as a copyable code block, as before.
    const [kind, id] = token.info.trim().split(/\s+/);
    if (kind === 'youtube') {
      const title = token.content.trim();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? '') || title === '') {
        throw new Error(`${source ?? 'guide'}: invalid youtube fence (want "\`\`\`youtube <11-char-id>" + a title line)`);
      }
      return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${escapeHtml(title)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>\n`;
    }
    return (
      `<div class="code"><button class="copy" type="button" data-copy data-done="${escapeHtml(copiedLabel)}">${escapeHtml(copyLabel)}</button>` +
      `<pre><code>${escapeHtml(token.content)}</code></pre></div>\n`
    );
  };

  const env = {};
  const tokens = md.parse(src, env);
  const headings: Heading[] = [];
  const links: string[] = [];
  const used = new Set<string>();

  tokens.forEach((token, i) => {
    if (token.type === 'heading_open') {
      const text = tokens[i + 1]?.content ?? '';
      const slug = slugify(text);
      let id = slug;
      for (let n = 2; used.has(id); n++) id = `${slug}-${n}`;
      used.add(id);
      token.attrSet('id', id);
      headings.push({ level: Number(token.tag.slice(1)), text, id });
    }
    if (token.type === 'inline') {
      for (const child of token.children ?? []) {
        if (child.type !== 'link_open') continue;
        const href = String(child.attrGet('href') ?? '');
        if (href !== '') links.push(href);
        if (/^(?:https?:)?\/\//.test(href)) {
          child.attrSet('target', '_blank');
          child.attrSet('rel', 'noopener noreferrer');
        } else if (href.startsWith('/')) {
          child.attrSet('href', base + href.slice(1));
        }
      }
    }
  });

  return { html: md.renderer.render(tokens, md.options as Parameters<typeof md.renderer.render>[1], env), headings, links };
}
