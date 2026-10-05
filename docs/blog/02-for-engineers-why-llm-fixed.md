# ルールでは割れない電話3分割を、LLM再分析が直す理由

form-mailerのフォームで、こんなプレビューが出ました。

![再分析前。電話3欄がすべて同一値でmaxlength警告](images/before-reanalyze.png)

電話番号の3欄すべてに `0335814321` を入れようとして、「文字数を超えるため入力しません」になります。「LLM で再分析」を押すと、こうなります。

![再分析後。tel1/tel2/tel3に正しく分割され、AI判定が付きます](images/after-reanalyze.png)

なぜ直るのかを、ルールとLLMの分担で整理します。

## ルールの限界

JushoAIの分類は2段階です。`classifyField` が1欄ずつ見て、`refineClassifications` が兄弟欄を見て補正します。電話3欄は `tel` が3つ並んだら `tel1/2/3` に振る想定です。

今回の欄は表示が「電話番号の市外…」「電話番号の市内…」「電話番号の加入…」で途切れています。属性やplaceholderも `090` / `0000` / `0000` のような例示だけでした。単体では「電話である」までは分かりますが、どれが市外局番かの確信が `ACCEPT_THRESHOLD (0.6)` に届きません。

確信が低い欄は `tel` のまま残り、値作りは「1欄電話」と判断して全欄にフル桁を入れます。`maxlength` を超えるため、計画は安全側に倒して、その3行を捨てます。これが赤字の正体です。

## 再分析で起きること

```text
scan -> classifyAll(metas, classifier)
  -> rule: confident only
  -> LLM: low-confidence fields
  -> refine -> buildPlan -> preview

preview [LLMで再分析] -> classifyAll(metas, classifier, { force: true })
  -> LLM: all fields
  -> refine -> buildPlan -> setRows
```

通常時は確信の低い欄だけをLLMに送ります。再分析は `force: true` で全欄を送り直します。プロンプトに入るのは `id, name, htmlId, label, placeholder, nearby, type, maxLength` を80文字に切ったものだけです。プロフィールの値や現在の入力値は入りません。

LLMの仕事は分類だけです。`tel1, tel2, tel3` を返し、分割やハイフン有無の決定は `core/` の決定的コードがやります。今回も `03 / 3581 / 4321` の分割自体は既存の整形ロジックの成果です。

## 対応関係

| 欄 | rule単体 | LLM再分析後 | source表示 |
|---|---|---|---|
| 市外〜 | tel (低確信) | tel1 | AI判定 |
| 市内〜 | tel (低確信) | tel2 | AI判定 |
| 加入〜 | tel (低確信) | tel3 | AI判定 |
| 都道府県 | prefecture (確信) | prefecture | 札なし、入力済みで据え置き |
| 氏名・カナ・メール | 確信あり | 同じ | 再分析後はAI判定表示の場合あり |

再分析後は `source: 'llm'` の行に「AI判定」の札が付きます。札は出所の表示であり、精度の保証ではありません。プレビューで値を確認してから「入力する」を押します。

## よくある誤解

Q. LLMが電話番号を作ったのでしょうか。
A. 大丈夫です。作りません。順番に整理します。LLMは欄の種類だけを返します。番号自体は保存済みプロフィールから、桁数と `maxlength` を見て切り分けます。

Q. 最初から全部LLMに送ればよいのではないでしょうか。
A. 速度と送信量のためです。読める欄はルールで即決し、読めない欄だけ送ります。外せない欄があるときだけ、人の操作で全欄再送します。

## 次にすること

同じ崩れを見たら、開発者ツールで欄の `label / nearby / maxLength` を確認してみてください。`tel` 止まりで `tel1/2/3` に割れていない場合は、この記事のパターンです。`tests/core/` に `makeMeta` で再現fixtureを足すと、次から回帰を検出できます。

今回の設定はボタン表示の通り `AI: OpenAI 互換` です。モデル名は設定画面の指定に依存します。Geminiや内蔵AIでも、送る項目と `force` の動きは同じです。
