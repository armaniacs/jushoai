import { CATEGORIES, type Category, type FieldMeta } from './core/types';
import type { ClassifySchedule } from './core/classifier';
import { includesLiteral } from './core/literals';
import { CLOUD_STATUSES, PROVIDER_KINDS, type AiState, type AiStatusInfo } from './ai/types';
import { AI_STATUSES } from './llm/availability';
import { TRANSFER_BACKSTOP_CAP, TRANSFER_CHUNK_SIZE } from './llm/transfer-contract';
import { MAX_TEXT_LENGTH } from './scan-limits';

// Send-size contract for ai-classify, shared with background-gateway:
// the sender ships at most TRANSFER_TOTAL_CAP fields in TRANSFER_CHUNK_SIZE
// pieces, and the receiver backstops each message at TRANSFER_BACKSTOP_CAP.
// The chunk must stay below the backstop so a well-formed sender never trips it.
// The numbers are owned by the transfer contract module (PBI-43): this file
// imports them instead of holding its own copies.
const MAX_ID_LENGTH = 100;

const AI_STATES: readonly string[] = [...AI_STATUSES, ...CLOUD_STATUSES];
const TEST_FAILURES = ['not-configured', 'permission', 'auth', 'network', 'rejected', 'bad-response', 'unavailable', 'first-dial'] as const;

export type TestFailure = (typeof TEST_FAILURES)[number];
export type TestResponse = { ok: true; category: Category } | { ok: false; reason: TestFailure };

// Failure vocabulary for ai-classify: the TestFailure set, which includes
// 'unavailable' (built-in AI present in settings but not usable right now),
// plus 'truncated' (the transfer capped the run at TRANSFER_TOTAL_CAP and
// dropped trailing fields). 'truncated' is classify-only: the transfer sets it
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
  // PBI-190: the simple wire types (a table row of only the discriminant) all
  // share the identical wire shape { type, v }, so one branch encodes them all:
  // the current version is stamped and stray keys (v, extra) are dropped here.
  // ai-classify keeps its own arm — the fields passthrough and the optional
  // chunk (omitted while undefined) have no table row.
  if (req.type !== 'ai-classify') {
    return { type: req.type, v: AI_REQUEST_VERSION };
  }
  const chunk = req.chunk;
  return chunk
    ? { type: 'ai-classify', v: AI_REQUEST_VERSION, fields: req.fields, chunk }
    : { type: 'ai-classify', v: AI_REQUEST_VERSION, fields: req.fields };
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

export const isAiState = (v: unknown): v is AiState => typeof v === 'string' && AI_STATES.includes(v);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT_LENGTH) : '');

// PBI-46: metadata allow-list の正準はこの内部 seam が持ち、encodeFieldMeta
// （送信側の射影）と decodeFieldMeta（受信側の再構築）の両端に供給する。
// キー規律は encode/decode 経由で得ること。
// PBI-175 の決定: radio/select に要る tag・options は wire に含めない。LLM は
// メタデータのみで分類し、tag/options は分類対象外と明示する（下の
// WIRE_EXCLUDED_KEYS を参照）。wire キー集合の変更は tests/messages.test.ts
// 等が固定しているため、含める場合は別 PBI の wire 形式変更として扱うこと。
const WIRE_META_KEYS = ['id', 'type', 'name', 'htmlId', 'label', 'placeholder', 'nearby', 'maxLength'] as const;
// PBI-175: wire に載せないと明示するキー。value（fill 判定専用のページ既存値）
// は privacy 上の理由で載せない。tag・options（radio/select の形状）は LLM 分類
// の対象外として載せない — 受信側 decodeFieldMeta は input 形状の搬送体に
// 再構築し、radio ゲート等の形状依存判定は pipeline 側の元 meta で行う。
// 黙って潰すのではなく、この除外を契約として宣言する（round-trip の安定性は
// tests/llm/classify-transport.test.ts が保証する）。
export const WIRE_EXCLUDED_KEYS = ['tag', 'options', 'value', 'autocomplete', 'pattern', 'readOnly', 'disabled'] as const;
// 除外キーの型としての公開。wire 変更の検討時はこの集合と WIRE_META_KEYS を対で見直す。
export type WireExcludedKey = (typeof WIRE_EXCLUDED_KEYS)[number];
// The metadata allow-list sent to the classifier; the single source shared by the sender
// (classify-transport), the receiver (decodeFieldMeta) and the prompt builder (buildPrompt).
export type MetaWire = Pick<FieldMeta, (typeof WIRE_META_KEYS)[number]>;

// Display width for metadata strings leaving the extension (prompt rows and
// feedback reports). Distinct from MAX_TEXT_LENGTH, which caps the wire envelope.
export const META_CLIP_LENGTH = 80;

export function encodeFieldMeta(f: FieldMeta): MetaWire {
  // LLM 送信用ペイロードはこの関数経由の wire 型（allow-list キー）のみで構築する。
  // FieldMeta.value（fill 判定専用のページ既存値）はここで落とす。以後の送信側変更でも
  // value を wire に載せない（受信側 decodeFieldMeta が value:'' に戻すのと対になる保証）。
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

// Rebuilds a FieldMeta from the metadata allow-list only; page-controlled values never pass through.
// FieldMeta.value（fill 判定専用）は常に '' に戻す。fill 判定の既存値参照は planner の
// meta.value スナップショットと fill-plan の live DOM 読み（isStillEmpty / targetsFromControls）の
// 別経路で維持し、この受信形状では復元しない。
// PBI-46: 受信側 codec の正準。wire 外のキー（value・tag・autocomplete 等）は
// 落とす fail-safe 射影で、欠落・不正 id 行は null として呼び出し側が数える。
// PBI-175: tag は常に 'input' に再構築する。これは黙った潰しではなく宣言された
// 契約である — tag・options は LLM 分類対象外（WIRE_EXCLUDED_KEYS）として wire
// に載せないと決めたため、受信側が元の形状を知る手段はない。形状依存の判定
// （radio ゲート等）は pipeline 側が手元の元 meta で行い、この搬送体では行わない。
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
  if (index < 1 || count < 1 || index > count || count > TRANSFER_BACKSTOP_CAP) return undefined;
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
// PBI-190: table membership as a type predicate. A string naming a row is a
// wire request type, so the decode walk and the encode branch below assemble
// their { type, v } records without per-type casts. hasOwnProperty (not `in`)
// keeps prototype keys ('__proto__' etc.) out of the wire vocabulary.
const isWireRequestType = (v: string): v is AiRequest['type'] =>
  Object.prototype.hasOwnProperty.call(REQUEST_WIRE_KEYS, v);

const hasOnlyKeys = (keys: string[], allow: readonly string[]): boolean =>
  keys.length === allow.length && keys.every((k) => allow.includes(k));

// PBI-175: decodeRequest の Result 型化。従来の null 一値は失敗の種類を
// 区別しないため、呼び出し側は oversize を truncated に、version/形不正を
// bad-response に写像できなかった。理由語彙は転送の失敗語彙に直結する
// （decodeErrorToClassifyFailure を参照）。
export type RequestDecodeError = 'oversize' | 'version' | 'malformed';
export type DecodedRequestResult =
  | { ok: true; request: DecodedAiRequest }
  | { ok: false; reason: RequestDecodeError };

// oversize（backstop 超え）は件数上限由来なので 'truncated' に、
// version skew と形不正は応答異常として 'bad-response' に写像する。
// 送信側転送（classify-transport）の失敗語彙と同一にすることで、
// 受信・送信の両端が同じ理由で記録・表示できる。
export function decodeErrorToClassifyFailure(reason: RequestDecodeError): ClassifyFailure {
  return reason === 'oversize' ? 'truncated' : 'bad-response';
}

export function decodeRequestResult(msg: unknown): DecodedRequestResult {
  if (!isRecord(msg)) return { ok: false, reason: 'malformed' };
  if (!checkRequestVersion(msg)) return { ok: false, reason: 'version' };
  // A legacy sender omits `v`; strip it before counting so the strict
  // closed-vocabulary key check below keeps rejecting every other extra key.
  // The strip must stay ahead of the table walk: hasOnlyKeys compares
  // keys.length, so a legacy version-less request would fail every row here.
  const keys = Object.keys(msg).filter((k) => k !== 'v');
  // PBI-190: one arm walks the wire-type table for the simple request types
  // (every row whose allow-list is only the discriminant), so a new simple
  // wire type rides its REQUEST_WIRE_KEYS row without a new arm here. The
  // walk keeps the table-membership guard and assembles the { type, v }
  // record without a cast; the ai-classify arm below stays outside the table
  // because its asymmetries (fields array validation, withChunk decision,
  // oversize backstop, parseSchedule) have no table row.
  const type = msg.type;
  if (
    typeof type === 'string' && isWireRequestType(type) && type !== 'ai-classify' &&
    hasOnlyKeys(keys, REQUEST_WIRE_KEYS[type])
  ) {
    return { ok: true, request: { type, v: AI_REQUEST_VERSION } };
  }
  if (msg.type === 'ai-classify' && Array.isArray(msg.fields)) {
    const withChunk = keys.length === 3;
    if (!hasOnlyKeys(keys, withChunk ? AI_CLASSIFY_CHUNK_KEYS : REQUEST_WIRE_KEYS['ai-classify']))
      return { ok: false, reason: 'malformed' };
    if (msg.fields.length > TRANSFER_BACKSTOP_CAP) return { ok: false, reason: 'oversize' };
    const chunk = withChunk ? parseSchedule(msg.chunk) : undefined;
    if (withChunk && chunk === undefined) return { ok: false, reason: 'malformed' };
    const fields = msg.fields.map(decodeFieldMeta).filter((f): f is FieldMeta => f !== null);
    return { ok: true, request: { type: 'ai-classify', v: AI_REQUEST_VERSION, fields, ...(chunk ? { chunk } : {}) } };
  }
  return { ok: false, reason: 'malformed' };
}

export function decodeRequest(msg: unknown): DecodedAiRequest | null {
  const r = decodeRequestResult(msg);
  return r.ok ? r.request : null;
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
