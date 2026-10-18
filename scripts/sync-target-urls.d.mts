export interface RegistryEntry {
  url: string;
  file: string | null;
}

export function parseRegistry(md: string): RegistryEntry[];
export function stampRegistry(md: string, url: string, file: string): string;

export const FETCH_TIMEOUT_MS: number;

export interface SyncTargetOptions {
  only?: string | null;
  all?: boolean;
}

export function parseSyncArgs(argv: string[]): { only: string | null; all: boolean; check: boolean };
export function selectTargets(entries: RegistryEntry[], opts?: SyncTargetOptions): RegistryEntry[];

export interface FetchPageResult {
  ok: boolean;
  status?: number;
  text?: string;
  error?: unknown;
}

export function fetchPage(url: string, fetchFn?: typeof fetch): Promise<FetchPageResult>;

export const EXPECTED_PLACEHOLDER: string;

export function countExpectedPlaceholders(source: string): number;

export interface ExpectedRemnant {
  file: string;
  count: number;
}

export function collectExpectedRemnants(files: Record<string, string>): ExpectedRemnant[];
export function formatExpectedRemnants(remnants: ExpectedRemnant[]): string;
