import { buildFieldNormViews } from './literals';
import type { FieldMeta, Item, PersonRole } from './types';

// 人物役割の語彙。語（欄自身の文言）と区画（共有見出し）の両方に同じ表を使う。
// 児童側は学校申込みの児童・生徒表現、保護者側は保護者表現に寄せる。
// 英語は学校系フォームの Parent/Guardian/Student/Child を拾うための最小集合。
const CHILD = /児童|生徒|お子|こども|子供|child|student|pupil/;
const GUARDIAN = /保護者|ほごしゃ|ホゴシャ|parent|guardian/;

// 語の一致は欄自身の根拠、区画の一致は共有見出しの根拠として、分類の
// own/legend と同じ確信度の段差で扱う。両方が一致したら上積みし、
// 割れたら確信度の高い語を採って両方の根拠を理由に残す。
const WORD_CONFIDENCE = 0.7;
const AREA_CONFIDENCE = 0.65;
const AGREED_CONFIDENCE = 0.85;

export interface PersonRoleJudgment {
  role: PersonRole;
  confidence: number;
  reason: string;
}

const scan = (text: string): PersonRole | null => {
  if (GUARDIAN.test(text)) return 'guardian';
  if (CHILD.test(text)) return 'child';
  return null;
};

// 欄メタから人物役割を決める。語と区画の併用で判定し、割れたら確信度で
// 決めて根拠を理由に残す。どちらにも手掛かりが無ければ本人に寄せる。
export function assignPersonRole(meta: FieldMeta): PersonRoleJudgment {
  const views = buildFieldNormViews(meta);
  const word = scan(views.ownText);
  const area = scan(views.legendText);
  if (word !== null && word === area) {
    return { role: word, confidence: AGREED_CONFIDENCE, reason: `word+area:${word}` };
  }
  if (word !== null && area === null) {
    return { role: word, confidence: WORD_CONFIDENCE, reason: `word:${word}` };
  }
  if (word === null && area !== null) {
    return { role: area, confidence: AREA_CONFIDENCE, reason: `area:${area}` };
  }
  if (word !== null && area !== null) {
    return { role: word, confidence: WORD_CONFIDENCE, reason: `conflict:word=${word}>area=${area}` };
  }
  return { role: 'self', confidence: 0, reason: 'default:self' };
}

// パイプライン用に役割を載せる。既に役割を持つ欄は変えない。
export function withPersonRole(item: Item): Item {
  if (item.role !== undefined) return item;
  const judged = assignPersonRole(item.meta);
  return { ...item, role: judged.role, roleReason: judged.reason };
}

// 役割の読み出し。未設定は本人扱いにする。
export const roleOf = (item: Item): PersonRole => item.role ?? 'self';
