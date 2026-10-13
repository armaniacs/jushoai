// Page CSS still reaches this host element in the light DOM, so critical
// declarations use important priority. The closed shadow root keeps page
// scripts from reading the UI inside.
//
// Placement is a required caller option: pass `position: 'fixed'` so the host
// never stays static. No default position is declared here on purpose.
// Without a position declaration, writing only coordinates would leave the
// host static and inert at the bottom of the page.
//
// `all: initial !important` also resets top/left to initial with important
// priority, so any later coordinate write must use
// setProperty(name, value, 'important') too; a plain inline write loses and
// the host falls back to its static position (bottom of the page). Overrides
// written after this reset win by source order among equal-priority important
// declarations, which is what mountButton and the overlays rely on. `left`
// stays unset on purpose: the overlay pins from the right edge (`right: 16px`
// with a fixed 360px width), and writing `left` with important would
// over-constrain the box (left + right + width; LTR drops right) and flip
// the pin toward the left edge.
export function createShadowHost(options: { position: 'fixed' }): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement('div');
  host.setAttribute('data-jushoai', '');
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  host.style.setProperty('position', options.position, 'important');
  const root = host.attachShadow({ mode: 'closed' });
  return { host, root };
}
