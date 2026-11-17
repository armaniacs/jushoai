import { createShadowHost } from './host';

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
  setRegisterBusy: (busy: boolean) => void;
}

export const AUTO_HIDE_MS = 15000;

const AUTO_CLOSE_NOTICE = '15秒後に自動で閉じます';
const OPEN_ANNOUNCEMENT = `JushoAI の非表示ダイアログを開きました。${AUTO_CLOSE_NOTICE}`;

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
  // engaged なら、外れた時点で閉じる。
  let engaged = false;
  // Registration in flight counts as engaged: the outcome display (close on
  // success or role="alert" on failure) must survive a timer expiry during
  // load/save, or a failed save would look like a successful dismissal.
  let registerBusy = false;
  let autoHideExpired = false;
  const maybeAutoHide = (): void => {
    if (autoHideExpired && !engaged && !registerBusy) teardown();
  };
  const onAutoHideExpired = (): void => {
    autoHideTimer = undefined;
    if (engaged || registerBusy) autoHideExpired = true;
    else teardown();
  };
  const armAutoHide = (): void => {
    if (autoHideTimer !== undefined) return;
    autoHideTimer = setTimeout(onAutoHideExpired, AUTO_HIDE_MS);
  };
  box.addEventListener('pointerenter', () => { engaged = true; });
  box.addEventListener('pointerleave', () => { engaged = false; maybeAutoHide(); });
  box.addEventListener('focusin', () => { engaged = true; });
  box.addEventListener('focusout', (e) => {
    // ダイアログ内のボタン間移動では engaged を維持する。
    if (e.relatedTarget instanceof Node && box.contains(e.relatedTarget)) return;
    engaged = false;
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
      box.append(fixed, submit, errorBox);
    } else {
      submit.addEventListener('click', () => {
        // aria-disabled is advisory only; activation is dropped here instead.
        if (registerBusy) return;
        reg.onRegister(selected);
      });
      box.append(makeOption('exact', reg.exactLabel), makeOption('prefix', reg.prefixLabel), submit, errorBox);
    }
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
      if (!actions.register) return;
      actions.register.onRegister(collapsedRegister ? 'prefix' : selected);
    },
    showRegisterError: (reason) => { if (errorBox) errorBox.textContent = reason; },
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
