import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUIDE_SLUGS } from '../../site/lib/site.ts';

export const SITE_DIR = fileURLToPath(new URL('../../site', import.meta.url));

export async function writeFixtureContent(dir: string, lang: 'ja' | 'en', slugs: readonly string[] = GUIDE_SLUGS) {
  await mkdir(join(dir, lang), { recursive: true });
  let order = 1;
  for (const slug of slugs) {
    await writeFile(
      join(dir, lang, `${slug}.md`),
      `---\ntitle: ${slug} ${lang}\ndescription: description ${slug}\norder: ${order++}\n---\n# ${slug} ${lang}\n\n## A\n\n\`\`\`bash\nmake build\n\`\`\`\n\n## B\n\n[home](/)\n`,
    );
  }
}
