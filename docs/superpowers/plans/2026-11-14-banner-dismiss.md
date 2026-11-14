# バナー一時非表示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 青バナー右上の半透明Xで押したバナーだけを消し、リロードまで再表示しない。

**Architecture:** 永続除外には触らない。隠したコンテナの集合をタブ内メモリに置き、`sync()` のマウント前段で引く。Xボタンはテスト可能な生成関数に切り出し、ダイアログは `mountPanel` 型のハンドルで閉じる。

**Tech Stack:** WXT + TypeScript + Vitest (jsdom)。

---

## File Structure

- Create: `src/content/dismiss-memory.ts` - 隠したコンテナの集合。追加・削除・判定・個数だけを持つ。
- Test: `tests/content/dismiss-memory.test.ts` - 集合操作の単体テスト。
- Modify: `src/ui/button.ts` - `createDismissButton` の追加と `mountButton` への配線。X用CSSの追加。
- Test: `tests/ui/dismiss-button.test.ts` - 生成関数のクリックと表示名のテスト。
- Create: `src/ui/dismiss-dialog.ts` - 非表示直後の小さなダイアログ。今回は「今回だけ閉じる」と「元に戻す」だけを持つ。
- Test: `tests/ui/dismiss-dialog.test.ts` - ボタン押下で対応する処理が走ることのテスト。
- Modify: `src/entrypoints/content.ts` - 集合の保持、`sync()` の除外、`mountButton` 第4引数の接続、「元に戻す」の再実行。

---

### Task 1: dismiss-memory 集合

**Files:**
- Create: `src/content/dismiss-memory.ts`
- Test: `tests/content/dismiss-memory.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createDismissMemory } from '../../src/content/dismiss-memory';

describe('createDismissMemory', () => {
  it('追加した要素だけを隠し対象にする', () => {
    const memory = createDismissMemory();
    const a = document.createElement('div');
    const b = document.createElement('div');
    expect(memory.has(a)).toBe(false);
    memory.add(a);
    expect(memory.has(a)).toBe(true);
    expect(memory.has(b)).toBe(false);
    expect(memory.size).toBe(1);
  });

  it('削除で戻り、二重追加で増えない', () => {
    const memory = createDismissMemory();
    const a = document.createElement('div');
    memory.add(a);
    memory.add(a);
    expect(memory.size).toBe(1);
    memory.remove(a);
    expect(memory.has(a)).toBe(false);
    expect(memory.size).toBe(0);
  });

  it('clear で空になる', () => {
    const memory = createDismissMemory();
    memory.add(document.createElement('div'));
    memory.clear();
    expect(memory.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/content/dismiss-memory.test.ts`
Expected: FAIL with "Failed to resolve import" または同等の解決失敗。

- [ ] **Step 3: Write minimal implementation**

```ts
export interface DismissMemory {
  add(container: Element): void;
  remove(container: Element): void;
  has(container: Element): boolean;
  clear(): void;
  readonly size: number;
}

export function createDismissMemory(): DismissMemory {
  const hidden = new Set<Element>();
  return {
    add: (container) => { hidden.add(container); },
    remove: (container) => { hidden.delete(container); },
    has: (container) => hidden.has(container),
    clear: () => { hidden.clear(); },
    get size() { return hidden.size; },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/content/dismiss-memory.test.ts`
Expected: 3 passed。

- [ ] **Step 5: Commit**

```bash
git add src/content/dismiss-memory.ts tests/content/dismiss-memory.test.ts
git commit -m "feat(content): 一時非表示の集合を追加する"
```

---

### Task 2: Xボタンの生成関数と配線

**Files:**
- Modify: `src/ui/button.ts`
- Test: `tests/ui/dismiss-button.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createDismissButton } from '../../src/ui/button';

describe('createDismissButton', () => {
  it('押すと onDismiss が1回走る', () => {
    const onDismiss = vi.fn();
    const button = createDismissButton(onDismiss);
    expect(button.getAttribute('aria-label')).toBe('このボタンを隠す');
    button.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('button 要素で type が button である', () => {
    const button = createDismissButton(() => {});
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/dismiss-button.test.ts`
Expected: FAIL。`createDismissButton` が存在しないため。

- [ ] **Step 3: Write minimal implementation**

`src/ui/button.ts` の CSS 文字列に次を足す。

```css
.dismiss { all: initial; position: absolute; top: -10px; right: -10px; width: 22px; height: 22px;
  border-radius: 50%; background: rgba(0,0,0,.45); color: #fff;
  font: 700 13px/22px system-ui, sans-serif; text-align: center; cursor: pointer;
  border: 1px solid rgba(255,255,255,.7); opacity: .55; }
.wrap:hover .dismiss, .dismiss:hover, .dismiss:focus-visible { opacity: 1; }
```

`wrap` の配置基準のため `.wrap` に `position: relative;` を足す。次を `mountButton` の外に足す。

```ts
export function createDismissButton(onDismiss: () => void): HTMLButtonElement {
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'dismiss';
  dismiss.textContent = 'X';
  dismiss.setAttribute('aria-label', 'このボタンを隠す');
  dismiss.title = 'このボタンを隠す';
  dismiss.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDismiss();
  });
  return dismiss;
}
```

`mountButton` の引数に `onDismiss: () => void = () => {}` を第4引数として足し、`wrap.append(button, badge, hint)` の前に次を足す。

```ts
const dismiss = createDismissButton(() => onDismiss());
wrap.append(dismiss);
```

既存のドラッグ抑止と競合しないよう、Xの押下は `suppressClick` の対象外にする。Xはドラッグ開始点にならないため、`wrap` の `pointerdown` で `e.target` が `.dismiss` の場合は何もしない分岐を足す。

```ts
wrap.addEventListener('pointerdown', (e) => {
  if ((e.target as Element | null)?.closest?.('.dismiss')) return;
  // 以下は既存の処理をそのまま残す
});
```

既存の `pointerdown` 登録の先頭にこの分岐だけを挿入する。既存処理の削除や並べ替えはしない。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/dismiss-button.test.ts`
Expected: 2 passed。

Run: `make typecheck`
Expected: エラーなし。

- [ ] **Step 5: Commit**

```bash
git add src/ui/button.ts tests/ui/dismiss-button.test.ts
git commit -m "feat(ui): バナーに半透明のXボタンを追加する"
```

---

### Task 3: 非表示直後のダイアログ(縮小版)

**Files:**
- Create: `src/ui/dismiss-dialog.ts`
- Test: `tests/ui/dismiss-dialog.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { showDismissDialog } from '../../src/ui/dismiss-dialog';

describe('showDismissDialog', () => {
  it('今回だけ閉じるで閉じて onClose が走る', () => {
    const onClose = vi.fn();
    const dialog = showDismissDialog({ onClose, onUndo: vi.fn() });
    dialog.closeOnly();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.contains(dialog.host)).toBe(false);
  });

  it('元に戻すで onUndo が走る', () => {
    const onUndo = vi.fn();
    const dialog = showDismissDialog({ onClose: vi.fn(), onUndo });
    dialog.undo();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/dismiss-dialog.test.ts`
Expected: FAIL。モジュールが存在しないため。

- [ ] **Step 3: Write minimal implementation**

```ts
import { createShadowHost } from './host';

export interface DismissDialogActions {
  onClose: () => void;
  onUndo: () => void;
}

export interface DismissDialogHandle {
  host: HTMLElement;
  closeOnly: () => void;
  undo: () => void;
  close: () => void;
}

export function showDismissDialog(actions: DismissDialogActions): DismissDialogHandle {
  const { host, root } = createShadowHost({ position: 'fixed' });
  host.style.setProperty('right', '16px', 'important');
  host.style.setProperty('bottom', '16px', 'important');

  const style = document.createElement('style');
  style.textContent = [
    '.box { font: 13px/1.5 system-ui, sans-serif; background: #fff; color: #222;',
    ' border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px;',
    ' box-shadow: 0 2px 8px rgba(0,0,0,.15); width: 280px; }',
    '.row { display: flex; gap: 8px; margin-top: 8px; }',
  ].join('');
  const box = document.createElement('div');
  box.className = 'box';
  const text = document.createElement('div');
  text.textContent = 'このボタンを隠しました(リロードまで)';
  const row = document.createElement('div');
  row.className = 'row';
  const only = document.createElement('button');
  only.type = 'button';
  only.textContent = '今回だけ閉じる';
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.textContent = '元に戻す';

  let closed = false;
  const teardown = (): void => {
    if (closed) return;
    closed = true;
    host.remove();
  };
  only.addEventListener('click', () => { teardown(); actions.onClose(); });
  undo.addEventListener('click', () => { teardown(); actions.onUndo(); });

  row.append(only, undo);
  box.append(text, row);
  root.append(style, box);
  document.body.append(host);

  return {
    host,
    closeOnly: () => { teardown(); actions.onClose(); },
    undo: () => { teardown(); actions.onUndo(); },
    close: teardown,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/dismiss-dialog.test.ts`
Expected: 2 passed。

Run: `make typecheck`
Expected: エラーなし。

- [ ] **Step 5: Commit**

```bash
git add src/ui/dismiss-dialog.ts tests/ui/dismiss-dialog.test.ts
git commit -m "feat(ui): 非表示直後の小さなダイアログを追加する"
```

---

### Task 4: content.ts への接続

**Files:**
- Modify: `src/entrypoints/content.ts`
- Test: 既存 `tests/entrypoints/content-exclusions.test.ts` の回帰 + 手動確認

- [ ] **Step 1: Write the failing test**

新規の振る舞いは既存の `sync()` 経路に載るため、ここでは回帰だけを固定する。既存テストが通ることを確認する。

Run: `npx vitest run tests/entrypoints/content-exclusions.test.ts`
Expected: PASS(現状のまま)。

- [ ] **Step 2: Implement the wiring**

`src/entrypoints/content.ts` の `main()` 内、`mounted` の next に次を足す。

```ts
const dismissed = createDismissMemory();
```

`import` に次を足す。

```ts
import { createDismissMemory } from '../content/dismiss-memory';
import { showDismissDialog } from '../ui/dismiss-dialog';
```

`sync()` 内の `detectForms` 直後に除外を足す。

```ts
const forms = detectForms(document).filter((f) => !dismissed.has(f.container));
```

`mountButton` の呼び出しを次に変える。`handle` の自己参照のため `let` で受ける。

```ts
for (const form of plan.mount) {
  let handle: ButtonHandle;
  handle = mountButton(
    form.anchor.el,
    () => void guardedRun(form.container, handle),
    (info) => {
      closeOpenPanels();
      openGuide = showAiGuide(
        buildGuide(info, browser, tabMemory.lastFailure()),
        () => { openGuide = null; },
        () => void chrome.runtime.sendMessage({ type: 'open-options' }),
      );
    },
    () => {
      dismissed.add(form.container);
      mounted.get(form.container)?.handle.destroy();
      mounted.delete(form.container);
      showDismissDialog({
        onClose: () => {},
        onUndo: () => {
          dismissed.remove(form.container);
          schedule();
        },
      });
    },
  );
  mounted.set(form.container, { handle, anchor: form.anchor.el, container: form.container });
  void getAiStatusViaBackground().then((s) => handle.setStatus(s));
}
```

既存の badge guide ブロックは切り貼りするだけで中身を変えない。

- [ ] **Step 3: Run tests to verify**

Run: `npx vitest run tests/entrypoints/content-exclusions.test.ts tests/content/dismiss-memory.test.ts tests/ui/dismiss-button.test.ts tests/ui/dismiss-dialog.test.ts`
Expected: 全 PASS。

Run: `make typecheck`
Expected: エラーなし。

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/content.ts
git commit -m "feat(content): Xで隠した分をマウント対象から外す"
```

---

### Task 5: 最終検証

- [ ] **Step 1: Run the focused suite**

Run: `npx vitest run tests/content/dismiss-memory.test.ts tests/ui/dismiss-button.test.ts tests/ui/dismiss-dialog.test.ts tests/entrypoints/content-exclusions.test.ts`
Expected: 全 PASS。

- [ ] **Step 2: Run the full check**

Run: `make check`
Expected: typecheck + test + 両ブラウザの build + manifest 検査 + web-ext lint が緑。

- [ ] **Step 3: Manual check with samples**

1. `make dev` 相当で拡張を読み込み、サンプルフォームを開く
2. Xを押して押したバナーだけが消えること
3. ダイアログの「元に戻す」で戻ること
4. リロードで戻ること
5. 設定画面の起動しないURLに何も追記されないこと(永続化なし)

## Self-Review

- 設計書の「押したバナーだけ」「リロードまで」「保存なし」は Task 1/4 で実装する
- Xの見た目と操作名は Task 2/3 で実装する
- プレースホルダなし。各手順に実コードと実コマンドを入れた
- 型の名前は `DismissMemory`、`createDismissButton`、`showDismissDialog` で全手順統一した
