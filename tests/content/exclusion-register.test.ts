import { describe, it, expect, vi } from 'vitest';
import {
  registerExclusionChoice,
  type ExclusionRegisterDeps,
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
    close: vi.fn(),
    setBusy: vi.fn(),
    ...overrides,
  };
}

describe('registerExclusionChoice', () => {
  it('成功すると閉じる', async () => {
    const deps = depsWith();
    await registerExclusionChoice('exact', deps);
    expect(deps.saveExcluded).toHaveBeenCalledWith(['https://example.com/form']);
    expect(deps.close).toHaveBeenCalledTimes(1);
    expect(deps.showError).not.toHaveBeenCalled();
  });

  it('重複は理由を出して開いたままにする', async () => {
    const deps = depsWith({ loadExcluded: vi.fn(async () => ['https://example.com/form']) });
    await registerExclusionChoice('exact', deps);
    expect(deps.showError).toHaveBeenCalledWith('すでに登録されています');
    expect(deps.saveExcluded).not.toHaveBeenCalled();
    expect(deps.close).not.toHaveBeenCalled();
  });

  it('保存失敗は固定文言を出して開いたままにする', async () => {
    const deps = depsWith({ saveExcluded: vi.fn(async () => { throw new Error('quota'); }) });
    await registerExclusionChoice('prefix', deps);
    expect(deps.showError).toHaveBeenCalledWith('保存に失敗しました');
    expect(deps.close).not.toHaveBeenCalled();
  });

  it('読み込み失敗は投げられた文言を出して開いたままにする', async () => {
    const deps = depsWith({ loadExcluded: vi.fn(async () => { throw new Error('読めません'); }) });
    await registerExclusionChoice('exact', deps);
    expect(deps.showError).toHaveBeenCalledWith('読めません');
    expect(deps.saveExcluded).not.toHaveBeenCalled();
    expect(deps.close).not.toHaveBeenCalled();
  });

  it('開始で忙しく終わりで戻す', async () => {
    const deps = depsWith();
    await registerExclusionChoice('prefix', deps);
    expect(vi.mocked(deps.setBusy).mock.calls.map((c) => c[0])).toEqual([true, false]);
  });
});
