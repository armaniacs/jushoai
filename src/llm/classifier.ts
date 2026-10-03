import { CATEGORIES, type Category, type FieldMeta } from '../core/types';
import { LM_OPTIONS, type LanguageModelStatic } from './availability';

export interface FieldClassifier {
  classify(fields: FieldMeta[]): Promise<Map<string, Category>>;
}

export const SYSTEM_PROMPT = `あなたは日本のWebフォームの入力欄を分類するアシスタントです。
各入力欄のメタデータを見て、次のカテゴリから1つだけ選んでください。
- lastName: 姓 / firstName: 名 / fullName: 姓名を1欄に入力
- lastNameKana: 姓のフリガナ / firstNameKana: 名のフリガナ / fullNameKana: 姓名のフリガナを1欄に入力
- email: メールアドレス
- tel: 電話番号1欄 / tel1, tel2, tel3: 電話番号の分割欄（市外局番, 市内局番, 加入者番号）
- zip: 郵便番号1欄 / zip1, zip2: 郵便番号の分割欄（上3桁, 下4桁）
- prefecture: 都道府県 / city: 市区町村 / street: 番地 / building: 建物名・部屋番号
- addressFull: 都道府県から全部入る住所1欄 / addressNoPref: 市区町村以降の住所1欄
- unknown: 上記のどれでもない
個人情報の値は与えられません。結果はJSONオブジェクトのみで返してください。`;

const clip = (s: string) => s.slice(0, 80);

export function buildPrompt(fields: FieldMeta[]): string {
  const rows = fields.map((f) => ({
    id: f.id,
    name: clip(f.name),
    htmlId: clip(f.htmlId),
    label: clip(f.label),
    placeholder: clip(f.placeholder),
    nearby: clip(f.nearby),
    type: f.type,
    maxLength: f.maxLength,
  }));
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

export function parseLlmOutput(raw: string, fields: FieldMeta[]): Map<string, Category> {
  const out = new Map<string, Category>();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return out;
  }
  if (typeof data !== 'object' || data === null) return out;
  const valid = new Set<string>(CATEGORIES);
  for (const f of fields) {
    const v = (data as Record<string, unknown>)[f.id];
    if (typeof v === 'string' && valid.has(v)) out.set(f.id, v as Category);
  }
  return out;
}

export class PromptApiClassifier implements FieldClassifier {
  constructor(private readonly lm: LanguageModelStatic) {}

  async classify(fields: FieldMeta[]): Promise<Map<string, Category>> {
    if (fields.length === 0) return new Map();
    const session = await this.lm.create({
      ...LM_OPTIONS,
      initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
    });
    try {
      const raw = await session.prompt(buildPrompt(fields), {
        responseConstraint: buildSchema(fields),
      });
      return parseLlmOutput(raw, fields);
    } finally {
      session.destroy();
    }
  }
}
