# プロファイル・住所のエクスポート/インポート 設計書

プロファイル（最大 10 件）と住所を 1 つの JSON ファイルに書き出し/読み込みできるようにする。Firefox の一時的なアドオンは終了とともにデータが消え、README が「使うたびに読み込み直して、登録し直す」を公式手順として案内している（README.md:22）。分類・注入・承認の基本設計は `2026-10-03-jushoai-design.md`、プロファイルと上限は `2026-10-05-profiles-design.md` に従い、この文書はエクスポート/インポートの変更点だけを定める。PBI は `pbi/2026-10-21-117-feat-profile-export-import.md`。

## 目的とスコープ

- 登録済みのプロファイル（14 欄）と住所（16 欄）を、ブラウザを閉じる前に 1 つの JSON ファイルへ退避できるようにする
- 退避したファイルを、同じ端末でも別の端末でも読み込んで復元できるようにする

### 含める

- `src/transfer.ts` にエクスポート/インポート関数を新設する（chrome.storage の読み書きは既存の `loadData`/`saveData` を使う）
- エクスポート: `StoredData` の `profiles` と `addresses` をそのまま JSON 化する
- インポート: パース、形検査、既定値の補完、正規化、検証、上限検査、保存の順で行う
- 設定ページの「プロファイル」ページの末尾に、mount-once の節としてエクスポート/インポートの fieldset を置く
- エクスポート前の警告（平文の個人情報）とインポート前の確認（上書きと追加の扱い）
- 収集上限 `MAX_ITEMS` を `src/core/collection.ts` に移し、`options/dom.ts` から再エクスポートする（UI と取り込み経路が同じ値を見る）

### 含めない

- クラウド同期・サーバー・`chrome.storage.sync`（NOT-TODO 3）
- AI API キーと暗号化キーの移行（`src/ai/secret-store.ts` の AES-GCM 非抽出鍵はエクスポート不可。移行先で復号不能でも既存経路が「未設定」として扱うため追加実装はない）
- プロファイル・住所の並べ替え、CSV など JSON 以外の形式
- インポートの差分取り消し（アンドゥ）

## 現状と原因

- データの退避手段がなく、Firefox の一時的なアドオンでは終了とともに `jushoai:data` も暗号化キーも消える。README は再入力を公式手順として案内している
- `saveData`（storage.ts:198）には上限の検証がなく、上限 `MAX_ITEMS` は設定ページの UI 層（`options/dom.ts:9`）だけが知っている。インポートは上限を自分で検査する必要がある
- 手動の退避（DevTools での値の書き写し）は 14 欄 × 10 件の再入力であり、運用として成立しない

## アーキテクチャ

```
設定ページ（エクスポート/インポート節）
  ├─ エクスポート: loadData() → { profiles, addresses } → JSON（jushoai-profiles.json）
  │    └─ saveTextFile（Blob + a.download）── 警告（window.confirm）の後
  └─ インポート: window.confirm → FileReader → JSON 文字列
       └─ importTransferFile(json)
            ├─ JSON.parse（壊れていれば拒否）
            ├─ 形検査（profiles/addresses が配列）
            ├─ migrateData で既定値補完と id 付与（欠損欄は load 境界と同じ扱い）
            ├─ normalizeProfile / normalizeAddress で正規化
            ├─ validateProfile / validateAddress（違反は全件拒否）
            ├─ 上限 10 件（既存 storage と id 単位マージ後の件数で検査）
            └─ saveData（id 単位マージ・additive）→ 取り込み件数を通知
```

chrome.storage.local のキー `jushoai:data`、`loadData`/`saveData`/`mergeById` の構造は無改変。`jushoai:last` も触れない。

## エクスポート

- **内容**: `loadData()` の結果のうち `profiles` と `addresses` のみ。`jushoai:last` は含めない（移行先では `profiles[0]` から開始する既存の初期化に従う）
- **ファイル名**: `jushoai-profiles.json`（固定。住所を含むが、保存データ一式の意味でこの名前に統一する）
- **形式**: `JSON.stringify({ profiles, addresses }, null, 2)`。MIME は `application/json;charset=utf-8`（`saveTextFile` に既定値付きの引数を追加して流用する）
- **検証しない**: 書き出すのは storage に実際にある値。読み出し境界で型矯正済みのため、追加の検証はしない
- **警告**: ボタン押下で `window.confirm` を出し、承認したときだけファイルを書き出す
  「エクスポートするファイルには、登録済みのプロファイルと住所が平文の個人情報として含まれます。ファイルの取り扱いには注意してください。書き出しますか？」

## インポート

**検証順序**（どれか 1 か所でも違反があれば保存しない。全か無か）:

1. **パース**: `JSON.parse` が失敗したら拒否
2. **形検査**: トップレベルがオブジェクトで、`profiles` と `addresses` がともに配列であること。両方の配列が空なら拒否（空のファイルは誤って選んだ可能性が高い）
3. **既定値の補完と id 付与**: `migrateData({ profiles, addresses })` を再利用する（`coerceStrings` 相当。文字列でない欄は既定値に戻り、オブジェクトでない項目は落ち、id が無い項目には内容から決定的な `mig-` id が付く）。レガシー `profile` キーは明示的に作り直した引数に入らないため取り込まれない
4. **正規化**: `normalizeProfile` / `normalizeAddress`（`1990/5/7` → `1990-05-07`、ふりがなのカタカナ化、半角化など。保存経路と同じ整形を検証の前に通す）
5. **検証**: `validateProfile` / `validateAddress`。1 件でも違反があれば全件拒否し、違反一覧を `ul.errors` で通知する
6. **上限**: 既存 storage と id 単位マージした後の件数で、プロファイルと住所それぞれ 10 件を超えたら拒否（既存 10 件に同じ id で更新をかける取り込みは 10 件のままなので許可）
7. **保存**: `saveData`（既存の id 単位マージ・additive）。同一 id は上書き、新 id は追加。全置換はしない

- **確認**: ファイル選択の後、`window.confirm` で「同じ ID は上書き、新しい ID は追加」を伝えてから読み込む
- **id の扱い**: id が無い項目は内容から決定的な id をもらうため、同じファイルの再取り込みは追加ではなく更新になる（二重取り込みで増えない）
- **住所の所有者**: ファイル内に存在しない `profileId` を持つ住所は、load 境界と同じく共通住所（`profileId: ''`）に落とす
- **取り込み後の再描画**: インポートは storage を直接書くため、開いているページのカードは取り込み直後に古くなる。節は取り込み成功時に `onImported` を呼び、`main.ts` が `loadData` から読み直して描画する（入力中の未保存の内容は破棄される）

## UI

- **置き場所**: 「プロファイル」ページ（`#app`）の末尾。`render()` は節単位で `replaceChildren` するため、エクスポート/インポートの節は起動時に 1 回だけ mount し、`render()` は同じ holder 要素を再 append する（監査・除外節と同じ mount-once 流儀。節の要素とその中の通知は再描画で壊れない）
- **部品**: `el` / `actionButton`（dom.ts）、ファイル出力は `saveTextFile`（audit-section.ts）を流用
- **ファイル入力は新設**: `input type=file` + `FileReader`。ダイアログと読み込みは deps（`pickFile` / `readFile`）として注入し、テストではスタブする
- **通知**: 成功は `p.saved`、失敗は `ul.errors`（`message()` と同じ形）。節内に保持し、`render()` の再描画でも消えない
- **文言**: 節の説明に「平文の個人情報が含まれる」「Firefox の一時的なアドオンでは終了とともに消える」「id 単位のマージと上限 10 件」を明記する

## テスト

- **storage・transfer 層**（`tests/storage.test.ts`、`vi.stubGlobal('chrome', ...)` パターン）: 出し入れ往復、`jushoai:last` を含まないこと、壊れた JSON、形状違反、検証違反（全件拒否で storage 変化なし）、上限超過（拒否）と上限ちょうど（同 id 更新は許可）、欠損欄の既定値補完、id 無し項目の決定的 id と再取り込みの冪等、所有者不明住所の共通化、空ファイルの拒否、保存失敗の型付きエラー
- **設定ページ UI**（`tests/options/transfer-section.test.ts`、deps 注入）: 警告を承認しないと書き出さない、承認で `save` にファイル名と JSON が渡る、読み込み失敗の通知、確認を承認しないとファイルを読まない、取り込み成功で件数通知と `onImported`、検証違反でエラー通知と `onImported` 無し、ファイル選択のキャンセルで何もしない、holder の再 append 後も節が壊れないこと
- 既存テストの期待値は変更しない（`MAX_ITEMS` は dom.ts から再エクスポートされ、`tests/options/item-limit.test.ts` はそのまま通る）

## 完了判定

1. `npx vitest run tests/storage.test.ts tests/options/ tests/core/` と `make typecheck` が緑
2. 設定ページでの目視確認:
   - エクスポート: 警告の承認後に `jushoai-profiles.json` がダウンロードされ、中身が `profiles` と `addresses` のみ
   - インポート: 確認の承認後に一覧へ反映され、同じ id は更新、新しい id は追加される
   - 検証違反・上限超過・壊れた JSON はエラー通知のみで storage が変わらない
   - Firefox の一時的なアドオンで、書き出し → 終了 → 再読み込み → インポートでデータが復元される

## 要検討（スコープ外として記録）

- **形式の版管理（version 項目）**: 現在は `profiles`/`addresses` のみ。将来の形式変更で version 項目の追加を検討する
- **削除の扱い（tombstone）**: マージは additive のため、ファイルに無い既存データは消えない。全置換・削除込みの移行は別 PBI
- **上限の競合**: 上限検査と保存の間に他コンテキストが書き込むと一時的に 10 件を超え得る（saveData のマージが保証する範囲と同じ）
- **クラウド同期・サーバー・chrome.storage.sync**: NOT-TODO 3 のまま。API キー・暗号化キーの移行もしない
