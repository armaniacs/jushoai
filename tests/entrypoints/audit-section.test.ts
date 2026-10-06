import { describe, it, expect, vi } from 'vitest';
import { appendEntry, EMPTY_AUDIT_STATE, type AuditEntry } from '../../src/ai/audit-log';
import { mountAuditSection, type AuditSectionDeps } from '../../src/entrypoints/options/audit-section';

const entry = (): AuditEntry => appendEntry(EMPTY_AUDIT_STATE, {
  provider: 'openai', host: 'h', model: 'm', purpose: 'classify', pageUrl: 'https://e.com/p',
  fieldCount: 2, result: 'success', httpStatus: 200, retried: false,
}, Date.UTC(2026, 9, 6)).entries[0]!;

const flush = () => new Promise((r) => setTimeout(r, 0));

function mount(initial: AuditEntry[], confirmAnswer = true) {
  let list = initial;
  const deps: AuditSectionDeps = {
    store: { list: async () => list, clear: async () => { list = []; } },
    save: vi.fn(),
    confirm: vi.fn(() => confirmAnswer),
    now: () => new Date(2026, 9, 6),
  };
  const root = document.createElement('div');
  mountAuditSection(root, deps);
  const buttons = () => [...root.querySelectorAll('button')];
  return { root, deps, buttons };
}

describe('audit section', () => {
  it('disables download and delete when empty', async () => {
    const { root, buttons } = mount([]);
    await flush();
    expect(root.textContent).toContain('ログはありません。');
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it('shows the count and downloads a TSV named by date', async () => {
    const { root, deps, buttons } = mount([entry()]);
    await flush();
    expect(root.textContent).toContain('ログは 1 件あります。');
    buttons()[0]!.click();
    expect(deps.save).toHaveBeenCalledOnce();
    const [name, content] = (deps.save as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(name).toBe('jushoai-audit-log-2026-10-06.tsv');
    expect(content.split('\n')[0]).toContain('id\tcreated_at');
    expect(content).toContain('https://e.com/p');
  });

  it('states the retention period and the personal-information caution', async () => {
    const { root } = mount([]);
    expect(root.textContent).toContain('7 日間');
    expect(root.textContent).toContain('利用者の責任');
  });

  it('deletes only after confirmation', async () => {
    const no = mount([entry()], false);
    await flush();
    no.buttons()[1]!.click();
    await flush();
    expect(no.root.textContent).toContain('1 件');

    const yes = mount([entry()], true);
    await flush();
    yes.buttons()[1]!.click();
    await flush();
    expect(yes.root.textContent).toContain('ログはありません。');
  });
});
