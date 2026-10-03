import type { Category, FieldMeta } from '../core/types';
import { isAiStatus, MAX_CLASSIFY_CHUNK, parseClassifyResponse } from '../messages';
import type { AiStatus } from './availability';
import type { FieldClassifier } from './classifier';

export async function getAiStatusViaBackground(): Promise<AiStatus> {
  try {
    const res: unknown = await chrome.runtime.sendMessage({ type: 'ai-status' });
    const status = (res as { status?: unknown } | null | undefined)?.status;
    return isAiStatus(status) ? status : 'unsupported';
  } catch {
    return 'unsupported';
  }
}

export async function requestDownloadViaBackground(): Promise<boolean> {
  try {
    const res: unknown = await chrome.runtime.sendMessage({ type: 'ai-download' });
    return (res as { started?: unknown } | null | undefined)?.started === true;
  } catch {
    return false;
  }
}

const toWire = (f: FieldMeta) => ({
  id: f.id,
  type: f.type,
  name: f.name,
  htmlId: f.htmlId,
  label: f.label,
  placeholder: f.placeholder,
  nearby: f.nearby,
  maxLength: f.maxLength,
});

export class BackgroundClassifier implements FieldClassifier {
  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    const out = new Map<string, Category>();
    for (let i = 0; i < fields.length; i += MAX_CLASSIFY_CHUNK) {
      const chunk = fields.slice(i, i + MAX_CLASSIFY_CHUNK).map(toWire);
      try {
        const res: unknown = await chrome.runtime.sendMessage({ type: 'ai-classify', fields: chunk });
        const parsed = parseClassifyResponse(res);
        if (parsed) for (const [id, c] of parsed) out.set(id, c);
      } catch {
        // A failed chunk must not discard results from the others.
      }
    }
    return out;
  }
}
