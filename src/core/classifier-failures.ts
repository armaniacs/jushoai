import { includesLiteral } from './literals';

const TEST_FAILURES = ['not-configured', 'permission', 'auth', 'network', 'rejected', 'bad-response', 'unavailable', 'first-dial'] as const;

export type TestFailure = (typeof TEST_FAILURES)[number];

// Failure vocabulary for ai-classify: the TestFailure set, which includes
// 'unavailable' (built-in AI present in settings but not usable right now),
// plus 'truncated' (the transfer capped the run at TRANSFER_TOTAL_CAP and
// dropped trailing fields). 'truncated' is classify-only: the transfer sets it
// locally, so it never arrives over the wire and the connection test never
// returns it (parseTestResponse still rejects it).
const CLASSIFY_FAILURES = [...TEST_FAILURES, 'truncated'] as const;

export type ClassifyFailure = (typeof CLASSIFY_FAILURES)[number];

// WHY: 語彙外の文字列を折り畳む既定の fold 先。分類・転送・レジストリの
// 失敗経路は未知の理由をこの 1 点に集約する ('bad-response' の値不変)。
// 語彙の 1 員ではなく「既定の選択」を表すため FALLBACK_ 接頭辞を持つ。
export const FALLBACK_CLASSIFY_FAILURE = 'bad-response' as const;

// The literal arrays stay module-internal: vocabulary membership is exposed
// only through these predicates, so consumers cannot grow dependencies on the
// raw lists.
// The predicates take unknown (not string): wire parsers pass unvalidated reply
// fields straight in, and includesLiteral already owns the typeof-string check,
// so callers never need a redundant typeof guard before calling.
export const isTestFailure = (v: unknown): v is TestFailure => includesLiteral(TEST_FAILURES, v);
export const isClassifyFailure = (v: unknown): v is ClassifyFailure => includesLiteral(CLASSIFY_FAILURES, v);

// Seam-boundary guard for failureReason (review #5): the reason travels as a
// string on AttemptOutcome, so a future adapter could hand back a
// non-vocabulary string that would crash the hint lookup
// (AI_FAILURE_TEXT[reason].hint). Fold unknown reasons to 'bad-response' —
// the same mapping the registry's throw path uses — and let null (success)
// pass through.
export function asClassifyFailure(reason: string | null): ClassifyFailure | null {
  if (reason === null) return null;
  return includesLiteral(CLASSIFY_FAILURES, reason) ? reason : FALLBACK_CLASSIFY_FAILURE;
}

// Maps a request decode failure onto the classify failure vocabulary:
// 'oversize' (past the transfer backstop) is caused by the field-count cap, so
// it maps to 'truncated', while version skew and malformed shapes map to
// 'bad-response' as response anomalies. Keeping the result in the same
// vocabulary the sender-side transfer (classify-transport) uses lets both ends
// record and display the same reason. The parameter is a plain string rather
// than the wire-side RequestDecodeError union because this module must not
// depend on the wire file; the ternary stays behavior-identical for that
// union (only 'oversize' is special-cased).
export function decodeErrorToClassifyFailure(reason: string): ClassifyFailure {
  return reason === 'oversize' ? 'truncated' : FALLBACK_CLASSIFY_FAILURE;
}
