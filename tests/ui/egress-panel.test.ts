import { describe, it, expect, vi, afterEach } from 'vitest';
import { confirmEgress, type EgressDecision } from '../../src/ui/egress-panel';
import { egressRowsFor } from '../../src/ai/egress-preview';
import { makeMeta, attachOpenShadow, buttonIn } from '../helpers';

function open(meta: Parameters<typeof egressRowsFor>[0]) {
  const sh = attachOpenShadow();
  const pending = confirmEgress(egressRowsFor(meta));
  return { pending, root: sh.root };
}

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('confirmEgress', () => {
  it('sends non-suspect rows and keeps suspect rows excluded by default', async () => {
    const { pending, root } = open([
      makeMeta({ id: 'a', label: '郵便番号' }),
      makeMeta({ id: 'b', label: '山田 太郎様' }),
    ]);
    const aiBtn = buttonIn(root, 'AI判定する');
    expect(aiBtn).toBeTruthy();
    aiBtn!.click();
    const decision: EgressDecision = await pending;
    expect(decision.mode).toBe('ai');
    expect(decision.mode === 'ai' && [...decision.send]).toEqual(['a']);
  });

  it('includes a suspect row when the exclude checkbox is unchecked', async () => {
    const { pending, root } = open([makeMeta({ id: 'b', label: '山田 太郎様' })]);
    const box = root.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(box?.checked).toBe(true);
    box!.checked = false;
    buttonIn(root, 'AI判定する')!.click();
    const decision = await pending;
    expect(decision.mode === 'ai' && [...decision.send]).toEqual(['b']);
  });

  it('resolves rule-only on the rule-only button', async () => {
    const { pending, root } = open([makeMeta({ id: 'a', label: '姓' })]);
    buttonIn(root, 'ルールのみで入力する')!.click();
    expect(await pending).toEqual({ mode: 'rule-only' });
  });

  it('renders rows through textContent and never via innerHTML', async () => {
    const { pending, root } = open([makeMeta({ id: 'a', label: '<img src=x onerror=alert(1)>' })]);
    const summary = root.querySelector('.egress-summary');
    expect(summary?.innerHTML).not.toContain('<img');
    expect(summary?.textContent).toContain('<img src=x onerror=alert(1)>');
    buttonIn(root, 'ルールのみで入力する')!.click();
    await pending;
  });

  it('shows the suspect row and its note only when suspects exist', async () => {
    const plain = open([makeMeta({ id: 'a', label: '姓' })]);
    expect(plain.root.querySelector('.suspect')).toBeNull();
    buttonIn(plain.root, 'ルールのみで入力する')!.click();
    await plain.pending;

    const suspectRun = open([makeMeta({ id: 'b', label: '山田 太郎様' })]);
    expect(suspectRun.root.querySelector('.suspect')).toBeTruthy();
    buttonIn(suspectRun.root, 'ルールのみで入力する')!.click();
    await suspectRun.pending;
  });
});
