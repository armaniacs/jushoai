import {
  classifyField, isConfident, refineClassifications, classifyRulePipeline,
} from './classify-rules';
import { detectKanaKind, resolveKana } from './kana';
import type { Category, FieldMeta, Item } from './types';
import type { FieldClassifier } from './classifier';
import { applyEnglishPage } from './page-language';
import { isAllowedRadioCategory } from './radio-policy';

// PBI-27: one aggregated line per rule-only run — field count and elapsed
// time only. No meta contents (label/placeholder/value/ids) ever enter the
// line, so no profile values or field PII can leak. The line is a console
// trace, not a stored entry: it holds no retained batch, so it cannot
// exceed the audit byte budget (AUDIT_MAX_BYTES) and leaves nothing for
// retention (AUDIT_RETENTION_MS) to expire. Fixed short format (~dozens of
// bytes) keeps each line far under any budget by construction.
function logRuleOnlyRun(fieldCount: number, startedAt: number): void {
  console.debug(`[JushoAI] rule-only classify fields=${fieldCount} durationMs=${Date.now() - startedAt}`);
}

export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
  opts: { force?: boolean; englishPage?: boolean; llmSkip?: ReadonlySet<string> } = {},
): Promise<Item[]> {
  const startedAt = Date.now();
  const force = opts.force === true;
  const ruled = metas.map((meta) => ({ meta, cls: classifyField(meta) }));
  // PBI-124: llmSkip keeps field ids the egress gate excluded — their metadata
  // never reaches the LLM and they fall through to the rule-keep path below.
  const pending = (force ? ruled : ruled.filter((r) => !isConfident(r.cls)))
    .filter((r) => !opts.llmSkip?.has(r.meta.id))
    .map((r) => r.meta);

  // PBI-27: the rule-only trace fires only when no LLM attempt happens
  // (classifier off, or nothing pending). When the LLM is attempted, the AI
  // path's own audit point (AuditedClassifier.log) is the record — including
  // on failure — so emitting here too would double-count that run.
  if (classifier === null || pending.length === 0) {
    // PBI-50: the rule-only route is owned by classifyRulePipeline (single
    // source); analyze keeps the LLM branch and the aggregated trace line.
    // Equivalent to the inline path below when fromLlm is empty: confident
    // fields keep their rule result either way, the rest keep theirs or fall
    // back to unknown, then resolveKana→refine→englishPage in the same order.
    // force has no meaning without an LLM (nothing to force past the rules),
    // so only the page-language flag is forwarded.
    logRuleOnlyRun(metas.length, startedAt);
    return classifyRulePipeline(metas, { englishPage: opts.englishPage });
  }
  let fromLlm = new Map<string, Category>();
  try {
    fromLlm = await classifier.classify(pending);
  } catch {
    // An LLM failure must not block rule-based filling.
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
      // PBI-41: the allowed set is owned by isAllowedRadioCategory.
      if (meta.tag !== 'radio' || isAllowedRadioCategory(category)) {
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
  return opts.englishPage ? applyEnglishPage(refined) : refined;
}
