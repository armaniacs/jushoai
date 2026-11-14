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
