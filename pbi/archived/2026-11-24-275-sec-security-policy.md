# PBI: 脆弱性の報告窓口と対応方針を公開する

## ユーザーストーリー
拡張の脆弱性を見つけた研究者として、非公開で報告できる窓口と対応の目安を知りたい、なぜなら公開 Issue に書くと修正前に悪用手順が広まるから

## 区分
セキュリティ / 1.0 必須

## 優先度
- 順位: 1 / 17
- RICEスコア: 1000 (Reach=100 / Impact=1 / Confidence=100% / Effort=0.1人週)
- 根拠: 現状 `SECURITY.md` が無く、Issue フォームは公開のみ。`<all_urls>` の content script と API キーを扱う拡張で、報告経路が公開 Issue しかないのは正式版として欠落。工数が極小で依存なし

## BDD受け入れシナリオ

```gherkin
Scenario: 研究者が非公開で報告できる
  Given 研究者がリポジトリを開く
  When  Security タブまたは SECURITY.md を見る
  Then  GitHub の非公開脆弱性報告 (private vulnerability reporting) の導線がある
  And   受付から初回応答までの目安日数が書かれている

Scenario: 公開 Issue に脆弱性を書こうとした人を止める
  Given 利用者が不具合 Issue のフォームを開く
  When  フォームの冒頭を読む
  Then  セキュリティ上の問題は公開 Issue ではなく非公開報告へ、という案内がある
```

## 受け入れ基準
- [x] ルートに `SECURITY.md` がある（対象バージョン、報告方法、応答目安、公開までの流れ、対象外の例）
- [x] リポジトリ設定で private vulnerability reporting が有効（ユーザー作業。2026-11-24 に有効化済みとユーザーが報告）
- [x] `.github/ISSUE_TEMPLATE/config.yml` と bug-report フォームに非公開報告への案内がある
- [x] サイトの安全ガイド (ja/en) から SECURITY.md へのリンクがあり、`make site` が緑
- [x] 対象外の例に「ページ自身が悪意ある label を出す場合の AI 送信内容」など、既知の設計上の限界を明記する

## テスト戦略
- E2E: なし
- 統合: `make site` の日英リンク検査
- 単体: なし（文書）

## 見積もり
0.1人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが確認手順として実施済み
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`SECURITY.md` 不在を `ls` で確認

## 実装記録

- SECURITY.md、Issue テンプレートの案内、サイト安全ガイド (ja/en) の報告方法の段落を追加。`make site` と `tests/site` は緑。
- ユーザー作業は完了（2026-11-24）: private vulnerability reporting を有効化。応答目安の日数（受付 7 日、方針 30 日）は現行どおりで確定。
- 未確認: 報告フォーム（`/security/advisories/new`）がログアウト状態で開くことの確認は、記録していない。
