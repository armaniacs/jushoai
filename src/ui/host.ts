// A closed shadow root keeps page CSS out and keeps page scripts from reading the UI.
export function createShadowHost(): { host: HTMLElement; root: ShadowRoot } {
  const host = document.createElement('div');
  host.setAttribute('data-jushoai', '');
  host.style.cssText = 'all: initial; position: absolute; z-index: 2147483647;';
  const root = host.attachShadow({ mode: 'closed' });
  return { host, root };
}
