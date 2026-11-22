import { afterAll, beforeAll } from 'vitest';
import { FirefoxAdapter } from './adapter';
import { runDarkColorScheme } from './scenarios';

const adapter = new FirefoxAdapter({ colorScheme: 'dark' });

beforeAll(async () => {
  await adapter.start();
  await adapter.seed();
});

afterAll(async () => {
  await adapter.close();
});

// Only the dark-token scenarios run in this forced-dark session; the light
// pins stay in the light suites (firefox.e2e.ts).
runDarkColorScheme(adapter, 'firefox');
