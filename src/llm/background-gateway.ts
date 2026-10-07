import type { Category, FieldMeta } from '../core/types';
import type { AiStatusInfo } from '../ai/types';
import { parseClassifyResult, parseStatusResponse, parseTestResponse, isLegacyClassifyFailure, MAX_CLASSIFY_CHUNK, toWireMeta, type ClassifyFailure, type TestResponse } from '../messages';
import type { FieldClassifier } from '../core/classifier';

const STATUS_TIMEOUT_MS = 5_000;
export const CLASSIFY_TIMEOUT_MS = 45_000;
export const MAX_CLASSIFY_TOTAL = 60;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 30_000;

const UNKNOWN_STATUS: AiStatusInfo = { status: 'unavailable', provider: 'none' };

// A stalled Service Worker reply must not leave the caller pending forever.
function sendWithTimeout(msg: unknown, ms: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    (chrome.runtime.sendMessage(msg) as Promise<unknown>).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function getAiStatusViaBackground(timeoutMs = STATUS_TIMEOUT_MS): Promise<AiStatusInfo> {
  try {
    return parseStatusResponse(await sendWithTimeout({ type: 'ai-status' }, timeoutMs)) ?? UNKNOWN_STATUS;
  } catch {
    return UNKNOWN_STATUS;
  }
}

export async function testAiViaBackground(timeoutMs = TEST_TIMEOUT_MS): Promise<TestResponse | null> {
  try {
    return parseTestResponse(await sendWithTimeout({ type: 'ai-test' }, timeoutMs));
  } catch {
    return null;
  }
}

export async function requestDownloadViaBackground(timeoutMs = DOWNLOAD_TIMEOUT_MS): Promise<boolean> {
  try {
    const res = await sendWithTimeout({ type: 'ai-download' }, timeoutMs);
    return (res as { started?: unknown } | null | undefined)?.started === true;
  } catch {
    return false;
  }
}

export class BackgroundClassifier implements FieldClassifier {
  // Reason for the chunk that stopped the run; null when every chunk succeeded.
  // Partial results from earlier chunks are still returned.
  lastFailureReason: ClassifyFailure | null = null;

  constructor(private readonly timeoutMs = CLASSIFY_TIMEOUT_MS) {}

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    const out = new Map<string, Category>();
    this.lastFailureReason = null;
    const capped = fields.slice(0, MAX_CLASSIFY_TOTAL);
    for (let i = 0; i < capped.length; i += MAX_CLASSIFY_CHUNK) {
      const chunk = capped.slice(i, i + MAX_CLASSIFY_CHUNK).map(toWireMeta);
      let parsed: ReturnType<typeof parseClassifyResult>;
      let raw: unknown;
      try {
        raw = await sendWithTimeout({ type: 'ai-classify', fields: chunk }, this.timeoutMs);
        parsed = parseClassifyResult(raw);
      } catch {
        this.lastFailureReason = 'network';
        break;
      }
      if (!parsed) {
        // A legacy reply carries no reason; record unknown instead of crying wolf.
        this.lastFailureReason = isLegacyClassifyFailure(raw) ? null : 'bad-response';
        break;
      }
      if (parsed.ok === false) {
        // A failing provider (401, 429, timeout) would fail every later chunk too.
        this.lastFailureReason = parsed.reason;
        break;
      }
      for (const [id, c] of parsed.map) out.set(id, c);
    }
    return out;
  }
}
