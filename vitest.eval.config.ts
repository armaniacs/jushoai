import { defineConfig } from 'vitest/config';

// Separate config for the local eval (PBI-136): *.eval.ts files stay out of
// the main suite (tests/**/*.test.ts) so `make check` never depends on the
// corpus health; `make eval` runs them on demand. jsdom because the corpus
// runner scans DOM.
export default defineConfig({
  test: { environment: 'jsdom', include: ['tests/eval/**/*.eval.ts'] },
});
