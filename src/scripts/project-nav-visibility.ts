/**
 * Project pages: always show the menu (home) button.
 */
export function initProjectNavFromInternal(): void {
  if (!document.body.classList.contains('project-page')) return;

  const nav = document.querySelector<HTMLElement>(
    'body.project-page .project-nav-btn[data-internal-entry-only]'
  );
  if (!nav) return;

  nav.classList.add('project-nav-btn--from-site');
  nav.removeAttribute('aria-hidden');
}
