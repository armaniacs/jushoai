// Pure assembly of Chrome launch flags. The environment is an explicit input
// (callers pass process.env; there is no default) so the produced argument
// list can be asserted in unit tests without launching a browser; the real
// launch stays covered by the Chrome E2E (tests/e2e/chrome.e2e.ts).
// PBI 49 decision (plan A): the former `= process.env` default was removed so
// the env source is always visible at the call site. An explicit `{}` means a
// local run with the sandbox kept enabled; only the harness passes the real
// process.env.

export function chromeLaunchArgs(
  env: { HEADLESS?: string; CI?: string; E2E_NO_SANDBOX?: string },
): string[] {
  const args: string[] = [];
  if (env.HEADLESS === '1') args.push('--headless=new');
  // The browser sandbox stays enabled for local runs: these tests only open
  // local fixtures (samples/ and tests/e2e/pages/) served over http, never
  // untrusted content. --no-sandbox is added only when running in a container
  // or CI, where the browser sandbox and /dev/shm are unavailable, or when
  // E2E_NO_SANDBOX is set explicitly for a restricted local environment.
  if (env.CI || env.E2E_NO_SANDBOX === '1') args.push('--no-sandbox');
  // Out of scope for the sandbox decision (they do not weaken it), so these
  // stay unconditional: /dev/shm can be too small in containers and GPU
  // rendering is unnecessary for these tests.
  args.push('--disable-dev-shm-usage', '--disable-gpu');
  return args;
}
