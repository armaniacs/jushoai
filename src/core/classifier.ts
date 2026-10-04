import type { Category, FieldMeta } from './types';

// The classification seam: rules handle confident fields, adapters behind this interface
// handle the rest. Implementations live in llm/ and ai/; core stays DOM- and LLM-free.
export interface FieldClassifier {
  classify(fields: FieldMeta[]): Promise<Map<string, Category>>;
}
