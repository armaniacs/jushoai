import type { ClassifySchedule, FieldClassifier } from '../core/classifier';
import type { Category, FieldMeta } from '../core/types';
import type { AuditDraft, AuditRecorder, AuditResult } from './audit-log';
import { clipAuditResponse } from './audit-log';
import { HttpAuthError, HttpRequestError } from './http-classifiers';

// Prompt text sent and raw output of one classify attempt, carried on the
// return value instead of a mutable out-param.
export interface AttemptTrace {
  status: number | null;
  retried: boolean;
  request: string;
  response: string;
}

export interface ClassifyAttempt {
  map: Map<string, Category>;
  trace: AttemptTrace;
  // Set when the attempt failed; classify() rethrows it so the throwing
  // contract of FieldClassifier is preserved.
  error?: unknown;
}

export interface TracedClassifier extends FieldClassifier {
  attempt(fields: FieldMeta[], schedule?: ClassifySchedule): Promise<ClassifyAttempt>;
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
export class AuditedClassifier implements TracedClassifier {
  constructor(
    private readonly inner: TracedClassifier,
    private readonly ctx: AuditContext,
    private readonly recorder: AuditRecorder,
  ) {}

  private async log(
    fields: FieldMeta[],
    result: AuditResult,
    startedAt: number,
    trace: AttemptTrace,
    schedule?: ClassifySchedule,
  ): Promise<void> {
    try {
      await this.recorder.record({
        ...this.ctx,
        fieldCount: fields.length,
        request: trace.request,
        response: clipAuditResponse(trace.response),
        chunkIndex: schedule?.index ?? null,
        chunkCount: schedule?.count ?? null,
        result,
        httpStatus: trace.status,
        retried: trace.retried,
        durationMs: Date.now() - startedAt,
      });
    } catch {
      // Audit storage problems must not block filling forms.
    }
  }

  async attempt(fields: FieldMeta[], schedule?: ClassifySchedule): Promise<ClassifyAttempt> {
    const startedAt = Date.now();
    const outcome = await this.inner.attempt(fields, schedule);
    const result = outcome.error === undefined ? 'success' as const : resultOf(outcome.error);
    await this.log(fields, result, startedAt, outcome.trace, schedule);
    return outcome;
  }

  async classify(fields: FieldMeta[], schedule?: ClassifySchedule): Promise<Map<string, Category>> {
    const outcome = await this.attempt(fields, schedule);
    if (outcome.error !== undefined) throw outcome.error;
    return outcome.map;
  }
}
