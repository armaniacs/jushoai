import { afterAll, beforeAll } from 'vitest';
import { ChromeAdapter } from './adapter';
import { runBrowserScenarios } from './scenarios';

const adapter = new ChromeAdapter();

beforeAll(async () => {
  await adapter.start();
  await adapter.seed();
});

afterAll(async () => {
  await adapter.close();
});

// All flows live in scenarios.ts; the flags below select the Chrome-only
// assertions (partial-notice report flow, touch-pointer drag, built-in
// provider). Suite/it names and counts are unchanged.
runBrowserScenarios(adapter, {
  label: 'chrome',
  expectBuiltInProvider: true,
  includeTouchPointer: true,
  includePartialNotice: true,
});
