import type { Category, FieldMeta } from '../core/types';
import { isAiStatus, MAX_CLASSIFY_CHUNK, parseClassifyResponse } from '../messages';
import type { AiStatus } from './availability';
import type { FieldClassifier } from './classifier';

export const STATUS_TIMEOUT_MS = 5_000;
export const CLASSIFY_TIMEOUT_MS = 20_000;
export const DOWNLOAD_TIMEOUT_MS = 120_000;

// A stalled Service Worker reply must not leave the caller pending forever.
function sendWithTimeout(msg: unknown, ms: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    (chrome.runtime.sendMessage(msg) as Promise<unknown>).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function getAiStatusViaBackground(timeoutMs = STATUS_TIMEOUT_MS): Promise<AiStatus> {
  try {
    const res = await sendWithTimeout({ type: 'ai-status' }, timeoutMs);
    const status = (res as { status?: unknown } | null | undefined)?.status;
    return isAiStatus(status) ? status : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function requestDownloadViaBackground(timeoutMs = DOWNLOAD_TIMEOUT_MS): Promise<boolean> {
  try {
    const res = await sendWithTimeout({ type: 'ai-download' }, timeoutMs);
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
  constructor(private readonly timeoutMs = CLASSIFY_TIMEOUT_MS) {}

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    const out = new Map<string, Category>();
    for (let i = 0; i < fields.length; i += MAX_CLASSIFY_CHUNK) {
      const chunk = fields.slice(i, i + MAX_CLASSIFY_CHUNK).map(toWire);
      try {
        const res = await sendWithTimeout({ type: 'ai-classify', fields: chunk }, this.timeoutMs);
        const parsed = parseClassifyResponse(res);
        if (parsed) for (const [id, c] of parsed) out.set(id, c);
      } catch {
        // A failed chunk must not discard results from the others.
      }
    }
    return out;
  }
}
