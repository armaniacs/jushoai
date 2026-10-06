// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ISSUE_TEMPLATES, issueUrl, renderFeedbackFooter, renderFeedbackSection, REPO_URL } from '../../site/lib/feedback.ts';
import { SITE_DIR } from './helpers.ts';
import type { Strings } from '../../site/lib/landing.ts';

const TEMPLATES_DIR = fileURLToPath(new URL('../../.github/ISSUE_TEMPLATE', import.meta.url));
const load = async (lang: string) => JSON.parse(await readFile(join(SITE_DIR, 'i18n', `${lang}.json`), 'utf8')) as Strings;

describe('feedback links', () => {
  it('uses the same repository as the extension', async () => {
    // Read as text: the site tsconfig cannot type-check the extension sources.
    const src = await readFile(fileURLToPath(new URL('../../src/feedback/issue-url.ts', import.meta.url)), 'utf8');
    expect(/FEEDBACK_REPO = '([^']+)'/.exec(src)?.[1]).toBe(REPO_URL);
  });

  it('has an issue form file for every template name', async () => {
    const files = await readdir(TEMPLATES_DIR);
    for (const t of ISSUE_TEMPLATES) expect(files, t).toContain(`${t}.yml`);
    expect(files).toContain('config.yml');
  });

  it.each(['ja', 'en'])('renders one link per template in the section and the guide footer (%s)', async (lang) => {
    const s = await load(lang);
    expect(s.feedback.items).toHaveLength(ISSUE_TEMPLATES.length);
    for (const html of [renderFeedbackSection(s.feedback), renderFeedbackFooter(s.feedback)]) {
      for (const t of ISSUE_TEMPLATES) expect(html).toContain(`href="${issueUrl(t)}"`);
      expect(html).toContain(s.feedback.note);
    }
  });
});
