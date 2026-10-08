import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  // The sources zip is what AMO reviewers rebuild from; keep only what `npm ci && wxt build` needs.
  zip: {
    excludeSources: [
      'video/**', 'site/**', 'site-dist/**', 'docs/**', 'samples/**', 'tests/**', 'tmp/**',
      'graphify-out/**', 'pbi/**', 'plans/**', 'scripts/**', 'CLAUDE.md', 'CHANGELOG.md',
      'vitest*.config.ts', '.superpowers/**',
    ],
  },
  manifest: ({ browser }) => ({
    name: 'JushoAI',
    description: '日本式フォームの住所・氏名・フリガナを補完する',
    permissions: ['storage'],
    optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'jushoai@armaniacs.github.io',
          strict_min_version: '128.0',
          data_collection_permissions: { required: ['none'], optional: ['websiteContent'] },
        },
      },
    }),
  }),
});
