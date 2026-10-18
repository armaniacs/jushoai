import { isExcludedUrl } from '../core/exclusions';

export interface ExclusionGateDeps {
  loadExcluded(): Promise<string[]>;
  href(): string;
  start(): void;
  stop(): void;
}

export interface ExclusionGate {
  init(): Promise<void>;
  refresh(): Promise<void>;
  recheck(): void;
  entries(): string[];
  isExcluded(): boolean;
}

// Keeps the content script off excluded URLs. `start`/`stop` own the observers
// and the mounted buttons, so a list that changes at runtime takes effect
// without a reload. The state starts unknown, so the first evaluation always
// applies even when the page is not excluded. A store that cannot be read fails
// open: a broken list must not silently disable the extension everywhere.
export function createExclusionGate(deps: ExclusionGateDeps): ExclusionGate {
  let list: string[] = [];
  let state: 'unknown' | 'running' | 'stopped' = 'unknown';
  const apply = (excluded: boolean): void => {
    const want = excluded ? 'stopped' : 'running';
    if (state === want) return;
    state = want;
    if (excluded) deps.stop();
    else deps.start();
  };
  const evaluate = (): void => apply(isExcludedUrl(deps.href(), list));
  const read = async (): Promise<void> => {
    try {
      list = await deps.loadExcluded();
    } catch {
      list = [];
    }
    evaluate();
  };
  return {
    entries: () => list,
    isExcluded: () => state === 'stopped',
    init: read,
    refresh: read,
    recheck: evaluate,
  };
}
