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
