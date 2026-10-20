import type { Category, FieldMeta } from '../core/types';
import type { AttemptTrace, ClassifyAttempt, TracedClassifier } from '../ai/audited-classifier';
import { clipAuditResponse } from '../ai/audit-log';
import { LM_OPTIONS, type LanguageModelStatic } from './availability';
import { SYSTEM_PROMPT, buildPrompt, buildSchema, parseLlmOutput } from './prompt';

export class PromptApiClassifier implements TracedClassifier {
  constructor(private readonly lm: LanguageModelStatic) {}

  // The trace rides the return value, matching HttpClassifier.attempt: the
  // prompt is kept from construction (even when create() fails), and failures
  // carry their partial trace in the same shape.
  // PBI-42: the unified seam's failureReason rides along too. A LanguageModel
  // failure has no wire status to map, so it reports 'bad-response' — the same
  // reason the provider-registry classify path maps such errors to.
  async attempt(fields: FieldMeta[]): Promise<ClassifyAttempt> {
    const trace: AttemptTrace = { status: null, retried: false, request: '', response: '' };
    if (fields.length === 0) return { map: new Map(), failureReason: null, trace };
    const prompt = buildPrompt(fields);
    // Set before create() so a failed session still leaves the request on record.
    trace.request = prompt;
    try {
      const session = await this.lm.create({
        ...LM_OPTIONS,
        initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
      });
      try {
        const raw = await session.prompt(prompt, {
          responseConstraint: buildSchema(fields),
        });
        // Same clip the audit entry applies, so the retained trace string itself
        // stays bounded instead of holding a full-size response (mirrors HttpClassifier.attempt).
        trace.response = clipAuditResponse(raw);
        return { map: parseLlmOutput(raw, fields), failureReason: null, trace };
      } finally {
        session.destroy();
      }
    } catch (error) {
      return { map: new Map(), failureReason: 'bad-response', trace, error };
    }
  }

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    const attempt = await this.attempt(fields);
    if (attempt.error !== undefined) throw attempt.error;
    return attempt.map;
  }
}
