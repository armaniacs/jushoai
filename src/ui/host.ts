// Page CSS still reaches this host element in the light DOM, so critical
// declarations use important priority. The closed shadow root keeps page
// scripts from reading the UI inside.
export function createShadowHost(): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement('div');
  host.setAttribute('data-jushoai', '');
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('position', 'absolute', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  const root = host.attachShadow({ mode: 'closed' });
  return { host, root };
}
