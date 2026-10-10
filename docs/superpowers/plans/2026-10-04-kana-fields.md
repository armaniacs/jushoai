# カナ欄対応 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ふりがな・カタカナ欄に正しいカナが入るように分類の最終段で `*Kana` へ振り分け、プレビューから LLM による全欄再分析を手動実行でき、設定画面でひらがな変換を確認できるようにする

**Architecture:** `classifyField` の分類経路は無改変。`classifyAll` の `refineClassifications` 直前に `wantsKana` ベースのカナオーバーレイを 1 箇所挟み、`force` オプションで LLM に全欄を渡す。UI は `preview.ts` のボタン追加と `content.ts` の接続のみ。設定画面は保存形式を変えず、ひらがな表示ヘルパを追加する。

**Tech Stack:** WXT + TypeScript + Vitest (jsdom)

**Spec:** `docs/superpowers/specs/2026-10-04-kana-fields-design.md`

**背景（原因の実測）:** 実フォームのカナ欄には `autocomplete="family-name"` が付いており、`classifyField` が autocomplete を 0.95 で最優先に採用するため、placeholder「例：みらい」・legend「ふりがな」・`pattern` のカナ範囲のいずれの検出にも到達しない。`detectKanaKind` 自体は正しく動いているため、分類経路を触らず最終判断にカナ決定を足すのが修正方針。

---

## File Structure

| ファイル | 操作 | 責務 |
|---|---|---|
| `src/core/classify-rules.ts` | Modify | `decodePattern`（`\uXXXX` 復号）、`wantsKana`、`detectKanaKind` の pattern 復号 |
| `src/core/analyze.ts` | Modify | カナオーバーレイ、`classifyAll` の `force` オプション |
| `src/ui/preview.ts` | Modify | 「LLM で再分析」ボタン、busy 状態管理 |
| `src/entrypoints/content.ts` | Modify | 再分析の接続（`items` の差し替え） |
| `src/entrypoints/options/dom.ts` | Modify | `kanaHiraganaHint` ヘルパ |
| `src/entrypoints/options/main.ts` | Modify | ラベル文言、セイ/メイ欄下のひらがな表示 |
| `src/entrypoints/options/index.html` | Modify | `.kana-preview` のスタイル |
| `samples/furigana-fieldset-form.html` | Create | page1 再現（お名前 + ふりがな fieldset） |
| `samples/katakana-fieldset-form.html` | Create | page2 再現（お名前 + お名前（カタカナ）） |
| `tests/core/classify-rules.test.ts` | Modify | `wantsKana`・pattern 復号の単体テスト |
| `tests/core/analyze.test.ts` | Modify | オーバーレイ・force モードの単体テスト |
| `tests/integration/samples.test.ts` | Modify | 2 サンプルの E2E テスト |
| `tests/ui/preview.test.ts` | Create | プレビュー UI テスト |
| `tests/entrypoints/options-dom.test.ts` | Create | ひらがな表示ヘルパのテスト |
| `CHANGELOG.md` | Modify | `[Unreleased]` に記録 |

コア（`core/`）は DOM にも LLM にも依存しない純粋関数のまま。`analyze.ts` は `classify-rules` のみを import する。DOM 注入 (`fill.ts`)・プレビュー承認フロー・プロファイル保存形式には手を付けない。

---

### Task 1: `wantsKana` と `pattern` の `\uXXXX` 復号

**Files:**
- Modify: `src/core/classify-rules.ts`
- Test: `tests/core/classify-rules.test.ts`

- [x] **Step 1: 失敗するテストを書く**

`tests/core/classify-rules.test.ts` の import に `wantsKana` を追加する:

```ts
import {
  ACCEPT_THRESHOLD, classifyField, detectKanaKind, isConfident, refineClassifications, wantsKana,
} from '../../src/core/classify-rules';
```

ファイル末尾（既存 describe の外）に追加する:

```ts
describe('wantsKana', () => {
  it('accepts a kana-only placeholder', () => {
    expect(wantsKana(makeMeta({ placeholder: '例：みらい' }))).toBe(true);
    expect(wantsKana(makeMeta({ placeholder: 'セイ' }))).toBe(true);
  });

  it('rejects a kanji or latin placeholder even under a furigana legend', () => {
    expect(wantsKana(makeMeta({ placeholder: '例：未来', nearby: 'ふりがな' }))).toBe(false);
    expect(wantsKana(makeMeta({ placeholder: 'John', label: 'フリガナ' }))).toBe(false);
  });

  it('reads kana words from name, id, label, or legend', () => {
    expect(wantsKana(makeMeta({ nearby: 'ふりがな' }))).toBe(true);
    expect(wantsKana(makeMeta({ label: 'お名前（カタカナ）' }))).toBe(true);
    expect(wantsKana(makeMeta({ htmlId: 'furigana_sei' }))).toBe(true);
    expect(wantsKana(makeMeta({ name: 'field_1_sei', htmlId: 'field_1_sei' }))).toBe(false);
  });

  it('detects kana ranges in a pattern written with \\uXXXX escapes', () => {
    expect(wantsKana(makeMeta({ pattern: '^[\\u3041-\\u3093]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^[\\u30A1-\\u30F6]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^[ぁ-ん]+$' }))).toBe(true);
    expect(wantsKana(makeMeta({ pattern: '^\\d{4}$' }))).toBe(false);
    expect(wantsKana(makeMeta())).toBe(false);
  });
});
```

既存の `describe('detectKanaKind')` ブロック内に追加する:

```ts
  it('reads kana ranges from a pattern written with \\uXXXX escapes', () => {
    expect(detectKanaKind(makeMeta({ pattern: '^[\\u2015\\u3000\\u3041-\\u3093\\u309B-\\u309E\\u30FC]+$' }))).toBe('hiragana');
    expect(detectKanaKind(makeMeta({ pattern: '^[\\u2015\\u3000\\u30A1-\\u30F6\\u30FB-\\u30FE]+$' }))).toBe('katakana');
  });
```

- [x] **Step 2: テストが失敗することを確認**

Run: `npx vitest run tests/core/classify-rules.test.ts`
Expected: FAIL — `wantsKana` が export されていないためモジュール読み込みエラー、または `\uXXXX` パターンの detectKanaKind テストが `katakana` を返して失敗

- [x] **Step 3: 実装する**

`src/core/classify-rules.ts`。`detectKanaKind` の直前に `decodePattern` と `wantsKana` を追加し、`detectKanaKind` の pattern 判定を復号後に変える:

```ts
// Decodes the literal \uXXXX escapes an HTML pattern attribute holds as text; only
// the regex engine interprets them, so kana-range checks on the raw string see none.
const decodePattern = (p: string) =>
  p.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

// True when the field asks for kana rather than kanji: a kana-only placeholder,
// kana vocabulary in name/id/label/legend, or a kana-only pattern. A kanji or
// latin placeholder means the field wants a plain name, whatever the heading says.
export function wantsKana(m: FieldMeta): boolean {
  const ph = stripExample(norm(m.placeholder));
  if (ph !== '' && /[一-龠a-z]/.test(ph)) return false;
  if (ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph)) return true;
  if (KANA.test(norm([m.name, m.htmlId, m.label, m.nearby].join(' ')))) return true;
  const pat = decodePattern(m.pattern);
  return /[ぁ-ゖァ-ヶ]/.test(pat) || /[ｦ-ﾟ]/.test(pat);
}
```

`detectKanaKind` の pattern 判定 3 行を置き換える（`m.pattern` → 復号済み `pat`）:

```ts
export function detectKanaKind(m: FieldMeta): KanaKind {
  const ph = stripExample(m.placeholder);
  if (/^[ｦ-ﾟ\s]+$/.test(ph)) return 'halfKatakana';
  if (/^[ぁ-ゖー\s　]+$/.test(ph)) return 'hiragana';
  if (/^[ァ-ヶー\s　]+$/.test(ph)) return 'katakana';
  const pat = decodePattern(m.pattern);
  if (/[ｦ-ﾟ]/.test(pat)) return 'halfKatakana';
  if (/ぁ|ぃ|ん/.test(pat)) return 'hiragana';
  if (/ァ|ア|ン/.test(pat)) return 'katakana';
  const text = [m.label, m.nearby, m.placeholder].join(' ');
  if (/半角カナ|半角カタカナ|ﾊﾝｶｸ/.test(text)) return 'halfKatakana';
  if (/カタカナ/.test(text)) return 'katakana';
  if (/ひらがな|ふりがな/.test(text)) return 'hiragana';
  return 'katakana';
}
```

- [x] **Step 4: テストが通ることを確認**

Run: `npx vitest run tests/core`
Expected: PASS（classifyField の既存テストも含め全緑 — `classifyField` は無改変のため退行しない）

- [x] **Step 5: コミット**

```bash
git add src/core/classify-rules.ts tests/core/classify-rules.test.ts
git commit -m "feat: カナ欄判定 wantsKana と pattern の \uXXXX 復号を追加"
```

---

### Task 2: カナオーバーレイ（samples E2E RED → 実装 → GREEN）

**Files:**
- Create: `samples/furigana-fieldset-form.html`
- Create: `samples/katakana-fieldset-form.html`
- Modify: `tests/integration/samples.test.ts`
- Modify: `tests/core/analyze.test.ts`
- Modify: `src/core/analyze.ts`

- [x] **Step 1: 再現サンプル HTML を 2 つ作る**

`samples/furigana-fieldset-form.html`（実ページ `pro.form-mailer.jp/fms/6d59e0a6280818` の最小再現。`pattern` 属性は `\uXXXX` の**リテラル文字列**として書く — HTML 属性はエスケープを解釈しないため、実ページと同じ形で保存される）:

```html
<!doctype html>
<html lang="ja"><meta charset="utf-8"><title>furigana fieldset form</title>
<form onsubmit="return false">
  <fieldset data-fieldset-label="お名前" class="form-fieldset form-fieldset-name required">
    <legend>お名前</legend>
    <label for="field_1_sei" class="visually-hidden">名前の姓</label>
    <input id="field_1_sei" name="field_1_sei" type="text" placeholder="例：未来" autocomplete="family-name">
    <label for="field_1_mei" class="visually-hidden">名前の名</label>
    <input id="field_1_mei" name="field_1_mei" type="text" placeholder="例：太郎" autocomplete="given-name">
  </fieldset>
  <fieldset data-fieldset-label="ふりがな" class="form-fieldset form-fieldset-name required">
    <legend>ふりがな</legend>
    <label for="field_2_sei" class="visually-hidden">名前の姓</label>
    <input id="field_2_sei" name="field_2_sei" type="text" placeholder="例：みらい" autocomplete="family-name"
      pattern="^[\u2015\u3000\u3041-\u3093\u309B-\u309E\u30FC]+$">
    <label for="field_2_mei" class="visually-hidden">名前の名</label>
    <input id="field_2_mei" name="field_2_mei" type="text" placeholder="例：たろう" autocomplete="given-name"
      pattern="^[\u2015\u3000\u3041-\u3093\u309B-\u309E\u30FC]+$">
  </fieldset>
</form>
</html>
```

`samples/katakana-fieldset-form.html`（実ページ `pro.form-mailer.jp/lp/2dd1c663300469` の最小再現）:

```html
<!doctype html>
<html lang="ja"><meta charset="utf-8"><title>katakana fieldset form</title>
<form onsubmit="return false">
  <fieldset data-fieldset-label="お名前" class="form-fieldset form-fieldset-name required">
    <legend>お名前</legend>
    <label for="field_1_sei" class="visually-hidden">名前の姓</label>
    <input id="field_1_sei" name="field_1_sei" type="text" placeholder="姓" autocomplete="family-name">
    <label for="field_1_mei" class="visually-hidden">名前の名</label>
    <input id="field_1_mei" name="field_1_mei" type="text" placeholder="名" autocomplete="given-name">
  </fieldset>
  <fieldset data-fieldset-label="お名前（カタカナ）" class="form-fieldset form-fieldset-name required">
    <legend>お名前（カタカナ）</legend>
    <label for="field_2_sei" class="visually-hidden">名前の姓</label>
    <input id="field_2_sei" name="field_2_sei" type="text" placeholder="セイ" autocomplete="family-name"
      pattern="^[\u2015\u3000\u30A1-\u30F6\u30FB-\u30FE]+$">
    <label for="field_2_mei" class="visually-hidden">名前の名</label>
    <input id="field_2_mei" name="field_2_mei" type="text" placeholder="メイ" autocomplete="given-name"
      pattern="^[\u2015\u3000\u30A1-\u30F6\u30FB-\u30FE]+$">
  </fieldset>
</form>
</html>
```

- [x] **Step 2: E2E テストを追加して失敗を確認**

`tests/integration/samples.test.ts`。import に 2 ファイルを追加:

```ts
import furigana from '../../samples/furigana-fieldset-form.html?raw';
import katakana from '../../samples/katakana-fieldset-form.html?raw';
```

`SAMPLES` レコードに追加:

```ts
const SAMPLES: Record<string, string> = {
  'table-form.html': table,
  'split-form.html': split,
  'single-field-form.html': single,
  'furigana-fieldset-form.html': furigana,
  'katakana-fieldset-form.html': katakana,
};
```

`describe('sample forms end to end')` 内に追加:

```ts
  it('furigana-fieldset-form', async () => {
    expect(await planFor('furigana-fieldset-form.html')).toEqual({
      field_1_sei: '山田', field_1_mei: '太郎',
      field_2_sei: 'やまだ', field_2_mei: 'たろう',
    });
  });

  it('katakana-fieldset-form', async () => {
    expect(await planFor('katakana-fieldset-form.html')).toEqual({
      field_1_sei: '山田', field_1_mei: '太郎',
      field_2_sei: 'ヤマダ', field_2_mei: 'タロウ',
    });
  });
```

Run: `npx vitest run tests/integration/samples.test.ts`
Expected: FAIL — `field_2_sei` が `'山田'`（autocomplete が lastName を返す現行バグ）になり `'やまだ'` と不一致。既存 3 サンプルと `field_1_*` は PASS

- [x] **Step 3: オーバーレイの単体テストを追加して失敗を確認**

`tests/core/analyze.test.ts` に追加する:

```ts
describe('kana overlay', () => {
  it('converts an autocomplete name hit when the field wants kana', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'field_4371037_sei', autocomplete: 'family-name',
      label: '名前の姓', placeholder: '例：みらい', nearby: 'ふりがな',
    })], null);
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', kanaKind: 'hiragana', confidence: 0.95 });
  });

  it('converts a katakana field with a セイ placeholder', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'field_4695585_sei', autocomplete: 'family-name',
      label: '名前の姓', placeholder: 'セイ', nearby: 'お名前（カタカナ）',
    })], null);
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', kanaKind: 'katakana' });
  });

  it('keeps the kanji category when the placeholder is kanji', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'field_4371018_sei', autocomplete: 'family-name',
      label: '名前の姓', placeholder: '例：未来', nearby: 'お名前',
    })], null);
    expect(items[0]!.cls.category).toBe('lastName');
    expect(items[0]!.cls.kanaKind).toBeUndefined();
  });

  it('converts legend-only kana fields the name route reads as kanji', async () => {
    const items = await classifyAll([makeMeta({
      id: 'a', name: 'f_1', label: '名前の姓', nearby: 'ふりがな',
    })], null);
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', kanaKind: 'hiragana' });
  });

  it('never touches non-name categories', async () => {
    const items = await classifyAll([makeMeta({ id: 'a', type: 'email', label: 'フリガナ連絡先' })], null);
    expect(items[0]!.cls.category).toBe('email');
  });

  it('splits a kana full-name pair after conversion', async () => {
    const items = await classifyAll([
      makeMeta({ id: 'a', name: 'name', label: 'フリガナ' }),
      makeMeta({ id: 'b', name: 'name', label: 'フリガナ' }),
    ], null);
    expect(items.map((i) => i.cls.category)).toEqual(['lastNameKana', 'firstNameKana']);
  });

  it('applies to LLM answers too', async () => {
    const { classifier } = llm({ a: 'lastName' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'xyz', pattern: '[ぁ-ん]+' })],
      classifier,
    );
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', source: 'llm', kanaKind: 'hiragana' });
  });
});
```

Run: `npx vitest run tests/core/analyze.test.ts`
Expected: FAIL — autocomplete 欄が `lastName` のまま、`kanaKind` が付かない

- [x] **Step 4: オーバーレイを実装する**

`src/core/analyze.ts`。import に `wantsKana` を追加:

```ts
import {
  classifyField, detectKanaKind, isConfident, refineClassifications, wantsKana, type Item,
} from './classify-rules';
```

ファイル本体に追加（`classifyAll` の前）:

```ts
const KANA_CATEGORY: Partial<Record<Category, Category>> = {
  lastName: 'lastNameKana',
  firstName: 'firstNameKana',
  fullName: 'fullNameKana',
};

// The kana decision cannot ride any single classification route: autocomplete reports
// family-name for both the kanji and the furigana pair, so it is applied once here,
// after rules and the LLM, before refinement groups the pairs.
function applyKanaOverlay(items: Item[]): void {
  for (const item of items) {
    const target = KANA_CATEGORY[item.cls.category];
    if (!target || !wantsKana(item.meta)) continue;
    item.cls.category = target;
    item.cls.kanaKind = detectKanaKind(item.meta);
  }
}
```

`classifyAll` の最後を変更:

```ts
  applyKanaOverlay(items);
  return refineClassifications(items);
```

- [x] **Step 5: 全テストが通ることを確認**

Run: `npx vitest run tests/core/analyze.test.ts && npx vitest run tests/integration/samples.test.ts`
Expected: PASS — Step 2/3 の失敗がすべて解消し、既存テストも退行しない

Run: `npm test`
Expected: PASS（全スイート緑）

- [x] **Step 6: コミット**

```bash
git add samples/furigana-fieldset-form.html samples/katakana-fieldset-form.html tests/integration/samples.test.ts tests/core/analyze.test.ts src/core/analyze.ts
git commit -m "fix: カナ欄を名前系カテゴリへ書き換えるオーバーレイを追加"
```

---

### Task 3: `classifyAll` の force モード

**Files:**
- Modify: `src/core/analyze.ts`
- Test: `tests/core/analyze.test.ts`

- [x] **Step 1: 失敗するテストを書く**

`tests/core/analyze.test.ts` に追加:

```ts
describe('classifyAll: force', () => {
  it('sends confident fields to the LLM and adopts the answers', async () => {
    const { classifier, classify } = llm({ a: 'firstName' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', autocomplete: 'family-name' })],
      classifier,
      { force: true },
    );
    expect(classify.mock.calls[0]![0].map((m) => m.id)).toEqual(['a']);
    expect(items[0]!.cls).toMatchObject({ category: 'firstName', source: 'llm' });
  });

  it('keeps rule results for fields the LLM does not answer', async () => {
    const { classifier, classify } = llm({});
    const items = await classifyAll(
      [makeMeta({ id: 'a', autocomplete: 'family-name' }), makeMeta({ id: 'b', name: 'xyz' })],
      classifier,
      { force: true },
    );
    expect(classify.mock.calls[0]![0].map((m) => m.id)).toEqual(['a', 'b']);
    expect(items.map((i) => i.cls.category)).toEqual(['lastName']);
  });

  it('falls back to weak rule hits when the LLM throws', async () => {
    const classifier: FieldClassifier = { classify: async () => { throw new Error('x'); } };
    const items = await classifyAll([makeMeta({ id: 'a', type: 'tel' })], classifier, { force: true });
    expect(items.map((i) => i.cls.category)).toEqual(['tel']);
  });

  it('keeps applying the kana overlay to LLM answers', async () => {
    const { classifier } = llm({ a: 'lastName' });
    const items = await classifyAll(
      [makeMeta({ id: 'a', name: 'field_1', autocomplete: 'family-name', placeholder: 'みらい' })],
      classifier,
      { force: true },
    );
    expect(items[0]!.cls).toMatchObject({ category: 'lastNameKana', source: 'llm', kanaKind: 'hiragana' });
  });
});
```

Run: `npx vitest run tests/core/analyze.test.ts`
Expected: FAIL — `classifyAll` が第 3 引数を受け付けず、または confident 欄が LLM に送られない

- [x] **Step 2: 実装する**

`src/core/analyze.ts` の `classifyAll` を置き換える:

```ts
export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
  opts: { force?: boolean } = {},
): Promise<Item[]> {
  const force = opts.force === true;
  const ruled = metas.map((meta) => ({ meta, cls: classifyField(meta) }));
  const pending = (force ? ruled : ruled.filter((r) => !isConfident(r.cls))).map((r) => r.meta);

  let fromLlm = new Map<string, Category>();
  if (classifier && pending.length > 0) {
    try {
      fromLlm = await classifier.classify(pending);
    } catch {
      // An LLM failure must not block rule-based filling.
    }
  }

  const items: Item[] = [];
  for (const { meta, cls } of ruled) {
    if (!force && isConfident(cls)) {
      items.push({ meta, cls });
      continue;
    }
    const category = fromLlm.get(meta.id);
    if (category && category !== 'unknown') {
      items.push({
        meta,
        cls: {
          category,
          confidence: 0.5,
          source: 'llm',
          ...(category.endsWith('Kana') ? { kanaKind: detectKanaKind(meta) } : {}),
        },
      });
      continue;
    }
    if (force && cls) items.push({ meta, cls });
  }
  applyKanaOverlay(items);
  return refineClassifications(items);
}
```

通常モード（`force` 未指定）の挙動は既存と完全に同一: confident 欄は早期採用、LLM 応答欄は採用、応答なしの weak 欄はドロップ。`force: true` では全欄を LLM に送り、応答なし・`unknown`・例外の欄は confidence 不問でルール結果を採用する。

- [x] **Step 3: テストが通ることを確認**

Run: `npm test`
Expected: PASS — force テスト 4 件と既存 `classifyAll` テスト全件

- [x] **Step 4: コミット**

```bash
git add src/core/analyze.ts tests/core/analyze.test.ts
git commit -m "feat: classifyAll に LLM 全欄再分析の force モードを追加"
```

---

### Task 4: プレビューの「LLM で再分析」ボタン

**Files:**
- Modify: `src/ui/preview.ts`
- Test: `tests/ui/preview.test.ts`（新規）

- [x] **Step 1: 失敗するテストを書く**

`tests/ui/preview.test.ts` を新規作成する:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { showPreview } from '../../src/ui/preview';
import type { PreviewOptions, PreviewRow } from '../../src/ui/preview';

const row = (status: PreviewRow['status']): PreviewRow => ({
  label: '姓', display: '山田', status, source: 'rule',
});

function open(opts: Partial<PreviewOptions> = {}) {
  let root!: ShadowRoot;
  const attach = HTMLElement.prototype.attachShadow;
  vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement, init) {
    root = attach.call(this, { mode: 'open' });
    return root;
  });
  const handle = showPreview({
    rows: [], addresses: [], selectedAddressId: '', onAddressChange: () => {},
    onApply: () => {}, onCancel: () => {}, ...opts,
  });
  return { handle, root };
}

const button = (root: ShadowRoot, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === text);

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('showPreview', () => {
  it('renders the reanalyze button only when a handler is given', () => {
    const withButton = open({ onReanalyze: () => {} });
    expect(button(withButton.root, 'LLM で再分析')).toBeTruthy();
    const without = open();
    expect(button(without.root, 'LLM で再分析')).toBeUndefined();
  });

  it('keeps the apply gating by row status', () => {
    const ok = open({ rows: [row('ok')] });
    expect(button(ok.root, '入力する')!.disabled).toBe(false);
    const filled = open({ rows: [row('filled')] });
    expect(button(filled.root, '入力する')!.disabled).toBe(true);
  });

  it('locks the panel while reanalysis runs and restores after', async () => {
    let resolve!: () => void;
    const onReanalyze = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const { root } = open({ rows: [row('ok')], onReanalyze });
    button(root, 'LLM で再分析')!.click();
    expect(onReanalyze).toHaveBeenCalledOnce();
    expect(button(root, '分析中…')!.disabled).toBe(true);
    expect(button(root, '入力する')!.disabled).toBe(true);
    expect(button(root, 'キャンセル')!.disabled).toBe(true);
    resolve();
    await vi.waitFor(() => expect(button(root, 'LLM で再分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
    expect(button(root, 'キャンセル')!.disabled).toBe(false);
  });

  it('re-enables the panel after a failed reanalysis', async () => {
    const onReanalyze = vi.fn(async () => { throw new Error('x'); });
    const { root } = open({ rows: [row('ok')], onReanalyze });
    button(root, 'LLM で再分析')!.click();
    await vi.waitFor(() => expect(button(root, 'LLM で再分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
  });
});
```

Run: `npx vitest run tests/ui/preview.test.ts`
Expected: FAIL — `onReanalyze` が存在せず、再分析ボタンが描画されない

- [x] **Step 2: 実装する**

`src/ui/preview.ts`。インターフェースを変更:

```ts
export interface PreviewOptions {
  rows: PreviewRow[];
  addresses: Address[];
  selectedAddressId: string;
  onAddressChange(id: string): void;
  onApply(): void;
  onCancel(): void;
  onReanalyze?(): void | Promise<void>;
}

export interface PreviewHandle {
  setRows(rows: PreviewRow[]): void;
  setReanalyzing(busy: boolean): void;
  close(): void;
}
```

CSS 定数に 1 行追加（`.actions` の行の後）:

```ts
  .actions .reanalyze { margin-right: auto; }
```

`showPreview` 本体 — ボタン生成〜アクション行を置き換える:

```ts
  const list = document.createElement('ul');
  const empty = document.createElement('p');
  empty.className = 'empty';
  empty.textContent = '入力できる欄が見つかりませんでした';
  const apply = document.createElement('button');
  apply.className = 'primary';
  apply.type = 'button';
  apply.textContent = '入力する';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'キャンセル';
  const onReanalyze = opts.onReanalyze;
  const reanalyze = onReanalyze
    ? Object.assign(document.createElement('button'), {
        type: 'button', className: 'reanalyze', textContent: 'LLM で再分析',
      })
    : null;
  let hasOk = false;
  let busy = false;
  const syncButtons = () => {
    if (reanalyze) {
      reanalyze.disabled = busy;
      reanalyze.textContent = busy ? '分析中…' : 'LLM で再分析';
    }
    cancel.disabled = busy;
    apply.disabled = busy || !hasOk;
  };
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(...(reanalyze ? [reanalyze, cancel, apply] : [cancel, apply]));
  panel.append(list, empty, actions);
```

`setRows` の末尾（`empty.hidden = ...` の後）を変更:

```ts
    empty.hidden = rows.length > 0;
    hasOk = rows.some((r) => r.status === 'ok');
    syncButtons();
```

`setReanalyzing` とクリックハンドラを `close` の定義の前に追加:

```ts
  const setReanalyzing = (v: boolean) => {
    busy = v;
    syncButtons();
  };
  if (onReanalyze) {
    reanalyze!.addEventListener('click', () => {
      if (busy) return;
      setReanalyzing(true);
      void Promise.resolve(onReanalyze())
        .catch((e) => console.error('JushoAI: reanalysis failed', e))
        .finally(() => setReanalyzing(false));
    });
  }
```

`return { setRows, close };` を変更:

```ts
  return { setRows, setReanalyzing, close };
```

- [x] **Step 3: テストが通ることを確認**

Run: `npx vitest run tests/ui`
Expected: PASS — 新規 preview テスト 4 件と既存 ui テスト全件

- [x] **Step 4: コミット**

```bash
git add src/ui/preview.ts tests/ui/preview.test.ts
git commit -m "feat: プレビューに LLM 再分析ボタンを追加"
```

---

### Task 5: content.ts に再分析を接続

**Files:**
- Modify: `src/entrypoints/content.ts`

単体テスト対象外（エントリポイントは chrome API を直接使うため、既存コードもテストなし。typecheck・build・Task 7 の手動確認で担保する）。

- [x] **Step 1: `items` を再代入可能にする**

`src/entrypoints/content.ts` の `run()` 内。該当行を変更:

```ts
      let items = await classifyAll(fields.map((f) => f.meta), classifier);
```

- [x] **Step 2: 再分析関数を追加し、プレビューに接続する**

`replan` の定義の後、`showPreview` の呼び出しの前に追加:

```ts
      async function reanalyze() {
        if (!classifier) return;
        items = await classifyAll(fields.map((f) => f.meta), classifier, { force: true });
        preview.setRows(replan());
      }
```

`showPreview` のオプションに `onReanalyze` を追加する:

```ts
      const preview = showPreview({
        rows: replan(),
        addresses: data.addresses,
        selectedAddressId: addressId,
        onReanalyze: classifier ? reanalyze : undefined,
        onAddressChange: (id) => {
          addressId = id;
          preview.setRows(replan());
        },
```

（`onApply` / `onCancel` は変更しない。`reanalyze` は関数宣言のため `preview` より前に書いても参照できる — 呼び出しはボタン押下時で、その時点で `preview` は初期化済み）

- [x] **Step 3: 型検査とビルドを通す**

Run: `npx wxt prepare && npm run typecheck`
Expected: エラーなし

Run: `npm run build`
Expected: `dist/chrome-mv3` へのビルド成功

- [x] **Step 4: コミット**

```bash
git add src/entrypoints/content.ts
git commit -m "feat: プレビューの再分析を content script から接続"
```

---

### Task 6: 設定画面のひらがな表示

**Files:**
- Modify: `src/entrypoints/options/dom.ts`
- Modify: `src/entrypoints/options/main.ts`
- Modify: `src/entrypoints/options/index.html`
- Test: `tests/entrypoints/options-dom.test.ts`（新規）

- [x] **Step 1: 失敗するテストを書く**

`tests/entrypoints/options-dom.test.ts` を新規作成する:

```ts
import { describe, it, expect } from 'vitest';
import { kanaHiraganaHint } from '../../src/entrypoints/options/dom';

describe('kanaHiraganaHint', () => {
  it('converts stored katakana to hiragana like the fill path', () => {
    expect(kanaHiraganaHint('ヤマダ')).toBe('やまだ');
    expect(kanaHiraganaHint('タロウ')).toBe('たろう');
  });

  it('accepts hiragana and half-width input the same way saving does', () => {
    expect(kanaHiraganaHint('やまだ')).toBe('やまだ');
    expect(kanaHiraganaHint('ﾀﾛｳ')).toBe('たろう');
  });

  it('stays empty for blank input', () => {
    expect(kanaHiraganaHint('')).toBe('');
    expect(kanaHiraganaHint('   ')).toBe('');
  });
});
```

Run: `npx vitest run tests/entrypoints/options-dom.test.ts`
Expected: FAIL — `kanaHiraganaHint` が存在しない

- [x] **Step 2: ヘルパを実装する**

`src/entrypoints/options/dom.ts`。冒頭に import を追加し、ファイル末尾に関数を追加する:

```ts
import { formatKana } from '../../core/formatters';
import { normalizeProfile } from '../../core/profile';
import { EMPTY_PROFILE } from '../../core/types';
```

```ts
// Mirrors save-time normalization then the fill-time hiragana conversion, so the
// hint under the kana inputs can never drift from what gets stored and injected.
export function kanaHiraganaHint(rawKana: string): string {
  const stored = normalizeProfile({ ...EMPTY_PROFILE, lastNameKana: rawKana }).lastNameKana;
  return stored ? formatKana(stored, 'hiragana') : '';
}
```

- [x] **Step 3: テストが通ることを確認**

Run: `npx vitest run tests/entrypoints/options-dom.test.ts`
Expected: PASS

- [x] **Step 4: 設定ページに組み込む**

`src/entrypoints/options/main.ts`。import を変更:

```ts
import { labeled, textInput, kanaHiraganaHint } from './dom';
```

`PROFILE_FIELDS` のカナ 2 行のラベルを変更:

```ts
const PROFILE_FIELDS: { key: keyof Profile; label: string; placeholder: string; type?: string }[] = [
  { key: 'lastName', label: '姓', placeholder: '山田' },
  { key: 'firstName', label: '名', placeholder: '太郎' },
  { key: 'lastNameKana', label: 'セイ（フリガナ・ふりがな入力可）', placeholder: 'ヤマダ' },
  { key: 'firstNameKana', label: 'メイ（フリガナ・ふりがな入力可）', placeholder: 'タロウ' },
  { key: 'email', label: 'メールアドレス', placeholder: 'yamada@example.com', type: 'email' },
  { key: 'tel', label: '電話番号', placeholder: '09012345678', type: 'tel' },
];
```

`render()` のプロファイルループを置き換える:

```ts
  for (const f of PROFILE_FIELDS) {
    const isKana = f.key === 'lastNameKana' || f.key === 'firstNameKana';
    const hint = isKana ? document.createElement('p') : null;
    if (hint) hint.className = 'kana-preview';
    const syncHint = (v: string) => {
      if (hint) hint.textContent = v.trim() ? `ひらがな表示: ${kanaHiraganaHint(v)}` : '';
    };
    const input = textInput(state.profile[f.key], f.placeholder, (v) => {
      state.profile[f.key] = v;
      syncHint(v);
    }, f.type);
    syncHint(state.profile[f.key]);
    profileSet.append(labeled(f.label, input));
    if (hint) profileSet.append(hint);
  }
```

`src/entrypoints/options/index.html` の `<style>` ブロック内、`.saved` の行の後に追加:

```css
      .kana-preview { margin: -4px 0 10px 2px; font-size: 12px; color: #5a6270; }
```

- [x] **Step 5: 型検査とビルドを通す**

Run: `npx wxt prepare && npm run typecheck`
Expected: エラーなし

- [x] **Step 6: コミット**

```bash
git add src/entrypoints/options/dom.ts src/entrypoints/options/main.ts src/entrypoints/options/index.html tests/entrypoints/options-dom.test.ts
git commit -m "feat: 設定ページにセイ・メイのひらがな表示を追加"
```

---

### Task 7: CHANGELOG・通し検査・手動確認

**Files:**
- Modify: `CHANGELOG.md`

- [x] **Step 1: CHANGELOG の `[Unreleased]` に記録する**

```markdown
## [Unreleased]

### Fixed

- ふりがな・カタカナ欄に漢字が入る問題を修正。分類の最終段でカナ欄判定（placeholder・見出し・`pattern`）が立った名前欄を `*Kana` カテゴリへ振り分け、正しい表記のカナを注入する

### Added

- プレビューから LLM による全欄の再分析を手動で実行できる「LLM で再分析」ボタン
- 設定ページのセイ・メイ欄に、保存・注入と同じ変換経路のひらがな表示
```

- [x] **Step 2: 通し検査を通す**

Run: `make check`
Expected: typecheck（拡張 + site）・全テスト・build すべて緑

- [x] **Step 3: コミット**

```bash
git add CHANGELOG.md
git commit -m "docs: CHANGELOG にカナ欄対応を記録"
```

- [ ] **Step 4: 手動確認（自動化できない実ページ挙動）**

Chrome で `chrome://extensions` を開き、デベロッパーモードで `dist/chrome-mv3` をロード（または `make dev`）。プロファイルに姓・名・セイ・メイ（全角カナ）を保存しておく。以下を確認する:

1. `https://pro.form-mailer.jp/fms/6d59e0a6280818` — ボタン → プレビュー: ふりがな欄に**ひらがな**、お名前欄に漢字が表示されること。承認後、ページのバリデーションエラー（全角ひらがなで入力してください）が出ないこと
2. `https://pro.form-mailer.jp/lp/2dd1c663300469` — プレビュー: お名前欄に漢字、お名前（カタカナ）欄に**全角カタカナ**が 4 行として正しく表示されること
3. プレビューの「LLM で再分析」ボタン — AI 利用可能な設定（built-in / openai / gemini）でのみ表示され、押すと「分析中…」になり完了後に行が更新されること。承認フローは変わらないこと
4. 設定ページ — セイ・メイ欄にひらがな／半角カナで入力すると「ひらがな表示」が即時追従し、保存後も正規化された値が保たれること

---

## Self-Review

**Spec coverage:**
- `wantsKana` + `\uXXXX` 復号 → Task 1
- カナオーバーレイ（ルール・LLM 両方、名前系のみ、confidence 維持、refine 直前） → Task 2
- force モード（全欄送信、フォールバック、オーバーレイ適用） → Task 3
- プレビュー 3 ボタン（AI 利用時のみ、busy 制御、承認必須） → Task 4
- content 接続（`items` 差し替え、`replan`） → Task 5
- ひらがな表示（保存形式不変、同一変換関数） → Task 6
- fixture（コア 9 系統 + samples 2 ファイル） → Tasks 1–3
- 完了判定 → Task 7
- 要検討（住所ふりがな等）は spec に記録済み、タスク不要

**Placeholder scan:** なし。全ステップに完全なコードと期待出力がある。

**Type consistency:** `wantsKana(m: FieldMeta): boolean`（Task 1 定義 → Task 2 の `applyKanaOverlay` で使用）。`classifyAll(metas, classifier, opts?: { force?: boolean })`（Task 3 → Task 5 の `{ force: true }`）。`onReanalyze?(): void | Promise<void>` と `setReanalyzing(busy: boolean)`（Task 4 → Task 5 の `onReanalyze: classifier ? reanalyze : undefined`、`reanalyze` は `Promise<void>` を返す）。`kanaHiraganaHint(rawKana: string): string`（Task 6 内で定義・使用）。

**検証済みの前提:** `classifyField` が autocomplete の 0.95 で短絡すること、`detectKanaKind` が placeholder「例：みらい」「セイ」から正しい kanaKind を返すことは、実フィールド形状でのプローブ実行により確認済み。
