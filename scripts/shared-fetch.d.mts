export const FETCH_TIMEOUT_MS: number;

export interface FetchPageResult {
  ok: boolean;
  status?: number;
  text?: string;
  error?: unknown;
}

export function fetchPage(url: string, fetchFn?: typeof fetch): Promise<FetchPageResult>;
