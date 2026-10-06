import { escapeHtml } from './markdown.ts';

export const REPO_URL = 'https://github.com/armaniacs/jushoai';

// Each name must match a file in .github/ISSUE_TEMPLATE/ (verified by check.ts and tests).
export const ISSUE_TEMPLATES = ['feature-request', 'form-support', 'bug-report'] as const;
export type IssueTemplate = (typeof ISSUE_TEMPLATES)[number];

export const issueUrl = (template: IssueTemplate): string => `${REPO_URL}/issues/new?template=${template}.yml`;

export interface FeedbackStrings {
  title: string;
  lead: string;
  items: { title: string; body: string; cta: string }[];
  note: string;
}

const e = escapeHtml;

export function renderFeedbackSection(f: FeedbackStrings): string {
  const cards = f.items
    .map(
      (i, n) =>
        `<div class="card"><h3>${e(i.title)}</h3><p>${e(i.body)}</p><p><a class="btn" href="${e(issueUrl(ISSUE_TEMPLATES[n]!))}" rel="noopener">${e(i.cta)}</a></p></div>`,
    )
    .join('');
  return `<section class="block soft" id="feedback"><div class="wrap">
<h2 class="section-title">${e(f.title)}</h2>
<p class="section-lead">${e(f.lead)}</p>
<div class="grid">${cards}</div>
<p class="note">${e(f.note)}</p>
</div></section>`;
}

// Compact variant appended to every guide page.
export function renderFeedbackFooter(f: FeedbackStrings): string {
  const links = f.items
    .map((i, n) => `<a href="${e(issueUrl(ISSUE_TEMPLATES[n]!))}" rel="noopener">${e(i.cta)}</a>`)
    .join(' / ');
  return `<aside class="feedback-box" id="feedback">
<h2>${e(f.title)}</h2>
<p>${e(f.lead)}</p>
<p>${links}</p>
<p class="note">${e(f.note)}</p>
</aside>`;
}
