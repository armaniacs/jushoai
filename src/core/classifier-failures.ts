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

// The literal arrays stay module-internal: vocabulary membership is exposed
// only through these predicates, so consumers cannot grow dependencies on the
// raw lists.
export const isTestFailure = (v: string): v is TestFailure => includesLiteral(TEST_FAILURES, v);
export const isClassifyFailure = (v: string): v is ClassifyFailure => includesLiteral(CLASSIFY_FAILURES, v);

// Seam-boundary guard for failureReason (review #5): the reason travels as a
// string on AttemptOutcome, so a future adapter could hand back a
// non-vocabulary string that would crash the hint lookup
// (AI_FAILURE_TEXT[reason].hint). Fold unknown reasons to 'bad-response' —
// the same mapping the registry's throw path uses — and let null (success)
// pass through.
export function asClassifyFailure(reason: string | null): ClassifyFailure | null {
  if (reason === null) return null;
  return includesLiteral(CLASSIFY_FAILURES, reason) ? reason : 'bad-response';
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
  return reason === 'oversize' ? 'truncated' : 'bad-response';
}
