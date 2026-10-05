# classifyAllのforce再送とpreview差し替えの実装読み

form-mailerの3分割電話で、ルール単体では全滅、再分析で復活する例がありました。

![before: tel単体扱いでmaxlength警告3連](images/before-reanalyze.png)

![after: tel1/tel2/tel3に割れて警告が消えます](images/after-reanalyze.png)

実装視点で、どこが効いたのかを追います。

## 分類の seam

入口は `src/entrypoints/content.ts` です。

```ts
let items = await classifyAll(metas, classifier);
// preview表示中
items = await classifyAll(metas, classifier, { force: true });
```

`src/core/analyze.ts` の `classifyAll` は、通常は `isConfident (confidence >= 0.6)` の欄を採用し、残りだけ `classifier.classify(pending)` に回します。`force: true` では全欄を送り、応答なし・`unknown`・例外時はルール結果に倒します。LLMが落ちてもルールだけで動き続ける縮退が前提です。

`FieldClassifier` の背後は3種類です。内蔵Prompt API、OpenAI互換、Geminiです。どれも `buildPrompt / buildSchema / parseLlmOutput` を共有し、分類だけ返します。今回のボタン表示は `AI: OpenAI 互換` で、`src/ui/status-label.ts` の `badgeLabel` が `available + openai` のときに出す文言です。具体的なモデル名は `src/ai/settings.ts` の設定値次第で、コード上の既定はありません。

## プレビューの差し替え

`src/ui/preview.ts` の `showPreview` は `setRows / setReanalyzing / close` を返します。再分析ボタンは `onReanalyze` があるときだけ出ます。

```ts
onReanalyze: classifier ? reanalyze : undefined,
```

押下中は `setReanalyzing(true)` で「分析中…」にし、二重押しと適用を止めます。完了後に `setRows` で行を差し替えます。行の出所は `PreviewRow.source` で、`'llm'` のときだけ「AI判定」の札を付けます。文言と警告は `PlanStatus` からの写像です。

- `ok` : 注記なし
- `filled` : 入力済みのため上書きしません
- `warn-maxlength` : 文字数を超えるため入力しません
- `warn-no-option` : 一致する選択肢がないため入力しません

今回のbeforeは `warn-maxlength` の3連、afterは `ok` の3連です。都道府県は `filled` のまま据え置きです。

## プライバシーの境界

送るのは `toWireMeta` の許可リストだけです。`id, name, htmlId, label, placeholder, nearby, type, maxLength` を各80文字で切ります。プロフィールの値、欄の現在値、selectの選択肢は送りません。通信はbackgroundの `fetch` だけで、Content Scriptと設定ページは直接送りません。APIキーはAES-GCMのエンベロープで保存し、backgroundだけが復号します。

OpenAI互換は `temperature: 0` と `json_schema` の厳密指定で送り、Geminiは `responseMimeType: application/json` と大文字型の `responseSchema` で送ります。どちらも `redirect: 'error'`、`credentials: 'omit'` です。

## 再現と回帰

ずれを見たら、先に `tests/core/` にfixtureを足して失敗させます。`makeMeta` で `label: '電話番号の市外...'` の3欄を作り、`classifyAll(fields, null)` では `tel` 止まり、`classifyAll` のLLM差し替えで `tel1/2/3` になることを固定します。正規表現が落ちたら期待値ではなく正規表現を直します。E2Eは `samples/` のフォームで手動確認します。

## 次にすること

再分析は万能ではありません。確信の低い欄が増えるほど送信が増え、誤分類の可能性も上がります。札の有無で出所を見分け、適用前に値を目視します。迷う欄があれば、その欄だけ手入力が最速です。
