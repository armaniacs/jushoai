import { escapeHtml } from './markdown.ts';
import { mockButton, mockForm, mockGuide, mockPreview } from './mocks.ts';
import type { Chrome } from './layout.ts';
import { issueUrl, REPO_URL, renderFeedbackSection, type FeedbackStrings } from './feedback.ts';
import { pageUrl, amoStoreUrl, edgeStoreUrl, storeUrl, type Lang } from './site.ts';

interface Titled { title: string; body: string }

export interface Strings {
  meta: { title: string; description: string };
  chrome: Chrome;
  hero: { eyebrow: string; titleBefore: string; titleEmphasis: string; tagline: string; ctaInstall: string; ctaGuide: string; ctaFeedback: string };
  features: { title: string; items: Titled[] };
  demo: { title: string; lead: string; iframeTitle: string; link: string };
  mock: {
    uiNote: string; captionButton: string; captionPreview: string; captionGuide: string;
    captionForm: string; before: string; after: string;
  };
  steps: { title: string; items: Titled[] };
  fields: { title: string; items: Titled[] };
  providers: { title: string; lead: string; items: { name: string; body: string }[] };
  privacy: { title: string; items: Titled[]; link: string };
  install: { title: string; steps: string[]; store: string; storeNote: string; edgeStore: string; edgeStoreNote: string; amoStore: string; amoStoreNote: string; more: string; releases: string };
  faq: { title: string; items: { q: string; a: string }[]; more: string };
  feedback: FeedbackStrings;
  license: { title: string; body: string; link: string };
  guides: { title: string; lead: string };
}

const e = escapeHtml;

// The demo lives on YouTube. Embed through the no-cookie host so loading the page
// does not set tracking cookies before the visitor presses play. The URLs stay in
// code (not in the dictionary) because dictionary strings go through escapeHtml.
const VIDEO_ID = 'Y3y9ofrsyFo';
const VIDEO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`;
const VIDEO_WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

export function renderLanding(p: { lang: Lang; base: string; s: Strings }): string {
  const { s } = p;
  const u = (path: string) => pageUrl(p.base, p.lang, path);
  const cards = (items: Titled[]) =>
    `<div class="grid">${items.map((i) => `<div class="card"><h3>${e(i.title)}</h3><p>${e(i.body)}</p></div>`).join('')}</div>`;

  return `<section class="hero"><div class="wrap">
<span class="eyebrow">${e(s.hero.eyebrow)}</span>
<h1>${e(s.hero.titleBefore)}<em>${e(s.hero.titleEmphasis)}</em></h1>
<p class="tagline">${e(s.hero.tagline)}</p>
<div class="actions"><a class="btn primary" href="#install">${e(s.hero.ctaInstall)}</a><a class="btn" href="${u('guides/')}">${e(s.hero.ctaGuide)}</a><a class="btn" href="${e(issueUrl('feature-request'))}" rel="noopener">${e(s.hero.ctaFeedback)}</a></div>
<div class="hero-mock">${mockButton()}</div>
</div></section>

<section class="block" id="features"><div class="wrap">
<h2 class="section-title">${e(s.features.title)}</h2>
${cards(s.features.items)}
<div class="showcase">
<figure>${mockPreview()}<figcaption>${e(s.mock.captionPreview)}</figcaption></figure>
<figure>${mockForm(false, s.mock.before)}<figcaption>${e(s.mock.before)}</figcaption></figure>
<figure>${mockForm(true, s.mock.after)}<figcaption>${e(s.mock.captionForm)} (${e(s.mock.after)})</figcaption></figure>
</div>
${p.lang === 'en' ? `<p class="note ui-note">${e(s.mock.uiNote)}</p>` : ''}
</div></section>

<section class="block" id="demo"><div class="wrap narrow">
<h2 class="section-title">${e(s.demo.title)}</h2>
<p class="section-lead">${e(s.demo.lead)}</p>
<div class="video"><iframe src="${VIDEO_EMBED_URL}" title="${e(s.demo.iframeTitle)}" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>
<p class="note"><a href="${VIDEO_WATCH_URL}" target="_blank" rel="noopener noreferrer">${e(s.demo.link)}</a></p>
</div></section>

<section class="block soft" id="steps"><div class="wrap">
<h2 class="section-title">${e(s.steps.title)}</h2>
<ol class="steps">${s.steps.items.map((i) => `<li><h3>${e(i.title)}</h3><p>${e(i.body)}</p></li>`).join('')}</ol>
</div></section>

<section class="block" id="fields"><div class="wrap">
<h2 class="section-title">${e(s.fields.title)}</h2>
${cards(s.fields.items)}
</div></section>

<section class="block soft" id="providers"><div class="wrap">
<h2 class="section-title">${e(s.providers.title)}</h2>
<p class="section-lead">${e(s.providers.lead)}</p>
<div class="grid">${s.providers.items.map((i) => `<div class="card"><h3>${e(i.name)}</h3><p>${e(i.body)}</p></div>`).join('')}</div>
<div class="showcase"><figure>${mockGuide()}<figcaption>${e(s.mock.captionGuide)}</figcaption></figure>
<figure>${mockButton()}<figcaption>${e(s.mock.captionButton)}</figcaption></figure></div>
</div></section>

<section class="block" id="privacy"><div class="wrap">
<h2 class="section-title">${e(s.privacy.title)}</h2>
${cards(s.privacy.items)}
<p class="note"><a href="${u('guides/privacy/')}">${e(s.privacy.link)}</a></p>
</div></section>

<section class="block soft" id="install"><div class="wrap narrow">
<h2 class="section-title">${e(s.install.title)}</h2>
<ol>${s.install.steps.map((t) => `<li>${e(t)}</li>`).join('')}</ol>
<p><a class="btn primary" href="${e(storeUrl(p.lang))}" target="_blank" rel="noopener noreferrer">${e(s.install.store)}</a> <span class="note">${e(s.install.storeNote)}</span></p>
<p><a class="btn" href="${e(edgeStoreUrl(p.lang))}" target="_blank" rel="noopener noreferrer">${e(s.install.edgeStore)}</a> <span class="note">${e(s.install.edgeStoreNote)}</span></p>
<p><a class="btn" href="${e(amoStoreUrl(p.lang))}" target="_blank" rel="noopener noreferrer">${e(s.install.amoStore)}</a> <span class="note">${e(s.install.amoStoreNote)}</span></p>
<p><a class="btn" href="${e(REPO_URL)}/releases/latest" target="_blank" rel="noopener noreferrer">${e(s.install.releases)}</a></p>
<p><a href="${u('guides/getting-started/')}">${e(s.install.more)}</a></p>
</div></section>

${renderFeedbackSection(s.feedback)}

<section class="block" id="license"><div class="wrap narrow">
<h2 class="section-title">${e(s.license.title)}</h2>
<p>${e(s.license.body)}</p>
<p><a href="${u('guides/license/')}">${e(s.license.link)}</a></p>
</div></section>

<section class="block" id="faq"><div class="wrap narrow">
<h2 class="section-title">${e(s.faq.title)}</h2>
${s.faq.items.map((i) => `<details class="faq"><summary>${e(i.q)}</summary><p>${e(i.a)}</p></details>`).join('\n')}
<p><a href="${u('guides/troubleshooting/')}">${e(s.faq.more)}</a></p>
</div></section>`;
}
