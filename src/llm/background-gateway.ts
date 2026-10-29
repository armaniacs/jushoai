import type { Category, FieldMeta } from '../core/types';
import type { AiStatusInfo } from '../ai/types';
import { aiDownloadRequest, aiStatusRequest, aiTestRequest, parseAuditClearResponse, parseStatusResponse, parseTestResponse, type ClassifyFailure, type TestResponse } from '../messages';
import { TRANSFER_CHUNK_TIMEOUT_MS, TRANSFER_STATUS_TIMEOUT_MS, TRANSFER_TOTAL_CAP, TRANSFER_TOTAL_TIMEOUT_MS } from './transfer-contract';
import { send } from './classify-transport';
import type { CappedAttempt, CappedClassifier, ClassifySchedule } from '../core/classifier';

// PBI-43: cap・timeout は転送契約モジュールが所有する。ここでは既存の名前を
// 契約値への別名として残し、外部 import (テスト含む) の振る舞いを変えない。
const STATUS_TIMEOUT_MS = TRANSFER_STATUS_TIMEOUT_MS;
// PBI-175: 下の3別名は後方互換のための deprecated 再export。転送の実体は
// classify-transport（send）が所有し、この gateway は数値を自前利用しない。
// 新規コードは transfer-contract の正準名を import すること。
export const CLASSIFY_TIMEOUT_MS = TRANSFER_CHUNK_TIMEOUT_MS;
// PBI-33: chunk sequential run total cap (1 chunk 45s x 3 chunks = 135s worst
// case on slow lines). The per-chunk send is additionally clamped to the
// remaining budget, so the wall clock stays within this bound.
export const CLASSIFY_TOTAL_TIMEOUT_MS = TRANSFER_TOTAL_TIMEOUT_MS;
// PBI-174: cap・chunk 幅の数値は転送契約ではなくチャンク計画
// (classify-pipeline/chunks) が所有する。ここでは既存の名前を別名として
// 残し、外部 import (テスト含む) の振る舞いを変えない。
export const MAX_CLASSIFY_TOTAL = TRANSFER_TOTAL_CAP;
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

  // PBI-175: 転送のみの薄い適合層。chunk 計画・encode・送信・parse の実体は
  // classify-transport の send が所有し、ここでは構成値（timeout 対）を流す
  // だけにする。失敗語彙の優先順位・切り詰め通知の規律も send 側に集約。
  async attempt(
    fields: FieldMeta[],
    callerSchedule?: ClassifySchedule,
    opts?: { signal?: AbortSignal },
  ): Promise<CappedAttempt & { failureReason: ClassifyFailure | null }> {
    return send(fields, {
      signal: opts?.signal,
      schedule: callerSchedule,
      timeoutMs: this.timeoutMs,
      totalTimeoutMs: this.totalTimeoutMs,
    });
  }

  async classify(fields: FieldMeta[], _schedule?: ClassifySchedule, opts?: { signal?: AbortSignal }): Promise<Map<string, Category>> {
    return (await this.attempt(fields, _schedule, opts)).map;
  }
}
