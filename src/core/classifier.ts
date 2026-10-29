import type { Category, FieldMeta } from './types';

// Position of one call within a fill's split classification run; carried on the
// wire and into the audit log so the scheduling of split requests stays traceable.
export interface ClassifySchedule {
  index: number;
  count: number;
}

// The classification seam: rules handle confident fields, adapters behind this interface
// handle the rest. Implementations live in llm/ and ai/; core stays DOM- and LLM-free.
//
// PBI-42: one attempt is one call of this shape. classify() is the fire-and-forget
// convenience (failures collapse to an empty map via throw-and-catch in analyze);
// attempt() is the observable seam: the map plus the reason travel together on the
// return value, so truncation and failure reasons are unit-testable through the
// seam instead of escaping into caller closures.
//
// PBI-48: the throwing contract belongs to classify() only. Adapters built on
// attempt() (e.g. classifyWithReason's seam in content-session.ts) return the
// partial map WITHOUT rethrowing outcome.error: a failed chunk's partial
// results still reach analyze, which keeps rule results for the missing fields.
// Do not swap such a seam for a raw classifier without preserving this.
//
// PBI-174: the abort signal rides the seam as an explicit run argument
// (ClassifyPipeline passes preview disposal down to the transfer). Adapters
// without chunking may ignore it; the run still checks it between chunks.
export interface FieldClassifier {
  classify(fields: FieldMeta[], schedule?: ClassifySchedule): Promise<Map<string, Category>>;
  attempt(
    fields: FieldMeta[],
    schedule?: ClassifySchedule,
    opts?: { signal?: AbortSignal },
  ): Promise<AttemptOutcome>;
}

// Result of one classification attempt: the partial map bound to the reason of
// the chunk that stopped the run. failureReason stays null on success.
// Kept as string (not ClassifyFailure) so core/ stays free of the message
// vocabulary import; gateway implementations narrow it to ClassifyFailure.
export interface AttemptOutcome {
  map: Map<string, Category>;
  failureReason: string | null;
}

// Result of a gateway attempt (PBI-193): the cap/split run lives in
// runClassifyPipeline (classify-pipeline/), so the gateway's single bounded
// send never drops fields and truncatedCount stays 0 — the run-level dropped
// count is the pipeline plan's. Partial results stay bound to the run's
// failure reason; the 'truncated' ClassifyFailure rides failureReason into the
// existing failureReason→showError path.
export interface CappedAttempt extends AttemptOutcome {
  truncatedCount: number;
}

// Gateway classifiers that cap the run narrow the unified seam with the cap
// detail: attempt() still returns the seam's {map, failureReason}, plus the
// truncated count. PBI-49: the schedule param is accepted for substitutability
// (a CappedClassifier is usable wherever a FieldClassifier is expected) and
// rides the single bounded send through to the wire: the pipeline run passes
// scheduleFor(i, count) for split runs and undefined for a single-chunk run,
// so the audit log's scheduling fields stay empty for degenerate runs
// (PBI-193: the cap/split is the pipeline plan's, not the gateway's). PBI-42:
// formerly a separate incompatible shape alongside TracedClassifier.attempt;
// now both narrow the one FieldClassifier.attempt seam.
export interface CappedClassifier extends FieldClassifier {
  attempt(
    fields: FieldMeta[],
    schedule?: ClassifySchedule,
    opts?: { signal?: AbortSignal },
  ): Promise<CappedAttempt>;
}
