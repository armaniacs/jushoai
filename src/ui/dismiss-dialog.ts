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
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'JushoAI の非表示ダイアログ');
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
  let autoHideTimer: ReturnType<typeof setTimeout> | undefined;
  const teardown = (): void => {
    if (closed) return;
    closed = true;
    if (autoHideTimer !== undefined) {
      clearTimeout(autoHideTimer);
      autoHideTimer = undefined;
    }
    host.remove();
  };
  only.addEventListener('click', () => { teardown(); actions.onClose(); });
  undo.addEventListener('click', () => { teardown(); actions.onUndo(); });

  // 自動非表示中も操作中(ホバー/フォーカス)は残す。タイマー満了時に
  // engaged なら、外れた時点で閉じる。
  let engaged = false;
  let autoHideExpired = false;
  const maybeAutoHide = (): void => {
    if (autoHideExpired && !engaged) teardown();
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
      submit.addEventListener('click', () => { reg.onRegister('prefix'); });
      box.append(fixed, submit, errorBox);
    } else {
      submit.addEventListener('click', () => { reg.onRegister(selected); });
      box.append(makeOption('exact', reg.exactLabel), makeOption('prefix', reg.prefixLabel), submit, errorBox);
    }
  }

  root.append(style, box);
  document.body.append(host);

  autoHideTimer = setTimeout(() => {
    autoHideTimer = undefined;
    if (engaged) autoHideExpired = true;
    else teardown();
  }, AUTO_HIDE_MS);

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
    setRegisterBusy: (busy) => { if (submitBtn) submitBtn.disabled = busy; },
  };
}
