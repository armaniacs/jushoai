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
- [x] 全BDDシナリオが確認手順として実施済み（シナリオ 1 は SECURITY.md の導線と応答日数、非公開報告の有効化済み。シナリオ 2 は Issue テンプレートの案内。ログアウト時のフォーム到達は下の実装記録に確認結果を追記）
- [x] コードレビュー完了（Task 1 レビュー Approved・指摘なし。GitHub PR での approve はユーザー作業）
- [x] ドキュメント更新済み（SECURITY.md・Issue テンプレート・サイト安全ガイド ja/en が本 PBI の成果物）

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`SECURITY.md` 不在を `ls` で確認

## 実装記録

- SECURITY.md、Issue テンプレートの案内、サイト安全ガイド (ja/en) の報告方法の段落を追加。`make site` と `tests/site` は緑。
- ユーザー作業は完了（2026-11-24）: private vulnerability reporting を有効化。応答目安の日数（受付 7 日、方針 30 日）は現行どおりで確定。
- ログアウト時の到達確認（2026-11-27）: `https://github.com/armaniacs/jushoai/security/advisories/new` にログアウト状態でアクセスすると `github.com/login?return_to=.../security/advisories/new` へ 302 する。GitHub の標準の認証フローで、サインイン後にフォームへ到達する。SECURITY.md の導線から報告者はこの経路でフォームに至るため、確認済みとして扱う。
