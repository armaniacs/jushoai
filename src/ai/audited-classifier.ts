import type { ClassifySchedule, FieldClassifier } from '../core/classifier';
import type { Category, FieldMeta } from '../core/types';
import type { AuditDraft, AuditRecorder, AuditResult } from './audit-log';
import { clipAuditResponse } from './audit-log';
import { HttpAuthError, HttpRequestError } from './http-classifiers';

export interface ClassifyTrace {
  status: number | null;
  retried: boolean;
}

export interface TracedClassifier extends FieldClassifier {
  lastTrace?: ClassifyTrace;
  // Prompt text sent and raw output from the latest classify call, read by the audit wrapper.
  lastExchange?: { request: string; response: string };
}

export type AuditContext = Pick<AuditDraft, 'provider' | 'host' | 'model' | 'purpose' | 'pageUrl'>;

export function resultOf(e: unknown): AuditResult {
  if (e instanceof HttpAuthError) return 'auth-error';
  if (e instanceof HttpRequestError) {
    if (e.status === null) return 'network-error';
    return e.status >= 200 && e.status < 300 ? 'invalid-response' : 'http-error';
  }
  return 'error';
}

// Records exactly one entry per call to the wrapped classifier, including failures.
// A failing recorder never changes the outcome of the call.
export class AuditedClassifier implements FieldClassifier {
  constructor(
    private readonly inner: TracedClassifier,
    private readonly ctx: AuditContext,
    private readonly recorder: AuditRecorder,
  ) {}

  private async log(
    fields: FieldMeta[],
    result: AuditResult,
    startedAt: number,
    schedule?: ClassifySchedule,
  ): Promise<void> {
    const trace = this.inner.lastTrace;
    const exchange = this.inner.lastExchange;
    try {
      await this.recorder.record({
        ...this.ctx,
        fieldCount: fields.length,
        request: exchange?.request ?? '',
        response: clipAuditResponse(exchange?.response ?? ''),
        chunkIndex: schedule?.index ?? null,
        chunkCount: schedule?.count ?? null,
        result,
        httpStatus: trace?.status ?? null,
        retried: trace?.retried ?? false,
        durationMs: Date.now() - startedAt,
      });
    } catch {
      // Audit storage problems must not block filling forms.
    }
  }

  async classify(fields: FieldMeta[], schedule?: ClassifySchedule): Promise<Map<string, Category>> {
    const startedAt = Date.now();
    try {
      const out = await this.inner.classify(fields, schedule);
      await this.log(fields, 'success', startedAt, schedule);
      return out;
    } catch (e) {
      await this.log(fields, resultOf(e), startedAt, schedule);
      throw e;
    }
  }
}
