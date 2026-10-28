# video

Chrome ウェブストア用のプロモーション動画（約 2 分、1920x1080、30fps、H.264）を作る一式。Playwright で操作を録画し、Remotion で字幕・拡大・早送り・音楽をつけて書き出す。台本と音楽の出典は [docs/store-listing.md](../docs/store-listing.md)。

## 構成

```
video/
├── playwright/
│   ├── setup-ai.mjs    # AI の録画用ブラウザプロファイルを作る（Gemini のキーを、設定ページから保存する）
│   ├── record.mjs      # ルールだけの 3 ページ（a / b / c）を録画する
│   ├── record-ai.mjs   # 設定画面（s）と AI のデモ（d）を録画する
│   └── record-drag.mjs # ボタンのドラッグ（drag）を録画する。samples/ と tests/e2e/pages/ を自前の配信（127.0.0.1:4181）で出すため、別ターミナルは要らない
└── remotion/
    ├── src/clips.json      # record.mjs が書く、各クリップの時刻（秒）
    ├── src/clips-ai.json   # record-ai.mjs が書く、各クリップの時刻（秒）
    ├── src/clips-drag.json # record-drag.mjs が書く、ドラッグのクリップの時刻（秒）
    ├── src/timeline.ts     # 場面の順序、字幕の文言、拡大、早送り
    ├── src/timeline-drag.ts # ドラッグ動画の場面と字幕（Promo の部品を再利用）
    ├── src/DragDemo.tsx    # ドラッグ動画の描画（Intro → デモ → 終幕、短い BGM）
    ├── src/Promo.tsx       # 映像の描画、音楽
    ├── render.mjs          # video/output/promo.mp4 に書き出す
    └── render-drag.mjs     # video/output/drag-demo.mp4 に書き出す
```

録画（`remotion/public/*.webm`）、音楽（`remotion/public/bgm.mp3`）、録画用のブラウザプロファイルと拡張機能のコピー（`playwright/.work/`、`ext/`）、書き出した動画（`output/`）は、リポジトリに含めない。音楽は、YouTube オーディオライブラリの曲で、音楽ファイルを単体で配信できない。

## 準備

```bash
cd video/remotion
npm install
```

ルートで `make build` を済ませておく（録画する拡張機能は、`dist/chrome-mv3`）。

## 字幕だけを直して書き出す

録画（`remotion/public/*.webm`）と音楽（`bgm.mp3`）が手元にあれば、再録画は要らない。

1. `remotion/src/timeline.ts` の字幕の文言を直す。
2. 書き出す。

```bash
cd video/remotion
npm run render   # → video/output/promo.mp4
```

## ドラッグの説明動画（v0.1.28 から）

ボタンをドラッグで移動できることを説明する、約 20 秒の動画。導入・デモ・終幕の 3 場面で、日本語字幕付き。

```bash
node video/playwright/record-drag.mjs   # → remotion/public/clip-drag.webm と src/clips-drag.json
cd video/remotion && npm run render-drag # → video/output/drag-demo.mp4
```

- 録画は headless のフル Chromium（channel: 'chromium'）で行う。headless shell では拡張機能が動かないため、`record.mjs` の `headless: false` は使わない
- デモページは `tests/e2e/pages/two-column-form.html`（PBI-161 の再現配置）。ボタンをつかんで移動し、離したあとに押してプレビューが開くまでを録る
- 字幕の文言は `remotion/src/timeline-drag.ts`、描画は `remotion/src/DragDemo.tsx`（`Promo.tsx` の Intro・Demo・Info を再利用）。BGM は `bgm.mp3` を 1 回だけ流す

## 録画し直す

録画は、デモページを `http://127.0.0.1:4180/` から配信して行う（`file://` では、拡張機能のコンテンツスクリプトが動かない）。別のターミナルで、先に起動しておく。

```bash
cd samples && python3 -m http.server 4180 --bind 127.0.0.1
```

ルールだけの 3 ページ（API キーは使わない）:

```bash
node video/playwright/record.mjs
```

AI の場面は、Gemini のキーを使う。キーは、環境変数 `GEMINI_API_KEY` から読み、設定ページ経由で、拡張機能が暗号化して保存する。画面にも出力にも出さない。

```bash
node video/playwright/setup-ai.mjs           # プロファイルを作り直し、接続テストまで行う
node video/playwright/record-ai.mjs          # 設定画面（s）と AI のデモ（d）
ONLY=d node video/playwright/record-ai.mjs   # AI のデモだけ録り直す
```

- `setup-ai.mjs` が、`ext/` に拡張機能のコピーを作る。コピーのマニフェストにだけ、Gemini のホスト権限を足す（設定ページの許可ダイアログは、自動操作では押せないため）。製品のマニフェストは変えない。
- モデルは、`setup-ai.mjs` の `MODEL`（現在 `gemini-3.5-flash`）。応答が 20 秒を超えると、拡張機能が待つのをやめて、AI の判定なしのプレビューを出すので、応答が数秒で安定するモデルを選ぶ。
- 録画が終わると、`clips.json` と `clips-ai.json` の時刻が更新される。字幕・拡大・早送りは、この時刻に合わせて動く。

## 録画の仕組み

- カーソルの矢印とクリックの波紋は、録画に映らないので、ページに重ねて描く（`record.mjs` の `CURSOR_SCRIPT`）。
- 拡張機能のボタンは、closed の Shadow DOM の中にあるので、CDP の `DOM.getDocument`（`pierce: true`）で位置を探して、座標でクリックする。
- AI のデモは、応答を待つ時間が毎回違う。`timeline.ts` が、3 秒を超える待ち時間を 8 倍速で飛ばす。
