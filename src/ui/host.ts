// Page CSS still reaches this host element in the light DOM, so critical
// declarations use important priority. The closed shadow root keeps page
// scripts from reading the UI inside.
//
// `all: initial !important` also resets top/left to initial with important
// priority, so any later coordinate write must use
// setProperty(name, value, 'important') too; a plain inline write loses and
// the host falls back to its static position (bottom of the page). Overrides
// written after this reset win by source order among equal-priority important
// declarations, which is what mountButton and the overlays rely on.
export function createShadowHost(): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement('div');
  host.setAttribute('data-jushoai', '');
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('position', 'absolute', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  const root = host.attachShadow({ mode: 'closed' });
  return { host, root };
}
