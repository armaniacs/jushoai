import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifest: {
    name: 'JushoAI',
    description: '日本式フォームの住所・氏名・フリガナを補完する',
    permissions: ['storage'],
  },
});
