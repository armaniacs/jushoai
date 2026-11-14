# 起動しないURL一発登録 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** X直後のダイアログで「このページだけ」と「この配下全体」を選んで起動しないURLへ登録する。

**Architecture:** 候補生成は `core/` の純関数にし、保存は既存の `loadExcludedUrls` と `addExclusionEntry` と `saveExcludedUrls` を通す。新規の理由文は作らず、反映は既存の `storage.onChanged` と `gate.refresh()` に任せる。

**Tech Stack:** WXT + TypeScript + Vitest (jsdom)。

**前提:** 先に `docs/superpowers/plans/2026-11-14-banner-dismiss.md` が実装済みであること。ダイアログに登録欄を足す形で拡張する。

---

## File Structure

- Create: `src/core/exclusion-prefix.ts` - 現在URLから exact 候補と prefix 候補を作る純関数。
- Test: `tests/core/exclusion-prefix.test.ts` - スライドURL、クエリ付き、ルート直下の単体テスト。
- Modify: `src/ui/dismiss-dialog.ts` - 登録欄(ラジオ2択と登録ボタン)の追加。保存失敗文の表示口の追加。
- Test: `tests/ui/dismiss-dialog.test.ts` - 登録選択と失敗表示のテストを追加する。
- Modify: `src/entrypoints/content.ts` - ダイアログ呼び出し口に登録処理を接続する。

---

### Task 1: 候補生成の純関数

**Files:**
- Create: `src/core/exclusion-prefix.ts`
- Test: `tests/core/exclusion-prefix.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildExclusionCandidates } from '../../src/core/exclusion-prefix';

describe('buildExclusionCandidates', () => {
  it('スライドURLから2候補を作る', () => {
    const result = buildExclusionCandidates('https://docs.google.com/presentation/d/abc/edit');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exact).toBe('https://docs.google.com/presentation/d/abc/edit');
    expect(result.prefix).toBe('https://docs.google.com/presentation/');
  });

  it('クエリとハッシュは exact に残し prefix からは落とす', () => {
    const result = buildExclusionCandidates('https://example.com/form?a=1#top');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.prefix).toBe('https://example.com/form/');
  });

  it('ルート直下は origin だけになる', () => {
    const result = buildExclusionCandidates('https://example.com');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.prefix).toBe('https://example.com/');
  });

  it('http 以外は既存の理由で失敗する', () => {
    const result = buildExclusionCandidates('chrome://extensions');
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/exclusion-prefix.test.ts`
Expected: FAIL。モジュールが存在しないため。

- [ ] **Step 3: Write minimal implementation**

```ts
import { normalizeExclusionEntry } from './exclusions';

export type ExclusionCandidates =
  | { ok: true; exact: string; prefix: string }
  | { ok: false; reason: string };

export function buildExclusionCandidates(href: string): ExclusionCandidates {
  const exact = normalizeExclusionEntry(href);
  if (!exact.ok) return exact;
  let url: URL;
  try {
    url = new URL(exact.value);
  } catch {
    return { ok: false, reason: 'URL の形式が正しくありません' };
  }
  const first = url.pathname.split('/').filter((part) => part !== '')[0];
  const prefix = first ? `${url.origin}/${first}/` : `${url.origin}/`;
  return { ok: true, exact: exact.value, prefix };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/exclusion-prefix.test.ts`
Expected: 4 passed。

- [ ] **Step 5: Commit**

```bash
git add src/core/exclusion-prefix.ts tests/core/exclusion-prefix.test.ts
git commit -m "feat(core): 除外登録の候補生成を追加する"
```

---

### Task 2: ダイアログに登録欄を足す

**Files:**
- Modify: `src/ui/dismiss-dialog.ts`
- Test: `tests/ui/dismiss-dialog.test.ts`

- [ ] **Step 1: Write the failing test**

既存ファイルに次を追記する。

```ts
import { showDismissDialog } from '../../src/ui/dismiss-dialog';

describe('showDismissDialog with register', () => {
  it('選んだ候補で onRegister が走る', () => {
    const onRegister = vi.fn();
    const dialog = showDismissDialog({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      register: {
        exactLabel: 'https://example.com/form',
        prefixLabel: 'https://example.com/',
        onRegister: onRegister as (choice: 'exact' | 'prefix') => void,
      },
    });
    dialog.choose('prefix');
    dialog.submitRegister();
    expect(onRegister).toHaveBeenCalledWith('prefix');
  });

  it('失敗文を出すとダイアログが残る', () => {
    const dialog = showDismissDialog({ onClose: vi.fn(), onUndo: vi.fn() });
    dialog.showRegisterError('すでに登録されています');
    expect(document.body.contains(dialog.host)).toBe(true);
  });
});
```

`vi` の import がなければ足す。既存の2件は残す。

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/dismiss-dialog.test.ts`
Expected: FAIL。`register`、`choose`、`submitRegister`、`showRegisterError` が存在しないため。

- [ ] **Step 3: Write minimal implementation**

`DismissDialogActions` に次を足す。

```ts
export interface DismissDialogRegister {
  exactLabel: string;
  prefixLabel: string;
  onRegister: (choice: 'exact' | 'prefix') => void;
}

export interface DismissDialogActions {
  onClose: () => void;
  onUndo: () => void;
  register?: DismissDialogRegister;
}
```

ハンドルに次を足す。

```ts
export interface DismissDialogHandle {
  host: HTMLElement;
  closeOnly: () => void;
  undo: () => void;
  close: () => void;
  choose: (choice: 'exact' | 'prefix') => void;
  submitRegister: () => void;
  showRegisterError: (reason: string) => void;
}
```

`showDismissDialog` の `row` 作成後に次を足す。`register` がない場合は従来どおり登録欄を作らない。

```ts
let selected: 'exact' | 'prefix' = 'exact';
let errorBox: HTMLElement | null = null;
let exactRadio: HTMLInputElement | null = null;
let prefixRadio: HTMLInputElement | null = null;

if (actions.register) {
  const reg = actions.register;
  const makeOption = (choice: 'exact' | 'prefix', label: string): HTMLElement => {
    const line = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'jushoai-exclusion-choice';
    radio.checked = choice === selected;
    radio.addEventListener('change', () => { selected = choice; });
    const text = document.createElement('span');
    text.textContent = `${choice === 'exact' ? 'このページだけ: ' : 'この配下全体: '}${label}`;
    line.append(radio, text);
    if (choice === 'exact') exactRadio = radio;
    else prefixRadio = radio;
    return line;
  };
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = '起動しないURLに登録する';
  submit.addEventListener('click', () => { reg.onRegister(selected); });
  errorBox = document.createElement('div');
  errorBox.setAttribute('role', 'alert');
  box.append(makeOption('exact', reg.exactLabel), makeOption('prefix', reg.prefixLabel), submit, errorBox);
}
```

戻り値に次を足す。

```ts
choose: (choice) => {
  selected = choice;
  if (choice === 'exact') exactRadio?.click();
  else prefixRadio?.click();
},
submitRegister: () => { actions.register?.onRegister(selected); },
showRegisterError: (reason) => { if (errorBox) errorBox.textContent = reason; },
```

既存の `closeOnly`、`undo`、`close` は変えない。登録欄の文字列はすべて `textContent` で入れる。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/dismiss-dialog.test.ts`
Expected: 既存2件 + 新規2件の計4 passed。

Run: `make typecheck`
Expected: エラーなし。

- [ ] **Step 5: Commit**

```bash
git add src/ui/dismiss-dialog.ts tests/ui/dismiss-dialog.test.ts
git commit -m "feat(ui): 非表示ダイアログに除外登録欄を追加する"
```

---

### Task 3: content.ts に登録処理を接続する

**Files:**
- Modify: `src/entrypoints/content.ts`
- Test: `tests/core/exclusion-prefix.test.ts` と `tests/entrypoints/content-exclusions.test.ts` の回帰

- [ ] **Step 1: Confirm the regression baseline**

Run: `npx vitest run tests/entrypoints/content-exclusions.test.ts tests/core/exclusion-prefix.test.ts`
Expected: 全 PASS(現状のまま)。

- [ ] **Step 2: Implement the registration wiring**

`import` に次を足す。

```ts
import { addExclusionEntry } from '../core/exclusions';
import { buildExclusionCandidates } from '../core/exclusion-prefix';
import { loadExcludedUrls, saveExcludedUrls } from '../exclusions-store';
```

Task 4 で作った `showDismissDialog` の呼び出しを次に置き換える。`handle` と `dialog` の循環参照を避けるため `dialog` は `let` で受ける。

```ts
let dialog: { showRegisterError: (reason: string) => void; close: () => void } | null = null;
const candidates = buildExclusionCandidates(window.location.href);
dialog = showDismissDialog({
  onClose: () => {},
  onUndo: () => {
    dismissed.remove(form.container);
    schedule();
  },
  register: candidates.ok
    ? {
        exactLabel: candidates.exact,
        prefixLabel: candidates.prefix,
        onRegister: (choice) => {
          void (async () => {
            const raw = choice === 'exact' ? candidates.exact : candidates.prefix;
            const current = await loadExcludedUrls();
            const added = addExclusionEntry(current, raw);
            if (!added.ok) {
              dialog?.showRegisterError(added.reason);
              return;
            }
            try {
              await saveExcludedUrls(added.entries);
            } catch {
              dialog?.showRegisterError('保存に失敗しました');
              return;
            }
            dialog?.close();
          })();
        },
      }
    : undefined,
});
```

`candidates.ok` が偽の場合は登録欄を出さず、失敗理由は出さない(候補自体が作れない頁では登録欄なしが仕様)。保存成功後は既存の `storage.onChanged` 経路で `gate.refresh()` が走るため、ここで直接 `refresh()` は呼ばない。

- [ ] **Step 3: Run tests to verify**

Run: `npx vitest run tests/entrypoints/content-exclusions.test.ts tests/core/exclusion-prefix.test.ts tests/ui/dismiss-dialog.test.ts tests/core/exclusions.test.ts`
Expected: 全 PASS。

Run: `make typecheck`
Expected: エラーなし。

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/content.ts
git commit -m "feat(content): 非表示ダイアログから除外登録できるようにする"
```

---

### Task 4: 最終検証

- [ ] **Step 1: Run the focused suite**

Run: `npx vitest run tests/core/exclusion-prefix.test.ts tests/ui/dismiss-dialog.test.ts tests/entrypoints/content-exclusions.test.ts tests/core/exclusions.test.ts`
Expected: 全 PASS。

- [ ] **Step 2: Run the full check**

Run: `make check`
Expected: typecheck + test + 両ブラウザの build + manifest 検査 + web-ext lint が緑。

- [ ] **Step 3: Manual check with samples**

1. サンプルフォームを開き、Xを押してダイアログが出ること
2. 「このページだけ」で設定画面の起動しないURLへ追記されること
3. 追記後に開いたままの頁でバナーが出なくなること
4. 別頁の「この配下全体」で同種の頁に波及すること
5. 重複登録で既存の理由文が出て、隠した状態が維持されること

## Self-Review

- 設計書の「2択」「設定画面への追記」「開いたまま反映」「既存理由文の再利用」は Task 1から3 で実装する
- 前提プランとの境界は明確にした。ダイアログの縮小版は前提側、登録欄は本計画側
- プレースホルダなし。各手順に実コードと実コマンドを入れた
- 型の名前は `ExclusionCandidates`、`buildExclusionCandidates`、`DismissDialogRegister` で全手順統一した
