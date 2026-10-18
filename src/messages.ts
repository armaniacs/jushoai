import { CATEGORIES, type Category, type FieldMeta } from './core/types';
import type { ClassifySchedule } from './core/classifier';
import { includesLiteral } from './core/literals';
import { CLOUD_STATUSES, PROVIDER_KINDS, type AiState, type AiStatusInfo } from './ai/types';
import { AI_STATUSES } from './llm/availability';
import { TRANSFER_BACKSTOP_CAP, TRANSFER_CHUNK_SIZE } from './llm/transfer-contract';

// Send-size contract for ai-classify, shared with background-gateway:
// the sender ships at most MAX_CLASSIFY_TOTAL fields in MAX_CLASSIFY_CHUNK
// pieces, and the receiver backstops each message at MAX_CLASSIFY_FIELDS.
// The chunk must stay below the backstop so a well-formed sender never trips it.
// PBI-43: 数値の所有は転送契約モジュールに集約し、ここでは既存の名前を契約値への
// 別名として残す (外部 import の振る舞い不変)。
export const MAX_CLASSIFY_FIELDS = TRANSFER_BACKSTOP_CAP;
export const MAX_CLASSIFY_CHUNK = TRANSFER_CHUNK_SIZE;
const MAX_ID_LENGTH = 100;
// Shared with the scan side (src/dom/scan-fields.ts) so both ends cap identical
// page-controlled strings at the same length.
export const MAX_TEXT_LENGTH = 200;

const AI_STATES: readonly string[] = [...AI_STATUSES, ...CLOUD_STATUSES];
const TEST_FAILURES = ['not-configured', 'permission', 'auth', 'network', 'rejected', 'bad-response', 'unavailable'] as const;

export type TestFailure = (typeof TEST_FAILURES)[number];
export type TestResponse = { ok: true; category: Category } | { ok: false; reason: TestFailure };

// Failure vocabulary for ai-classify: the TestFailure set, which includes
// 'unavailable' (built-in AI present in settings but not usable right now),
// plus 'truncated' (the gateway capped the run at MAX_CLASSIFY_TOTAL and
// dropped trailing fields). 'truncated' is classify-only: the gateway sets it
// locally, so it never arrives over the wire and the connection test never
// returns it (parseTestResponse still rejects it).
const CLASSIFY_FAILURES = [...TEST_FAILURES, 'truncated'] as const;

export type ClassifyFailure = (typeof CLASSIFY_FAILURES)[number];
export type ClassifyResponse =
  | { ok: true; entries: [string, Category][] }
  | { ok: false; reason: ClassifyFailure };

// Runtime-message version contract (PBI-34): sender and receiver ship in
// lockstep inside the same extension build, so matching versions are the norm.
// The `v` stamp exists to detect generation skew (e.g. a stale content script
// talking to an updated service worker across an update restart) instead of
// degrading silently into a misclassification or a no-response. The receiver
// stays fail-safe: a missing `v` (legacy sender) is accepted without warning
// and normalized to the current version, while an unknown `v` is warned about
// and rejected (null), riding the existing null → undefined → gateway-null
// fallback path instead of being treated as a known shape.
export const AI_REQUEST_VERSION = 1 as const;
export type AiRequestVersion = typeof AI_REQUEST_VERSION;

export type AiRequest =
  | { type: 'ai-status'; v: AiRequestVersion }
  // PBI-54: wire 上の fields は MetaWire[]（allow-list キーのみ）。受信側は
  // decode で FieldMeta に再構築し、DecodedAiRequest として扱う。
  | { type: 'ai-classify'; v: AiRequestVersion; fields: MetaWire[]; chunk?: ClassifySchedule }
  | { type: 'ai-download'; v: AiRequestVersion }
  | { type: 'ai-test'; v: AiRequestVersion }
  | { type: 'open-options'; v: AiRequestVersion }
  | { type: 'audit-clear'; v: AiRequestVersion };

// Decoded (receiver-side) shape: identical to AiRequest except ai-classify
// fields are rebuilt to FieldMeta (value:'' 等の既定値付き) by decodeFieldMeta.
// Receivers (handle-message, background) work with this, never with the wire
// shape directly. PBI-54.
// NOTE: adding an AiRequest variant means checking this type too — the
// ai-classify arm is spelled out here, the rest ride Exclude above.
export type DecodedAiRequest =
  | Exclude<AiRequest, { type: 'ai-classify' }>
  | { type: 'ai-classify'; v: AiRequestVersion; fields: FieldMeta[]; chunk?: ClassifySchedule };

// PBI-46: wire codec の入口。versioning（付与）と envelope のキー規律はこの
// codec の背後に集約し、呼び出し側は encode/decode（またはその薄い別名の
// builder群・parse群）だけを使う。version-less の素形を渡すと現行 version を
// 刻印した AiRequest を返し、余分なキーは落とす（fail-safe: 受信側 decode が
// 同じ allow-list で検証するため、送信側の組み立て誤りは受信で null になる）。
export type VersionlessAiRequest =
  | { type: 'ai-status' }
  | { type: 'ai-classify'; fields: MetaWire[]; chunk?: ClassifySchedule }
  | { type: 'ai-download' }
  | { type: 'ai-test' }
  | { type: 'open-options' }
  | { type: 'audit-clear' };

export function encodeRequest(req: VersionlessAiRequest | AiRequest): AiRequest {
  switch (req.type) {
    case 'ai-status':
      return { type: 'ai-status', v: AI_REQUEST_VERSION };
    case 'ai-download':
      return { type: 'ai-download', v: AI_REQUEST_VERSION };
    case 'ai-test':
      return { type: 'ai-test', v: AI_REQUEST_VERSION };
    case 'open-options':
      return { type: 'open-options', v: AI_REQUEST_VERSION };
    case 'audit-clear':
      return { type: 'audit-clear', v: AI_REQUEST_VERSION };
    case 'ai-classify': {
      const chunk = req.chunk;
      return chunk
        ? { type: 'ai-classify', v: AI_REQUEST_VERSION, fields: req.fields, chunk }
        : { type: 'ai-classify', v: AI_REQUEST_VERSION, fields: req.fields };
    }
  }
}

// Version-stamped builders: senders construct every AiRequest through these so
// all variants carry v:1 by construction. parseRequest accepts the legacy
// version-less shape too, so adopting a builder is never a breaking change.
// PBI-46: 実体は encodeRequest への委譲。version 付与の正しさは codec が持つ。
export const aiStatusRequest = (): AiRequest => encodeRequest({ type: 'ai-status' });
// Callers must pass encodeFieldMeta output: the MetaWire[] element type does
// not structurally reject a value-bearing FieldMeta, so a raw meta would
// carry its fill-only value over the wire (receivers sanitize, but it has
// already crossed). The only production sender (background-gateway) maps
// through encodeFieldMeta; keep it that way.
export const aiClassifyRequest = (fields: MetaWire[], chunk?: ClassifySchedule): AiRequest =>
  encodeRequest(chunk ? { type: 'ai-classify', fields, chunk } : { type: 'ai-classify', fields });
export const aiDownloadRequest = (): AiRequest => encodeRequest({ type: 'ai-download' });
export const aiTestRequest = (): AiRequest => encodeRequest({ type: 'ai-test' });
export const openOptionsRequest = (): AiRequest => encodeRequest({ type: 'open-options' });
export const auditClearRequest = (): AiRequest => encodeRequest({ type: 'audit-clear' });

// Reply to audit-clear; the settings page keeps its delete-failure notice on ok:false.
export type AuditClearResponse = { ok: true } | { ok: false };

// Popup (action popup) to content script: start the usual classify → preview flow
// on the active tab. Answered by the content script, not by the background.
export const ANALYZE_MESSAGE_TYPE = 'jushoai-analyze';
// Closed vocabulary for analyze failures, shared by the sender (content script)
// and the consumer (action popup) across the runtime-message seam.
export const ANALYZE_REASONS = ['no-form', 'no-tab', 'error'] as const;
export type AnalyzeReason = (typeof ANALYZE_REASONS)[number];
export const isAnalyzeReason = (v: unknown): v is AnalyzeReason => includesLiteral(ANALYZE_REASONS, v);
export type AnalyzeResponse = { ok: true } | { ok: false; reason: AnalyzeReason };

export const isAiState = (v: unknown): v is AiState => typeof v === 'string' && AI_STATES.includes(v);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT_LENGTH) : '');

// PBI-46: metadata allow-list の正準はこの内部 seam が持ち、encodeFieldMeta
// （送信側の射影）と decodeFieldMeta（受信側の再構築）の両端に供給する。
// 外部に見える META_WIRE_KEYS は後方互換の別名（同一参照）で、新規コードは
// encode/decode 経由でキー規律を得ること。
const WIRE_META_KEYS = ['id', 'type', 'name', 'htmlId', 'label', 'placeholder', 'nearby', 'maxLength'] as const;
// The metadata allow-list sent to the classifier; the single source shared by the sender
// (background-gateway), the receiver (decodeFieldMeta) and the prompt builder (buildPrompt).
// PBI-46: 互換別名。実体は上の WIRE_META_KEYS（codec 内部 seam）。
// PBI-51: 新規コードは encode/decode 経由でキー規律を得ること。直接参照は非推奨。
/** @deprecated Use encodeFieldMeta/decodeFieldMeta instead of the key list. */
export const META_WIRE_KEYS = WIRE_META_KEYS;
export type MetaWire = Pick<FieldMeta, (typeof META_WIRE_KEYS)[number]>;

// Display width for metadata strings leaving the extension (prompt rows and
// feedback reports). Distinct from MAX_TEXT_LENGTH, which caps the wire envelope.
export const META_CLIP_LENGTH = 80;

export function encodeFieldMeta(f: FieldMeta): MetaWire {
  // LLM 送信用ペイロードはこの関数経由の wire 型（allow-list キー）のみで構築する。
  // FieldMeta.value（fill 判定専用のページ既存値）はここで落とす。以後の送信側変更でも
  // value を wire に載せない（受信側 decodeFieldMeta が value:'' に戻すのと対になる保証）。
  // PBI-46: 送信側 codec の正準。toWireMeta は後方互換の別名。
  return {
    id: f.id,
    type: f.type,
    name: f.name,
    htmlId: f.htmlId,
    label: f.label,
    placeholder: f.placeholder,
    nearby: f.nearby,
    maxLength: f.maxLength,
  };
}

// PBI-46: 互換別名。実体は encodeFieldMeta。
// PBI-51: 新規コードは encodeFieldMeta を使うこと。
/** @deprecated Use encodeFieldMeta instead. */
export function toWireMeta(f: FieldMeta): MetaWire {
  return encodeFieldMeta(f);
}

// Rebuilds a FieldMeta from the metadata allow-list only; page-controlled values never pass through.
// FieldMeta.value（fill 判定専用）は常に '' に戻す。fill 判定の既存値参照は planner の
// meta.value スナップショットと fill-plan の live DOM 読み（isStillEmpty / targetsFromControls）の
// 別経路で維持し、この受信形状では復元しない。
// PBI-46: 受信側 codec の正準。wire 外のキー（value・tag・autocomplete 等）は
// 落とす fail-safe 射影で、欠落・不正 id 行は null として呼び出し側が数える。
export function decodeFieldMeta(v: unknown): FieldMeta | null {
  if (!isRecord(v)) return null;
  const id = v.id;
  if (typeof id !== 'string' || id === '' || id.length > MAX_ID_LENGTH) return null;
  const maxLength = typeof v.maxLength === 'number' && Number.isFinite(v.maxLength) ? v.maxLength : null;
  const wire: MetaWire = {
    id,
    type: text(v.type),
    name: text(v.name),
    htmlId: text(v.htmlId),
    label: text(v.label),
    placeholder: text(v.placeholder),
    nearby: text(v.nearby),
    maxLength,
  };
  return { ...wire, tag: 'input', autocomplete: '', pattern: '', options: [], readOnly: false, disabled: false, value: '' };
}

// Chunk position sanity: a 1-based pair with the index inside the count, bounded
// generously (a 60-field run in 20-field chunks can never exceed 3), so the audit
// log cannot carry a schedule a well-formed sender would not produce.
const parseSchedule = (v: unknown): ClassifySchedule | undefined => {
  if (!isRecord(v)) return undefined;
  const index = v.index;
  const count = v.count;
  if (typeof index !== 'number' || typeof count !== 'number') return undefined;
  if (!Number.isInteger(index) || !Number.isInteger(count)) return undefined;
  if (index < 1 || count < 1 || index > count || count > MAX_CLASSIFY_FIELDS) return undefined;
  return { index, count };
};

// Unknown versions fail safe: warn once per message and reject (null) so the
// caller falls back instead of acting on a shape from another generation.
const checkRequestVersion = (msg: Record<string, unknown>): boolean => {
  const v = msg.v;
  if (v === undefined || v === AI_REQUEST_VERSION) return true;
  console.warn(`[JushoAI] unknown AiRequest version (${String(v)}), ignoring message`);
  return false;
};

// PBI-46: request envelope の allow-list を一箇所で持つ内部 seam。
// encodeRequest（組み立て）と decodeRequest（検証）の両端がここから供給を
// 受け、wire ずれ（未知キー・欠落キー）は decode 側の hasOnlyKeys で検出する。
// ai-classify の chunk は分割実行時のみ付く任意キーで、基本形に足して数える。
const REQUEST_WIRE_KEYS: Record<AiRequest['type'], readonly string[]> = {
  'ai-status': ['type'],
  'ai-download': ['type'],
  'ai-test': ['type'],
  'open-options': ['type'],
  'audit-clear': ['type'],
  'ai-classify': ['type', 'fields'],
};
const AI_CLASSIFY_CHUNK_KEYS: readonly string[] = [...REQUEST_WIRE_KEYS['ai-classify'], 'chunk'];

const hasOnlyKeys = (keys: string[], allow: readonly string[]): boolean =>
  keys.length === allow.length && keys.every((k) => allow.includes(k));

export function decodeRequest(msg: unknown): DecodedAiRequest | null {
  if (!isRecord(msg)) return null;
  if (!checkRequestVersion(msg)) return null;
  // A legacy sender omits `v`; strip it before counting so the strict
  // closed-vocabulary key check below keeps rejecting every other extra key.
  const keys = Object.keys(msg).filter((k) => k !== 'v');
  if (msg.type === 'ai-status' && hasOnlyKeys(keys, REQUEST_WIRE_KEYS['ai-status']))
    return { type: 'ai-status', v: AI_REQUEST_VERSION };
  if (msg.type === 'ai-download' && hasOnlyKeys(keys, REQUEST_WIRE_KEYS['ai-download']))
    return { type: 'ai-download', v: AI_REQUEST_VERSION };
  if (msg.type === 'ai-test' && hasOnlyKeys(keys, REQUEST_WIRE_KEYS['ai-test']))
    return { type: 'ai-test', v: AI_REQUEST_VERSION };
  if (msg.type === 'open-options' && hasOnlyKeys(keys, REQUEST_WIRE_KEYS['open-options']))
    return { type: 'open-options', v: AI_REQUEST_VERSION };
  if (msg.type === 'audit-clear' && hasOnlyKeys(keys, REQUEST_WIRE_KEYS['audit-clear']))
    return { type: 'audit-clear', v: AI_REQUEST_VERSION };
  if (msg.type === 'ai-classify' && Array.isArray(msg.fields)) {
    const withChunk = keys.length === 3;
    if (!hasOnlyKeys(keys, withChunk ? AI_CLASSIFY_CHUNK_KEYS : REQUEST_WIRE_KEYS['ai-classify'])) return null;
    if (msg.fields.length > MAX_CLASSIFY_FIELDS) return null;
    const chunk = withChunk ? parseSchedule(msg.chunk) : undefined;
    if (withChunk && chunk === undefined) return null;
    const fields = msg.fields.map(decodeFieldMeta).filter((f): f is FieldMeta => f !== null);
    return { type: 'ai-classify', v: AI_REQUEST_VERSION, fields, ...(chunk ? { chunk } : {}) };
  }
  return null;
}

// PBI-46: 互換別名。受信側 codec の正準は decodeRequest で、version 照合・
// legacy 許容・キー数え・field 消毒のすべてを背後に隠す。
// PBI-51: 新規コードは decodeRequest を使うこと。
/** @deprecated Use decodeRequest instead. */
export function parseRequest(msg: unknown): DecodedAiRequest | null {
  return decodeRequest(msg);
}

export function parseClassifyResponse(res: unknown): Map<string, Category> | null {
  const parsed = parseClassifyResult(res);
  return parsed?.ok === true ? parsed.map : null;
}

// Old background replies used {ok:false} without a reason vocabulary.
// Telling a missing reason apart from a malformed one keeps the gateway from
// mislabeling a legacy failure as a bad response.
// PBI-46: legacy 許容の判定も decode 側 seam の一部。parseClassifyResult が
// reason 付き失敗だけを通し、理由なし legacy はここで識別して呼び出し側の
// fail-safe（null 記録）に渡す。
export function isLegacyClassifyFailure(res: unknown): boolean {
  return isRecord(res) && res.ok === false && res.reason === undefined;
}

// Seam-boundary guard for failureReason (review #5): the reason travels as a
// string on AttemptOutcome, so a future adapter could hand back a
// non-vocabulary string that would crash the hint lookup
// (AI_FAILURE_TEXT[reason].hint). Fold unknown reasons to 'bad-response' —
// the same mapping the registry's throw path uses — and let null (success)
// pass through.
export function asClassifyFailure(reason: string | null): ClassifyFailure | null {
  if (reason === null) return null;
  return includesLiteral(CLASSIFY_FAILURES, reason) ? reason : 'bad-response';
}

// Reason-aware counterpart of parseClassifyResponse: keeps the failure reason
// from an ai-classify reply instead of collapsing it to null.
export function parseClassifyResult(res: unknown): { ok: true; map: Map<string, Category> } | { ok: false; reason: ClassifyFailure } | null {
  if (!isRecord(res)) return null;
  if (res.ok === false) {
    return includesLiteral(CLASSIFY_FAILURES, res.reason)
      ? { ok: false, reason: res.reason }
      : null;
  }
  if (res.ok !== true || !Array.isArray(res.entries)) return null;
  const out = new Map<string, Category>();
  for (const e of res.entries) {
    if (Array.isArray(e) && e.length === 2 && typeof e[0] === 'string' && includesLiteral(CATEGORIES, e[1])) {
      out.set(e[0], e[1]);
    }
  }
  return { ok: true, map: out };
}

export function parseStatusResponse(res: unknown): AiStatusInfo | null {
  if (!isRecord(res) || !isAiState(res.status)) return null;
  const provider = res.provider;
  if (!includesLiteral(PROVIDER_KINDS, provider)) return null;
  return { status: res.status, provider };
}

export function parseTestResponse(res: unknown): TestResponse | null {
  if (!isRecord(res)) return null;
  if (res.ok === true && includesLiteral(CATEGORIES, res.category)) {
    return { ok: true, category: res.category };
  }
  if (res.ok === false && includesLiteral(TEST_FAILURES, res.reason)) {
    return { ok: false, reason: res.reason };
  }
  return null;
}

export function parseAuditClearResponse(res: unknown): AuditClearResponse | null {
  if (!isRecord(res)) return null;
  if (res.ok === true) return { ok: true };
  if (res.ok === false) return { ok: false };
  return null;
}
