import { escapeHtml } from './markdown.ts';
import { issueUrl, REPO_URL } from './feedback.ts';
import { pageUrl, SITE_ORIGIN, type Lang } from './site.ts';

export interface NavStrings {
  home: string;
  guides: string;
  install: string;
  feedback: string;
  langName: string;
  skip: string;
}

export interface FooterStrings {
  tagline: string;
  guides: string;
  privacy: string;
  license: string;
  feedback: string;
  source: string;
}

export interface Chrome {
  nav: NavStrings;
  footer: FooterStrings;
}

export interface PageInput {
  lang: Lang;
  base: string;
  // Page path without the language prefix, for example 'guides/privacy/' or '' for the landing page.
  path: string;
  title: string;
  description: string;
  // Trusted HTML produced by this build (Markdown output or the landing renderer).
  body: string;
  chrome: Chrome;
  hasCode?: boolean;
}

export function renderPage(p: PageInput): string {
  const other: Lang = p.lang === 'ja' ? 'en' : 'ja';
  const u = (lang: Lang, path: string) => escapeHtml(pageUrl(p.base, lang, path));
  const asset = (name: string) => escapeHtml(`${p.base}assets/${name}`);
  const { nav, footer } = p.chrome;
  return `<!doctype html>
<html lang="${p.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(p.title)}</title>
<meta name="description" content="${escapeHtml(p.description)}">
<meta name="color-scheme" content="dark light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="JushoAI">
<meta property="og:title" content="${escapeHtml(p.title)}">
<meta property="og:description" content="${escapeHtml(p.description)}">
<meta property="og:url" content="${escapeHtml(SITE_ORIGIN + pageUrl(p.base, p.lang, p.path))}">
<meta property="og:image" content="${escapeHtml(SITE_ORIGIN + p.base + 'assets/logo.png')}">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/png" sizes="32x32" href="${asset('favicon-32.png')}">
<link rel="apple-touch-icon" href="${asset('apple-touch-icon.png')}">
<link rel="alternate" hreflang="ja" href="${u('ja', p.path)}">
<link rel="alternate" hreflang="en" href="${u('en', p.path)}">
<link rel="alternate" hreflang="x-default" href="${u('ja', p.path)}">
<link rel="stylesheet" href="${asset('site.css')}">
</head>
<body>
<a class="skip" href="#main">${escapeHtml(nav.skip)}</a>
<header class="nav">
<a class="logo" href="${u(p.lang, '')}"><span class="logo-tile"><img src="${asset('logo.png')}" alt="" width="28" height="28"></span><span>JushoAI</span></a>
<nav>
<a href="${u(p.lang, '')}">${escapeHtml(nav.home)}</a>
<a href="${u(p.lang, 'guides/')}">${escapeHtml(nav.guides)}</a>
<a href="${u(p.lang, '')}#install">${escapeHtml(nav.install)}</a>
<a class="cta" href="${escapeHtml(issueUrl('feature-request'))}" rel="noopener">${escapeHtml(nav.feedback)}</a>
<a class="lang" href="${u(other, p.path)}" hreflang="${other}" lang="${other}">${escapeHtml(nav.langName)}</a>
</nav>
</header>
<main id="main">
${p.body}
</main>
<footer>
<p>${escapeHtml(footer.tagline)}</p>
<p><a href="${u(p.lang, 'guides/')}">${escapeHtml(footer.guides)}</a> / <a href="${u(p.lang, 'guides/privacy/')}">${escapeHtml(footer.privacy)}</a> / <a href="${u(p.lang, 'guides/license/')}">${escapeHtml(footer.license)}</a> / <a href="${escapeHtml(issueUrl('feature-request'))}" rel="noopener">${escapeHtml(footer.feedback)}</a> / <a href="${escapeHtml(REPO_URL)}" rel="noopener">${escapeHtml(footer.source)}</a></p>
</footer>
${p.hasCode ? `<script src="${asset('copy.js')}" defer></script>\n` : ''}</body>
</html>
`;
}
