import {
  classifyField, isConfident, refineClassifications,
} from './classify-rules';
import { detectKanaKind, resolveKana } from './kana';
import type { Category, FieldMeta, Item } from './types';
import type { FieldClassifier } from './classifier';
import { applyEnglishPage } from './page-language';

export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
  opts: { force?: boolean; englishPage?: boolean } = {},
): Promise<Item[]> {
  const startedAt = Date.now();
  const force = opts.force === true;
  const ruled = metas.map((meta) => ({ meta, cls: classifyField(meta) }));
  const pending = (force ? ruled : ruled.filter((r) => !isConfident(r.cls))).map((r) => r.meta);

  // PBI-27: the rule-only trace fires only when no LLM attempt happens
  // (classifier off, or nothing pending). When the LLM is attempted, the AI
  // path's own audit point (AuditedClassifier.log) is the record — including
  // on failure — so emitting here too would double-count that run.
  const llmAttempted = classifier !== null && pending.length > 0;
  let fromLlm = new Map<string, Category>();
  if (classifier && pending.length > 0) {
    try {
      fromLlm = await classifier.classify(pending);
    } catch {
      // An LLM failure must not block rule-based filling.
    }
  }

  const items: Item[] = [];
  for (const { meta, cls } of ruled) {
    if (!force && isConfident(cls)) {
      items.push({ meta, cls });
      continue;
    }
    const category = fromLlm.get(meta.id);
    if (category && category !== 'unknown') {
      // PBI-05: radio groups are only fillable as gender/ageDecade (see
      // buildPlan). An LLM answer classifying a radio as anything else would
      // bypass that policy, so drop it here and fall through to the rule-keep
      // path below (PBI-03), which leaves such fields as unknown.
      if (meta.tag !== 'radio' || category === 'gender' || category === 'ageDecade') {
        items.push({
          meta,
          cls: {
            category,
            confidence: 0.5,
            source: 'llm',
            ...(category.endsWith('Kana') ? { kanaKind: detectKanaKind(meta) } : {}),
          },
        });
        continue;
      }
    }
    // Without an LLM answer, keep the rule result (even a weak one) so
    // rule-only filling still works; fields the rules cannot classify stay
    // visible as unknown so buildPlan can exclude them instead of misfilling.
    items.push({ meta, cls: cls ?? { category: 'unknown', confidence: 0, source: 'rule' } });
  }
  const resolved = resolveKana(items);
  const refined = refineClassifications(resolved);
  const out = opts.englishPage ? applyEnglishPage(refined) : refined;
  if (!llmAttempted) {
    // PBI-27: one aggregated line per rule-only run — field count and elapsed
    // time only. No meta contents (label/placeholder/value/ids) ever enter the
    // line, so no profile values or field PII can leak. The line is a console
    // trace, not a stored entry: it holds no retained batch, so it cannot
    // exceed the audit byte budget (AUDIT_MAX_BYTES) and leaves nothing for
    // retention (AUDIT_RETENTION_MS) to expire. Fixed short format (~dozens of
    // bytes) keeps each line far under any budget by construction.
    console.debug(`[JushoAI] rule-only classify fields=${metas.length} durationMs=${Date.now() - startedAt}`);
  }
  return out;
}
