import { CATEGORIES, type Category, type FieldMeta } from '../core/types';
import { META_CLIP_LENGTH, encodeFieldMeta, type MetaWire } from '../messages';
import type { FieldClassifier } from '../core/classifier';
import type { AttemptTrace, ClassifyAttempt, TracedClassifier } from '../ai/audited-classifier';
import { clipAuditResponse } from '../ai/audit-log';
import { LM_OPTIONS, type LanguageModelStatic } from './availability';

export const SYSTEM_PROMPT = `あなたは日本のWebフォームの入力欄を分類するアシスタントです。
各入力欄のメタデータを見て、次のカテゴリから1つだけ選んでください。
- lastName: 姓 / firstName: 名 / fullName: 姓名を1欄に入力
- lastNameKana: 姓のフリガナ / firstNameKana: 名のフリガナ / fullNameKana: 姓名のフリガナを1欄に入力
- email: メールアドレス
- tel: 電話番号1欄 / tel1, tel2, tel3: 電話番号の分割欄（市外局番, 市内局番, 加入者番号）
- zip: 郵便番号1欄 / zip1, zip2: 郵便番号の分割欄（上3桁, 下4桁）
- birthYear: 生まれ年（西暦4桁）/ birthMonth: 生まれ月 / birthDay: 生まれ日 / birthEra: 和暦の元号
- school: 学校名 / department: 学部・学科
- lastNameRomaji: 姓(ローマ字・半角英字) / firstNameRomaji: 名(ローマ字) / fullNameRomaji: 姓名のローマ字を1欄に入力(半角英数指定)
- gender: 性別
- ageDecade: 年代(20代〜70代以上。生年月日から導出する値)
- country: 国名(半角英数) / address1, address2, address3, address4: 海外住所の建物・番地・市・州(半角英数) / postalCode: 海外の郵便番号(半角英数)
- prefecture: 都道府県 / city: 市区町村 / street: 番地 / building: 建物名・部屋番号
- addressFull: 都道府県から全部入る住所1欄 / addressNoPref: 市区町村以降の住所1欄
- unknown: 上記のどれでもない
個人情報の値は与えられません。結果はJSONオブジェクトのみで返してください。`;

const clip = (s: string) => s.slice(0, META_CLIP_LENGTH);

// Prompt rows carry only the metadata allow-list (MetaWire), with strings clipped for prompt size.
const toPromptRow = (f: FieldMeta): MetaWire => {
  const w = encodeFieldMeta(f);
  return {
    ...w,
    name: clip(w.name),
    htmlId: clip(w.htmlId),
    label: clip(w.label),
    placeholder: clip(w.placeholder),
    nearby: clip(w.nearby),
  };
};

export function buildPrompt(fields: FieldMeta[]): string {
  const rows = fields.map(toPromptRow);
  return `次の入力欄を分類し、{"入力欄id": "カテゴリ"} のJSONで返してください。\n${JSON.stringify(rows)}`;
}

export function buildSchema(fields: FieldMeta[]) {
  return {
    type: 'object' as const,
    properties: Object.fromEntries(
      fields.map((f) => [f.id, { type: 'string' as const, enum: [...CATEGORIES] }]),
    ),
    required: fields.map((f) => f.id),
    additionalProperties: false,
  };
}

function parseJsonLoosely(raw: string): unknown {
  const attempts = [raw];
  const unfenced = raw.trim().replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
  attempts.push(unfenced);
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last > first) attempts.push(raw.slice(first, last + 1));
  for (const text of attempts) {
    try {
      return JSON.parse(text);
    } catch {
      // try the next candidate
    }
  }
  return null;
}

export function parseLlmOutput(raw: string, fields: FieldMeta[]): Map<string, Category> {
  const out = new Map<string, Category>();
  const data = parseJsonLoosely(raw);
  if (typeof data !== 'object' || data === null) return out;
  const valid = new Set<string>(CATEGORIES);
  for (const f of fields) {
    const v = (data as Record<string, unknown>)[f.id];
    if (typeof v === 'string' && valid.has(v)) out.set(f.id, v as Category);
  }
  return out;
}

export class PromptApiClassifier implements TracedClassifier {
  constructor(private readonly lm: LanguageModelStatic) {}

  // The trace rides the return value, matching HttpClassifier.attempt: the
  // prompt is kept from construction (even when create() fails), and failures
  // carry their partial trace in the same shape.
  // PBI-42: the unified seam's failureReason rides along too. A LanguageModel
  // failure has no wire status to map, so it reports 'bad-response' — the same
  // reason the provider-registry classify path maps such errors to.
  async attempt(fields: FieldMeta[]): Promise<ClassifyAttempt> {
    const trace: AttemptTrace = { status: null, retried: false, request: '', response: '' };
    if (fields.length === 0) return { map: new Map(), failureReason: null, trace };
    const prompt = buildPrompt(fields);
    // Set before create() so a failed session still leaves the request on record.
    trace.request = prompt;
    try {
      const session = await this.lm.create({
        ...LM_OPTIONS,
        initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
      });
      try {
        const raw = await session.prompt(prompt, {
          responseConstraint: buildSchema(fields),
        });
        // Same clip the audit entry applies, so the retained trace string itself
        // stays bounded instead of holding a full-size response (mirrors HttpClassifier.attempt).
        trace.response = clipAuditResponse(raw);
        return { map: parseLlmOutput(raw, fields), failureReason: null, trace };
      } finally {
        session.destroy();
      }
    } catch (error) {
      return { map: new Map(), failureReason: 'bad-response', trace, error };
    }
  }

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    const attempt = await this.attempt(fields);
    if (attempt.error !== undefined) throw attempt.error;
    return attempt.map;
  }
}
