import type { Category, FieldMeta } from '../core/types';
import type { AiStatusInfo } from '../ai/types';
import { parseClassifyResponse, parseStatusResponse, parseTestResponse, MAX_CLASSIFY_CHUNK, type TestResponse } from '../messages';
import type { FieldClassifier } from './classifier';

export const STATUS_TIMEOUT_MS = 5_000;
export const CLASSIFY_TIMEOUT_MS = 30_000
export const MAX_CLASSIFY_TOTAL = 60;
export const DOWNLOAD_TIMEOUT_MS = 120_000;
export const TEST_TIMEOUT_MS = 30_000;

const UNKNOWN_STATUS: AiStatusInfo = { status: 'unavailable', provider: 'none' };

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

export async function getAiStatusViaBackground(timeoutMs = STATUS_TIMEOUT_MS): Promise<AiStatusInfo> {
  try {
    return parseStatusResponse(await sendWithTimeout({ type: 'ai-status' }, timeoutMs)) ?? UNKNOWN_STATUS;
  } catch {
    return UNKNOWN_STATUS;
  }
}

export async function testAiViaBackground(timeoutMs = TEST_TIMEOUT_MS): Promise<TestResponse | null> {
  try {
    return parseTestResponse(await sendWithTimeout({ type: 'ai-test' }, timeoutMs));
  } catch {
    return null;
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
    const capped = fields.slice(0, MAX_CLASSIFY_TOTAL);
    for (let i = 0; i < capped.length; i += MAX_CLASSIFY_CHUNK) {
      const chunk = capped.slice(i, i + MAX_CLASSIFY_CHUNK).map(toWire);
      try {
        const res = await sendWithTimeout({ type: 'ai-classify', fields: chunk }, this.timeoutMs);
        const parsed = parseClassifyResponse(res);
        // A failing provider (401, 429, timeout) would fail every later chunk too.
        if (!parsed) break;
        for (const [id, c] of parsed) out.set(id, c);
      } catch {
        break;
      }
    }
    return out;
  }
}
