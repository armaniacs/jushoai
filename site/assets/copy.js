let timer;
document.addEventListener('click', (e) => {
  const target = e.target instanceof Element ? e.target.closest('[data-copy]') : null;
  if (!target) return;
  const code = target.parentElement && target.parentElement.querySelector('code');
  if (!code || !navigator.clipboard) return;
  navigator.clipboard.writeText(code.textContent || '').then(
    () => {
      // The label is captured once so a rapid second click cannot save the "done" text as the original.
      if (!target.dataset.label) target.dataset.label = target.textContent;
      const label = target.dataset.label;
      target.textContent = target.getAttribute('data-done') || label;
      target.classList.add('copied');
      clearTimeout(timer);
      timer = setTimeout(() => {
        target.textContent = label;
        target.classList.remove('copied');
      }, 1400);
    },
    () => {},
  );
});
