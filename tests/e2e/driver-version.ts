// Pure version-preflight logic for the Chrome E2E (PBI-204). The inputs are
// the raw `--version` outputs (or null when a binary could not be run), never
// the environment, so the match / mismatch / unavailable decision and the
// repair instructions are assertable in unit tests without spawning anything.
// The I/O shell that produces the inputs lives in harness.ts (startChromeDriver
// preflight); the real launch stays covered by the Chrome E2E (chrome.e2e.ts).

export type DriverVersionStatus = 'match' | 'mismatch' | 'unavailable';

// The major version from a `--version` output: the first dotted number in the
// text ("Google Chrome 156.0.8078.76", "ChromeDriver 154.0.8037.92 (...)").
// The comparison is major-only on purpose: the Selenium Manager cache resolves
// 156.0.8078.80 against an installed Chrome 156.0.8078.76 and both must count
// as aligned. Returns null when the text carries no version.
export function parseMajorVersion(output: string): string | null {
  const matched = /\d+(?:\.\d+)*/.exec(output);
  if (!matched) return null;
  return matched[0]!.split('.')[0]!;
}

export function driverVersionStatus(
  chromeVersion: string | null,
  driverVersion: string | null,
): DriverVersionStatus {
  if (chromeVersion === null || driverVersion === null) return 'unavailable';
  const chromeMajor = parseMajorVersion(chromeVersion);
  const driverMajor = parseMajorVersion(driverVersion);
  if (chromeMajor === null || driverMajor === null) return 'unavailable';
  return chromeMajor === driverMajor ? 'match' : 'mismatch';
}

export interface DriverVersionCheck {
  status: DriverVersionStatus;
  chromeMajor: string | null;
  driverMajor: string | null;
  // The chromedriver binary the resolution landed on (null when unresolved).
  driverPath: string | null;
  // The Selenium Manager cache the harness points at (the stale-cache fallback
  // of ~/.cache/selenium is kept out through this default).
  cachePath: string;
  // The raw platform the resolution ran on (process.platform, e.g. "darwin").
  // An input like the versions above, never read from the environment here;
  // undefined keeps today's message. An unknown platform is fail-safe in the
  // harness (the macOS Selenium Manager dir is still tried) and this field is
  // what lets the repair message name the platform and say it is unsupported
  // instead of staying opaque (PBI-204 review Minor: the fail-safe named no
  // platform).
  platform?: string | null;
}

// Platforms the bundled Selenium Manager ships a binary for (harness.ts maps
// darwin/win32/linux onto its bin directories). Any other platform falls back
// to the macOS directory — fail safe, and the failure message below is where
// it stops being silent (PBI-204 review Minor: the fail-safe named no platform).
const SUPPORTED_PLATFORMS = ['darwin', 'win32', 'linux'];

// Repair instructions attached to a failing preflight. One numbered list per
// fix, every line a runnable command or an explicit override; a match returns
// no message (the caller only throws for mismatch / unavailable). An unknown
// platform stays fail-safe (the macOS Selenium Manager dir is still tried) but
// must not stay opaque: the message names the platform and says it is
// unsupported before the repair paths.
export function driverVersionFailureMessage(check: DriverVersionCheck): string {
  if (check.status === 'match') return '';
  const platformNotes = check.platform != null
    && !SUPPORTED_PLATFORMS.includes(check.platform)
    ? [`Platform note: ${check.platform} is not supported by the bundled Selenium Manager (darwin/win32/linux); the macOS directory is tried as a fail-safe, so the driver must come from CHROMEDRIVER_BIN or a manual download.`]
    : [];
  const repairs = [
    `1. retry with network available: Selenium Manager downloads chromedriver@<chrome major> into SE_CACHE_PATH=${check.cachePath} (the harness points SE_CACHE_PATH there by default, so the stale ~/.cache/selenium fallback is out of the picture)`,
    `2. opt-in download: JUSHOAI_DRIVER_DOWNLOAD=1 make e2e-chrome (fetches chromedriver@${check.chromeMajor ?? '<chrome major>'} via @puppeteer/browsers)`,
    `3. manual download: npx @puppeteer/browsers install chromedriver@${check.chromeMajor ?? '<chrome major>'} --path ${check.cachePath}`,
    '4. explicit binary: set CHROMEDRIVER_BIN to a chromedriver whose major matches Chrome',
    '5. align the Chrome major with the driver (brew upgrade google-chrome) or install a driver for the Chrome major',
  ];
  if (check.chromeMajor === null) {
    return [
      'Chrome version preflight failed: the Chrome --version output could not be read.',
      ...platformNotes,
      'Set CHROME_BIN to the Chrome binary (macOS: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome) so the version comparison can run.',
      '',
      ...repairs,
    ].join('\n');
  }
  if (check.driverMajor === null) {
    return [
      `Chrome version preflight failed: no ChromeDriver could be resolved for Chrome major ${check.chromeMajor} (Selenium Manager found no matching cached driver and could not download one).`,
      ...platformNotes,
      'A silently mismatched driver must not be used.',
      '',
      ...repairs,
    ].join('\n');
  }
  return [
    `Chrome version preflight failed: ChromeDriver major ${check.driverMajor} does not match Chrome major ${check.chromeMajor} (resolved binary: ${check.driverPath ?? 'unknown'}).`,
    ...platformNotes,
    'A silently mismatched driver must not be used.',
    '',
    ...repairs,
  ].join('\n');
}
