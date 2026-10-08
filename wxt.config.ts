import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifest: ({ browser }) => ({
    name: 'JushoAI',
    description: '日本式フォームの住所・氏名・フリガナを補完する',
    permissions: ['storage'],
    optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: { id: 'jushoai@armaniacs.github.io', strict_min_version: '128.0' },
      },
    }),
  }),
});
