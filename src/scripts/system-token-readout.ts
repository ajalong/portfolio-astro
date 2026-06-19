function initTokenReadouts(): void {
  const style = getComputedStyle(document.documentElement);
  document.querySelectorAll<HTMLElement>('[data-token-readout]').forEach((el) => {
    const token = el.dataset.tokenReadout;
    if (!token) return;
    const value = style.getPropertyValue(`--${token}`).trim();
    const valueEl = el.querySelector('.system-token-readout__value');
    if (valueEl && value) valueEl.textContent = value;
  });
}

document.addEventListener('astro:page-load', initTokenReadouts);
