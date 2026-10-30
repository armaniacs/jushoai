# PBI: プライバシー記事に DNS rebinding の注意書きを足す

## ユーザーストーリー
プライバシー記事（docs/blog/04-for-users-privacy-design.md）を読む利用者として、「接続先も検査している」節に DNS rebinding の限界の注意書きがほしい、なぜなら 同じ正直な注意書きが privacy.md・safety.md のガイドにはあるのに、そのガイドへリンクしている記事側に無く、記事だけ読むと接続先の検査について過大な安心感を与えるから

## 優先度
- 順位: 2 / 6
- RICEスコア: 50（Reach=2 / Impact=0.5 / Confidence=100% / Effort=0.02人週）
- 根拠: ガイド（privacy.md:32・safety.md:49）にある正直な注意書きが、そのガイドへリンクしている記事側に無い。記事の軸は「送らない設計の正確な説明」で、ガイドより過大な安心感を与えないための 1 文。同点の 206 と同時に 1 コミットで

## 出どころ
- site/content/ja/privacy.md:32: 「検証と実際の接続は別々の名前解決であるため、その間に解決結果が変わる（DNS rebinding）場合を完全には排除できません。」（正規の文言）
- site/content/ja/safety.md:49: 同じ注意書き。「この点は /guides/privacy/ にも書いています」のリンク付き
- docs/blog/04-for-users-privacy-design.md:36-38: 「接続先も検査している」節。保存時の解決先検査、呼び出し直前の再確認、呼び出しごとに取り直す点は書いているが、DNS rebinding の限界には触れていない
- docs/blog/04-for-users-privacy-design.md:46: 記事の最終行で両ガイド（/guides/safety/・/guides/privacy/）へリンクしている

## BDD受け入れシナリオ
Scenario: 記事の注意書きがガイドと一致する
  Given docs/blog/04-for-users-privacy-design.md の「接続先も検査している」節（:36-38）
  When 節の段落に注意書きを 1 文追加する
  Then 追加された文は、検証と実際の接続が別々の名前解決であるため、その間に解決結果が変わる（DNS rebinding）場合を完全には排除できない旨を述べ、privacy.md:32・safety.md:49 と矛盾しない文言になっている

Scenario: 中央の主張が弱まらない
  Given 記事全体（タイトルから最終行のガイドへのリンクまで）
  When 「接続先も検査している」節に注意書き 1 文を追加する
  Then 変更はこの 1 文だけに留まり、「プロファイルに登録した氏名や住所をどこにも送りません」という記事の軸（:5）とまとめ（:42-44）、最終行のガイドへのリンク（:46）は変更されない

## 受け入れ基準
- [ ] 「接続先も検査している」節に DNS rebinding の注意書きが 1 文追加されている
- [ ] 追加文言は privacy.md:32・safety.md:49 と整合する（決定した文言は実装時に両ガイドに照らして確定する）
- [ ] 変更はこの 1 文だけ。記事の他の節・まとめ・リンクは変更しない
- [ ] 記事の中央の主張（プロファイルの値を送らない設計の説明）は弱めていない
- [ ] docs-charset チェックを通す（CP932 で表現できる文字だけ。U+2014 は使わない）

## 実装手順
- docs/blog/04-for-users-privacy-design.md の「接続先も検査している」節（:38）の段落末尾に、注意書きを 1 文追加する
- 文例: 「ただし、検証と実際の接続は別々の名前解決であるため、その間に解決結果が変わる（DNS rebinding）場合を完全には排除できません。」（privacy.md:32 の鏡像。確定文言は実装時に privacy.md・safety.md に整合させる。サイト側の privacy.md・safety.md は本 PBI では変更しない）
- python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py で文字種を検証する

## テスト戦略
- 検証: docs-charset チェック + privacy.md/safety.md との文言照合

## 見積もり
0.02（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
