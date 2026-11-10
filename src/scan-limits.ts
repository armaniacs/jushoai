// Max length of page-controlled strings (label text, placeholder, nearby).
// Shared by the scan side (src/dom/scan-fields.ts) and the wire decode side
// (src/messages.ts) so both ends cap identical page-controlled strings at the
// same length.
export const MAX_TEXT_LENGTH = 200;

// Limit map (PBI-222): every bound in one place. Values and owners unchanged;
// this comment only records route x constant x owner so a new send/store
// path can pick the right one without reading all call sites.
// - send (wire): MAX_TEXT_LENGTH (this file; scan + wire decode),
//   MAX_ID_LENGTH and META_CLIP_LENGTH (src/messages.ts:15,146),
//   MAX_RESPONSE_BYTES and the dual Content-Length/stream cap in
//   readJsonBounded (src/ai/http-classifiers.ts:14,142-163).
// - store (audit budget): AUDIT_MAX_BYTES, AUDIT_PAGE_URL_MAX_BYTES and
//   AUDIT_MAX_ENTRIES (src/ai/audit-log.ts:11,22,4).
// - display (clip): clipAuditResponse with AUDIT_RESPONSE_CLIP_LENGTH
//   (src/ai/audit-log.ts:65-66,62).
// Guide for a new path: sending values -> wire bounds; persisting records ->
// audit budget; showing page text -> clip bounds. Do not move or unify the
// constants (they change for different reasons).
