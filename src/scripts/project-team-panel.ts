const BODY_LOCK = 'project-team-panel-open';

export function initProjectTeamPanel(): void {
  const openBtn = document.querySelector<HTMLButtonElement>('[data-project-team-open]');
  const panel = document.querySelector<HTMLElement>('[data-project-team-panel]');
  const backdrop = document.querySelector<HTMLElement>('[data-project-team-backdrop]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-project-team-close]');
  if (!openBtn || !panel || !backdrop) return;

  const onDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !panel.hidden) {
      e.preventDefault();
      closePanel();
    }
  };

  const closePanel = () => {
    openBtn.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove(BODY_LOCK);
    document.removeEventListener('keydown', onDocumentKeydown);
    openBtn.focus();
  };

  const openPanel = () => {
    openBtn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add(BODY_LOCK);
    document.addEventListener('keydown', onDocumentKeydown);
    closeBtn?.focus();
  };

  openBtn.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  closeBtn?.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
}
