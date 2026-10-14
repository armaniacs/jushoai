import type { Category, FieldMeta } from '../core/types';
import type { AiStatusInfo } from '../ai/types';
import { parseAuditClearResponse, parseClassifyResult, parseStatusResponse, parseTestResponse, isLegacyClassifyFailure, MAX_CLASSIFY_CHUNK, toWireMeta, type ClassifyFailure, type TestResponse } from '../messages';
import type { FieldClassifier } from '../core/classifier';

const STATUS_TIMEOUT_MS = 5_000;
export const CLASSIFY_TIMEOUT_MS = 45_000;
export const MAX_CLASSIFY_TOTAL = 60;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 30_000;
const CLEAR_TIMEOUT_MS = 10_000;

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

// Single backbone for the background calls: public signatures (timeout
// argument, null fallback) stay put while timeout/parse additions land here.
// Thin wrappers above keep their types and defaults untouched.
async function callBackground<T>(msg: unknown, ms: number, parse: (v: unknown) => T | null): Promise<T | null> {
  try {
    return parse(await sendWithTimeout(msg, ms));
  } catch {
    return null;
  }
}

export async function getAiStatusViaBackground(timeoutMs = STATUS_TIMEOUT_MS): Promise<AiStatusInfo> {
  return (await callBackground({ type: 'ai-status' }, timeoutMs, parseStatusResponse)) ?? UNKNOWN_STATUS;
}

export async function testAiViaBackground(timeoutMs = TEST_TIMEOUT_MS): Promise<TestResponse | null> {
  return callBackground({ type: 'ai-test' }, timeoutMs, parseTestResponse);
}

export async function requestDownloadViaBackground(timeoutMs = DOWNLOAD_TIMEOUT_MS): Promise<boolean> {
  const res = await callBackground({ type: 'ai-download' }, timeoutMs, (v) => v);
  return (res as { started?: unknown } | null | undefined)?.started === true;
}

// Delegates the settings-page delete to the background AuditStore so record and
// clear share one write queue; ok:false and a stalled reply both report failure.
export async function clearAuditViaBackground(timeoutMs = CLEAR_TIMEOUT_MS): Promise<boolean> {
  return (await callBackground({ type: 'audit-clear' }, timeoutMs, parseAuditClearResponse))?.ok === true;
}

export class BackgroundClassifier implements FieldClassifier {
  constructor(private readonly timeoutMs = CLASSIFY_TIMEOUT_MS) {}

  // The failure reason rides the return value: partial results from earlier
  // chunks stay bound to the reason of the chunk that stopped the run, with no
  // shared mutable read after the call.
  async attempt(fields: FieldMeta[]): Promise<{ map: Map<string, Category>; failureReason: ClassifyFailure | null }> {
    const out = new Map<string, Category>();
    let failureReason: ClassifyFailure | null = null;
    const capped = fields.slice(0, MAX_CLASSIFY_TOTAL);
    const chunkCount = Math.ceil(capped.length / MAX_CLASSIFY_CHUNK);
    for (let i = 0; i < capped.length; i += MAX_CLASSIFY_CHUNK) {
      const rows = capped.slice(i, i + MAX_CLASSIFY_CHUNK).map(toWireMeta);
      // The chunk position rides along only when the run was actually split, so
      // single-chunk calls stay out of the audit log's scheduling fields.
      const schedule = chunkCount > 1 ? { index: i / MAX_CLASSIFY_CHUNK + 1, count: chunkCount } : undefined;
      let parsed: ReturnType<typeof parseClassifyResult>;
      let raw: unknown;
      try {
        raw = await sendWithTimeout(
          { type: 'ai-classify', fields: rows, ...(schedule ? { chunk: schedule } : {}) },
          this.timeoutMs,
        );
        parsed = parseClassifyResult(raw);
      } catch {
        failureReason = 'network';
        break;
      }
      if (!parsed) {
        // A legacy reply carries no reason; record unknown instead of crying wolf.
        failureReason = isLegacyClassifyFailure(raw) ? null : 'bad-response';
        break;
      }
      if (parsed.ok === false) {
        // A failing provider (401, 429, timeout) would fail every later chunk too.
        failureReason = parsed.reason;
        break;
      }
      for (const [id, c] of parsed.map) out.set(id, c);
    }
    return { map: out, failureReason };
  }

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    return (await this.attempt(fields)).map;
  }
}
