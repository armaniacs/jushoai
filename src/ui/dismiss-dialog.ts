import { createShadowHost } from './host';
import { SHADOW_TOKENS } from './overlay';

export interface DismissDialogRegister {
  exactLabel: string;
  prefixLabel: string;
  onRegister: (choice: 'exact' | 'prefix') => void;
}

export interface DismissDialogActions {
  onClose: () => void;
  onUndo: () => void;
  register?: DismissDialogRegister;
  // Page-side agreed focus target, evaluated at close time. The banner that
  // opened this dialog is destroyed before the dialog appears, so the opener
  // position captured at open time is already body; the wiring returns the
  // form's first field instead. Connectivity is checked before focusing.
  restoreFocus?: () => HTMLElement | null;
}

export interface DismissDialogHandle {
  host: HTMLElement;
  closeOnly: () => void;
  undo: () => void;
  close: () => void;
  choose: (choice: 'exact' | 'prefix') => void;
  submitRegister: () => void;
  showRegisterError: (reason: string) => void;
  showRegisterSuccess: (onUndoRegistration: () => void) => void;
  setRegisterBusy: (busy: boolean) => void;
}

export const AUTO_HIDE_MS = 15000;

const AUTO_CLOSE_NOTICE = '15秒後に自動で閉じます';
const OPEN_ANNOUNCEMENT = `JushoAI の非表示ダイアログを開きました。${AUTO_CLOSE_NOTICE}`;
const REGISTER_SUCCESS_RESULT = '起動しないURLに登録しました。';
// The removal path names the settings section the options page renders, so a
// user who missed the undo window can still find the list without hunting.
const REGISTER_SUCCESS_HINT = '解除は設定ページの『起動しないURL』から。';
const REGISTER_UNDO_LABEL = '登録を取り消す';

export function showDismissDialog(actions: DismissDialogActions): DismissDialogHandle {
  const { host, root } = createShadowHost({ position: 'fixed' });
  host.style.setProperty('right', '16px', 'important');
  host.style.setProperty('bottom', '16px', 'important');

  const style = document.createElement('style');
  // Tokens via SHADOW_TOKENS, not OVERLAY_CSS wholesale: only the variables
  // are shared, so the overlay panel/button rules stay out of this root.
  style.textContent = [
    SHADOW_TOKENS,
    '.box { font: 13px/1.5 system-ui, sans-serif; background: var(--jushoai-panel-bg); color: var(--jushoai-panel-fg);',
    ' border: 1px solid var(--jushoai-border); border-radius: 8px; padding: 10px 12px;',
    ' box-shadow: 0 2px 8px rgba(0,0,0,.15); width: 280px; }',
    '.row { display: flex; gap: 8px; margin-top: 8px; }',
    '.opt { display: flex; gap: 6px; align-items: flex-start; margin-top: 4px; }',
    '.opt > input { flex-shrink: 0; }',
    '.opt > span { min-width: 0; overflow-wrap: anywhere; }',
  ].join('');
  const box = document.createElement('div');
  box.className = 'box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'JushoAI の非表示ダイアログ');
  const text = document.createElement('div');
  text.textContent = `このボタンを隠しました(リロードまで)。${AUTO_CLOSE_NOTICE}`;
  // Live region announcing the dialog's appearance. Sits outside the dialog
  // box (sibling region), visually hidden like preview.ts's status line.
  const live = document.createElement('div');
  live.setAttribute('role', 'status');
  live.setAttribute(
    'style',
    'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;',
  );
  const row = document.createElement('div');
  row.className = 'row';
  const only = document.createElement('button');
  only.type = 'button';
  only.textContent = '今回だけ閉じる';
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.textContent = '元に戻す';

  let closed = false;
  let autoHideTimer: ReturnType<typeof setTimeout> | undefined;
  // Esc closes via the "close only this time" path: registration never runs.
  // The dialog is non-modal, so the key only applies while focus is inside —
  // otherwise Esc would be stolen from modal panels (preview/guide) that may
  // be open on top of this dialog.
  const onEscapeKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    const active = root.activeElement;
    if (!(active instanceof Node) || !box.contains(active)) return;
    teardown();
    actions.onClose();
  };
  const detachEscapeClose = (): void => {
    document.removeEventListener('keydown', onEscapeKey, true);
  };
  document.addEventListener('keydown', onEscapeKey, true);
  // Focus restore follows mountPanel's policy: prefer the position focused at
  // open time. Here that is usually already body — the banner that opened the
  // dialog is destroyed before showDismissDialog runs — so the wiring supplies
  // a page-side agreed target (the form's first field) as the fallback.
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const restoreFocus = (): void => {
    if (opener && opener !== document.body && opener.isConnected) {
      opener.focus();
      return;
    }
    const agreed = actions.restoreFocus?.() ?? null;
    if (agreed && agreed.isConnected) agreed.focus();
  };
  const teardown = (): void => {
    if (closed) return;
    closed = true;
    if (autoHideTimer !== undefined) {
      clearTimeout(autoHideTimer);
      autoHideTimer = undefined;
    }
    detachEscapeClose();
    // Shadow focus retargets to the host in document.activeElement.
    const focusWasInside = document.activeElement === host;
    host.remove();
    // Restore only when this close actually strands focus on body (the body
    // fall this dialog exists to fix). If the user already moved focus
    // elsewhere on the page, yanking it to the agreed target would interrupt
    // them mid-keystroke.
    if (focusWasInside || document.activeElement === document.body) restoreFocus();
  };
  only.addEventListener('click', () => { teardown(); actions.onClose(); });
  undo.addEventListener('click', () => { teardown(); actions.onUndo(); });

  // 自動非表示中も操作中(ホバー/フォーカス)は残す。タイマー満了時に
  // 保持されていれば、外れた時点で閉じる。ホバーとフォーカスは別フラグ:
  // 成功表示は箱(tabindex=-1)自体へのフォーカスを保持と数えないため
  // (下の focusin 参照)、箱へのフォーカス着替えがホバー保持を消さない。
  let hoverHeld = false;
  let focusHeld = false;
  // Registration in flight counts as held: the outcome display (close on
  // success or role="alert" on failure) must survive a timer expiry during
  // load/save, or a failed save would look like a successful dismissal.
  let registerBusy = false;
  let autoHideExpired = false;
  const maybeAutoHide = (): void => {
    if (autoHideExpired && !hoverHeld && !focusHeld && !registerBusy) teardown();
  };
  const onAutoHideExpired = (): void => {
    autoHideTimer = undefined;
    if (hoverHeld || focusHeld || registerBusy) autoHideExpired = true;
    else teardown();
  };
  const armAutoHide = (): void => {
    if (autoHideTimer !== undefined) return;
    autoHideTimer = setTimeout(onAutoHideExpired, AUTO_HIDE_MS);
  };
  box.addEventListener('pointerenter', () => { hoverHeld = true; });
  box.addEventListener('pointerleave', () => {
    // Either leave event resets the whole hold (pinned PBI-237 behavior of
    // the former single flag): leaving by pointer closes even while a
    // control inside keeps focus, and vice versa.
    hoverHeld = false;
    focusHeld = false;
    maybeAutoHide();
  });
  box.addEventListener('focusin', (e) => {
    // The success view parks focus on the box itself (tabindex=-1) to keep an
    // accidental Enter off the undo button. Container focus is not user
    // interaction, so it must not hold the auto-close: the text promises a
    // 15s close and a hold would make that false in the success view's own
    // default state. Landing on the box also releases a hold left by a
    // control removed since (the register submit), which fires no focusout.
    // Unlike the leave events it must not clear hoverHeld: the pointer is
    // still on the box right after a submit click when success shows.
    focusHeld = e.target !== box;
    if (!focusHeld) maybeAutoHide();
  });
  box.addEventListener('focusout', (e) => {
    // ダイアログ内のボタン間移動では保持を維持する。
    if (e.relatedTarget instanceof Node && box.contains(e.relatedTarget)) return;
    hoverHeld = false;
    focusHeld = false;
    maybeAutoHide();
  });

  row.append(only, undo);
  box.append(text, row);

  let selected: 'exact' | 'prefix' = 'exact';
  let errorBox: HTMLElement | null = null;
  let exactRadio: HTMLInputElement | null = null;
  let prefixRadio: HTMLInputElement | null = null;
  let submitBtn: HTMLButtonElement | null = null;
  // exact と prefix が同じ文字列(ルート URL など)のときは二択に意味が
  // ないので、ラジオなしの1行表示にして登録は prefix 扱いにする。
  let collapsedRegister = false;
  // Nodes the success view swaps out wholesale (PBI-244).
  const registerNodes: HTMLElement[] = [];
  let succeeded = false;

  if (actions.register) {
    const reg = actions.register;
    const makeOption = (choice: 'exact' | 'prefix', label: string): HTMLElement => {
      const line = document.createElement('label');
      line.className = 'opt';
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
    submitBtn = submit;
    errorBox = document.createElement('div');
    errorBox.setAttribute('role', 'alert');
    if (reg.exactLabel === reg.prefixLabel) {
      collapsedRegister = true;
      const fixed = document.createElement('div');
      fixed.textContent = `このサイト全体: ${reg.prefixLabel}`;
      submit.addEventListener('click', () => {
        // aria-disabled is advisory only; activation is dropped here instead.
        if (registerBusy) return;
        reg.onRegister('prefix');
      });
      registerNodes.push(fixed);
    } else {
      submit.addEventListener('click', () => {
        // aria-disabled is advisory only; activation is dropped here instead.
        if (registerBusy) return;
        reg.onRegister(selected);
      });
      registerNodes.push(makeOption('exact', reg.exactLabel), makeOption('prefix', reg.prefixLabel));
    }
    registerNodes.push(submit);
    box.append(...registerNodes, errorBox);
  }

  root.append(style, live, box);
  document.body.append(host);

  // Set after insertion: a live region filled before it enters the document
  // is skipped by some screen readers.
  live.textContent = OPEN_ANNOUNCEMENT;
  // mountPanel's convention: initial focus goes to the first enabled button.
  const buttons = [...box.querySelectorAll<HTMLButtonElement>('button')];
  buttons.find((b) => !b.disabled)?.focus();

  armAutoHide();

  return {
    host,
    closeOnly: () => { teardown(); actions.onClose(); },
    undo: () => { teardown(); actions.onUndo(); },
    close: teardown,
    choose: (choice) => {
      selected = choice;
      if (choice === 'exact') exactRadio?.click();
      else prefixRadio?.click();
    },
    submitRegister: () => {
      // The register UI is gone after success; a stale handle must not
      // re-register.
      if (succeeded) return;
      if (!actions.register) return;
      actions.register.onRegister(collapsedRegister ? 'prefix' : selected);
    },
    showRegisterError: (reason) => { if (errorBox) errorBox.textContent = reason; },
    showRegisterSuccess: (onUndoRegistration) => {
      if (!actions.register || succeeded) return;
      succeeded = true;
      submitBtn = null;
      // A save-failure → retry → success sequence would otherwise leave the
      // stale reason next to the success message.
      if (errorBox) errorBox.textContent = '';
      // The dismissal actions leave with the register UI: 元に戻す would only
      // un-dismiss a page the exclusion keeps dormant, and two undo buttons
      // with different meanings would invite the wrong one.
      for (const node of registerNodes) node.remove();
      row.remove();
      text.textContent = `${REGISTER_SUCCESS_RESULT}${REGISTER_SUCCESS_HINT}${AUTO_CLOSE_NOTICE}`;
      const undoRegistration = document.createElement('button');
      undoRegistration.type = 'button';
      undoRegistration.textContent = REGISTER_UNDO_LABEL;
      // Inline spacing instead of a `.box > button` rule: the register submit
      // is also a direct child and must keep its existing look.
      undoRegistration.style.marginTop = '8px';
      undoRegistration.addEventListener('click', () => {
        // The undo chain flips the shared busy flag synchronously at start;
        // a double-click must not re-enter load → remove → save mid-flight.
        if (registerBusy) return;
        onUndoRegistration();
      });
      box.append(undoRegistration);
      // Focus the box, not the undo button: an accidental second Enter on a
      // focused undo would cancel the registration just made. tabindex=-1
      // keeps keyboard focus (and Esc) inside instead of stranding it on
      // body, and Tab reaches the undo button as a deliberate second step.
      // Container focus does not hold the auto-close (only controls do), so
      // the promised 15s close still runs while the user merely reads.
      box.setAttribute('tabindex', '-1');
      box.focus();
      live.textContent = `${REGISTER_SUCCESS_RESULT}${REGISTER_SUCCESS_HINT}`;
    },
    setRegisterBusy: (busy) => {
      registerBusy = busy;
      // aria-disabled instead of the disabled attribute: disabling would drop
      // keyboard focus to body (same rationale as site/assets/copy.js). The
      // attribute is removed when idle: "false" is the ARIA default state and
      // only adds noise for assistive tech.
      if (submitBtn) {
        if (busy) submitBtn.setAttribute('aria-disabled', 'true');
        else submitBtn.removeAttribute('aria-disabled');
      }
      if (!busy && autoHideExpired && !closed) {
        // Expiry absorbed during registration: rearm a full window so normal
        // auto-close resumes and a just-shown role="alert" stays readable.
        autoHideExpired = false;
        armAutoHide();
      }
    },
  };
}
