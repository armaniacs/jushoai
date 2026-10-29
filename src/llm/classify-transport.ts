import type { Category, FieldMeta } from '../core/types';
import type { ClassifySchedule } from '../core/classifier';
import {
  aiClassifyRequest,
  encodeFieldMeta,
  isLegacyClassifyFailure,
  parseClassifyResult,
  type ClassifyFailure,
} from '../messages';
import { TRANSFER_CHUNK_TIMEOUT_MS, TRANSFER_TOTAL_TIMEOUT_MS } from './transfer-contract';
import { sendWithTimeout } from './timed-call';

// Single owner of the classify transfer wire (PBI-175). The transfer-side
// concerns — encode, the codec-owned envelope, one bounded round-trip, and the
// wire failure vocabulary — are aggregated here, and the only public entry is
// send. The sequential chunk run (cap clamp → split → schedule → failure
// aggregation) is NOT here: since PBI-193 the pipeline run
// (runClassifyPipeline, classify-pipeline/pipeline.ts) is the canonical run,
// and this send is one bounded send over the fields the caller hands in. The
// seam invariant is that pipeline fields already fit one chunk width; the plan
// call that kept that invariant lives in the pipeline alone. The gateway
// (background-gateway.ts) holds no transfer content either: it is the thin
// adapter that forwards its configuration pair into send.

export interface ClassifySendOptions {
  signal?: AbortSignal;
  // Chunk position for this one send, passed through to the wire verbatim.
  // The pipeline hands scheduleFor(i, count) for split runs and undefined for
  // a single-chunk run, so degenerate runs stay out of the audit log's
  // scheduling fields (the transport:88-90 passthrough, kept by PBI-193).
  schedule?: ClassifySchedule;
  // Defaults are the transfer-contract values. Passthrough for the gateway's
  // configuration (tests included); normally left unspecified.
  timeoutMs?: number;
  totalTimeoutMs?: number;
}

export interface ClassifySendResult {
  map: Map<string, Category>;
  failureReason: ClassifyFailure | null;
  truncatedCount: number;
}

// The one bounded send (PBI-193): encode the fields the caller hands in, one
// wire round-trip, and bind the wire failure vocabulary to the result. The run
// disciplines (first failure wins, the 'truncated' notice only when nothing
// else failed, an abort keeping what is earned) are owned by
// runClassifyPipeline — the canonical chunk run this module serves through the
// FieldClassifier seam.
//
// Failure vocabulary of this one send: a rejected round-trip (timeout, abort,
// disconnect) is 'network', a legacy reason-less failure stays null, a
// malformed reply is 'bad-response', and a failing provider (401, 429,
// timeout) reports its reason verbatim.
//
// PBI-33: totalTimeoutMs still clamps this send (Math.min(timeoutMs,
// remaining)), so a send's wall clock stays within the budget the caller
// configured; the signal stops the send before and during the round-trip.
// Either cutoff returns 'network' with the map earned so far.
export async function send(fields: FieldMeta[], opts: ClassifySendOptions = {}): Promise<ClassifySendResult> {
  const signal = opts.signal;
  const timeoutMs = opts.timeoutMs ?? TRANSFER_CHUNK_TIMEOUT_MS;
  const totalTimeoutMs = opts.totalTimeoutMs ?? TRANSFER_TOTAL_TIMEOUT_MS;
  const out = new Map<string, Category>();
  // One send never drops fields: the cap/split lives in the pipeline's plan
  // (PBI-193), so the count is 0 for every outcome below.
  const truncatedCount = 0;
  if (fields.length === 0) {
    return { map: out, failureReason: null, truncatedCount };
  }
  if (signal?.aborted) {
    return { map: out, failureReason: 'network', truncatedCount };
  }
  const startedAt = Date.now();
  const remaining = totalTimeoutMs - (Date.now() - startedAt);
  if (remaining <= 0) {
    return { map: out, failureReason: 'network', truncatedCount };
  }
  const rows = fields.map(encodeFieldMeta);
  // PBI-54: sent through the ai-classify builder (codec-owned envelope);
  // rows are MetaWire and the wire type says so.
  let raw: unknown;
  try {
    raw = await sendWithTimeout(
      aiClassifyRequest(rows, opts.schedule),
      Math.min(timeoutMs, remaining),
      signal,
    );
  } catch {
    return { map: out, failureReason: 'network', truncatedCount };
  }
  const parsed = parseClassifyResult(raw);
  if (!parsed) {
    // A legacy reply carries no reason; record unknown instead of crying wolf.
    return { map: out, failureReason: isLegacyClassifyFailure(raw) ? null : 'bad-response', truncatedCount };
  }
  if (parsed.ok === false) {
    return { map: out, failureReason: parsed.reason, truncatedCount };
  }
  for (const [id, c] of parsed.map) out.set(id, c);
  return { map: out, failureReason: null, truncatedCount };
}
