import { escapeHtml } from './markdown.ts';
import { pageUrl, type Guide, type Lang } from './site.ts';
import type { Strings } from './landing.ts';

export function renderGuidesIndex(p: { lang: Lang; base: string; s: Strings; guides: Guide[] }): string {
  const items = p.guides
    .filter((g) => g.lang === p.lang)
    .sort((a, b) => a.order - b.order)
    .map(
      (g) =>
        `<li><a href="${pageUrl(p.base, p.lang, `guides/${g.slug}/`)}"><strong>${escapeHtml(g.title)}</strong><span>${escapeHtml(g.description)}</span></a></li>`,
    )
    .join('\n');
  return `<div class="prose">
<h1>${escapeHtml(p.s.guides.title)}</h1>
<p>${escapeHtml(p.s.guides.lead)}</p>
<ul class="guide-list">
${items}
</ul>
</div>`;
}
