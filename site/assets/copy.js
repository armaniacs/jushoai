// Copy-button feedback follows the `copy-button` guide pattern: the button
// label never changes. Success/failure is shown in the adjacent
// role="status" tip, which is both the visible bubble and the live region,
// so sighted and screen-reader users get the same message for both
// outcomes. Copying is idempotent, so the button is never disabled while
// feedback shows (disabling would drop keyboard focus and block retrying
// after a failure).
const timers = new WeakMap();
let lastMessage = '';

function report(button, ok) {
  const tip = button.nextElementSibling;
  if (!tip) return;
  // Rapid clicks restart this button's own feedback instead of stacking
  // timers; other buttons' feedback is unaffected.
  clearTimeout(timers.get(button));
  button.removeAttribute('data-copied');
  button.removeAttribute('data-failed');
  let message = ok ? button.getAttribute('data-done') || 'Copied' : button.getAttribute('data-fail') || 'Copy failed';
  // VoiceOver skips a message identical to the previous one from the same
  // region, even when the region was emptied in between. Track the last
  // message in a variable (not by reading the bubble, which is cleared) and
  // append a no-break space so a repeat differs. It is not read aloud.
  if (message === lastMessage) message += '\u00A0';
  lastMessage = message;
  tip.textContent = '';
  button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
  requestAnimationFrame(() => {
    tip.textContent = message;
  });
  timers.set(
    button,
    setTimeout(() => {
      button.removeAttribute('data-copied');
      button.removeAttribute('data-failed');
      tip.textContent = '';
    }, 2000),
  );
}

document.addEventListener('click', (e) => {
  const target = e.target instanceof Element ? e.target.closest('[data-copy]') : null;
  if (!target) return;
  const code = target.parentElement && target.parentElement.querySelector('code');
  if (!code) return;
  // innerText (unlike textContent) keeps rendered line breaks; fall back to
  // textContent where innerText is unavailable.
  const text = (typeof code.innerText === 'string' ? code.innerText : code.textContent || '').trim();
  if (!text) return;
  // A missing navigator.clipboard (non-secure context) throws inside the
  // try, so the failure message is shown and announced instead of failing
  // silently. Clipboard access can also be denied: the failure is shown too,
  // not only announced.
  try {
    navigator.clipboard.writeText(text).then(
      () => report(target, true),
      () => report(target, false),
    );
  } catch {
    report(target, false);
  }
});
