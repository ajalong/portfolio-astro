const BODY_LOCK = 'project-team-panel-open';

function lockScroll() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
  document.documentElement.classList.add(BODY_LOCK);
}

function unlockScroll() {
  document.documentElement.classList.remove(BODY_LOCK);
  document.body.style.paddingRight = '';
}

export function initProjectTeamPanel(): void {
  const openBtn = document.querySelector<HTMLButtonElement>('[data-project-team-open]');
  const panel = document.querySelector<HTMLElement>('[data-project-team-panel]');
  const card = document.querySelector<HTMLElement>('[data-project-team-card]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-project-team-close]');
  if (!openBtn || !panel) return;

  const onDocumentKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !panel.hidden) {
      e.preventDefault();
      closePanel();
    }
  };

  const closePanel = () => {
    openBtn.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-visible');
    document.removeEventListener('keydown', onDocumentKeydown);
    panel.addEventListener('transitionend', () => {
      panel.setAttribute('hidden', '');
      unlockScroll();
      openBtn.focus();
    }, { once: true });
  };

  const openPanel = () => {
    openBtn.setAttribute('aria-expanded', 'true');
    panel.removeAttribute('hidden');
    lockScroll();
    document.addEventListener('keydown', onDocumentKeydown);
    // Double rAF ensures hidden removal is painted before opacity transition starts
    requestAnimationFrame(() => requestAnimationFrame(() => {
      panel.classList.add('is-visible');
      closeBtn?.focus();
    }));
  };

  openBtn.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  closeBtn?.addEventListener('click', closePanel);

  // Click outside the card closes the panel
  panel.addEventListener('click', (e) => {
    if (card && !card.contains(e.target as Node)) closePanel();
  });
}
