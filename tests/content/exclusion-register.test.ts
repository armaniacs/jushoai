import { describe, it, expect, vi } from 'vitest';
import {
  registerExclusionChoice,
  undoRegisteredExclusion,
  type ExclusionRegisterDeps,
  type ExclusionUndoDeps,
} from '../../src/content/exclusion-register';

const CANDIDATES = {
  exact: 'https://example.com/form',
  prefix: 'https://example.com/',
};

function depsWith(overrides: Partial<ExclusionRegisterDeps> = {}): ExclusionRegisterDeps {
  return {
    loadExcluded: vi.fn(async () => [] as string[]),
    saveExcluded: vi.fn(async () => {}),
    candidates: CANDIDATES,
    showError: vi.fn(),
    showSuccess: vi.fn(),
    setBusy: vi.fn(),
    ...overrides,
  };
}

describe('registerExclusionChoice', () => {
  it('成功すると登録済みエントリを伴う成功表示に切り替える (PBI-244)', async () => {
    const deps = depsWith();
    await registerExclusionChoice('exact', deps);
    expect(deps.saveExcluded).toHaveBeenCalledWith(['https://example.com/form']);
    expect(deps.showSuccess).toHaveBeenCalledWith('https://example.com/form');
    expect(deps.showError).not.toHaveBeenCalled();
  });

  it('prefix の成功表示は prefix 側の正規形を渡す', async () => {
    const deps = depsWith();
    await registerExclusionChoice('prefix', deps);
    expect(deps.showSuccess).toHaveBeenCalledWith('https://example.com/');
  });

  it('重複は理由を出して開いたままにする', async () => {
    const deps = depsWith({ loadExcluded: vi.fn(async () => ['https://example.com/form']) });
    await registerExclusionChoice('exact', deps);
    expect(deps.showError).toHaveBeenCalledWith('すでに登録されています');
    expect(deps.saveExcluded).not.toHaveBeenCalled();
    expect(deps.showSuccess).not.toHaveBeenCalled();
  });

  it('保存失敗は固定文言を出して開いたままにする', async () => {
    const deps = depsWith({ saveExcluded: vi.fn(async () => { throw new Error('quota'); }) });
    await registerExclusionChoice('prefix', deps);
    expect(deps.showError).toHaveBeenCalledWith('保存に失敗しました');
    expect(deps.showSuccess).not.toHaveBeenCalled();
  });

  it('読み込み失敗は投げられた文言を出して開いたままにする', async () => {
    const deps = depsWith({ loadExcluded: vi.fn(async () => { throw new Error('読めません'); }) });
    await registerExclusionChoice('exact', deps);
    expect(deps.showError).toHaveBeenCalledWith('読めません');
    expect(deps.saveExcluded).not.toHaveBeenCalled();
    expect(deps.showSuccess).not.toHaveBeenCalled();
  });

  it('開始で忙しく終わりで戻す', async () => {
    const deps = depsWith();
    await registerExclusionChoice('prefix', deps);
    expect(vi.mocked(deps.setBusy).mock.calls.map((c) => c[0])).toEqual([true, false]);
  });
});

function undoDepsWith(overrides: Partial<ExclusionUndoDeps> = {}): ExclusionUndoDeps {
  return {
    loadExcluded: vi.fn(async () => [] as string[]),
    saveExcluded: vi.fn(async () => {}),
    onRemoved: vi.fn(),
    showError: vi.fn(),
    setBusy: vi.fn(),
    ...overrides,
  };
}

describe('undoRegisteredExclusion', () => {
  it('該当 1 件だけを削除して保存し、他のエントリは壊さない', async () => {
    const deps = undoDepsWith({
      loadExcluded: vi.fn(async () => [
        'https://a.example/',
        'https://example.com/form',
        'https://b.example/',
      ]),
    });
    await undoRegisteredExclusion('https://example.com/form', deps);
    expect(deps.saveExcluded).toHaveBeenCalledTimes(1);
    expect(deps.saveExcluded).toHaveBeenCalledWith(['https://a.example/', 'https://b.example/']);
    expect(deps.onRemoved).toHaveBeenCalledTimes(1);
    expect(deps.showError).not.toHaveBeenCalled();
  });

  it('prefix 登録の取り消しで他ページのエントリに触れない', async () => {
    const deps = undoDepsWith({
      loadExcluded: vi.fn(async () => [
        'https://example.com/',
        'https://docs.google.com/document/',
      ]),
    });
    await undoRegisteredExclusion('https://example.com/', deps);
    expect(deps.saveExcluded).toHaveBeenCalledWith(['https://docs.google.com/document/']);
  });

  it('上限いっぱいでも 1 件減らして保存できる', async () => {
    const full = Array.from({ length: 100 }, (_, i) => `https://example.com/${i}`);
    const deps = undoDepsWith({ loadExcluded: vi.fn(async () => full) });
    await undoRegisteredExclusion('https://example.com/50', deps);
    const saved = vi.mocked(deps.saveExcluded).mock.calls[0]?.[0] ?? [];
    expect(saved).toHaveLength(99);
    expect(saved).not.toContain('https://example.com/50');
  });

  it('保存済みに無ければ書き戻さず取り消し済みとして扱う', async () => {
    const deps = undoDepsWith({ loadExcluded: vi.fn(async () => ['https://a.example/']) });
    await undoRegisteredExclusion('https://example.com/form', deps);
    expect(deps.saveExcluded).not.toHaveBeenCalled();
    expect(deps.onRemoved).toHaveBeenCalledTimes(1);
  });

  it('開始で忙しく終わりで戻す', async () => {
    const deps = undoDepsWith();
    await undoRegisteredExclusion('https://example.com/form', deps);
    expect(vi.mocked(deps.setBusy).mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it('読み込み失敗は投げられた文言を出し、取り消しは起こらない', async () => {
    const deps = undoDepsWith({ loadExcluded: vi.fn(async () => { throw new Error('読めません'); }) });
    await undoRegisteredExclusion('https://example.com/form', deps);
    expect(deps.showError).toHaveBeenCalledWith('読めません');
    expect(deps.saveExcluded).not.toHaveBeenCalled();
    expect(deps.onRemoved).not.toHaveBeenCalled();
  });

  it('保存失敗は固定文言を出し、取り消しは起こらない', async () => {
    const deps = undoDepsWith({
      loadExcluded: vi.fn(async () => ['https://example.com/form']),
      saveExcluded: vi.fn(async () => { throw new Error('quota'); }),
    });
    await undoRegisteredExclusion('https://example.com/form', deps);
    expect(deps.showError).toHaveBeenCalledWith('取り消しに失敗しました');
    expect(deps.onRemoved).not.toHaveBeenCalled();
  });
});
