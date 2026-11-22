import { afterAll, beforeAll } from 'vitest';
import { ChromeAdapter } from './adapter';
import { runDarkColorScheme } from './scenarios';

const adapter = new ChromeAdapter({ colorScheme: 'dark' });

beforeAll(async () => {
  await adapter.start();
  await adapter.seed();
});

afterAll(async () => {
  await adapter.close();
});

// Only the dark-token scenarios run in this forced-dark session; the light
// pins stay in the light suites (chrome.e2e.ts).
runDarkColorScheme(adapter, 'chrome');
