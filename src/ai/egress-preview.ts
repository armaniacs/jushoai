import { encodeFieldMeta } from '../messages';
import { suspectPii } from '../core/pii-suspect';
import type { FieldMeta } from '../core/types';

// Egress preview rows (PBI-124): what the AI provider would receive for the
// pending fields. Built from the same wire construction the request uses
// (encodeFieldMeta), so what the gate shows cannot drift from what is sent —
// the audit log and this preview render the same allow-list shape.
export interface EgressRow {
  id: string;
  suspect: boolean;
  summary: string;
}

const SUSPECT_INPUT_KEYS = ['label', 'placeholder', 'nearby', 'name', 'htmlId'] as const;

export function egressRowSummary(wire: ReturnType<typeof encodeFieldMeta>): string {
  const parts: string[] = [];
  if (wire.name) parts.push(`name=${wire.name}`);
  if (wire.htmlId) parts.push(`id=${wire.htmlId}`);
  if (wire.label) parts.push(`label=${wire.label}`);
  if (wire.placeholder) parts.push(`placeholder=${wire.placeholder}`);
  if (wire.nearby) parts.push(`見出し=${wire.nearby}`);
  parts.push(`type=${wire.type}`);
  if (wire.maxLength != null) parts.push(`maxLength=${wire.maxLength}`);
  return parts.join('・');
}

export function egressRowsFor(
  metas: FieldMeta[],
  suspect: (text: string) => boolean = suspectPii,
): EgressRow[] {
  return metas.map((m) => {
    const wire = encodeFieldMeta(m);
    const text = SUSPECT_INPUT_KEYS.map((k) => wire[k]).join('\n');
    return { id: wire.id, suspect: suspect(text), summary: egressRowSummary(wire) };
  });
}
