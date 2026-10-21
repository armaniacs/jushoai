# PBI: プロファイルのエクスポート/インポート(警告付きローカルファイル)

## ユーザーストーリー

Firefox 一時アドオン利用者として、プロファイル(最大 10 件)と住所を 1 つの JSON ファイルに書き出し/読み込みしたい、なぜなら終了とともにプロファイル・住所・暗号化キーが消え README が「使うたびに読み込み直して、登録し直す」を公式手順として案内しているから(README.md:22)。

## 優先度

- 順位: 3位 / 9件
- RICEスコア: 32(Reach=5 / Impact=2 / Confidence=80% / Effort=0.25人月)
- 根拠: 登録済みデータ全消失(プロファイル 14 欄+住所 16 欄×最大 10 件の再入力)を防ぐ最大のユーザー価値。再利用部品(validateProfile/validateAddress/MAX_ITEMS/saveTextFile/window.confirm)と保存構造(StoredData)がすべて実装済み。設計書がインポート/エクスポートを非目標として明示した変更のため設計書新規が着手条件(docs/todo-not-todo.md:155 共通ルール 2、profiles-design.md:26, 174)。

## BDD受け入れシナリオ

```gherkin
Scenario: エクスポートで警告の後に JSON が書き出される
  Given プロファイルと住所が登録されている
  When 設定ページのエクスポートを実行する
  Then 平文の個人情報を含む旨の警告の後に JSON がダウンロードされる

Scenario: インポートで検証と上限が適用される
  Given エクスポートした JSON がある
  When インポートを実行する
  Then validateProfile と validateAddress と上限 10 件が検証され不正データは保存されない

Scenario: 不正 JSON で storage が変化しない
  Given 検証違反や上限超過を含む JSON がある
  When インポートを実行する
  Then エラー通知が表示され storage の内容は変化しない
```

## 受け入れ基準

- [x] docs/superpowers/specs/ に設計書を新規作成してから着手する(上書きと追加の扱い・最終使用状態(jushoai:last)を含めるかは設計時に決める)(docs/superpowers/specs/2026-10-21-profile-transfer-design.md。id 単位マージ(同一 id は更新・新 id は追加、全置換なし)、jushoai:last は含めない、検証順序と警告文言を確定、文字種検証 exit 0)
- [x] storage 層(src/storage.ts)のエクスポート/インポートの単体テストを追加する(tests/storage.test.ts の vi.stubGlobal chrome パターン)(実装は src/transfer.ts を新設、tests/storage.test.ts に 16 ケース追加。saveData の契約は mergeStoredData の export 化のみで無変更)
- [x] インポートは上限 10 件を自分で検査する(上限は UI 層のみで saveData には検証が無い: storage.ts:198-211、MAX_ITEMS は options/dom.ts:9-10)(MAX_ITEMS/isAtLimit を src/core/collection.ts に移して UI と取り込み経路が同じ値を見るようにし、インポートはマージ後件数で検査)
- [x] エクスポートは saveTextFile(audit-section.ts:13-22)を流用し「平文の個人情報を含む」警告を表示する(mimeType 既定値引数を追加し既存 TSV 呼び出しは互換)
- [x] ファイル入力(input type=file+FileReader)を新設する(src 配下に前例なし)(src/entrypoints/options/transfer-section.ts を新設。mount-once の holder を #app 内に置き render() が再 append、nav への新規ページ追加は OPTION_SECTIONS の id 一覧を固定する既存テストを守るため回避)
- [x] クラウド同期・サーバー・chrome.storage.sync は作らない(NOT-TODO 3)
- [x] `make check` が通る

## テスト戦略

- 単体: storage 層のエクスポート/インポート・検証・上限の境界値
- 統合: options UI の deps 注入型テスト(window.confirm・message 通知・render() 再描画で壊れないこと)
- 手動: 設定ページでの実際の出し入れ

## 見積もり

- 0.25人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(tests/storage.test.ts 16 ケース+tests/options/transfer-section.test.ts 10 ケースでエクスポート警告・検証と上限・不正 JSON で storage 不変を機械的に守る)
- [ ] コードレビュー完了
- [x] `make check` が通る
