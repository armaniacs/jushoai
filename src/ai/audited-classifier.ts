import type { FieldClassifier } from '../core/classifier';
import type { Category, FieldMeta } from '../core/types';
import type { AuditDraft, AuditRecorder, AuditResult } from './audit-log';
import { HttpAuthError, HttpRequestError } from './http-classifiers';

export interface ClassifyTrace {
  status: number | null;
  retried: boolean;
}

export interface TracedClassifier extends FieldClassifier {
  lastTrace?: ClassifyTrace;
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

  private async log(fields: FieldMeta[], result: AuditResult): Promise<void> {
    const trace = this.inner.lastTrace;
    try {
      await this.recorder.record({
        ...this.ctx,
        fieldCount: fields.length,
        result,
        httpStatus: trace?.status ?? null,
        retried: trace?.retried ?? false,
      });
    } catch {
      // Audit storage problems must not block filling forms.
    }
  }

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    try {
      const out = await this.inner.classify(fields);
      await this.log(fields, 'success');
      return out;
    } catch (e) {
      await this.log(fields, resultOf(e));
      throw e;
    }
  }
}
