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
  /** Failure message shown in the adjacent role="status" tip (Task 3). */
  copyFailLabel: string;
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

// Wraps every <table> in a keyboard-scrollable region (responsive-table
// pattern). The accessible name is derived from the table's own header
// cells so each table gets a distinct label without new i18n keys. The
// inner <table>/<th> markup is left untouched (plain tags, <th> semantics
// kept) so guide validators that match literal tags keep working.
export function wrapTables(html: string): string {
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/g, (m, inner: string) => {
    const head = /<thead>([\s\S]*?)<\/thead>/.exec(inner)?.[1] ?? inner;
    const headers = [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)]
      .map((c) => decodeHtml((c[1] ?? '').replace(/<[^>]+>/g, '').trim()))
      .filter((t) => t !== '');
    // Empty-header fallback: fixed neutral token "table" (the HTML element
    // name, not a translated word) so ja/en symmetry holds without new i18n
    // dictionary keys. A region without an accessible name is exposed as
    // generic, so a label is always emitted here.
    const label = headers.length > 0 ? ` aria-label="${escapeHtml(headers.join(', '))}"` : ' aria-label="table"';
    return `<div class="table-wrapper" tabindex="0" role="region"${label}><table>${inner}</table></div>`;
  });
}

// wrapTables reads header text back out of already-escaped HTML, so decode
// the entities markdown-it emitted before escapeHtml re-escapes the label
// (decode &amp; last to avoid double-decoding sequences like &amp;quot;).
const decodeHtml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

export function renderMarkdown(src: string, { base, copyLabel, copiedLabel, copyFailLabel, source }: RenderOptions): Rendered {
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
    // Scrollable code blocks follow the guide `html` §2 pattern: the <pre>
    // that scrolls (`.code pre` has overflow-x:auto) is itself focusable and
    // exposed as a named region so keyboard-only users can scroll it.
    // The copy <button> next to it keeps its visible label (Task 3); there
    // is no caption element to reference via aria-labelledby — aria-label is
    // used instead. The name is the fence language when present
    // ("code: bash") with a neutral "code" fallback (the element-ish token,
    // not a translated word, mirroring wrapTables' "table" fallback) so
    // ja/en output stays symmetric without new i18n dictionary keys.
    const lang = kind ? ` aria-label="code: ${escapeHtml(kind)}"` : ' aria-label="code"';
    // Copy-button feedback follows the guide `copy-button` pattern (Task 3):
    // the button label never changes; success/failure is shown in the
    // adjacent role="status" tip, which is both the visible bubble and the
    // live region. The tip stays empty until a copy so no stale message is
    // left for screen reader browse mode. `data-copy`/`data-done` are kept
    // for the existing contract; `data-fail` carries the localized failure
    // message (same ja/en source as the other labels, no new i18n keys).
    return (
      `<div class="code"><button class="copy" type="button" data-copy data-done="${escapeHtml(copiedLabel)}" data-fail="${escapeHtml(copyFailLabel)}">${escapeHtml(copyLabel)}</button>` +
      `<span class="tip" role="status"></span>` +
      `<pre tabindex="0" role="region"${lang}><code>${escapeHtml(token.content)}</code></pre></div>\n`
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

  const rendered = md.renderer.render(tokens, md.options as Parameters<typeof md.renderer.render>[1], env);
  return { html: wrapTables(rendered), headings, links };
}
