# PBI: dev ツールチェーンの既知 CVE を追跡し、破壊的でない解消を評価する

状態: 評価完了（shell-quote は overrides で解消・node-forge は修正版リリースが存在せず追跡継続。`make check` green。`npm audit fix --force` 不使用）

## 評価結果（2026-10-10 実施）

- 依存経路（`npm ls node-forge shell-quote`）:
  - `web-ext@10.7.0 → @devicefarmer/adbkit@3.3.9 → node-forge@1.4.0`
  - `web-ext@10.7.0 → fx-runner@1.6.0 → shell-quote@1.10.0`
- shell-quote（GHSA-pqg4-j6r4-53mv, critical）: 修正版 1.11.0 / 1.12.0 が存在。`package.json` の `overrides` で `^1.12.0` に固定し、`npm audit` の該当警告が消えたことを確認。`npm install` の peer dependency 警告なし
- node-forge（GHSA-86w9-cpqp-85rv, high）: 脆弱範囲が `*`（全バージョン）で、最新の 1.4.0 も該当。修正版リリースが存在しないため overrides では解消不可。残存は 4 high（すべてこのチェーン）
- wxt 上流の追跡（github.com/wxt-dev/wxt main, 0.21.4）: peer `web-ext >=9.2.0`（optional）、dev `^10.5.0` で web-ext 10.x を維持。node-forge / shell-quote チェーンからの移行は未実施。npm audit の提示する web-ext 5.1.0 へのダウングレードは peer 範囲外で衝突するため不採用
- 再検討トリガー: (1) node-forge が修正版をリリースしたとき、(2) wxt の web-ext 依存が adbkit / fx-runner を含まない形に更新されたとき。該当のいずれかが起きたら `npm audit` で再確認し overrides または更新を適用する
- `npm audit` の現状: 4 high（node-forge チェーンのみ、dev のみ・出荷コードへの露出なし）

## ユーザーストーリー
このリポジトリで開発する開発者として、npm audit が報告する dev 依存の既知脆弱性が追跡・評価されている状態になってほしい、なぜなら `npm audit fix --force` のような破壊的な対処でビルドツールチェーンを壊すことなく、安全な版固定で解消できるかどうかを根拠付きで判断したいから

## 優先度
- 順位: 7 / 7
- RICE スコア: 0.25（Reach=1 / Impact=0.25 / Confidence=100% / Effort=1pt）
- 根拠: VulnHunter 監査（`JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase3d_output.md`、dev tooling は DEV-ONLY 判定）と npm audit 実行結果（2026-10-10）。指摘 6 件（3 high, 3 critical）はすべて dev 依存チェーン内で、node-forge と shell-quote はビルドツール（web-ext / fx-runner / @devicefarmer/adbkit、wxt のビルドツールチェーン）の推移依存であり、拡張機能には出荷されない（`wxt.config.ts` の `zip.excludeSources`、`scripts/` と `video/` も出荷外）。実害がないため Impact は最低位だが、放置すると audit 警告が積み上がって真正の脅威の検出が鈍るため、評価と追跡だけでも行う

## 背景
- 出典: VulnHunter 監査の README が npm audit での確認を推奨。実際に `npm audit` を実行したところ 6 件（3 high, 3 critical）が報告され、すべて dev チェーン内で出荷コードへの露出はない
- 主要な 2 件:
  - node-forge: GHSA-86w9-cpqp-85rv（high）— web-ext / fx-runner 経由の推移依存
  - shell-quote: GHSA-pqg4-j6r4-53mv（critical）— web-ext / @devicefarmer/adbkit 経由の推移依存
- `package.json` の devDependencies は `web-ext ^10.7.0` と `wxt ^0.21.4`。wxt は web-ext に依存しており、両者のバージョン整合がビルドの前提になっている
- 制約: `npm audit fix --force` は使わない。web-ext を 5.1.0 にダウングレードする破壊的変更で、wxt >= 0.21.1 が要求する web-ext と衝突する
- 制約: 解消の可否にかかわらず `make check`（typecheck + test + 両ブラウザの build + manifest 検査 + web-ext lint）を green に保つ

## BDD受け入れシナリオ
Scenario: overrides で node-forge を安全な版に固定できる
  Given package.json の overrides に GHSA-86w9-cpqp-85rv の修正版以上の node-forge を追加する
  When npm install を実行してから make check を実行する
  Then npm audit の node-forge 警告が消え、make check が green になる

Scenario: overrides で shell-quote を安全な版に固定できる
  Given package.json の overrides に GHSA-pqg4-j6r4-53mv の修正版以上の shell-quote を追加する
  When npm install を実行してから make check を実行する
  Then npm audit の shell-quote 警告が消え、make check が green になる

Scenario: 互換性がない場合は現状維持を記録して元に戻す
  Given 追加した overrides が wxt のビルドチェーンを壊して make check が red になる
  When overrides を package.json から取り除いて npm install し直す
  Then make check が green に戻り、失敗の理由と wxt 上流の web-ext 更新状況が本 PBI に記録される

Scenario: wxt 上流の web-ext 更新状況が記録される
  Given wxt の上流リポジトリを確認する
  When web-ext 依存の更新（issue / PR / changelog）を調べる
  Then 更新の有無と見込みが本 PBI に記録される

## 受け入れ基準
- [x] `npm ls node-forge shell-quote` で依存経路（web-ext / fx-runner / @devicefarmer/adbkit）と現在の版が記録されている
- [x] wxt の上流で web-ext が更新されるかどうか（issue / PR / changelog）を追跡し、結果が本 PBI に記録されている
- [x] package.json の overrides で node-forge を安全な版に固定する検証が行われている（修正版リリースが存在しないため固定不可と記録）
- [x] package.json の overrides で shell-quote を安全な版に固定する検証が行われている（^1.12.0 を適用）
- [x] 解消できた場合は npm audit の該当警告（node-forge / shell-quote）が消えている（shell-quote は消えた。node-forge は解消不可で残存 4 high）
- [x] 解消できない場合は理由、上流追跡の結果、再検討トリガー（wxt の web-ext 更新版）が本 PBI に記録されている
- [x] `make check` が green のまま（overrides の適用後。exit=0）
- [x] `npm audit fix --force` を使っていない

## テスト戦略（t_wadaスタイル）
この PBI はプロダクトコード・テストの追加をしない（dev ツールチェーンの検証タスク）。検証は npm audit / npm ls と make check で行う。検証手順:

1. `npm audit` を実行し、現状の 6 件（3 high, 3 critical）の警告一覧を記録する
2. `npm ls node-forge shell-quote` を実行し、依存経路とインストール済みの版を記録する
3. package.json に `overrides` を追加して `npm install` し、`npm audit` で node-forge と shell-quote の該当警告が消えたことを確認する
4. `make check`（typecheck + test + 両ブラウザの build + manifest 検査 + web-ext lint）が通ることを確認する。ここで red になる場合は手順 5 へ
5. overrides を取り除いて `npm install` し直し、`make check` が green に戻ることを確認した上で、失敗理由と wxt 上流の追跡結果を本 PBI に記録する

## 実装者向け注記
### 現状の確認
- `package.json` の devDependencies: `web-ext ^10.7.0`、`wxt ^0.21.4`。`lint:firefox` で `web-ext lint --source-dir dist/firefox-mv3` を実行しており、web-ext はビルド後の lint に直接使われている
- npm audit（2026-10-10）: 6 件（3 high, 3 critical）。node-forge は web-ext / fx-runner 経由、shell-quote は web-ext / @devicefarmer/adbkit 経由の推移依存
- 出典: `JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase3d_output.md`（dev tooling は DEV-ONLY 判定）
- node-forge と shell-quote はビルドツールチェーンのパッケージで、拡張機能には出荷されない（`wxt.config.ts` の `zip.excludeSources`、`scripts/` と `video/` も出荷外）

### 対応手順
1. `npm audit` と `npm ls node-forge shell-quote` で依存経路・版を記録する
2. wxt の上流リポジトリで web-ext 依存の更新（issue / PR / changelog）を確認し、結果を本 PBI に記録する
3. package.json に `overrides` で node-forge と shell-quote の安全な版を追加し、`npm install` する
4. `npm audit` で該当警告が消えたこと、`make check` が green であることを確認する
5. 互換性問題が出た場合は overrides を取り除き、`make check` が green に戻ることを確認した上で、追跡結果と再検討トリガー（wxt の web-ext 更新版）を記録する

### 落とし穴
- `npm audit fix --force` を使わない: web-ext 5.1.0 へのダウングレードは wxt >= 0.21.1 が要求する web-ext と衝突し、ビルドツールチェーンが壊れる
- overrides は package-lock.json も更新する: コミットする場合は package.json と package-lock.json を個別に add する（`git add -A` は使わない）
- web-ext lint（make check 内）が overrides 後に挙動を変える可能性がある: build + manifest 検査 + web-ext lint まで通ることを必ず確認する。`make test` には含まれないため `make check` で見る
- overrides で版を上げすぎると、web-ext / fx-runner / @devicefarmer/adbkit が要求する範囲から外れて npm install が警告を出すことがある。peer dependency の整合が崩れていないか npm install の出力を確認する
- セキュリティ対応に見えるが実害はない（出荷コードへの露出なし）。優先度は最低位であり、`make check` を壊してまで即時解消する必要はない

## 見積もり
1pt（要チームでの見積もり）

## Definition of Done
- [x] wxt 上流での web-ext 更新状況の追跡結果が本 PBI に記録されている
- [x] node-forge / shell-quote の overrides 検証が完了し、解消可否と理由が記録されている（解消の場合は npm audit の該当警告が消えている）
- [x] `make check` が green で、`npm audit fix --force` を使っていない
