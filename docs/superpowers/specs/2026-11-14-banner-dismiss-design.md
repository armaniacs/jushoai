# バナー非表示と起動しないURL一発登録の設計

## 目的と背景

- フォーム検出で出す青バナー「JushoAIで入力」が資料共有やプレゼン中に邪魔になる
- 設定画面の「起動しないURL」はあるが、邪魔な瞬間に登録できない
- その場で消す手段と、永続除外への短い導線を足す

## 合意済み事項

- Xボタンの見た目: バナー右上に重ねる半透明の丸ボタン(案A)
- Xの効果範囲: 押したバナーのみ、このタブのリロードまで(メモリのみ)
- 登録単位: その場で「このページだけ」と「この配下全体」から選ぶ
- 導線: X押下後に即ダイアログを出す(トーストなしの案B)
- 対象: マルチバナー時も押した分だけ隠す。全バナー一括ではない

## アーキテクチャ

- 永続除外は従来どおり `chrome.storage.local` のリストが正とする
- 一時非表示はタブ内メモリだけに置き、保存・送信・監査ログに残さない
- 既存の除外ゲート(`createExclusionGate` + `storage.onChanged` + `gate.refresh`)は変えない。登録側が同じ保存関数を通すだけにする
- `core/` は純粋関数のままにする。URL候補の組み立てだけを `core/` に足し、DOM操作と保存は `content/` と `ui/` に寄せる

## コンポーネント

- `src/ui/button.ts`
  - `mountButton` に `onDismiss` を追加する
  - Xは `button` 要素にし、`aria-label` で「このボタンを隠す」と読ませる
  - ドラッグ後の誤クリック抑止(`suppressClick`)をXにも流用する
  - 普段は半透明、ホバーとフォーカスで濃くする
- `src/ui/dismiss-dialog.ts`(新規、Shadow DOM)
  - 非表示直後に同じ隅に出す小さなダイアログ
  - 選択肢はラジオ2択(このページだけ/この配下全体)+ [登録する] + [今回だけ閉じる] + [元に戻す]
  - ページ由来の文字列は `textContent` で入れ、`innerHTML` を使わない
- `src/content/dismiss-memory.ts`(新規、タブメモリ)
  - 隠したコンテナの集合を持つ。リロードで消える
  - `sync()` が `detectForms` の結果から集合分を引いてマウントしない
  - 永続除外の `stop()` とは混ぜない
- `src/core/exclusion-prefix.ts`(新規、純関数)
  - 入力: 現在の URL 文字列
  - 出力: exact 候補と prefix 候補
  - exact は `normalizeExclusionEntry` を通す
  - prefix は origin + 先頭パス1段 + `/` とする。パスがなければ origin + `/` とする
  - 例: `https://docs.google.com/presentation/d/xxx/edit` の prefix は `https://docs.google.com/presentation/`

## データの流れ

1. Xを押すと `dismiss-memory` に追加し、対応するハンドルを破棄してダイアログを開く
2. 「今回だけ」はダイアログを閉じるだけで終わる
3. 「登録」は `loadExcludedUrls` で読んで `addExclusionEntry` で足し、`saveExcludedUrls` で保存する
4. 保存後は既存の `storage.onChanged` 経路で各タブの `gate.refresh()` が走り、開いたままの頁でも反映される
5. 「元に戻す」は集合から外して `sync()` を再実行する

## エラー処理

- 上限100件、形式不正、重複は `addExclusionEntry` の reason をそのまま出す。新規文言は作らない
- 保存失敗はダイアログ内に「保存に失敗しました」と出し、隠した状態は維持する。リロードで復活するので詰まない
- 拡張の更新直後などのコンテキスト無効化は既存の `isContextInvalidated` 流用で再読み込み案内にする

## テスト

- 単体
  - prefix 導出: スライド URL、クエリ付き、ルート直下、http の扱い
  - `dismiss-memory`: 追加、元に戻す、別コンテナに波及しないこと
  - 重複登録時に既存 reason が維持されること
- 結合
  - 登録後に `isExcludedUrl` が真になり、`sync()` がマウントしないこと
  - 保存失敗時にダイアログが閉じずに理由が見えること
- 手動
  - サンプルフォームで X、リロード復活、設定画面の起動しないURLへの追記を確認する

## 対象外

- ページ内全バナーの一括非表示はしない
- リロード後も残る一時非表示はしない
- prefix の段数選択や正規表現の登録はしない

## 制約

- 一時非表示は Element の同一性で覚える。枠組みが作り直したフォームは再表示されうる
- 外れたノードはタブの寿命まで残る。リロードで消える
