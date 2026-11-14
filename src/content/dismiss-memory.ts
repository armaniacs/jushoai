export interface DismissMemory {
  add(container: Element): void;
  remove(container: Element): void;
  has(container: Element): boolean;
  clear(): void;
  readonly size: number;
}

export function createDismissMemory(): DismissMemory {
  const hidden = new Set<Element>();
  return {
    add: (container) => { hidden.add(container); },
    remove: (container) => { hidden.delete(container); },
    has: (container) => hidden.has(container),
    clear: () => { hidden.clear(); },
    get size() { return hidden.size; },
  };
}
