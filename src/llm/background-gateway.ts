import type { Category, FieldMeta } from '../core/types';
import type { AiStatusInfo } from '../ai/types';
import { aiClassifyRequest, aiDownloadRequest, aiStatusRequest, aiTestRequest, parseAuditClearResponse, parseClassifyResult, parseStatusResponse, parseTestResponse, isLegacyClassifyFailure, encodeFieldMeta, type ClassifyFailure, type TestResponse } from '../messages';
import { TRANSFER_CHUNK_SIZE, TRANSFER_CHUNK_TIMEOUT_MS, TRANSFER_STATUS_TIMEOUT_MS, TRANSFER_TOTAL_CAP, TRANSFER_TOTAL_TIMEOUT_MS } from './transfer-contract';
import type { CappedAttempt, CappedClassifier, ClassifySchedule } from '../core/classifier';

// PBI-43: cap・timeout は転送契約モジュールが所有する。ここでは既存の名前を
// 契約値への別名として残し、外部 import (テスト含む) の振る舞いを変えない。
const STATUS_TIMEOUT_MS = TRANSFER_STATUS_TIMEOUT_MS;
export const CLASSIFY_TIMEOUT_MS = TRANSFER_CHUNK_TIMEOUT_MS;
// PBI-33: chunk sequential run total cap (1 chunk 45s x 3 chunks = 135s worst
// case on slow lines). The per-chunk send is additionally clamped to the
// remaining budget, so the wall clock stays within this bound.
export const CLASSIFY_TOTAL_TIMEOUT_MS = TRANSFER_TOTAL_TIMEOUT_MS;
export const MAX_CLASSIFY_TOTAL = TRANSFER_TOTAL_CAP;
// PBI-43: チャンク幅も契約から引き、messages 経由の間接参照をやめる。
const MAX_CLASSIFY_CHUNK = TRANSFER_CHUNK_SIZE;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const TEST_TIMEOUT_MS = 30_000;
const CLEAR_TIMEOUT_MS = 10_000;

const UNKNOWN_STATUS: AiStatusInfo = { status: 'unavailable', provider: 'none' };

// A stalled Service Worker reply must not leave the caller pending forever.
// The optional signal links the wait to preview disposal (PBI-33): an abort
// rejects the in-flight chunk so the loop below stops without sending more.
function sendWithTimeout(msg: unknown, ms: number, signal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, ms);
    const onAbort = () => { clearTimeout(timer); cleanup(); reject(new Error('aborted')); };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
    (chrome.runtime.sendMessage(msg) as Promise<unknown>).then(
      (v) => { clearTimeout(timer); cleanup(); resolve(v); },
      (e) => { clearTimeout(timer); cleanup(); reject(e); },
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
  return (await callBackground(aiStatusRequest(), timeoutMs, parseStatusResponse)) ?? UNKNOWN_STATUS;
}

export async function testAiViaBackground(timeoutMs = TEST_TIMEOUT_MS): Promise<TestResponse | null> {
  return callBackground(aiTestRequest(), timeoutMs, parseTestResponse);
}

export async function requestDownloadViaBackground(timeoutMs = DOWNLOAD_TIMEOUT_MS): Promise<boolean> {
  const res = await callBackground(aiDownloadRequest(), timeoutMs, (v) => v);
  return (res as { started?: unknown } | null | undefined)?.started === true;
}

// Delegates the settings-page delete to the background AuditStore so record and
// clear share one write queue; ok:false and a stalled reply both report failure.
export async function clearAuditViaBackground(timeoutMs = CLEAR_TIMEOUT_MS): Promise<boolean> {
  return (await callBackground({ type: 'audit-clear' }, timeoutMs, parseAuditClearResponse))?.ok === true;
}

export class BackgroundClassifier implements CappedClassifier {
  constructor(
    private readonly timeoutMs = CLASSIFY_TIMEOUT_MS,
    private readonly totalTimeoutMs = CLASSIFY_TOTAL_TIMEOUT_MS,
  ) {}

  // The failure reason rides the return value: partial results from earlier
  // chunks stay bound to the reason of the chunk that stopped the run, with no
  // shared mutable read after the call. A capped run additionally reports the
  // cut: truncatedCount carries how many trailing fields the cap dropped, and
  // failureReason becomes 'truncated' when nothing else failed (an actual chunk
  // failure stays more actionable than the cap notice, so it keeps priority).
  // PBI-42: this is the unified FieldClassifier.attempt seam ({map,
  // failureReason}) narrowed with the cap detail — callers read truncation and
  // failure reasons off the return value instead of a wrapper.
  // The schedule param is accepted for seam substitutability but intentionally
  // unused: the gateway derives its own chunk schedule from the cap and
  // MAX_CLASSIFY_CHUNK (single-chunk runs stay out of the audit log's
  // scheduling fields), so a caller schedule would be meaningless here.
  // PBI-33: the whole sequential run is bounded by totalTimeoutMs (remaining
  // budget clamps each chunk send), and opts.signal (preview disposal) stops
  // the run before/during a chunk. Either cutoff keeps earlier chunks and
  // reports 'network' so the caller safely continues with rules only.
  async attempt(
    fields: FieldMeta[],
    _schedule?: ClassifySchedule,
    opts?: { signal?: AbortSignal },
  ): Promise<CappedAttempt & { failureReason: ClassifyFailure | null }> {
    const signal = opts?.signal;
    const startedAt = Date.now();
    const out = new Map<string, Category>();
    let failureReason: ClassifyFailure | null = null;
    const truncatedCount = Math.max(0, fields.length - MAX_CLASSIFY_TOTAL);
    const capped = fields.slice(0, MAX_CLASSIFY_TOTAL);
    const chunkCount = Math.ceil(capped.length / MAX_CLASSIFY_CHUNK);
    for (let i = 0; i < capped.length; i += MAX_CLASSIFY_CHUNK) {
      if (signal?.aborted) {
        failureReason ??= 'network';
        break;
      }
      const remaining = this.totalTimeoutMs - (Date.now() - startedAt);
      if (remaining <= 0) {
        failureReason ??= 'network';
        break;
      }
      const rows = capped.slice(i, i + MAX_CLASSIFY_CHUNK).map(encodeFieldMeta);
      // The chunk position rides along only when the run was actually split, so
      // single-chunk calls stay out of the audit log's scheduling fields.
      // PBI-54: sent through the ai-classify builder (codec-owned envelope);
      // rows are MetaWire and the wire type says so.
      const schedule = chunkCount > 1 ? { index: i / MAX_CLASSIFY_CHUNK + 1, count: chunkCount } : undefined;
      let parsed: ReturnType<typeof parseClassifyResult>;
      let raw: unknown;
      try {
        raw = await sendWithTimeout(
          aiClassifyRequest(rows, schedule),
          Math.min(this.timeoutMs, remaining),
          signal,
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
    if (truncatedCount > 0 && failureReason === null) {
      failureReason = 'truncated';
    }
    return { map: out, failureReason, truncatedCount };
  }

  async classify(fields: FieldMeta[], _schedule?: ClassifySchedule, opts?: { signal?: AbortSignal }): Promise<Map<string, Category>> {
    return (await this.attempt(fields, _schedule, opts)).map;
  }
}
