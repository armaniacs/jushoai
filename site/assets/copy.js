document.addEventListener('click', (e) => {
  const target = e.target instanceof Element ? e.target.closest('[data-copy]') : null;
  if (!target) return;
  const code = target.parentElement && target.parentElement.querySelector('code');
  if (!code || !navigator.clipboard) return;
  navigator.clipboard.writeText(code.textContent || '').then(
    () => {
      const label = target.textContent;
      target.textContent = target.getAttribute('data-done') || label;
      target.classList.add('copied');
      setTimeout(() => {
        target.textContent = label;
        target.classList.remove('copied');
      }, 1400);
    },
    () => {},
  );
});
