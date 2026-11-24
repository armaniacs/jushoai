import MarkdownIt from 'markdown-it';

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export interface RenderOptions {
  base: string;
  /** Base URL path for rewriting relative `./<slug>.md` guide links (e.g. "/guides/"). */
  guideBase?: string;
  copyLabel: string;
  copiedLabel: string;
  /** Failure message shown in the adjacent role="status" tip (Task 3). */
  copyFailLabel: string;
  /** Per-language region name for header-less tables (ja "表", en "table"). */
  tableLabel: string;
  /** Per-language region-name base for code blocks (ja "コード", en "code"). */
  codeLabel: string;
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
// cells so each table gets a distinct label; tables without usable headers
// fall back to the per-language tableLabel ("表" on ja pages, "table" on en
// pages — passed in like the copy labels, not looked up here) so ja/en
// symmetry holds without new i18n dictionary keys. A region without an
// accessible name is exposed as generic, so a label is always emitted here.
// Repeats within one page get a numeric suffix ("表 2") so same-named
// regions stay distinguishable. The inner <table>/<th> markup is left
// untouched (plain tags, <th> semantics kept) so guide validators that match
// literal tags keep working.
export function wrapTables(html: string, tableLabel: string): string {
  // One page per call, so a per-call counter disambiguates repeats in it.
  const counts = new Map<string, number>();
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/g, (m, inner: string) => {
    const head = /<thead>([\s\S]*?)<\/thead>/.exec(inner)?.[1] ?? inner;
    const headers = [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)]
      .map((c) => decodeHtml((c[1] ?? '').replace(/<[^>]+>/g, '').trim()))
      .filter((t) => t !== '');
    // Empty-header fallback: the per-language tableLabel.
    const base = headers.length > 0 ? headers.join(', ') : tableLabel;
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    const name = n === 1 ? base : `${base} ${n}`;
    return `<div class="table-wrapper" tabindex="0" role="region" aria-label="${escapeHtml(name)}"><table>${inner}</table></div>`;
  });
}

// wrapTables reads header text back out of already-escaped HTML, so decode
// the entities markdown-it emitted before escapeHtml re-escapes the label
// (decode &amp; last to avoid double-decoding sequences like &amp;quot;).
const decodeHtml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

// Renders a click-to-load YouTube facade (performance pattern): the player
// iframe is not in the initial HTML, so no request goes to YouTube before the
// visitor activates it. The link points at the watch page, so without
// JavaScript it still opens the video; `facade.js` intercepts the click and
// swaps in the no-cookie player with autoplay. The video id is validated
// both by the callers and inside this function (11-char YouTube id), and the
// title is escaped here, so both attributes are safe. `rel=0` keeps related
// videos on the same channel.
export function videoFacade(id: string, title: string): string {
  // Defense in depth: both current callers validate the id (11-char YouTube
  // id) before calling, but this guard keeps a future third caller from
  // injecting an arbitrary string into src/href.
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('invalid youtube video id (want an 11-char YouTube id)');
  const embed = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  const watch = `https://www.youtube.com/watch?v=${id}`;
  return (
    `<div class="video video-facade">` +
    `<a class="video-facade-link" href="${watch}" target="_blank" rel="noopener noreferrer"` +
    ` data-embed="${escapeHtml(embed)}" data-title="${escapeHtml(title)}">` +
    `<span class="video-facade-icon" aria-hidden="true"></span>` +
    `<span class="video-facade-title">${escapeHtml(title)}</span></a></div>\n`
  );
}

export function renderMarkdown(src: string, { base, guideBase, copyLabel, copiedLabel, copyFailLabel, tableLabel, codeLabel, source }: RenderOptions): Rendered {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  const normalizedGuideBase = guideBase ? `${guideBase.replace(/\/+$/, '')}/` : '';
  // One page per call, so a per-call counter disambiguates repeats in it.
  const codeCounts = new Map<string, number>();
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]!;
    // ```youtube <11-char-id> with the iframe title on the content line
    // renders a click-to-load facade (same markup as the landing demo
    // section). The no-cookie player is only loaded after activation.
    // Anything else renders as a copyable code block, as before.
    const [kind, id] = token.info.trim().split(/\s+/);
    if (kind === 'youtube') {
      const title = token.content.trim();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? '') || title === '') {
        throw new Error(`${source ?? 'guide'}: invalid youtube fence (want "\`\`\`youtube <11-char-id>" + a title line)`);
      }
      return videoFacade(id!, title);
    }
    // Scrollable code blocks follow the guide `html` §2 pattern: the <pre>
    // that scrolls (`.code pre` has overflow-x:auto) is itself focusable and
    // exposed as a named region so keyboard-only users can scroll it.
    // The copy <button> next to it keeps its visible label (Task 3); there
    // is no caption element to reference via aria-labelledby — aria-label is
    // used instead. The name is the per-language codeLabel plus the fence
    // language when present ("コード: bash" on ja pages, "code: bash" on en
    // pages — passed in like the copy labels, not looked up here) so ja/en
    // output stays symmetric without new i18n dictionary keys. Repeats
    // within one page get a numeric suffix ("コード: bash 2") so same-named
    // regions stay distinguishable.
    const baseName = kind ? `${codeLabel}: ${kind}` : codeLabel;
    const seen = (codeCounts.get(baseName) ?? 0) + 1;
    codeCounts.set(baseName, seen);
    const regionName = seen === 1 ? baseName : `${baseName} ${seen}`;
    const lang = ` aria-label="${escapeHtml(regionName)}"`;
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
        const relGuide = normalizedGuideBase ? /^\.\/([a-z-]+)\.md(#.*)?$/.exec(href) : null;
        if (/^(?:https?:)?\/\//.test(href)) {
          child.attrSet('target', '_blank');
          child.attrSet('rel', 'noopener noreferrer');
        } else if (relGuide) {
          child.attrSet('href', `${normalizedGuideBase}${relGuide[1]}/${relGuide[2] ?? ''}`);
        } else if (href.startsWith('/')) {
          child.attrSet('href', base + href.slice(1));
        }
      }
    }
  });

  const rendered = md.renderer.render(tokens, md.options as Parameters<typeof md.renderer.render>[1], env);
  return { html: wrapTables(rendered, tableLabel), headings, links };
}
