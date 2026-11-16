// Click-to-load for YouTube facades (performance pattern). Each
// `.video-facade-link` points at the watch page, so without JavaScript it
// still opens the video in a new tab. With JavaScript the click is
// intercepted and the no-cookie player iframe is created in place with
// autoplay, keeping the facade's title. No request goes to YouTube before
// activation. Keyboard users activate the link as usual; focus moves into
// the player via the iframe's own tabindex.
document.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('.video-facade-link[data-embed]') : null;
  if (!(link instanceof HTMLAnchorElement)) return;
  const box = link.closest('.video-facade');
  if (!box) return;
  event.preventDefault();
  const iframe = document.createElement('iframe');
  iframe.src = link.dataset.embed ?? '';
  if (iframe.src === '') return;
  iframe.title = link.dataset.title ?? '';
  iframe.setAttribute('loading', 'lazy');
  iframe.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  box.replaceChildren(iframe);
  iframe.focus({ preventScroll: true });
});
