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
