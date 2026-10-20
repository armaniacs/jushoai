import { includesLiteral } from './core/literals';

// Popup (action popup) to content script: start the usual classify → preview flow
// on the active tab. Answered by the content script, not by the background.
export const ANALYZE_MESSAGE_TYPE = 'jushoai-analyze';
// Closed vocabulary for analyze failures, shared by the sender (content script)
// and the consumer (action popup) across the runtime-message seam.
export const ANALYZE_REASONS = ['no-form', 'no-tab', 'error'] as const;
export type AnalyzeReason = (typeof ANALYZE_REASONS)[number];
export const isAnalyzeReason = (v: unknown): v is AnalyzeReason => includesLiteral(ANALYZE_REASONS, v);
export type AnalyzeResponse = { ok: true } | { ok: false; reason: AnalyzeReason };
