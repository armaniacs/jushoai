import { describe, it, expect, vi } from 'vitest';
import { appendEntry, EMPTY_AUDIT_STATE, type AuditDraft, type AuditEntry } from '../../src/ai/audit-log';
import { mountAuditSection, type AuditSectionDeps } from '../../src/entrypoints/options/audit-section';

const draft = (over: Partial<AuditDraft> = {}): AuditDraft => ({
  provider: 'openai', host: 'h', model: 'm', purpose: 'classify', pageUrl: 'https://e.com/p',
  fieldCount: 2, request: 'PROMPT', response: 'RAW', chunkIndex: null, chunkCount: null,
  result: 'success', httpStatus: 200, retried: false, durationMs: 12, ...over,
});

const entry = (over: Partial<AuditDraft> = {}): AuditEntry =>
  appendEntry(EMPTY_AUDIT_STATE, draft(over), Date.UTC(2026, 9, 6)).entries[0]!;

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
  const details = () => [...root.querySelectorAll<HTMLDetailsElement>('.audit-list > details')];
  return { root, deps, buttons, details, setEntries: (next: AuditEntry[]) => { list = next; } };
}

describe('audit section', () => {
  it('disables download and delete but keeps reload when empty', async () => {
    const { root, buttons } = mount([]);
    await flush();
    expect(root.textContent).toContain('ログはありません。');
    expect(buttons().map((b) => b.textContent)).toEqual(['TSV でダウンロード', 'ログを削除', '最新のログを読み込む']);
    expect(buttons()[0]!.disabled).toBe(true);
    expect(buttons()[1]!.disabled).toBe(true);
    expect(buttons()[2]!.disabled).toBe(false);
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

  it('lists entries newest first with an expandable trace', async () => {
    const first = entry();
    const second = appendEntry({ nextId: 2, entries: [first] }, draft(), Date.UTC(2026, 9, 6)).entries[1]!;
    const { root, details } = mount([first, second]);
    await flush();
    expect(details()).toHaveLength(2);
    expect(details()[0]!.textContent).toContain('#2');
    expect(details()[1]!.textContent).toContain('#1');
    expect(details()[0]!.querySelector('summary')!.textContent).toContain('openai');
    // The target page URL is visible without opening the entry.
    expect(details()[0]!.querySelector('summary')!.textContent).toContain('https://e.com/p');
    details()[0]!.open = true;
    details()[0]!.dispatchEvent(new Event('toggle'));
    expect(details()[0]!.textContent).toContain('PROMPT');
    expect(details()[0]!.textContent).toContain('RAW');
  });

  it('shows the chunk position and the system prompt for a split call', async () => {
    const { root, details } = mount([entry({ chunkIndex: 2, chunkCount: 3 })]);
    await flush();
    details()[0]!.open = true;
    details()[0]!.dispatchEvent(new Event('toggle'));
    expect(root.textContent).toContain('2 / 3');
    expect(root.textContent).toContain('システムプロンプト');
  });

  it('keeps the trace out of the closed summary', async () => {
    const { details } = mount([entry()]);
    await flush();
    expect(details()[0]!.querySelector('summary')!.textContent).not.toContain('PROMPT');
  });

  it('omits the page URL from the summary when the entry has none', async () => {
    const { details } = mount([entry({ pageUrl: '' })]);
    await flush();
    const summary = details()[0]!.querySelector('summary')!.textContent ?? '';
    expect(summary.endsWith('success')).toBe(true);
  });

  it('reloads the log on demand', async () => {
    const first = entry();
    const second = appendEntry({ nextId: 2, entries: [first] }, draft(), Date.UTC(2026, 9, 6)).entries[1]!;
    const { root, buttons, setEntries } = mount([first]);
    await flush();
    expect(root.textContent).toContain('ログは 1 件あります。');
    setEntries([first, second]);
    buttons()[2]!.click();
    await flush();
    expect(root.textContent).toContain('ログは 2 件あります。');
  });
});
