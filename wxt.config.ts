import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  // The sources zip is what AMO reviewers rebuild from; keep only what `npm ci && wxt build` needs.
  zip: {
    excludeSources: [
      'video/**', 'site/**', 'site-dist/**', 'docs/**', 'samples/**', 'tests/**', 'tmp/**',
      'graphify-out/**', 'pbi/**', 'plans/**', 'scripts/**', 'CLAUDE.md', 'CHANGELOG.md',
      'vitest*.config.ts', '.superpowers/**', '.github/**',
      // AMO reviewers must not receive throwaway scan artifacts (incl. test keys) or promo material.
      'JushoAI_VULNHUNT_*/**', 'promo/**',
      // Belt and braces: local submit credentials must never enter the sources zip
      // (dotfiles are already skipped by default, but an explicit rule survives config changes).
      '.env*',
    ],
  },
  manifest: ({ browser }) => ({
    name: 'JushoAI',
    description: '日本式フォームの住所・氏名・フリガナを補完する',
    // contextMenus: the one-click この欄に入力 entry (PBI-137). Host
    // permissions stay optional; the menu itself needs no host access.
    permissions: ['storage', 'contextMenus'],
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
