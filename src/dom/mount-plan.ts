export interface MountPlanForm<F extends { container: Element; anchor: { el: Element } }> {
  destroy: Element[];
  mount: F[];
}

export function planMounts<F extends { container: Element; anchor: { el: Element } }>(
  mounted: ReadonlyMap<Element, Element>,
  forms: F[],
): MountPlanForm<F> {
  const byContainer = new Map(forms.map((f) => [f.container, f]));
  const destroy: Element[] = [];
  for (const [container, anchor] of mounted) {
    const f = byContainer.get(container);
    if (!f || !container.isConnected || !anchor.isConnected || f.anchor.el !== anchor) destroy.push(container);
  }
  const kept = new Set([...mounted.keys()].filter((c) => !destroy.includes(c)));
  return { destroy, mount: forms.filter((f) => !kept.has(f.container)) };
}
