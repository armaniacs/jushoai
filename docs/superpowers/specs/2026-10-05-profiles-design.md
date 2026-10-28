# 複数プロファイル・生年月日・学校対応 設計書

氏名・カナ・連絡先だけだったプロファイルを拡張し、生年月日・学校名・学部学科の注入と、最大 10 件のプロファイル切り替え・複製に対応する。分類・注入・承認の基本設計は `2026-10-03-jushoai-design.md`、カナ欄対応は `2026-10-04-kana-fields-design.md` に従い、この文書は変更点だけを定める。フォーム不具合の報告機能は独立 PBI（`pbi/2026-10-05-form-report.md`）として別サイクルで扱い、ここには含めない。

## 目的とスコープ

- 実在フォーム（`pro.form-mailer.jp/lp/2dd1c663300469` の生年月日・学校名・学部学科欄）に正しく注入できるようにする
- 用途別（個人用・テスト用・就活用など）に最大 10 件のプロファイルを持ち、プレビューで切り替え、既存プロファイルから複製できるようにする

### 含める

- `Profile` 型への `birthday`（ISO YYYY-MM-DD）・`school`・`department` 追加（いずれも任意・空可）
- 新カテゴリ 6 種（`birthYear` / `birthMonth` / `birthDay` / `birthEra` / `school` / `department`）の分類、`AUTOCOMPLETE` の `bday-*` 対応、LLM プロンプトのカテゴリ追加
- 生年月日 1 欄型・type=date の対応（追補 2026-10-21）: 新カテゴリ `birthday` の分類、`AUTOCOMPLETE` の `bday` 対応、type=date の走査対象化
- 会社名・部署の対応（追補 2026-10-21）: `Profile` 型への `companyName`・`companyDepartment` 追加（いずれも任意・空可）、新カテゴリ `company` / `companyDepartment` の分類、`AUTOCOMPLETE` の `organization` 対応
- 和暦（元号 select＋和暦年）の注入。プロファイルは西暦で 1 回だけ保存し、和暦は注入時に計算で導出する
- 月・日・元号 select への注入（都道府県 select と同一の未選択判定＋option マッチ方式）
- `StoredData` の `profiles` 配列化（1〜10 件）、旧形式からの自動移行（ラベル「メイン」）
- プレビューのプロファイル選択（住所セレクトと同一方式）、設定画面のプロファイルカード（ラベル編集・複製・削除・上限）
- 実フォーム由来の回帰サンプル 1 件とコア fixture

### 含めない

- 住所のプロファイル単位化（住所リストは全プロファイルで共有のまま）
- プロファイル選択状態の永続化（常に `profiles[0]` から開始。住所の `addresses[0]` と同一方式）
- プロファイルの並べ替え・インポート/エクスポート
- フォーム不具合の報告機能（別 PBI）

## 現状と原因

- `Profile` は姓・名・カナ・メール・電話のみで、生年月日・学校の保持場所がない。分類カテゴリにも存在しない（設計書の MVP 対象外リストに「生年月日」「複数の氏名プロファイル」として明記されていた範囲）
- `StoredData = { profile, addresses }` の単一プロファイル。`isReady` はプロファイル有効＋住所 1 件を要求
- 実ページの生年月日欄: 年は text input（`placeholder="2000"`、`autocomplete="bday-year"`）、月・日は select（`value="01"` / text `1`、`autocomplete="bday-month"` / `bday-day`）。planner は select への注入を都道府県のみに対応している
- 学校名・学部学科は空 placeholder の text input（legend「学校名」「学部・学科」）。現行 `EXCLUDE` が `学校` を含むため学校名欄は分類不能（null）になっている

## アーキテクチャ

```
設定 ──profiles[]（移行・複製・上限10）──▶ chrome.storage.local
ボタン ──scanContainer → classifyAll（新6カテゴリ＋AUTOCOMPLETE bday-*）
  └─ buildPlan(items, { profile: 選択中, address })
       ├─ birthday → ISO 分割（birthEra 有無で和暦年/西暦年を切替）
       ├─ school/department → そのまま（空はスキップ）
       └─ month/day/era の select → 未選択判定＋option マッチ
  └─ プレビュー（プロファイル選択＋承認必須）→ fillField
```

分類経路・confidence 体系・承認フロー・カナオーバーレイは無改変。新カテゴリはオーバーレイの対象外（名前系 3 種のみに作用するため干渉しない）。

## データモデル・保存・移行

```ts
export interface Profile {
  id: string;         // プロファイル識別（crypto.randomUUID）
  label: string;      // 「個人用」「就活用」など（必須・空不可）
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  birthday: string;   // ISO YYYY-MM-DD、空文字可（任意）
  school: string;     // 任意
  department: string; // 任意
  email: string;
  tel: string;
}

export interface StoredData {
  profiles: Profile[];  // 1〜10 件
  addresses: Address[];
}
```

- **任意項目の扱い**: 生年月日・学校名・学部学科は空欄のまま保存できる。空の項目に対応する欄は注入スキップ（プレビューにも行が出ない）。「入れたくないデータは空白」が正規の使い方。`validateProfile` の必須（姓・名・セイ・メイ）は不変。生年月日は年月日すべて揃った完全な日付か空欄かのいずれかとし、年だけ等の部分入力は形式エラーとして保存をブロックする
- **移行**: 旧形式 `{ profile }` を読み込んだら `profiles: [{ ...profile, id: 新規, label: 'メイン' }]` に変換して保存。万一両形式が共存していたら `profiles`（空でなければ）を優先する。以降は新形式のみ
- **選択の初期値**: 常に `profiles[0]`（住所の `addresses[0]` と同一方式）。選択状態の永続化はしない。先頭カードが事実上のメイン
- **上限 10**: 10 件到達で追加・複製ボタンを無効化＋文言表示。保存時にも検証
- **複製**: ディープコピー＋新 id、ラベルは「◯◯ のコピー」、末尾に追加。上限到達時は無効
- **削除**: 最後の 1 件も削除可（住所の削除と同一方針。2026-10-28 変更）。0 件ではカードが消え新規追加ボタンのみになり、0 件のままの保存は件数エラーでブロックされる
- **ラベル**: 必須・空不可。重複は許容
- **`isReady`**: 有効プロファイル 1 件以上＋住所 1 件以上

## 分類

`classifyField` の autocomplete 直後・sources ループ前にフィールド単位プリパスを新設する。

`AUTOCOMPLETE` マップに追加: `bday-year → birthYear`、`bday-month → birthMonth`、`bday-day → birthDay`（0.95）。

`own` = name＋htmlId＋label＋placeholder（正規化済み）、誕生文脈 = `bday|birth|dob|生年月日|誕生` が own または legend（nearby）にあること:

| 条件 | 結果 |
|---|---|
| 誕生文脈 ＋ own に `year\|年` | `birthYear`（0.7） |
| 誕生文脈 ＋ own に `month\|月` | `birthMonth`（0.7） |
| 誕生文脈 ＋ own に `day\|日` | `birthDay`（0.7） |
| `元号\|年号\|和暦\|令和\|平成\|昭和\|大正\|明治\|era\|wareki\|gengou` が own にある | `birthEra`（0.7）、legend のみなら 0.65 |
| `学校\|school\|univ\|college\|高校\|大学` が own にある | `school`（0.7）、legend のみなら 0.65 |
| `学部\|学科\|専攻\|department\|major\|faculty` が own にある | `department`（0.7）、legend のみなら 0.65 |

- **誕生文脈のゲート**: 月・日（`月`/`日` の一文字）は単独では判定せず、必ず誕生文脈と組み合わせる
- **学校は `EXCLUDE` より優先**: 現行 `EXCLUDE` は `学校` を含むため、学校判定を `EXCLUDE` より前に置き、`EXCLUDE` から `学校` を除去する。`会社`・`法人`等の除外は不変
- **`学部` と `部署` の衝突なし**: `EXCLUDE`・`NAME_EXCLUDE` いずれにも `学部`・`学科` は含まれない
- **LLM**: `llm/classifier.ts` のカテゴリ一覧に 6 種を追加（既存と同様の日本語説明付き）。ルール自信なし欄は従来どおり LLM へ
- **`refineClassifications` は無改変**: 新 6 カテゴリは単独欄で確定し、ペア分割の対象にならない

## 値生成・注入

プロファイルの `birthday`（ISO 1 本）を `valueFor` で分解する:

| カテゴリ | 値 |
|---|---|
| `birthYear` | 同一フォームに `birthEra` があれば**和暦年**、なければ**西暦年**（4 桁） |
| `birthMonth` / `birthDay` | ゼロ埋め 2 桁 |
| `birthEra` | 元号名（`令和`/`平成`/`昭和`/`大正`/`明治`） |
| `school` / `department` | プロファイル値をそのまま（空なら従来どおりスキップ） |

- **和暦の判定表**（`prefectures.ts` と同様の定数テーブル）: 明治 1868-09-08〜、大正 1912-07-30〜、昭和 1926-12-25〜、平成 1989-01-08〜、令和 2019-05-01〜。和暦年 = 西暦年 − 開始年 ＋ 1、**元年は `1` と表記**（数字のみ受け付けるバリデーションが一般的なため）
- **年の西暦/和暦切り替え**: `valueFor` が受け取る `present: Set<Category>` に `birthEra` が含まれるかで判定
- **不正な birthday**（保存時検証をすり抜けた場合）は planner 側で正規表現チェックし、空扱い（注入しない）

select への注入を都道府県以外に拡張する:

- **対象**: `birthMonth` / `birthDay` / `birthEra` の select
- **未選択判定は共通**: 既存 `isUntouchedSelect`（先頭 option にいる = 未触）をそのまま使う。入力済み select は上書きせず `filled`、一致 option なしは `warn-no-option`（都道府県と同一ポリシー）
- **option マッチ**: 月・日は option の value・text を数値化して比較（`value="01"` / text `1` の表記ゆれに対応）。元号は option text との完全一致を優先、なければ value との一致
- 年 input の `maxlength` 超過などは既存の `warn-maxlength` ポリシー（切り詰めず警告して注入しない）に準拠

## 追補（2026-10-21）: 生年月日 1 欄型・type=date・会社名・部署

深掘り（2026-10-17）で生年月日 1 欄型・type=date 欄と 会社名・部署欄の実在が確定したため、「含めない」を解除する（PBI-118・PBI-119）。基本設計（分類・注入・承認）は無改変で、この節は解除と設計判断だけを定める。

### 生年月日 1 欄型・type=date（PBI-118）

- **走査**: `dom/scan-fields.ts` の `TEXT_TYPES` に `date` を追加する。type=date は FieldMeta が生成されていなかったため、欄自体が分類・注入の対象外だった
- **注入値は ISO（YYYY-MM-DD）一択**: type=date は HTML 標準で value が常に YYYY-MM-DD のため、注入値は ISO に限定する。1 欄型 text も ISO 一択とする
- **placeholder 例示の解析はしない**: 1 欄型 text の placeholder（`1990年5月7日`・`1990/5/7`・和暦表記など）から形式を推定して変換する実装は作らない。誤注入の恐れがあるため、解釈できない値は注入しない、を本設計の判断として記録する
- **解釈不能な保存値は注入しない**: 保存済み birthday が ISO に解釈できない場合（和暦・年だけ・区切り違いなど）は planner が空扱いし、プレビューに warn-no-value を出して注入しない
- **分類は欄自身の文言だけ**: `birthday` カテゴリは欄の label・name・id・placeholder が誕生日語そのもの（`生年月日`/`誕生日`/`Birthday` など）のときだけ返す。見出し（legend・nearby）だけでは判定しない（生年月日 fieldset に年/月/日 3 欄が入る既存形と衝突するため）。月/日/年語を持つ従来欄は `birthYear`/`birthMonth`/`birthDay` のまま
- **AUTOCOMPLETE**: `bday → birthday`（0.95）を追加する。`bday-year`/`bday-month`/`bday-day` は従来どおり

### 会社名・部署（PBI-119）

- **Profile 型**: `companyName`・`companyDepartment` を追加する（いずれも任意・空可・検証なし、保存時の正規化は trim のみ）。既存 `department` は学部・学科用のまま変更しない
- **新カテゴリ**: `company`（会社名）と `companyDepartment`（会社の部署）。既存 `school`/`department` と同一の単独欄パターン（own 0.7 / legend 0.65）
- **EXCLUDE の緩和境界**: 会社語の欄は `company`（`会社名`・`法人名`・`団体名`・`社名`）と `companyDepartment`（`部署`。`部署名` は除く）だけを EXCLUDE から通す。`ご担当者名`・`会社の生年月日`・`会社電話`・`役職`・`店舗`・`法人種別`・カナ欄（`会社名（フリガナ）`）は従来どおり除外のまま
- **既存ガードの維持**: `会社名` が `school` にならないこと、`部署` が `department` にならないことは維持する。英語の複合欄（`Company Department`）は会社・部署のどちらとも解釈できるため除外のまま
- **AUTOCOMPLETE**: `organization → company`（0.95）を追加する。欄の意味をページ自身が宣言している autocomplete トークンであり、誤注入より不注入の損失が大きいため追加する、を本設計の判断として記録する
- **走査・フォーマッタ**: text は既に走査対象のため拡大しない。会社用のフォーマッタ（カナ変換など）は新規に作らない
- **buildSchema**: `llm/prompt.ts` の buildSchema は CATEGORIES 連動（`enum: [...CATEGORIES]`）で自動反映されることを確認済み。`parseLlmOutput` も CATEGORIES 基準のため連動する

### 半角・全角幅強制（PBI-120）

- **判定は pattern 属性のみ**: 幅の要求は欄の `pattern` 属性からだけ読む。placeholder は例示であって強制ではないため読まない（例示の全角数字で半角値を書き換える誤変換を避ける）。quantifier の `{2,10}` は文字数であって要求文字ではないため、判定前に落とす
- **判定結果**: 全角形（`[０-９]`・`[Ａ-Ｚａ-ｚ]`・カナ範囲）があれば `full`、半角形（`[0-9a-zA-Z]`・`[ｦ-ﾟ]`・`\d`/`\w`）があれば `half`、両方（`[0-9０-９]`）かどちらも無ければ無変換
- **変換は core/formatters の純粋関数**: `toFullWidth`（ASCII 表示域 0x21-0x7E を 0xFEE0 ずらす＋半角カナ→全角カナ、濁点は NFC で結合）と `toHalfWidth`（全角 ASCII ブロック 0xFF01-0xFF5E を逆方向にずらす）。空白はずらさない（氏名の区切りを書き換えないため）。clean との契約: ここで NFKC を掛け直さない（値は既に profile 形のため、NFKC はずらしを打ち消す）
- **planner は input 欄のみに適用**: select/radio は option の一致が前提（走査が select/radio の pattern を運ばない）、type=date は ISO が崩れるため対象外。0xFEE0 のずらし自体は長さ不変だが、`toFullWidth` の末尾 NFC は値全体に掛かるため幅と無関係な列（ハングル jamo 結合・孤立 ﾞ→U+3099）も再構成され、code unit 長は変わり得る。maxlength 超過の判定は変換後の値に対して行い、超過時は従来どおり切り詰めず警告して注入しない
- **新カテゴリは作らない**: 「半角カタカナのみ」「全角英数のみ」の pattern は既存カテゴリの値整形に幅判定を足す形。カナの幅は従来どおり kanaKind（detectKanaKind）が受け持ち、幅変換はカナを二重に書き換えない
- **走査の拡大はしない**: pattern・placeholder・maxLength は既に FieldMeta が運んでいる
- **samples**: 対象 URL は未確定。全角強制パターンは既存サンプル（formmailer-raijo-age.html のカナ欄、`^[\u2015\u3000\u30A1-\u30F6\u30FB-\u30FE]+$`）が実在し、既存統合テストの期待値は不変

### 長すぎる建物名の略記（PBI-122）

- **規則は core/abbreviate.ts の決定的な規則表**: LLM は使わない。空白は全角のみ詰める（半角空白は英語表記の語間なので保持）＋住居系接尾語の短縮（マンション・アパート・コーポ・コーポラス・ハイツ・レジデンス→邸、ビルディング→ビル）。置換は末尾に一度だけ（複合名の部分置換で壊さないため）。置換は必ず短くなるものだけ（長くなる置換は収まらないため表に入れない）
- **適用範囲**: `building` 欄と、建物名を合成する `street`・`addressNoPref`・`addressFull`。合成欄は追加した建物尾部だけを短縮し、市区町村・町名の土台は書き換えない（土台がすでに超過している場合は救えないため従来どおり warn-maxlength）。海外住所の address2 は別カテゴリのため対象外
- **注入は承認後のみ**: 超過欄の行は warn-maxlength のまま略記候補（略記前 → 略記後）を持ち、プレビューが「略記して入れる」チェックボックスを出す。既定は未承認＝注入しない。承認された行だけが apply で value/status を置き換えて注入される（NOT-TODO 12 との整合）。略記しても収まらない・規則が当てはまらないときは従来どおり警告して注入しない
- **onApply のシグネチャ**: `onApply(sendFeedback, approvedAbbrevs)` に第 2 引数を追加する。承認セット（fieldId）はプレビューが集めて session.apply に渡し、session が plan を置き換えてから injectPlan する。fill 側の契約（status ok が注入）は不変
- **幅変換との順序契約**: PBI-120 の幅変換が先（buildPlan が raw を変換してから maxlength 判定）、略記はその後（変換済みの値に対して超過判定→候補生成）。合成欄の建物名側にも同じ幅変換を掛けてから候補を生成する（変換済み raw と未変換 profile 値の比較で候補が消えないため）。略記の出力を幅変換に戻さない。この順で固定する
- **samples**: 「建物欄+maxlength 超過」の組合せは samples に未収集のため fixture を追加しない。対象 URL の確定と make addurl はユーザー作業として残す

## UI

### プレビュー: プロファイル選択

住所セレクトと同一方式。`showPreview` に `profiles`・`selectedProfileId`・`onProfileChange` を追加する:

- プロファイルが **2 件以上のときのみ**セレクトを表示（住所セレクトの `length > 1` ルールと同一）
- option の表示名はプロファイルのラベル
- 選択変更 → `replan()` が選択中プロファイルで再計画 → 行が即時更新
- 初期値は `profiles[0]`。再分析（force）・入力済み・`maxlength` 警告はすべて選択中プロファイル基準で再計算される

### 設定画面: プロファイルカード

プロファイルごとに fieldset カード:

- **カード内容**: ラベル編集欄＋全フィールド（姓・名・セイ・メイ・生年月日・学校名・学部学科・メール・電話）＋セイ/メイ下のひらがな表示（既存機能を各カードで再利用）
- **ボタン**: 「複製」（同内容＋新 id で末尾追加、ラベルは「◯◯ のコピー」）／「このプロファイルを削除」（1 件のみのとき無効）
- **追加ボタン**: 「プロファイルを新規追加」（空プロファイルを追加、10 件到達で無効化＋文言表示）
- **ラベル**: 必須・空不可。重複は許容

### 入力仕様

- **生年月日**: text 入力（placeholder `1990-05-07`）。保存時に正規化: `/`・`年月日` 区切りも受理しゼロ埋め ISO（`1990-5-7` → `1990-05-07`）へ。検証は月 1-12・日 1-31＋実在日チェック。空は許容
- **学校名・学部学科**: 通常の text 入力、検証なし（空許容）
- **保存時検証**: 既存（姓・名・セイ・メイ必須）に加え、ラベル必須・生年月日形式・プロファイル件数 1〜10。不備があれば保存せずエラー表示（既存方式）

## テスト

- **分類**（`tests/core/`）: 新 6 カテゴリの `FieldMeta` fixture。偽陽性ガード: placeholder 漢字＋誕生 legend は分類しないこと、`会社名` が `school` にならないこと、`部署` が `department` にならないこと
- **値生成**（`tests/core/`）: ISO 分割、和暦テーブル境界（2019-04-30→平成31、2019-05-01→令和1、1989-01-07→昭和64、1989-01-08→平成1）、`birthEra` 有無での年の西暦/和暦切り替え、不正 birthday は空扱い。select option マッチ（月 `value="01"`/text `1`、元号 text 一致）
- **移行**: 旧形式 `{ profile }` → `profiles[0]`（label「メイン」、新 id 付与）。移行ロジックは切り出して単体テスト
- **E2E**（`tests/integration/`）: 新規サンプル 1 件（年 input＋月/日 select＋学校名＋学部学科、実ページ構造の最小再現）で scan→分類→plan まで。和暦パス（era select あり）はコアの planner テストでカバーし、サンプルは増やさない
- プロファイル選択・複製・上限の UI 振る舞いは `content.ts`・options の配線のため、typecheck＋手動確認で担保（エントリポイントの単体テストは作らない既存方針）

## 完了判定

1. `make check`（typecheck + test + build）が緑
2. 実ページでの目視確認:
   - プロファイルに生年月日・学校名・学部学科を保存し、page2（`pro.form-mailer.jp/lp/2dd1c663300469`）で正しく注入されること（月・日 select が選択状態になること）
   - プレビューでプロファイルを切り替えると行が入れ替わること
   - 設定画面で複製→「◯◯ のコピー」追加、削除（1 件時は不可）、10 件で追加不可になること
   - 既存データが「メイン」1 件として移行されること（現プロファイルが引き継がれること）

## 要検討（スコープ外として記録）

- **住所のふりがな欄**: kana-fields 設計書の記録を維持。本 spec の対象外
- **住所のプロファイル単位化・プロファイルの並べ替え**: 対象外
- **フォーム不具合の報告機能**: 別 PBI（`pbi/2026-10-05-form-report.md`）で扱う
