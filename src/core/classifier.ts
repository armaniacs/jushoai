import type { Category, FieldMeta } from './types';

// Position of one call within a fill's split classification run; carried on the
// wire and into the audit log so the scheduling of split requests stays traceable.
export interface ClassifySchedule {
  index: number;
  count: number;
}

// The classification seam: rules handle confident fields, adapters behind this interface
// handle the rest. Implementations live in llm/ and ai/; core stays DOM- and LLM-free.
export interface FieldClassifier {
  classify(fields: FieldMeta[], schedule?: ClassifySchedule): Promise<Map<string, Category>>;
}

// Result of a gateway attempt that caps the input (BackgroundClassifier slices at
// MAX_CLASSIFY_TOTAL): partial results stay bound to the run's failure reason, and
// truncatedCount reports how many trailing fields the cap dropped (0 when the run
// was not capped). The 'truncated' ClassifyFailure rides failureReason into the
// existing failureReason→showError path; the count rides alongside it so callers
// can state exact numbers without parsing strings.
export interface CappedAttempt {
  map: Map<string, Category>;
  // Kept as string (not ClassifyFailure) so core/ stays free of the message
  // vocabulary import; gateway implementations narrow it to ClassifyFailure.
  failureReason: string | null;
  truncatedCount: number;
}

// Gateway classifiers that cap the run implement this alongside FieldClassifier;
// callers read the truncation signal off attempt() without touching classify().
// (A separate interface, not an attempt() on FieldClassifier, because
// TracedClassifier already extends FieldClassifier with an incompatible
// trace-carrying attempt shape.)
export interface CappedClassifier extends FieldClassifier {
  attempt(fields: FieldMeta[]): Promise<CappedAttempt>;
}
