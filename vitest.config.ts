import { defineConfig } from 'vitest/config';

// pool: 'vmThreads' keeps per-file isolation while creating the jsdom environment
// once per worker instead of once per file; environment setup dominates this suite.
export default defineConfig({
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'], pool: 'vmThreads' },
});
