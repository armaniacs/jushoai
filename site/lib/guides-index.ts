import { escapeHtml } from './markdown.ts';
import { pageUrl, type Guide, type Lang } from './site.ts';
import type { Strings } from './landing.ts';

interface GuideGroup {
  readonly title: Record<Lang, string>;
  readonly slugs: readonly string[];
}

// User-journey grouping for the guides index page. Kept here alongside other
// small per-language label maps so the i18n JSON schema stays unchanged.
const GUIDE_GROUPS: readonly GuideGroup[] = [
  {
    title: { ja: 'まずはここから', en: 'Start here' },
    slugs: ['getting-started', 'profiles', 'addresses'],
  },
  {
    title: { ja: '毎日の入力と使いこなし', en: 'Everyday use' },
    slugs: ['popup-and-fill', 'scenarios', 'shortcuts-and-tools', 'supported-fields'],
  },
  {
    title: { ja: 'AI と安全・プライバシー', en: 'AI, safety and privacy' },
    slugs: ['ai-providers', 'safety', 'privacy'],
  },
  {
    title: { ja: '仕組み・困ったとき・その他', en: 'Reference and help' },
    slugs: ['how-it-works', 'troubleshooting', 'glossary', 'license'],
  },
];

function renderList(guides: Guide[], lang: Lang, base: string): string {
  const items = [...guides]
    .sort((a, b) => a.order - b.order)
    .map(
      (g) =>
        `<li><a href="${pageUrl(base, lang, `guides/${g.slug}/`)}"><strong>${escapeHtml(g.title)}</strong><span>${escapeHtml(g.description)}</span></a></li>`,
    )
    .join('\n');
  return `<ul class="guide-list">\n${items}\n</ul>`;
}

export function renderGuidesIndex(p: { lang: Lang; base: string; s: Strings; guides: Guide[] }): string {
  const langGuides = p.guides.filter((g) => g.lang === p.lang);
  const groupedSlugs = new Set<string>(GUIDE_GROUPS.flatMap((g) => g.slugs));
  const sections: string[] = [];

  for (const group of GUIDE_GROUPS) {
    const members = langGuides.filter((g) => group.slugs.includes(g.slug));
    if (members.length === 0) continue;
    sections.push(`<h2 class="guide-group">${escapeHtml(group.title[p.lang])}</h2>\n${renderList(members, p.lang, p.base)}`);
  }

  const ungrouped = langGuides.filter((g) => !groupedSlugs.has(g.slug));
  if (ungrouped.length > 0) {
    sections.push(renderList(ungrouped, p.lang, p.base));
  }

  return `<div class="prose">
<h1>${escapeHtml(p.s.guides.title)}</h1>
<p>${escapeHtml(p.s.guides.lead)}</p>
${sections.join('\n')}
</div>`;
}
